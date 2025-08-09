-- Create user_plan_selections table
CREATE TABLE public.user_plan_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  selected_plan TEXT NOT NULL,
  selected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on user_plan_selections table
ALTER TABLE public.user_plan_selections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_plan_selections
CREATE POLICY "Users can view their own plan selections" ON public.user_plan_selections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own plan selections" ON public.user_plan_selections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all plan selections" ON public.user_plan_selections
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Update existing plans to match the new requirements
UPDATE public.subscription_plans SET is_active = false WHERE name IN ('Basic Plan', 'Premium Plan', 'Enterprise Plan');

-- Insert new plans
INSERT INTO public.subscription_plans (name, price, currency, duration_months, features, is_popular, is_active) VALUES
('Starter', 500, 'KES', 1, ARRAY[
  'Basic task access',
  '1-level referral earnings',
  'Weekly payouts',
  'WhatsApp support',
  'Basic training materials'
], false, true),

('Amateur', 1000, 'KES', 1, ARRAY[
  'More task opportunities',
  '2-level referral earnings',
  'Bi-weekly payouts',
  'Priority support',
  'Advanced training',
  'Bonus challenges'
], false, true),

('Pro', 2000, 'KES', 1, ARRAY[
  'Premium task access',
  '3-level referral earnings',
  'Daily payouts',
  'Dedicated support',
  'Pro training modules',
  'Exclusive bonuses',
  'Team building tools'
], true, true),

('Elite', 5000, 'KES', 1, ARRAY[
  'All premium features',
  'Maximum referral levels',
  'Instant payouts',
  'VIP support',
  'Leadership training',
  'Monthly bonuses',
  'Advanced analytics',
  'Personal mentor'
], false, true);