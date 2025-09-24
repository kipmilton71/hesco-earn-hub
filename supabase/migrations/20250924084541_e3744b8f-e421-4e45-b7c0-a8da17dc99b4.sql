-- Update referral reward amounts
CREATE OR REPLACE FUNCTION public.calculate_referral_reward(plan_amount numeric, referral_level integer)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN CASE 
    WHEN plan_amount = 500 THEN
      CASE referral_level
        WHEN 1 THEN 100
        WHEN 2 THEN 50
        WHEN 3 THEN 25
        ELSE 0
      END
    WHEN plan_amount = 1000 THEN
      CASE referral_level
        WHEN 1 THEN 200
        WHEN 2 THEN 100
        WHEN 3 THEN 50
        ELSE 0
      END
    WHEN plan_amount = 2000 THEN
      CASE referral_level
        WHEN 1 THEN 300
        WHEN 2 THEN 150
        WHEN 3 THEN 75
        ELSE 0
      END
    WHEN plan_amount = 5000 THEN
      CASE referral_level
        WHEN 1 THEN 500
        WHEN 2 THEN 250
        WHEN 3 THEN 125
        ELSE 0
      END
    ELSE 0
  END;
END;
$function$