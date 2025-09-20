-- Fix function search paths for security compliance

-- Update handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'phone', NULL)
  );
  
  -- Assign role (admin for kipmilton71@gmail.com, customer for others)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    CASE 
      WHEN NEW.email = 'kipmilton71@gmail.com' THEN 'admin'::app_role
      ELSE 'customer'::app_role
    END
  );
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
  RAISE;
END;
$$;

-- Update has_role function  
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Update get_current_user_role function
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT role::TEXT FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Update calculate_referral_reward function  
CREATE OR REPLACE FUNCTION public.calculate_referral_reward(plan_amount numeric, referral_level integer)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $$
BEGIN
  RETURN CASE 
    WHEN plan_amount = 500 THEN
      CASE referral_level
        WHEN 1 THEN 25
        WHEN 2 THEN 15
        WHEN 3 THEN 5
        ELSE 0
      END
    WHEN plan_amount = 1000 THEN
      CASE referral_level
        WHEN 1 THEN 50
        WHEN 2 THEN 30
        WHEN 3 THEN 15
        ELSE 0
      END
    WHEN plan_amount = 2000 THEN
      CASE referral_level
        WHEN 1 THEN 100
        WHEN 2 THEN 75
        WHEN 3 THEN 50
        ELSE 0
      END
    WHEN plan_amount = 5000 THEN
      CASE referral_level
        WHEN 1 THEN 200
        WHEN 2 THEN 150
        WHEN 3 THEN 100
        ELSE 0
      END
    ELSE 0
  END;
END;
$$;

-- Update calculate_task_reward function
CREATE OR REPLACE FUNCTION public.calculate_task_reward(plan_amount numeric, task_type text)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $$
BEGIN
  RETURN CASE 
    WHEN plan_amount = 500 THEN
      CASE task_type
        WHEN 'video' THEN 15
        WHEN 'survey' THEN 10
        ELSE 0
      END
    WHEN plan_amount = 1000 THEN
      CASE task_type
        WHEN 'video' THEN 30
        WHEN 'survey' THEN 20
        ELSE 0
      END
    WHEN plan_amount = 2000 THEN
      CASE task_type
        WHEN 'video' THEN 50
        WHEN 'survey' THEN 25
        ELSE 0
      END
    WHEN plan_amount = 5000 THEN
      CASE task_type
        WHEN 'video' THEN 70
        WHEN 'survey' THEN 30
        ELSE 0
      END
    ELSE 0
  END;
END;
$$;

-- Update get_user_plan_amount function
CREATE OR REPLACE FUNCTION public.get_user_plan_amount(user_uuid uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  plan_amount DECIMAL;
BEGIN
  SELECT sp.price INTO plan_amount
  FROM public.user_applications ua
  JOIN public.subscription_plans sp ON ua.subscription_plan_id = sp.id
  WHERE ua.user_id = user_uuid 
    AND ua.status = 'approved'
  ORDER BY ua.created_at DESC
  LIMIT 1;
  
  RETURN COALESCE(plan_amount, 0);
END;
$$;