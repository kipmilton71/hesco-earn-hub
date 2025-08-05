-- Add missing foreign key constraints
ALTER TABLE public.user_applications 
ADD CONSTRAINT fk_user_applications_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.user_applications 
ADD CONSTRAINT fk_user_applications_subscription_plan_id 
FOREIGN KEY (subscription_plan_id) REFERENCES public.subscription_plans(id) ON DELETE CASCADE;

ALTER TABLE public.payment_submissions 
ADD CONSTRAINT fk_payment_submissions_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.payment_submissions 
ADD CONSTRAINT fk_payment_submissions_subscription_plan_id 
FOREIGN KEY (subscription_plan_id) REFERENCES public.subscription_plans(id) ON DELETE CASCADE;

-- Add foreign key relationship between user_applications and payment_submissions
ALTER TABLE public.payment_submissions 
ADD COLUMN user_application_id UUID REFERENCES public.user_applications(id) ON DELETE CASCADE;