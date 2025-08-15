-- Fix security vulnerabilities in profiles table RLS policies

-- Drop existing overly permissive INSERT policies
DROP POLICY IF EXISTS "Allow profile creation" ON public.profiles;
DROP POLICY IF EXISTS "Allow trigger function to create profiles" ON public.profiles;

-- Create a more secure function to check if current context is a trigger
CREATE OR REPLACE FUNCTION public.is_trigger_context()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Check if we're in a trigger context by looking at transaction characteristics
  -- This is a more secure way to allow trigger-based inserts
  RETURN current_setting('application_name', true) = 'supabase_auth_admin';
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$;

-- Create more restrictive INSERT policies
CREATE POLICY "Users can only create their own profile" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = id);

-- Allow system/trigger to create profiles (for user registration)
CREATE POLICY "System can create profiles during registration" 
ON public.profiles 
FOR INSERT 
TO service_role
WITH CHECK (true);

-- Enhance UPDATE policy with additional security checks
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile with validation" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND 
  -- Prevent users from changing their own ID
  id = (SELECT id FROM public.profiles WHERE id = auth.uid()) AND
  -- Basic email validation
  email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
);

-- Add audit logging for profile changes
CREATE TABLE IF NOT EXISTS public.profile_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL,
  action TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  changed_by UUID,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ip_address INET
);

-- Enable RLS on audit log
ALTER TABLE public.profile_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs" 
ON public.profile_audit_log 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create audit trigger function
CREATE OR REPLACE FUNCTION public.profile_audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO public.profile_audit_log (
      profile_id, 
      action, 
      old_values, 
      new_values, 
      changed_by
    ) VALUES (
      NEW.id,
      'UPDATE',
      to_jsonb(OLD),
      to_jsonb(NEW),
      auth.uid()
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.profile_audit_log (
      profile_id, 
      action, 
      old_values, 
      changed_by
    ) VALUES (
      OLD.id,
      'DELETE',
      to_jsonb(OLD),
      auth.uid()
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create audit trigger
DROP TRIGGER IF EXISTS profile_audit_trigger ON public.profiles;
CREATE TRIGGER profile_audit_trigger
  AFTER UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profile_audit_trigger();

-- Add indexes for better performance and security
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profile_audit_log_profile_id ON public.profile_audit_log(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_audit_log_changed_at ON public.profile_audit_log(changed_at);

-- Add data validation constraints
ALTER TABLE public.profiles 
ADD CONSTRAINT IF NOT EXISTS valid_email 
CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

ALTER TABLE public.profiles 
ADD CONSTRAINT IF NOT EXISTS valid_phone 
CHECK (phone IS NULL OR phone ~ '^\+?[1-9]\d{1,14}$');

-- Ensure updated_at is automatically updated
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();