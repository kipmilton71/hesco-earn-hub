-- Drop ALL unique constraints on user_responses table
ALTER TABLE public.user_responses 
DROP CONSTRAINT IF EXISTS user_responses_user_id_question_id_daily_task_id_key;

DROP INDEX IF EXISTS user_responses_daily_unique;

-- Create a secure function to handle task completion and balance updates
CREATE OR REPLACE FUNCTION public.complete_task_and_update_balance(
  p_user_id uuid,
  p_task_type text,
  p_task_date date,
  p_reward_amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance_record user_balances%ROWTYPE;
  v_completion_id uuid;
BEGIN
  -- Check if task already completed today
  IF EXISTS (
    SELECT 1 FROM task_completions 
    WHERE user_id = p_user_id 
    AND task_type = p_task_type 
    AND task_date = p_task_date
  ) THEN
    RAISE EXCEPTION 'Task already completed today';
  END IF;

  -- Insert task completion
  INSERT INTO task_completions (user_id, task_type, task_date, reward_amount)
  VALUES (p_user_id, p_task_type, p_task_date, p_reward_amount)
  RETURNING id INTO v_completion_id;

  -- Get or create user balance
  SELECT * INTO v_balance_record
  FROM user_balances
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    -- Create new balance record
    INSERT INTO user_balances (user_id, available_balance, total_earned, plan_balance)
    VALUES (p_user_id, p_reward_amount, p_reward_amount, 0)
    RETURNING * INTO v_balance_record;
  ELSE
    -- Update existing balance
    UPDATE user_balances
    SET 
      available_balance = available_balance + p_reward_amount,
      total_earned = total_earned + p_reward_amount,
      updated_at = now()
    WHERE user_id = p_user_id
    RETURNING * INTO v_balance_record;
  END IF;

  -- Insert balance transaction
  INSERT INTO balance_transactions (
    user_id,
    transaction_type,
    amount,
    balance_before,
    balance_after,
    description,
    reference_table,
    reference_id
  )
  VALUES (
    p_user_id,
    'task_reward',
    p_reward_amount,
    v_balance_record.available_balance - p_reward_amount,
    v_balance_record.available_balance,
    p_task_type || ' task completion reward',
    'task_completions',
    v_completion_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'completion_id', v_completion_id,
    'new_balance', v_balance_record.available_balance
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.complete_task_and_update_balance TO authenticated;