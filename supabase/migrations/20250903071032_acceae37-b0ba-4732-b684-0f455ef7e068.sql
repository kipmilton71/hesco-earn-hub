-- Fix the payment_submissions table to properly link to user_applications
ALTER TABLE public.payment_submissions 
ADD COLUMN IF NOT EXISTS user_application_id UUID REFERENCES public.user_applications(id) ON DELETE CASCADE;

-- Update existing payment_submissions to link them to their applications
UPDATE public.payment_submissions 
SET user_application_id = (
  SELECT ua.id 
  FROM public.user_applications ua 
  WHERE ua.user_id = payment_submissions.user_id 
    AND ua.subscription_plan_id = payment_submissions.subscription_plan_id
  LIMIT 1
)
WHERE user_application_id IS NULL;

-- Create a function to automatically link new payments to applications
CREATE OR REPLACE FUNCTION public.link_payment_to_application()
RETURNS TRIGGER AS $$
BEGIN
  -- Find the matching application for this payment
  SELECT id INTO NEW.user_application_id
  FROM public.user_applications
  WHERE user_id = NEW.user_id
    AND subscription_plan_id = NEW.subscription_plan_id
    AND status = 'pending'
  ORDER BY created_at DESC
  LIMIT 1;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically link payments to applications
DROP TRIGGER IF EXISTS auto_link_payment_to_application ON public.payment_submissions;
CREATE TRIGGER auto_link_payment_to_application
  BEFORE INSERT ON public.payment_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.link_payment_to_application();