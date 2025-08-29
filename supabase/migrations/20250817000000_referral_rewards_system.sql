-- Referral and Rewards System Migration
-- This migration implements the complete referral, rewards, and withdrawal system

-- First, create the has_role function that's missing
CREATE OR REPLACE FUNCTION public.has_role(user_uuid UUID, role_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- For now, we'll use a simple check - you can modify this based on your admin system
  -- Option 1: Check if user has admin role in user_roles table (if you have one)
  -- Option 2: Check specific admin user IDs
  -- Option 3: Use a simple email-based check
  
  -- For now, let's use a simple approach - you can modify this later
  RETURN EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = user_uuid 
    AND email IN ('admin@hesco.com', 'your-admin-email@example.com') -- Add your admin emails here
  );
END;
$$;

-- Create user_balances table to track plan balance and available balance
CREATE TABLE public.user_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_balance DECIMAL(10,2) NOT NULL DEFAULT 0, -- Locked subscription balance
  available_balance DECIMAL(10,2) NOT NULL DEFAULT 0, -- Withdrawable balance
  total_earned DECIMAL(10,2) NOT NULL DEFAULT 0, -- Total lifetime earnings
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create referrals table to track referral relationships
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  referred_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  level INTEGER NOT NULL CHECK (level >= 1 AND level <= 3), -- 1st, 2nd, 3rd level
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(referred_id), -- Each user can only be referred once
  UNIQUE(referrer_id, referred_id)
);

-- Create referral_rewards table to track referral earnings
CREATE TABLE public.referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  referred_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  referral_level INTEGER NOT NULL CHECK (referral_level >= 1 AND referral_level <= 3),
  referred_plan_amount DECIMAL(10,2) NOT NULL, -- Plan amount of the referred user
  reward_amount DECIMAL(10,2) NOT NULL, -- Amount earned from this referral
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create video_links table for video tasks
CREATE TABLE public.video_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create task_completions table to track daily task completions
CREATE TABLE public.task_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  task_type TEXT NOT NULL CHECK (task_type IN ('video', 'survey')),
  task_date DATE NOT NULL,
  reward_amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'cancelled')),
  video_link_id UUID REFERENCES public.video_links(id), -- For video tasks
  daily_task_id UUID REFERENCES public.daily_tasks(id), -- For survey tasks
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, task_type, task_date) -- Prevent duplicate completions per day
);

-- Create withdrawal_requests table
CREATE TABLE public.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) NOT NULL, -- 15% tax
  net_amount DECIMAL(10,2) NOT NULL, -- Amount after tax
  mpesa_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
  processed_by UUID REFERENCES auth.users(id),
  processed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create balance_transactions table for audit trail
CREATE TABLE public.balance_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('referral_reward', 'task_reward', 'withdrawal', 'subscription_payment')),
  amount DECIMAL(10,2) NOT NULL,
  balance_before DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,
  reference_id UUID, -- ID of related record (referral_reward, task_completion, etc.)
  reference_table TEXT, -- Table name for the reference
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all new tables
ALTER TABLE public.user_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balance_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_balances
CREATE POLICY "Users can view their own balance" ON public.user_balances
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all balances" ON public.user_balances
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for referrals
CREATE POLICY "Users can view their own referrals" ON public.referrals
  FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE POLICY "Users can create referrals" ON public.referrals
  FOR INSERT WITH CHECK (auth.uid() = referrer_id);

CREATE POLICY "Admins can view all referrals" ON public.referrals
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for referral_rewards
CREATE POLICY "Users can view their own referral rewards" ON public.referral_rewards
  FOR SELECT USING (auth.uid() = referrer_id);

CREATE POLICY "Admins can view all referral rewards" ON public.referral_rewards
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for video_links
CREATE POLICY "Admins can manage video links" ON public.video_links
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view active video links" ON public.video_links
  FOR SELECT USING (is_active = true);

-- RLS Policies for task_completions
CREATE POLICY "Users can view their own task completions" ON public.task_completions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own task completions" ON public.task_completions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all task completions" ON public.task_completions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for withdrawal_requests
CREATE POLICY "Users can view their own withdrawal requests" ON public.withdrawal_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own withdrawal requests" ON public.withdrawal_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all withdrawal requests" ON public.withdrawal_requests
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for balance_transactions
CREATE POLICY "Users can view their own transactions" ON public.balance_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all transactions" ON public.balance_transactions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Create indexes for better performance
CREATE INDEX idx_user_balances_user_id ON public.user_balances(user_id);
CREATE INDEX idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX idx_referrals_referred_id ON public.referrals(referred_id);
CREATE INDEX idx_referral_rewards_referrer_id ON public.referral_rewards(referrer_id);
CREATE INDEX idx_video_links_active ON public.video_links(is_active);
CREATE INDEX idx_task_completions_user_id ON public.task_completions(user_id);
CREATE INDEX idx_task_completions_date ON public.task_completions(task_date);
CREATE INDEX idx_withdrawal_requests_user_id ON public.withdrawal_requests(user_id);
CREATE INDEX idx_withdrawal_requests_status ON public.withdrawal_requests(status);
CREATE INDEX idx_balance_transactions_user_id ON public.balance_transactions(user_id);

-- Create function to calculate referral rewards based on plan
CREATE OR REPLACE FUNCTION public.calculate_referral_reward(
  plan_amount DECIMAL,
  referral_level INTEGER
)
RETURNS DECIMAL
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN CASE 
    WHEN plan_amount = 500 THEN
      CASE referral_level
        WHEN 1 THEN 25
        WHEN 2 THEN 15
        WHEN 3 THEN 5
        ELSE 0
      END
    WHEN plan_amount = 1000 THEN
      CASE referral_level
        WHEN 1 THEN 50
        WHEN 2 THEN 30
        WHEN 3 THEN 15
        ELSE 0
      END
    WHEN plan_amount = 2000 THEN
      CASE referral_level
        WHEN 1 THEN 100
        WHEN 2 THEN 75
        WHEN 3 THEN 50
        ELSE 0
      END
    WHEN plan_amount = 5000 THEN
      CASE referral_level
        WHEN 1 THEN 200
        WHEN 2 THEN 150
        WHEN 3 THEN 100
        ELSE 0
      END
    ELSE 0
  END;
END;
$$;

-- Create function to calculate task rewards based on plan
CREATE OR REPLACE FUNCTION public.calculate_task_reward(
  plan_amount DECIMAL,
  task_type TEXT
)
RETURNS DECIMAL
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN CASE 
    WHEN plan_amount = 500 THEN
      CASE task_type
        WHEN 'video' THEN 15
        WHEN 'survey' THEN 10
        ELSE 0
      END
    WHEN plan_amount = 1000 THEN
      CASE task_type
        WHEN 'video' THEN 30
        WHEN 'survey' THEN 20
        ELSE 0
      END
    WHEN plan_amount = 2000 THEN
      CASE task_type
        WHEN 'video' THEN 50
        WHEN 'survey' THEN 25
        ELSE 0
      END
    WHEN plan_amount = 5000 THEN
      CASE task_type
        WHEN 'video' THEN 70
        WHEN 'survey' THEN 30
        ELSE 0
      END
    ELSE 0
  END;
END;
$$;

-- Create function to get user's current plan amount
CREATE OR REPLACE FUNCTION public.get_user_plan_amount(user_uuid UUID)
RETURNS DECIMAL
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  plan_amount DECIMAL;
BEGIN
  SELECT sp.price INTO plan_amount
  FROM public.user_applications ua
  JOIN public.subscription_plans sp ON ua.subscription_plan_id = sp.id
  WHERE ua.user_id = user_uuid 
    AND ua.status = 'approved'
  ORDER BY ua.created_at DESC
  LIMIT 1;
  
  RETURN COALESCE(plan_amount, 0);
END;
$$;

-- Create function to process referral rewards
CREATE OR REPLACE FUNCTION public.process_referral_rewards(referred_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  referrer_record RECORD;
  plan_amount DECIMAL;
  reward_amount DECIMAL;
  current_level INTEGER;
  parent_id UUID;
BEGIN
  -- Get the referred user's plan amount
  plan_amount := public.get_user_plan_amount(referred_user_id);
  
  IF plan_amount = 0 THEN
    RETURN; -- No plan, no rewards
  END IF;
  
  -- Process rewards for up to 3 levels
  current_level := 1;
  parent_id := referred_user_id;
  
  WHILE current_level <= 3 LOOP
    -- Find the referrer at this level
    SELECT referrer_id INTO parent_id
    FROM public.referrals
    WHERE referred_id = parent_id AND status = 'active'
    LIMIT 1;
    
    IF parent_id IS NULL THEN
      EXIT; -- No more referrers in the chain
    END IF;
    
    -- Calculate reward for this level
    reward_amount := public.calculate_referral_reward(plan_amount, current_level);
    
    IF reward_amount > 0 THEN
      -- Create referral reward record
      INSERT INTO public.referral_rewards (
        referrer_id, 
        referred_id, 
        referral_level, 
        referred_plan_amount, 
        reward_amount
      ) VALUES (
        parent_id,
        referred_user_id,
        current_level,
        plan_amount,
        reward_amount
      );
      
      -- Update referrer's available balance
      INSERT INTO public.user_balances (user_id, available_balance, total_earned)
      VALUES (parent_id, reward_amount, reward_amount)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        available_balance = user_balances.available_balance + reward_amount,
        total_earned = user_balances.total_earned + reward_amount,
        updated_at = NOW();
      
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
        parent_id,
        'referral_reward',
        reward_amount,
        ub.available_balance - reward_amount,
        ub.available_balance,
        rr.id,
        'referral_rewards',
        'Referral reward for level ' || current_level || ' referral'
      FROM public.user_balances ub
      CROSS JOIN public.referral_rewards rr
      WHERE ub.user_id = parent_id 
        AND rr.referrer_id = parent_id 
        AND rr.referred_id = referred_user_id
        AND rr.referral_level = current_level
      ORDER BY rr.created_at DESC
      LIMIT 1;
    END IF;
    
    current_level := current_level + 1;
  END LOOP;
END;
$$;

-- Create function to process task completion
CREATE OR REPLACE FUNCTION public.process_task_completion(
  user_uuid UUID,
  task_type_param TEXT,
  video_link_id_param UUID DEFAULT NULL,
  daily_task_id_param UUID DEFAULT NULL
)
RETURNS DECIMAL
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
    reward_amount,
    video_link_id,
    daily_task_id
  ) VALUES (
    user_uuid,
    task_type_param,
    CURRENT_DATE,
    reward_amount,
    video_link_id_param,
    daily_task_id_param
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
$$;

-- Create function to process withdrawal request
CREATE OR REPLACE FUNCTION public.process_withdrawal_request(
  user_uuid UUID,
  amount_param DECIMAL,
  mpesa_number_param TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  plan_amount DECIMAL;
  available_balance DECIMAL;
  max_withdrawal DECIMAL;
  tax_amount DECIMAL;
  net_amount DECIMAL;
  withdrawal_id UUID;
  current_balance DECIMAL;
BEGIN
  -- Get user's plan amount and current balance
  plan_amount := public.get_user_plan_amount(user_uuid);
  
  SELECT available_balance INTO available_balance
  FROM public.user_balances
  WHERE user_id = user_uuid;
  
  available_balance := COALESCE(available_balance, 0);
  
  -- Check if it's Saturday (withdrawal day)
  IF EXTRACT(DOW FROM CURRENT_DATE) != 6 THEN
    RAISE EXCEPTION 'Withdrawals are only allowed on Saturdays';
  END IF;
  
  -- Calculate maximum withdrawal based on plan
  max_withdrawal := CASE 
    WHEN plan_amount = 500 THEN 125
    WHEN plan_amount = 1000 THEN 250
    WHEN plan_amount = 2000 THEN 325
    WHEN plan_amount = 5000 THEN 500
    ELSE 0
  END;
  
  -- Add all earned from daily tasks
  max_withdrawal := max_withdrawal + available_balance;
  
  -- Validate withdrawal amount
  IF amount_param > max_withdrawal THEN
    RAISE EXCEPTION 'Withdrawal amount exceeds maximum allowed';
  END IF;
  
  IF amount_param > available_balance THEN
    RAISE EXCEPTION 'Insufficient available balance';
  END IF;
  
  -- Calculate tax and net amount
  tax_amount := amount_param * 0.15;
  net_amount := amount_param - tax_amount;
  
  -- Create withdrawal request
  INSERT INTO public.withdrawal_requests (
    user_id,
    amount,
    tax_amount,
    net_amount,
    mpesa_number
  ) VALUES (
    user_uuid,
    amount_param,
    tax_amount,
    net_amount,
    mpesa_number_param
  ) RETURNING id INTO withdrawal_id;
  
  -- Deduct from available balance
  UPDATE public.user_balances
  SET available_balance = available_balance - amount_param,
      updated_at = NOW()
  WHERE user_id = user_uuid;
  
  -- Get updated balance for transaction record
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
  ) VALUES (
    user_uuid,
    'withdrawal',
    -amount_param,
    available_balance,
    current_balance,
    withdrawal_id,
    'withdrawal_requests',
    'Withdrawal request - Net: ' || net_amount || ' KSh'
  );
  
  RETURN withdrawal_id;
END;
$$;

-- Create trigger to automatically process referral rewards when a user gets approved
CREATE OR REPLACE FUNCTION public.trigger_referral_rewards()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    PERFORM public.process_referral_rewards(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER user_application_approved_trigger
  AFTER UPDATE ON public.user_applications
  FOR EACH ROW EXECUTE FUNCTION public.trigger_referral_rewards();

-- Create trigger to update user_balances when subscription payment is verified
CREATE OR REPLACE FUNCTION public.trigger_subscription_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  plan_amount DECIMAL;
BEGIN
  IF NEW.status = 'verified' AND OLD.status != 'verified' THEN
    -- Get plan amount
    SELECT sp.price INTO plan_amount
    FROM public.subscription_plans sp
    WHERE sp.id = NEW.subscription_plan_id;
    
    -- Update user's plan balance
    INSERT INTO public.user_balances (user_id, plan_balance, total_earned)
    VALUES (NEW.user_id, plan_amount, plan_amount)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      plan_balance = user_balances.plan_balance + plan_amount,
      total_earned = user_balances.total_earned + plan_amount,
      updated_at = NOW();
    
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
      NEW.user_id,
      'subscription_payment',
      plan_amount,
      ub.plan_balance - plan_amount,
      ub.plan_balance,
      NEW.id,
      'payment_submissions',
      'Subscription payment for plan ' || plan_amount || ' KSh'
    FROM public.user_balances ub
    WHERE ub.user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER payment_submission_verified_trigger
  AFTER UPDATE ON public.payment_submissions
  FOR EACH ROW EXECUTE FUNCTION public.trigger_subscription_payment();

-- Update existing subscription plans to match the new system
UPDATE public.subscription_plans 
SET name = 'Plan 500', price = 500, features = ARRAY['Video: 15sh daily', 'Survey: 10sh daily', 'Withdrawal: 125sh + earnings on Saturdays']
WHERE price = 1000;

UPDATE public.subscription_plans 
SET name = 'Plan 1000', price = 1000, features = ARRAY['Video: 30sh daily', 'Survey: 20sh daily', 'Withdrawal: 250sh + earnings on Saturdays']
WHERE price = 5000;

UPDATE public.subscription_plans 
SET name = 'Plan 2000', price = 2000, features = ARRAY['Video: 50sh daily', 'Survey: 25sh daily', 'Withdrawal: 325sh + earnings on Saturdays']
WHERE price = 15000;

-- Insert Plan 5000 if it doesn't exist
INSERT INTO public.subscription_plans (name, price, currency, duration_months, features, is_popular, is_active)
SELECT 'Plan 5000', 5000, 'KSh', 1, ARRAY['Video: 70sh daily', 'Survey: 30sh daily', 'Withdrawal: 500sh + earnings on Saturdays'], false, true
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_plans WHERE price = 5000);

-- Insert some default video links
INSERT INTO public.video_links (title, description, video_url, duration_minutes, created_by)
SELECT 
  'Welcome to Hesco Earn Hub',
  'Learn about our platform and how to earn money daily',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  2,
  (SELECT id FROM auth.users WHERE email = 'kipmilton71@gmail.com' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM public.video_links WHERE title = 'Welcome to Hesco Earn Hub');
