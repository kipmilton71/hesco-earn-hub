-- Fix ambiguous column reference by renaming variables
CREATE OR REPLACE FUNCTION public.process_task_completion(user_uuid uuid, task_type_param text)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  plan_amount DECIMAL;
  calculated_reward DECIMAL;  -- Renamed from reward_amount
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
  calculated_reward := public.calculate_task_reward(plan_amount, task_type_param);
  
  IF calculated_reward = 0 THEN
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
    calculated_reward
  );
  
  -- Update user's available balance
  INSERT INTO public.user_balances (user_id, available_balance, total_earned)
  VALUES (user_uuid, calculated_reward, calculated_reward)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    available_balance = user_balances.available_balance + calculated_reward,
    total_earned = user_balances.total_earned + calculated_reward,
    updated_at = NOW();
  
  -- Get current balance for transaction record
  SELECT ub.available_balance INTO current_balance
  FROM public.user_balances ub
  WHERE ub.user_id = user_uuid;
  
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
    calculated_reward,  -- Using renamed variable
    current_balance - calculated_reward,
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
  
  RETURN calculated_reward;
END;
$function$;