-- Fix foreign key relationships to prevent ambiguous joins
-- Add proper foreign keys for user_responses table

-- Add foreign keys for user_responses table
ALTER TABLE public.user_responses 
ADD CONSTRAINT fk_user_responses_user_id 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.user_responses 
ADD CONSTRAINT fk_user_responses_question_id 
FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;

ALTER TABLE public.user_responses 
ADD CONSTRAINT fk_user_responses_daily_task_id 
FOREIGN KEY (daily_task_id) REFERENCES public.daily_tasks(id) ON DELETE CASCADE;

-- Add foreign keys for questions table
ALTER TABLE public.questions 
ADD CONSTRAINT fk_questions_daily_task_id 
FOREIGN KEY (daily_task_id) REFERENCES public.daily_tasks(id) ON DELETE CASCADE;

-- Add foreign keys for payment_submissions table
ALTER TABLE public.payment_submissions 
ADD CONSTRAINT fk_payment_submissions_user_id 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.payment_submissions 
ADD CONSTRAINT fk_payment_submissions_subscription_plan_id 
FOREIGN KEY (subscription_plan_id) REFERENCES public.subscription_plans(id) ON DELETE CASCADE;

ALTER TABLE public.payment_submissions 
ADD CONSTRAINT fk_payment_submissions_user_application_id 
FOREIGN KEY (user_application_id) REFERENCES public.user_applications(id) ON DELETE SET NULL;

-- Add foreign keys for user_applications table  
ALTER TABLE public.user_applications 
ADD CONSTRAINT fk_user_applications_user_id 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.user_applications 
ADD CONSTRAINT fk_user_applications_subscription_plan_id 
FOREIGN KEY (subscription_plan_id) REFERENCES public.subscription_plans(id) ON DELETE CASCADE;

-- Add foreign key for user_plan_selections table
ALTER TABLE public.user_plan_selections 
ADD CONSTRAINT fk_user_plan_selections_user_id 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add foreign key for daily_tasks created_by field
ALTER TABLE public.daily_tasks 
ADD CONSTRAINT fk_daily_tasks_created_by 
FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;