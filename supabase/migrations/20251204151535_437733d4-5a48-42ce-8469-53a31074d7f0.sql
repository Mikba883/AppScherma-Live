-- Enable real-time for team match tables
ALTER TABLE team_matches REPLICA IDENTITY FULL;
ALTER TABLE team_match_bouts REPLICA IDENTITY FULL;

-- Add tables to realtime publication (ignore if already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'team_matches'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE team_matches;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'team_match_bouts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE team_match_bouts;
  END IF;
END $$;

-- Drop existing restrictive policies for team_matches
DROP POLICY IF EXISTS "Instructors can create team matches" ON team_matches;
DROP POLICY IF EXISTS "Instructors can update team matches in their gym" ON team_matches;
DROP POLICY IF EXISTS "Instructors can delete team matches" ON team_matches;

-- New policy: Any gym member can create team matches
CREATE POLICY "Gym members can create team matches"
ON team_matches FOR INSERT
WITH CHECK (
  gym_id = get_current_user_gym_id() 
  AND get_current_user_gym_id() IS NOT NULL
);

-- New policy: Any gym member can update team matches in their gym
CREATE POLICY "Gym members can update team matches"
ON team_matches FOR UPDATE
USING (
  gym_id = get_current_user_gym_id() 
  AND get_current_user_gym_id() IS NOT NULL
);

-- New policy: Instructors/owners can delete, or creator can delete
CREATE POLICY "Users can delete team matches"
ON team_matches FOR DELETE
USING (
  gym_id = get_current_user_gym_id() 
  AND (
    created_by = auth.uid()
    OR has_role(auth.uid(), 'istruttore')
    OR has_role(auth.uid(), 'capo_palestra')
  )
);

-- Drop existing restrictive policy for team_match_bouts
DROP POLICY IF EXISTS "Instructors can manage team match bouts" ON team_match_bouts;

-- New policy: Any gym member can manage team match bouts
CREATE POLICY "Gym members can manage team match bouts"
ON team_match_bouts FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM team_matches tm
    WHERE tm.id = team_match_bouts.team_match_id
    AND tm.gym_id = get_current_user_gym_id()
    AND get_current_user_gym_id() IS NOT NULL
  )
);