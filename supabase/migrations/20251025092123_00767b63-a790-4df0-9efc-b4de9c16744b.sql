-- Create a secure function for gym owners to remove members
CREATE OR REPLACE FUNCTION public.remove_gym_member(_member_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _owner_gym_id uuid;
  _member_gym_id uuid;
  _owner_role text;
BEGIN
  -- Get owner's gym_id and role
  SELECT gym_id, role INTO _owner_gym_id, _owner_role
  FROM public.profiles
  WHERE user_id = auth.uid();

  -- Verify owner is capo_palestra
  IF _owner_role != 'capo_palestra' THEN
    RAISE EXCEPTION 'Solo i capi palestra possono rimuovere membri';
  END IF;

  -- Verify owner has a gym
  IF _owner_gym_id IS NULL THEN
    RAISE EXCEPTION 'Devi essere associato a una palestra';
  END IF;

  -- Get member's gym_id
  SELECT gym_id INTO _member_gym_id
  FROM public.profiles
  WHERE user_id = _member_user_id;

  -- Verify member is in the same gym
  IF _member_gym_id IS NULL OR _member_gym_id != _owner_gym_id THEN
    RAISE EXCEPTION 'Il membro non fa parte della tua palestra';
  END IF;

  -- Verify not trying to remove self
  IF _member_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Non puoi rimuovere te stesso dalla palestra';
  END IF;

  -- Remove member from gym
  UPDATE public.profiles
  SET gym_id = NULL
  WHERE user_id = _member_user_id;
END;
$$;