-- Modify decide_bout to handle both normal and tournament matches
CREATE OR REPLACE FUNCTION public.decide_bout(_bout_id uuid, _decision text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  _bout_record RECORD;
  _message TEXT;
  _is_athlete_a BOOLEAN;
  _is_athlete_b BOOLEAN;
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

  -- Check if this is a tournament match
  IF _bout_record.tournament_id IS NOT NULL THEN
    -- TOURNAMENT MATCH LOGIC
    _is_athlete_a := (_bout_record.athlete_a = auth.uid());
    _is_athlete_b := (_bout_record.athlete_b = auth.uid());

    IF NOT (_is_athlete_a OR _is_athlete_b) THEN
      RAISE EXCEPTION 'Non sei autorizzato a decidere questo match';
    END IF;

    IF _decision = 'approve' THEN
      -- Mark approval for this athlete
      IF _is_athlete_a THEN
        UPDATE public.bouts
        SET approved_by_a = auth.uid()
        WHERE id = _bout_id;
      ELSIF _is_athlete_b THEN
        UPDATE public.bouts
        SET approved_by_b = auth.uid()
        WHERE id = _bout_id;
      END IF;

      -- Check if both approved
      SELECT * INTO _bout_record
      FROM public.bouts
      WHERE id = _bout_id;

      IF _bout_record.approved_by_a IS NOT NULL AND _bout_record.approved_by_b IS NOT NULL THEN
        -- Both approved - mark as approved
        UPDATE public.bouts
        SET status = 'approved', 
            approved_by = _bout_record.created_by,
            approved_at = now()
        WHERE id = _bout_id;

        -- Notify the other athlete
        INSERT INTO public.notifications (athlete_id, title, message, type, created_by, related_bout_id, gym_id)
        VALUES (
          CASE WHEN _is_athlete_a THEN _bout_record.athlete_b ELSE _bout_record.athlete_a END,
          'Match Approvato',
          format('Il match del torneo è stato approvato da entrambi gli atleti ed è ora ufficiale!'),
          'success',
          auth.uid(),
          _bout_id,
          _bout_record.gym_id
        );
      ELSE
        -- Notify the other athlete that one approved
        INSERT INTO public.notifications (athlete_id, title, message, type, created_by, related_bout_id, gym_id)
        VALUES (
          CASE WHEN _is_athlete_a THEN _bout_record.athlete_b ELSE _bout_record.athlete_a END,
          'Match in Attesa',
          format('Il tuo avversario ha approvato il match del torneo. Approva anche tu per renderlo ufficiale.'),
          'info',
          auth.uid(),
          _bout_id,
          _bout_record.gym_id
        );
      END IF;
    ELSIF _decision = 'reject' THEN
      -- Reject tournament match
      UPDATE public.bouts
      SET status='rejected', rejected_by=auth.uid(), rejected_at=now()
      WHERE id=_bout_id AND status='pending';
      
      _message := format('Il match del torneo del %s contro %s è stato rifiutato',
        _bout_record.bout_date,
        CASE WHEN _is_athlete_a THEN _bout_record.athlete_b_name ELSE _bout_record.athlete_a_name END);
      
      INSERT INTO public.notifications (athlete_id, title, message, type, created_by, related_bout_id, gym_id)
      VALUES (
        CASE WHEN _is_athlete_a THEN _bout_record.athlete_b ELSE _bout_record.athlete_a END, 
        'Match Rifiutato', 
        _message, 
        'error', 
        auth.uid(), 
        _bout_id,
        _bout_record.gym_id
      );
    ELSE
      RAISE EXCEPTION 'Decisione non valida';
    END IF;
  ELSE
    -- NORMAL MATCH LOGIC (unchanged)
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
      
      INSERT INTO public.notifications (athlete_id, title, message, type, created_by, related_bout_id, gym_id)
      VALUES (_bout_record.created_by, 'Match Approvato', _message, 'success', auth.uid(), _bout_id, _bout_record.gym_id);
      
    ELSIF _decision = 'reject' THEN
      UPDATE public.bouts
      SET status='rejected', rejected_by=auth.uid(), rejected_at=now()
      WHERE id=_bout_id AND status='pending';
      
      _message := format('Il tuo match del %s contro %s (%s - %s) è stato rifiutato',
        _bout_record.bout_date,
        CASE WHEN _bout_record.athlete_a = _bout_record.created_by THEN _bout_record.athlete_b_name ELSE _bout_record.athlete_a_name END,
        COALESCE(_bout_record.weapon, 'arma non specificata'), _bout_record.bout_type);
      
      INSERT INTO public.notifications (athlete_id, title, message, type, created_by, related_bout_id, gym_id)
      VALUES (_bout_record.created_by, 'Match Rifiutato', _message, 'error', auth.uid(), _bout_id, _bout_record.gym_id);
    ELSE
      RAISE EXCEPTION 'Decisione non valida';
    END IF;
  END IF;
END;
$$;