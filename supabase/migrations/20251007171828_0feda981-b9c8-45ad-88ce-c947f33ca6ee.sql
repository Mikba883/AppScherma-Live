-- CRITICAL SECURITY FIX: Move roles from profiles table to separate user_roles table
-- This prevents privilege escalation attacks

-- 1. Create enum for roles
CREATE TYPE public.app_role AS ENUM ('allievo', 'istruttore', 'capo_palestra');

-- 2. Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role public.app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- 3. Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, role::public.app_role
FROM public.profiles
WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- 5. Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 6. Create helper function to get user's primary role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::TEXT
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role
      WHEN 'capo_palestra' THEN 1
      WHEN 'istruttore' THEN 2
      WHEN 'allievo' THEN 3
    END
  LIMIT 1
$$;

-- 7. RLS Policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can view roles of gym members"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p1
    JOIN public.profiles p2 ON p1.gym_id = p2.gym_id
    WHERE p1.user_id = auth.uid()
      AND p2.user_id = user_roles.user_id
  )
);

-- 8. Update get_current_user_role function to use new table
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT public.get_user_role(auth.uid());
$$;

-- 9. Update RLS policies to use has_role function instead of profiles.role

-- Bouts policies
DROP POLICY IF EXISTS "Instructors can delete bouts" ON public.bouts;
CREATE POLICY "Instructors can delete bouts"
ON public.bouts
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'istruttore') OR 
  public.has_role(auth.uid(), 'capo_palestra')
);

DROP POLICY IF EXISTS "Users can insert bouts in their gym" ON public.bouts;
CREATE POLICY "Users can insert bouts in their gym"
ON public.bouts
FOR INSERT
TO authenticated
WITH CHECK (
  gym_id = (SELECT gym_id FROM public.profiles WHERE user_id = auth.uid())
  AND (
    created_by = auth.uid() 
    OR public.has_role(auth.uid(), 'istruttore')
    OR public.has_role(auth.uid(), 'capo_palestra')
  )
);

DROP POLICY IF EXISTS "bouts_update_approve" ON public.bouts;
CREATE POLICY "bouts_update_approve"
ON public.bouts
FOR UPDATE
TO authenticated
USING (
  status = 'pending'
  AND (
    athlete_b = auth.uid()
    OR public.has_role(auth.uid(), 'istruttore')
    OR public.has_role(auth.uid(), 'capo_palestra')
  )
)
WITH CHECK (true);

-- Notifications policies
DROP POLICY IF EXISTS "Instructors can create notifications" ON public.notifications;
CREATE POLICY "Instructors can create notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'istruttore') OR
  public.has_role(auth.uid(), 'capo_palestra')
);

-- 10. Update database functions to use has_role

CREATE OR REPLACE FUNCTION public.register_bout_instructor(
  _athlete_a UUID,
  _athlete_b UUID,
  _bout_date DATE,
  _weapon TEXT,
  _bout_type TEXT,
  _score_a INTEGER,
  _score_b INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  _user_gym_id UUID;
  _id UUID;
  _instructor_name TEXT;
  _athlete_a_name TEXT;
  _athlete_b_name TEXT;
BEGIN
  -- Check if user is an instructor
  IF NOT (public.has_role(auth.uid(), 'istruttore') OR public.has_role(auth.uid(), 'capo_palestra')) THEN
    RAISE EXCEPTION 'Solo gli istruttori possono usare questa funzione';
  END IF;

  -- Get gym_id and instructor name
  SELECT full_name, gym_id INTO _instructor_name, _user_gym_id
  FROM public.profiles 
  WHERE user_id = auth.uid();
  
  IF _user_gym_id IS NULL THEN
    RAISE EXCEPTION 'Profilo non trovato per utente';
  END IF;

  -- Validate weapon
  IF _weapon IS NOT NULL AND _weapon != '' AND _weapon NOT IN ('fioretto','spada','sciabola') THEN
    RAISE EXCEPTION 'Arma non valida: %', _weapon;
  END IF;
  
  -- Validate bout type
  IF _bout_type NOT IN ('sparring','gara','bianco') THEN
    RAISE EXCEPTION 'Tipo match non valido: %', _bout_type;
  END IF;

  -- Check if athletes exist and are in the same gym
  SELECT full_name INTO _athlete_a_name
  FROM public.profiles 
  WHERE user_id = _athlete_a AND gym_id = _user_gym_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Atleta A non trovato nella tua palestra';
  END IF;
  
  SELECT full_name INTO _athlete_b_name
  FROM public.profiles 
  WHERE user_id = _athlete_b AND gym_id = _user_gym_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Atleta B non trovato nella tua palestra';
  END IF;

  -- Validate athletes are different
  IF _athlete_a = _athlete_b THEN
    RAISE EXCEPTION 'Gli atleti devono essere diversi';
  END IF;

  -- Insert the bout
  INSERT INTO public.bouts (
    bout_date, weapon, bout_type,
    athlete_a, athlete_b, score_a, score_b,
    status, created_by, approved_by, approved_at, gym_id
  ) VALUES (
    COALESCE(_bout_date, CURRENT_DATE),
    CASE WHEN _weapon = '' THEN NULL ELSE _weapon END,
    _bout_type,
    _athlete_a, _athlete_b, _score_a, _score_b,
    'approved', auth.uid(), auth.uid(), NOW(), _user_gym_id
  )
  RETURNING id INTO _id;

  -- Create notifications
  INSERT INTO public.notifications (athlete_id, title, message, type, created_by, related_bout_id, gym_id)
  VALUES 
    (_athlete_a, 'Nuovo Match Registrato', 
     format('L''istruttore %s ha registrato un nuovo match per te del %s contro %s (%s - %s). Risultato: %s - %s',
            _instructor_name, COALESCE(_bout_date, CURRENT_DATE), _athlete_b_name,
            COALESCE(_weapon, 'arma non specificata'), _bout_type, _score_a, _score_b),
     'info', auth.uid(), _id, _user_gym_id),
    (_athlete_b, 'Nuovo Match Registrato',
     format('L''istruttore %s ha registrato un nuovo match per te del %s contro %s (%s - %s). Risultato: %s - %s',
            _instructor_name, COALESCE(_bout_date, CURRENT_DATE), _athlete_a_name,
            COALESCE(_weapon, 'arma non specificata'), _bout_type, _score_b, _score_a),
     'info', auth.uid(), _id, _user_gym_id);

  RETURN _id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_bout_with_notification(_bout_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  _bout_record RECORD;
BEGIN
  -- Check if user is instructor
  IF NOT (public.has_role(auth.uid(), 'istruttore') OR public.has_role(auth.uid(), 'capo_palestra')) THEN
    RAISE EXCEPTION 'Solo gli istruttori possono cancellare gli incontri';
  END IF;

  -- Get bout details
  SELECT 
    b.*,
    pa.full_name as athlete_a_name,
    pb.full_name as athlete_b_name,
    pi.full_name as instructor_name
  INTO _bout_record
  FROM public.bouts b
  LEFT JOIN public.profiles pa ON pa.user_id = b.athlete_a
  LEFT JOIN public.profiles pb ON pb.user_id = b.athlete_b
  LEFT JOIN public.profiles pi ON pi.user_id = auth.uid()
  WHERE b.id = _bout_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Incontro non trovato';
  END IF;

  -- Create notifications
  INSERT INTO public.notifications (athlete_id, title, message, type, created_by, related_bout_id)
  VALUES 
    (_bout_record.athlete_a, 'Incontro Cancellato', 
     format('Il tuo incontro del %s contro %s (%s - %s) è stato cancellato dall''istruttore %s',
            _bout_record.bout_date, _bout_record.athlete_b_name, 
            COALESCE(_bout_record.weapon, 'arma non specificata'), _bout_record.bout_type, _bout_record.instructor_name), 
     'warning', auth.uid(), _bout_id),
    (_bout_record.athlete_b, 'Incontro Cancellato', 
     format('Il tuo incontro del %s contro %s (%s - %s) è stato cancellato dall''istruttore %s',
            _bout_record.bout_date, _bout_record.athlete_a_name, 
            COALESCE(_bout_record.weapon, 'arma non specificata'), _bout_record.bout_type, _bout_record.instructor_name), 
     'warning', auth.uid(), _bout_id);

  -- Delete the bout
  DELETE FROM public.bouts WHERE id = _bout_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.decide_bout(_bout_id UUID, _decision TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  _bout_record RECORD;
  _message TEXT;
BEGIN
  -- Get bout details
  SELECT 
    b.*,
    pa.full_name as athlete_a_name,
    pb.full_name as athlete_b_name
  INTO _bout_record
  FROM public.bouts b
  LEFT JOIN public.profiles pa ON pa.user_id = b.athlete_a
  LEFT JOIN public.profiles pb ON pb.user_id = b.athlete_b
  WHERE b.id = _bout_id AND b.status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match non trovato o già deciso';
  END IF;

  -- Check authorization
  IF _bout_record.athlete_b != auth.uid() THEN
    IF NOT (public.has_role(auth.uid(), 'istruttore') OR public.has_role(auth.uid(), 'capo_palestra')) THEN
      RAISE EXCEPTION 'Non autorizzato a decidere questo match';
    END IF;
  END IF;

  -- Process decision
  IF _decision = 'approve' THEN
    UPDATE public.bouts
    SET status='approved', approved_by=auth.uid(), approved_at=now()
    WHERE id=_bout_id AND status='pending';
    
    _message := format('Il tuo match del %s contro %s (%s - %s) è stato approvato',
      _bout_record.bout_date,
      CASE WHEN _bout_record.athlete_a = _bout_record.created_by THEN _bout_record.athlete_b_name ELSE _bout_record.athlete_a_name END,
      COALESCE(_bout_record.weapon, 'arma non specificata'), _bout_record.bout_type);
    
    INSERT INTO public.notifications (athlete_id, title, message, type, created_by, related_bout_id)
    VALUES (_bout_record.created_by, 'Match Approvato', _message, 'success', auth.uid(), _bout_id);
    
  ELSIF _decision = 'reject' THEN
    UPDATE public.bouts
    SET status='rejected', rejected_by=auth.uid(), rejected_at=now()
    WHERE id=_bout_id AND status='pending';
    
    _message := format('Il tuo match del %s contro %s (%s - %s) è stato rifiutato',
      _bout_record.bout_date,
      CASE WHEN _bout_record.athlete_a = _bout_record.created_by THEN _bout_record.athlete_b_name ELSE _bout_record.athlete_a_name END,
      COALESCE(_bout_record.weapon, 'arma non specificata'), _bout_record.bout_type);
    
    INSERT INTO public.notifications (athlete_id, title, message, type, created_by, related_bout_id)
    VALUES (_bout_record.created_by, 'Match Rifiutato', _message, 'error', auth.uid(), _bout_id);
  ELSE
    RAISE EXCEPTION 'Decisione non valida';
  END IF;
END;
$function$;

-- 11. Keep role column in profiles for backward compatibility (will be deprecated)
-- Add comment to indicate it's deprecated
COMMENT ON COLUMN public.profiles.role IS 'DEPRECATED: Use user_roles table instead. Kept for backward compatibility only.';