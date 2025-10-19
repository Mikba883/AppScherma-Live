-- Update decide_bout function to:
-- 1. Remove creation of 'info' notifications (they are useless)
-- 2. Delete notifications for current user when they approve/reject (even if opponent hasn't approved yet)
CREATE OR REPLACE FUNCTION public.decide_bout(_bout_id uuid, _decision text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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

    -- Delete notifications for current user immediately
    DELETE FROM public.notifications
    WHERE related_bout_id = _bout_id
      AND athlete_id = auth.uid();

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

        -- Delete ALL remaining notifications related to this match
        DELETE FROM public.notifications
        WHERE related_bout_id = _bout_id;

        -- Notify the other athlete with SUCCESS notification
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
      END IF;
      -- REMOVED: No more 'info' notifications when one athlete approves

    ELSIF _decision = 'reject' THEN
      -- Reject tournament match
      UPDATE public.bouts
      SET status='rejected', rejected_by=auth.uid(), rejected_at=now()
      WHERE id=_bout_id AND status='pending';
      
      -- Delete ALL notifications related to this match
      DELETE FROM public.notifications
      WHERE related_bout_id = _bout_id;
      
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
    END IF;
  ELSE
    -- NORMAL MATCH LOGIC
    IF NOT (_bout_record.athlete_b = auth.uid() 
        OR public.has_role(auth.uid(), 'istruttore'::app_role)
        OR public.has_role(auth.uid(), 'capo_palestra'::app_role)) THEN
      RAISE EXCEPTION 'Non sei autorizzato a decidere questo match';
    END IF;

    -- Delete notifications for current user immediately
    DELETE FROM public.notifications
    WHERE related_bout_id = _bout_id
      AND athlete_id = auth.uid();

    -- Process decision
    IF _decision = 'approve' THEN
      UPDATE public.bouts
      SET status='approved', approved_by=auth.uid(), approved_at=now()
      WHERE id=_bout_id AND status='pending';
      
      -- Delete all remaining notifications related to this match
      DELETE FROM public.notifications
      WHERE related_bout_id = _bout_id;
      
      _message := format('Il tuo match del %s contro %s (%s - %s) è stato approvato',
        _bout_record.bout_date, _bout_record.athlete_b_name, 
        COALESCE(_bout_record.weapon, 'arma non specificata'), _bout_record.bout_type);
      
      INSERT INTO public.notifications (athlete_id, title, message, type, created_by, related_bout_id, gym_id)
      VALUES (_bout_record.created_by, 'Match Approvato', _message, 'success', auth.uid(), _bout_id, _bout_record.gym_id);
      
    ELSIF _decision = 'reject' THEN
      UPDATE public.bouts
      SET status='rejected', rejected_by=auth.uid(), rejected_at=now()
      WHERE id=_bout_id AND status='pending';
      
      -- Delete all notifications related to this match
      DELETE FROM public.notifications
      WHERE related_bout_id = _bout_id;
      
      _message := format('Il tuo match del %s contro %s (%s - %s) è stato rifiutato',
        _bout_record.bout_date, _bout_record.athlete_b_name,
        COALESCE(_bout_record.weapon, 'arma non specificata'), _bout_record.bout_type);
      
      INSERT INTO public.notifications (athlete_id, title, message, type, created_by, related_bout_id, gym_id)
      VALUES (_bout_record.created_by, 'Match Rifiutato', _message, 'error', auth.uid(), _bout_id, _bout_record.gym_id);
    ELSE
      RAISE EXCEPTION 'Decisione non valida: %', _decision;
    END IF;
  END IF;
END;
$function$;