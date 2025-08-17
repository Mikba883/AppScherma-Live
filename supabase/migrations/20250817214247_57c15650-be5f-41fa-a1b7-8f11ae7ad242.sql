-- Update RLS policy to allow instructors to register bouts between any team athletes
DROP POLICY IF EXISTS "bouts_insert_involved" ON public.bouts;

CREATE POLICY "bouts_insert_involved" ON public.bouts
FOR INSERT 
WITH CHECK (
  team_id = (SELECT team_id FROM profiles WHERE user_id = auth.uid())
  AND created_by = auth.uid()
  AND (
    -- Gli atleti possono inserire solo bout dove sono coinvolti
    (
      (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'allievo'
      AND (athlete_a = auth.uid() OR athlete_b = auth.uid())
    )
    OR
    -- Gli istruttori possono inserire bout tra qualsiasi atleta del team
    (
      (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'istruttore'
      AND athlete_a IN (SELECT user_id FROM profiles WHERE team_id = (SELECT team_id FROM profiles WHERE user_id = auth.uid()))
      AND athlete_b IN (SELECT user_id FROM profiles WHERE team_id = (SELECT team_id FROM profiles WHERE user_id = auth.uid()))
    )
  )
);