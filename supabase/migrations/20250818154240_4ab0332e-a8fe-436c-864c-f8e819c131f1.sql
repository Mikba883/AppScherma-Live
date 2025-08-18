-- Add DELETE policy for notifications so users can delete their own notifications
CREATE POLICY "Athletes can delete own notifications" 
ON public.notifications 
FOR DELETE 
USING (athlete_id = auth.uid());

-- Update decide_bout function to send confirmation/rejection notifications
CREATE OR REPLACE FUNCTION public.decide_bout(_bout_id uuid, _decision text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  _bout_record RECORD;
  _creator_name TEXT;
  _opponent_name TEXT;
  _message TEXT;
BEGIN
  -- Get bout details and participant names
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

  -- Check if user is authorized to decide
  IF _bout_record.athlete_b != auth.uid() THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.role = 'istruttore'
    ) THEN
      RAISE EXCEPTION 'Non autorizzato a decidere questo match';
    END IF;
  END IF;

  -- Update bout status
  IF _decision = 'approve' THEN
    UPDATE public.bouts
    SET status='approved', approved_by=auth.uid(), approved_at=now()
    WHERE id=_bout_id AND status='pending';
    
    -- Create approval notification for the creator
    _message := format(
      'Il tuo match del %s contro %s (%s - %s) è stato approvato',
      _bout_record.bout_date,
      CASE 
        WHEN _bout_record.athlete_a = _bout_record.created_by THEN _bout_record.athlete_b_name
        ELSE _bout_record.athlete_a_name
      END,
      COALESCE(_bout_record.weapon, 'arma non specificata'),
      _bout_record.bout_type
    );
    
    INSERT INTO public.notifications (athlete_id, title, message, type, created_by, related_bout_id)
    VALUES (_bout_record.created_by, 'Match Approvato', _message, 'success', auth.uid(), _bout_id);
    
  ELSIF _decision = 'reject' THEN
    UPDATE public.bouts
    SET status='rejected', rejected_by=auth.uid(), rejected_at=now()
    WHERE id=_bout_id AND status='pending';
    
    -- Create rejection notification for the creator
    _message := format(
      'Il tuo match del %s contro %s (%s - %s) è stato rifiutato',
      _bout_record.bout_date,
      CASE 
        WHEN _bout_record.athlete_a = _bout_record.created_by THEN _bout_record.athlete_b_name
        ELSE _bout_record.athlete_a_name
      END,
      COALESCE(_bout_record.weapon, 'arma non specificata'),
      _bout_record.bout_type
    );
    
    INSERT INTO public.notifications (athlete_id, title, message, type, created_by, related_bout_id)
    VALUES (_bout_record.created_by, 'Match Rifiutato', _message, 'error', auth.uid(), _bout_id);
    
  ELSE
    RAISE EXCEPTION 'Decisione non valida';
  END IF;
END;
$function$