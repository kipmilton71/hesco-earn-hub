-- Drop the incorrect unique constraint that doesn't include question_id
DROP INDEX IF EXISTS public.user_responses_daily_unique;

-- Create correct unique constraint that includes question_id
-- This allows multiple responses per task (one per question) but prevents duplicate responses for the same question
CREATE UNIQUE INDEX user_responses_daily_unique 
ON public.user_responses(user_id, question_id, daily_task_id, submitted_date);

-- Add comment explaining the constraint
COMMENT ON INDEX public.user_responses_daily_unique IS 'Ensures one response per user per question per task per day';