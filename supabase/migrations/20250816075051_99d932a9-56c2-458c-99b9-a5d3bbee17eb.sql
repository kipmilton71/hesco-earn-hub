-- Fix foreign key relationships for better data integrity and joins

-- Add foreign key constraints to establish proper relationships
ALTER TABLE user_applications 
ADD CONSTRAINT user_applications_subscription_plan_id_fkey 
FOREIGN KEY (subscription_plan_id) REFERENCES subscription_plans(id) ON DELETE RESTRICT;

ALTER TABLE user_applications 
ADD CONSTRAINT user_applications_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE payment_submissions 
ADD CONSTRAINT payment_submissions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE payment_submissions 
ADD CONSTRAINT payment_submissions_subscription_plan_id_fkey 
FOREIGN KEY (subscription_plan_id) REFERENCES subscription_plans(id) ON DELETE RESTRICT;

ALTER TABLE payment_submissions 
ADD CONSTRAINT payment_submissions_user_application_id_fkey 
FOREIGN KEY (user_application_id) REFERENCES user_applications(id) ON DELETE SET NULL;

ALTER TABLE questions 
ADD CONSTRAINT questions_daily_task_id_fkey 
FOREIGN KEY (daily_task_id) REFERENCES daily_tasks(id) ON DELETE CASCADE;

ALTER TABLE user_responses 
ADD CONSTRAINT user_responses_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE user_responses 
ADD CONSTRAINT user_responses_question_id_fkey 
FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE;

ALTER TABLE user_responses 
ADD CONSTRAINT user_responses_daily_task_id_fkey 
FOREIGN KEY (daily_task_id) REFERENCES daily_tasks(id) ON DELETE CASCADE;

ALTER TABLE user_plan_selections 
ADD CONSTRAINT user_plan_selections_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;