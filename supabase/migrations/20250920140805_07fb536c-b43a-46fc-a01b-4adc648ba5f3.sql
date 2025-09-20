-- Fix search path for all remaining functions that need it
CREATE OR REPLACE FUNCTION public.link_payment_to_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.trigger_referral_rewards()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    PERFORM public.process_referral_rewards(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trigger_subscription_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  plan_amount DECIMAL;
BEGIN
  IF NEW.status = 'verified' AND OLD.status != 'verified' THEN
    -- Get plan amount
    SELECT sp.price INTO plan_amount
    FROM public.subscription_plans sp
    WHERE sp.id = NEW.subscription_plan_id;
    
    -- Update user's plan balance
    INSERT INTO public.user_balances (user_id, plan_balance, total_earned)
    VALUES (NEW.user_id, plan_amount, plan_amount)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      plan_balance = user_balances.plan_balance + plan_amount,
      total_earned = user_balances.total_earned + plan_amount,
      updated_at = NOW();
    
    -- Add transaction record
    INSERT INTO public.balance_transactions (
      user_id,
      transaction_type,
      amount,
      balance_before,
      balance_after,
      reference_id,
      reference_table,
      description
    )
    SELECT 
      NEW.user_id,
      'subscription_payment',
      plan_amount,
      ub.plan_balance - plan_amount,
      ub.plan_balance,
      NEW.id,
      'payment_submissions',
      'Subscription payment for plan ' || plan_amount || ' KSh'
    FROM public.user_balances ub
    WHERE ub.user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.setup_user_profile(user_id uuid, user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email)
  VALUES (user_id, user_email)
  ON CONFLICT (id) DO NOTHING;
  
  -- Assign role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    user_id,
    CASE 
      WHEN user_email = 'kipmilton71@gmail.com' THEN 'admin'::app_role
      ELSE 'customer'::app_role
    END
  )
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RAISE NOTICE 'User profile setup completed for: %', user_email;
END;
$function$;