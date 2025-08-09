-- Ensure payment_submissions table has proper status values
ALTER TABLE public.payment_submissions 
DROP CONSTRAINT IF EXISTS payment_submissions_status_check;

ALTER TABLE public.payment_submissions 
ADD CONSTRAINT payment_submissions_status_check 
CHECK (status IN ('pending', 'verified', 'rejected'));

-- Ensure user_applications table has proper status values
ALTER TABLE public.user_applications 
DROP CONSTRAINT IF EXISTS user_applications_status_check;

ALTER TABLE public.user_applications 
ADD CONSTRAINT user_applications_status_check 
CHECK (status IN ('pending', 'approved', 'rejected', 'suspended'));

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_applications_user_id ON public.user_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_applications_status ON public.user_applications(status);
CREATE INDEX IF NOT EXISTS idx_payment_submissions_user_id ON public.payment_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_submissions_status ON public.payment_submissions(status);

-- Add RLS policies for payment_submissions if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'payment_submissions' 
        AND policyname = 'Users can view their own payments'
    ) THEN
        CREATE POLICY "Users can view their own payments" ON public.payment_submissions
          FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'payment_submissions' 
        AND policyname = 'Users can create their own payments'
    ) THEN
        CREATE POLICY "Users can create their own payments" ON public.payment_submissions
          FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'payment_submissions' 
        AND policyname = 'Admins can view all payments'
    ) THEN
        CREATE POLICY "Admins can view all payments" ON public.payment_submissions
          FOR ALL USING (public.has_role(auth.uid(), 'admin'));
    END IF;
END $$;

-- Add RLS policies for user_applications if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_applications' 
        AND policyname = 'Users can view their own applications'
    ) THEN
        CREATE POLICY "Users can view their own applications" ON public.user_applications
          FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_applications' 
        AND policyname = 'Users can create their own applications'
    ) THEN
        CREATE POLICY "Users can create their own applications" ON public.user_applications
          FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_applications' 
        AND policyname = 'Admins can view all applications'
    ) THEN
        CREATE POLICY "Admins can view all applications" ON public.user_applications
          FOR ALL USING (public.has_role(auth.uid(), 'admin'));
    END IF;
END $$; 