-- Create notifications table for athlete notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  related_bout_id UUID
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Athletes can view their own notifications
CREATE POLICY "Athletes can view own notifications" 
ON public.notifications 
FOR SELECT 
USING (athlete_id = auth.uid());

-- Athletes can update their own notifications (mark as read)
CREATE POLICY "Athletes can update own notifications" 
ON public.notifications 
FOR UPDATE 
USING (athlete_id = auth.uid())
WITH CHECK (athlete_id = auth.uid());

-- Instructors can insert notifications for any athlete
CREATE POLICY "Instructors can create notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'istruttore'
  )
);

-- Add delete policy to bouts table for instructors
CREATE POLICY "Instructors can delete bouts" 
ON public.bouts 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'istruttore'
  )
);

-- Function to delete bout and notify athletes
CREATE OR REPLACE FUNCTION public.delete_bout_with_notification(_bout_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  _bout_record RECORD;
  _instructor_name TEXT;
  _athlete_a_name TEXT;
  _athlete_b_name TEXT;
  _message TEXT;
BEGIN
  -- Check if user is instructor
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'istruttore'
  ) THEN
    RAISE EXCEPTION 'Solo gli istruttori possono cancellare gli incontri';
  END IF;

  -- Get bout details and athlete names
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

  -- Create notification message
  _message := format(
    'Il tuo incontro del %s contro %s (%s - %s) è stato cancellato dall''istruttore %s',
    _bout_record.bout_date,
    CASE 
      WHEN _bout_record.athlete_a = auth.uid() THEN _bout_record.athlete_b_name
      ELSE _bout_record.athlete_a_name
    END,
    COALESCE(_bout_record.weapon, 'arma non specificata'),
    _bout_record.bout_type,
    _bout_record.instructor_name
  );

  -- Create notifications for both athletes
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