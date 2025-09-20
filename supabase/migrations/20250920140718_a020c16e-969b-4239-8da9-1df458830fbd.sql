-- Fix RLS policies for user_balances to allow admin operations
DROP POLICY IF EXISTS "Admins can view all balances" ON public.user_balances;

CREATE POLICY "Admins can manage all balances" 
ON public.user_balances 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::text))
WITH CHECK (has_role(auth.uid(), 'admin'::text));

-- Ensure the process_task_completion function exists with correct signature
CREATE OR REPLACE FUNCTION public.process_task_completion(user_uuid uuid, task_type_param text)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  plan_amount DECIMAL;
  reward_amount DECIMAL;
  current_balance DECIMAL;
BEGIN
  -- Check if task already completed today
  IF EXISTS (
    SELECT 1 FROM public.task_completions 
    WHERE user_id = user_uuid 
      AND task_type = task_type_param 
      AND task_date = CURRENT_DATE
  ) THEN
    RAISE EXCEPTION 'Task already completed today';
  END IF;
  
  -- Get user's plan amount
  plan_amount := public.get_user_plan_amount(user_uuid);
  
  IF plan_amount = 0 THEN
    RAISE EXCEPTION 'No active subscription plan found';
  END IF;
  
  -- Calculate reward
  reward_amount := public.calculate_task_reward(plan_amount, task_type_param);
  
  IF reward_amount = 0 THEN
    RAISE EXCEPTION 'Invalid task type or plan';
  END IF;
  
  -- Create task completion record
  INSERT INTO public.task_completions (
    user_id, 
    task_type, 
    task_date, 
    reward_amount
  ) VALUES (
    user_uuid,
    task_type_param,
    CURRENT_DATE,
    reward_amount
  );
  
  -- Update user's available balance
  INSERT INTO public.user_balances (user_id, available_balance, total_earned)
  VALUES (user_uuid, reward_amount, reward_amount)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    available_balance = user_balances.available_balance + reward_amount,
    total_earned = user_balances.total_earned + reward_amount,
    updated_at = NOW();
  
  -- Get current balance for transaction record
  SELECT available_balance INTO current_balance
  FROM public.user_balances
  WHERE user_id = user_uuid;
  
  -- Add transaction record
  INSERT INTO public.balance_transactions (
    user_id,
    transaction_type,
    amount,
    balance_before,
    balance_after,
    reference_id,
    reference_table,
    description
  )
  SELECT 
    user_uuid,
    'task_reward',
    reward_amount,
    current_balance - reward_amount,
    current_balance,
    tc.id,
    'task_completions',
    'Task completion reward for ' || task_type_param
  FROM public.task_completions tc
  WHERE tc.user_id = user_uuid 
    AND tc.task_type = task_type_param 
    AND tc.task_date = CURRENT_DATE
  ORDER BY tc.created_at DESC
  LIMIT 1;
  
  RETURN reward_amount;
END;
$function$;