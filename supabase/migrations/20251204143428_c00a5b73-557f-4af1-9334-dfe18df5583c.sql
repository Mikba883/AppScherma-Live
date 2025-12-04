-- Create team_matches table for 3v3 relay format
CREATE TABLE public.team_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_date DATE NOT NULL DEFAULT CURRENT_DATE,
  weapon TEXT,
  gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'setup', -- 'setup', 'in_progress', 'overtime', 'completed', 'cancelled'
  
  -- Squadra A
  team_a_name TEXT DEFAULT 'Squadra A',
  team_a_athlete_1 UUID,
  team_a_athlete_2 UUID,
  team_a_athlete_3 UUID,
  
  -- Squadra B
  team_b_name TEXT DEFAULT 'Squadra B',
  team_b_athlete_1 UUID,
  team_b_athlete_2 UUID,
  team_b_athlete_3 UUID,
  
  -- Punteggi totali cumulativi
  total_score_a INTEGER NOT NULL DEFAULT 0,
  total_score_b INTEGER NOT NULL DEFAULT 0,
  
  -- Assalto corrente (1-9)
  current_bout INTEGER NOT NULL DEFAULT 1,
  
  -- Overtime (minuto supplementare)
  overtime_score_a INTEGER,
  overtime_score_b INTEGER,
  overtime_winner TEXT, -- 'A' o 'B'
  
  -- Winner
  winner TEXT, -- 'A' o 'B'
  
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Create team_match_bouts table for the 9 individual bouts
CREATE TABLE public.team_match_bouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_match_id UUID NOT NULL REFERENCES public.team_matches(id) ON DELETE CASCADE,
  bout_number INTEGER NOT NULL, -- 1-9
  
  -- Chi tira in questo assalto (indice 1-3 riferito agli atleti della squadra)
  athlete_a_index INTEGER NOT NULL, -- 1, 2, or 3
  athlete_b_index INTEGER NOT NULL, -- 1, 2, or 3
  
  -- Punteggio TARGET da raggiungere (5, 10, 15, 20, 25, 30, 35, 40, 45)
  target_score INTEGER NOT NULL,
  
  -- Punteggio all'inizio dell'assalto (cumulativo)
  start_score_a INTEGER NOT NULL DEFAULT 0,
  start_score_b INTEGER NOT NULL DEFAULT 0,
  
  -- Punteggio alla fine dell'assalto
  end_score_a INTEGER,
  end_score_b INTEGER,
  
  -- Stoccate messe a segno IN questo assalto (max 5 ciascuno)
  bout_touches_a INTEGER NOT NULL DEFAULT 0,
  bout_touches_b INTEGER NOT NULL DEFAULT 0,
  
  -- Tempo impiegato (secondi)
  time_elapsed INTEGER,
  
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed'
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  UNIQUE(team_match_id, bout_number)
);

-- Enable RLS
ALTER TABLE public.team_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_match_bouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for team_matches
CREATE POLICY "Users can view team matches from their gym"
  ON public.team_matches FOR SELECT
  USING (gym_id = get_current_user_gym_id() AND get_current_user_gym_id() IS NOT NULL);

CREATE POLICY "Instructors can create team matches"
  ON public.team_matches FOR INSERT
  WITH CHECK (
    gym_id = get_current_user_gym_id() 
    AND (has_role(auth.uid(), 'istruttore') OR has_role(auth.uid(), 'capo_palestra'))
  );

CREATE POLICY "Instructors can update team matches in their gym"
  ON public.team_matches FOR UPDATE
  USING (
    gym_id = get_current_user_gym_id() 
    AND (has_role(auth.uid(), 'istruttore') OR has_role(auth.uid(), 'capo_palestra'))
  );

CREATE POLICY "Instructors can delete team matches"
  ON public.team_matches FOR DELETE
  USING (
    gym_id = get_current_user_gym_id() 
    AND (has_role(auth.uid(), 'istruttore') OR has_role(auth.uid(), 'capo_palestra'))
  );

-- RLS Policies for team_match_bouts
CREATE POLICY "Users can view team match bouts from their gym"
  ON public.team_match_bouts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_matches tm
      WHERE tm.id = team_match_bouts.team_match_id
      AND tm.gym_id = get_current_user_gym_id()
    )
  );

CREATE POLICY "Instructors can manage team match bouts"
  ON public.team_match_bouts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.team_matches tm
      WHERE tm.id = team_match_bouts.team_match_id
      AND tm.gym_id = get_current_user_gym_id()
      AND (has_role(auth.uid(), 'istruttore') OR has_role(auth.uid(), 'capo_palestra'))
    )
  );

-- Create indexes for performance
CREATE INDEX idx_team_matches_gym_id ON public.team_matches(gym_id);
CREATE INDEX idx_team_matches_status ON public.team_matches(status);
CREATE INDEX idx_team_match_bouts_match_id ON public.team_match_bouts(team_match_id);