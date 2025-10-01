-- First, delete duplicate responses (keep only the most recent one per user per task per day)
DELETE FROM public.user_responses
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, daily_task_id, created_at::date) id
  FROM public.user_responses
  ORDER BY user_id, daily_task_id, created_at::date, created_at DESC
);

-- Add submitted_date column
ALTER TABLE public.user_responses 
ADD COLUMN IF NOT EXISTS submitted_date DATE NOT NULL DEFAULT CURRENT_DATE;

-- Update existing records to use their created_at date
UPDATE public.user_responses 
SET submitted_date = created_at::date 
WHERE submitted_date = CURRENT_DATE;

-- Create unique constraint for one submission per user per task per day
CREATE UNIQUE INDEX IF NOT EXISTS user_responses_daily_unique 
ON public.user_responses(user_id, daily_task_id, submitted_date);

-- Add comment
COMMENT ON COLUMN public.user_responses.submitted_date IS 'Date when the response was submitted, allows daily submissions';