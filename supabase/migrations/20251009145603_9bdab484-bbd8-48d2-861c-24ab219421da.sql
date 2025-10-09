-- Fix gym owner contact information exposure

-- Step 1: Remove the overly permissive public SELECT policy
DROP POLICY IF EXISTS "View gyms with active public links" ON public.gyms;

-- Step 2: Create a secure view for public gym information (without sensitive data)
CREATE OR REPLACE VIEW public.public_gym_info AS
SELECT 
  g.id,
  g.name,
  g.logo_url,
  g.shifts,
  g.created_at
FROM public.gyms g
WHERE gym_has_active_public_link(g.id);

-- Step 3: Enable RLS on the view
ALTER VIEW public.public_gym_info SET (security_barrier = true);

-- Step 4: Create a security definer function to get public gym info by token
CREATE OR REPLACE FUNCTION public.get_public_gym_by_token(_token text)
RETURNS TABLE (
  id uuid,
  name text,
  logo_url text,
  shifts text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    g.id,
    g.name,
    g.logo_url,
    g.shifts
  FROM public.gyms g
  INNER JOIN public.gym_public_links gpl ON gpl.gym_id = g.id
  WHERE gpl.token = _token
    AND gpl.is_active = true
    AND (gpl.max_uses IS NULL OR gpl.uses_count < gpl.max_uses);
$$;

-- Step 5: Add comment explaining the security measure
COMMENT ON FUNCTION public.get_public_gym_by_token IS 
'Securely retrieves public gym information by token without exposing owner contact details. Used for public registration links.';

COMMENT ON VIEW public.public_gym_info IS
'Public view of gym information that excludes sensitive owner contact details (owner_email, owner_name). Only shows gyms with active public links.';