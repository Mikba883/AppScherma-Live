export interface TournamentAthlete {
  id: string;
  full_name: string;
}

export interface TournamentMatch {
  id?: string;
  athleteA: string;
  athleteB: string;
  scoreA: number | null;
  scoreB: number | null;
  weapon: string | null;
  status: string;
  round_number?: number | null;
  approved_by_a?: string | null;
  approved_by_b?: string | null;
}