-- Drop the problematic unique constraint entirely
DROP INDEX IF EXISTS public.user_responses_daily_unique;

-- We'll rely on task_completions table to prevent duplicate submissions per day
-- No unique constraint needed on user_responses since multiple questions per task are allowed