// Sequenza standard degli assalti nel formato staffetta 3v3
export const TEAM_RELAY_SEQUENCE = [
  { bout: 1, teamAIndex: 1, teamBIndex: 1, target: 5 },
  { bout: 2, teamAIndex: 2, teamBIndex: 2, target: 10 },
  { bout: 3, teamAIndex: 3, teamBIndex: 3, target: 15 },
  { bout: 4, teamAIndex: 1, teamBIndex: 2, target: 20 },
  { bout: 5, teamAIndex: 2, teamBIndex: 3, target: 25 },
  { bout: 6, teamAIndex: 3, teamBIndex: 1, target: 30 },
  { bout: 7, teamAIndex: 1, teamBIndex: 3, target: 35 },
  { bout: 8, teamAIndex: 2, teamBIndex: 1, target: 40 },
  { bout: 9, teamAIndex: 3, teamBIndex: 2, target: 45 },
] as const;

export const BOUT_TIME_LIMIT = 180; // 3 minuti in secondi
export const OVERTIME_TIME_LIMIT = 60; // 1 minuto in secondi
export const MAX_BOUT_TOUCHES = 5; // Massimo stoccate per assalto per atleta
export const FINAL_TARGET = 45;

export interface TeamMatchAthlete {
  id: string;
  full_name: string;
  index: 1 | 2 | 3;
}

export interface TeamMatch {
  id: string;
  match_date: string;
  weapon: string | null;
  gym_id: string;
  created_by: string;
  status: 'setup' | 'in_progress' | 'overtime' | 'completed' | 'cancelled';
  team_a_name: string;
  team_a_athlete_1: string | null;
  team_a_athlete_2: string | null;
  team_a_athlete_3: string | null;
  team_b_name: string;
  team_b_athlete_1: string | null;
  team_b_athlete_2: string | null;
  team_b_athlete_3: string | null;
  total_score_a: number;
  total_score_b: number;
  current_bout: number;
  overtime_score_a: number | null;
  overtime_score_b: number | null;
  overtime_winner: 'A' | 'B' | null;
  winner: 'A' | 'B' | null;
  created_at: string;
  completed_at: string | null;
}

export interface TeamMatchBout {
  id: string;
  team_match_id: string;
  bout_number: number;
  athlete_a_index: number;
  athlete_b_index: number;
  target_score: number;
  start_score_a: number;
  start_score_b: number;
  end_score_a: number | null;
  end_score_b: number | null;
  bout_touches_a: number;
  bout_touches_b: number;
  time_elapsed: number | null;
  status: 'pending' | 'in_progress' | 'completed';
  started_at: string | null;
  completed_at: string | null;
}

export interface TeamSetup {
  teamAName: string;
  teamBName: string;
  teamA: (string | null)[];
  teamB: (string | null)[];
  weapon: string;
  matchDate: Date;
}

// Utility per determinare se un assalto deve terminare
export const shouldEndBout = (
  currentScoreA: number,
  currentScoreB: number,
  targetScore: number,
  boutTouchesA: number,
  boutTouchesB: number,
  timeElapsed: number
): { end: boolean; reason: string } => {
  if (currentScoreA >= targetScore) {
    return { end: true, reason: `Squadra A ha raggiunto il target (${targetScore})` };
  }
  if (currentScoreB >= targetScore) {
    return { end: true, reason: `Squadra B ha raggiunto il target (${targetScore})` };
  }
  if (boutTouchesA >= MAX_BOUT_TOUCHES) {
    return { end: true, reason: `A1 ha fatto ${MAX_BOUT_TOUCHES} stoccate` };
  }
  if (boutTouchesB >= MAX_BOUT_TOUCHES) {
    return { end: true, reason: `B ha fatto ${MAX_BOUT_TOUCHES} stoccate` };
  }
  if (timeElapsed >= BOUT_TIME_LIMIT) {
    return { end: true, reason: 'Tempo scaduto (3 minuti)' };
  }
  return { end: false, reason: '' };
};

// Utility per determinare se il match deve terminare
export const shouldEndMatch = (
  totalScoreA: number,
  totalScoreB: number,
  currentBout: number,
  boutEnded: boolean
): { ended: boolean; winner?: 'A' | 'B'; overtime?: boolean } => {
  // Una squadra ha raggiunto 45
  if (totalScoreA >= FINAL_TARGET) {
    return { ended: true, winner: 'A' };
  }
  if (totalScoreB >= FINAL_TARGET) {
    return { ended: true, winner: 'B' };
  }
  
  // Fine del 9° assalto
  if (currentBout === 9 && boutEnded) {
    if (totalScoreA === totalScoreB) {
      return { ended: false, overtime: true };
    }
    return { ended: true, winner: totalScoreA > totalScoreB ? 'A' : 'B' };
  }
  
  return { ended: false };
};
