export const SURFACES = ["hard", "clay", "grass", "astro"] as const;

export type Surface = (typeof SURFACES)[number];

export type PlayerKey = "alan" | "opponent";

export type DeucelineDataset = {
  schemaVersion: 2;
  rivalry: {
    id: string;
    title: string;
    players: Record<PlayerKey, Player>;
  };
  matches: Match[];
};

export type Player = {
  displayName: string;
  // Identity (not derived data): the player's colour drives every win/identity
  // cue in the UI, and `abbr` disambiguates names that share a first letter.
  color: string;
  abbr: string;
};

// Fields shared by every match regardless of how much detail we have.
// `seq` is the canonical chronological order (1 = oldest). `date` is optional
// because early matches were recorded before we tracked exact dates — sorting
// and streaks rely on `seq`, while `date` is only used for display when present.
type MatchBase = {
  id: string;
  seq: number;
  date?: string;
  surface: Surface;
  location?: string;
  notes?: string;
  // Raw input, not a derived value: an unfinished match was suspended before a
  // winner was decided (e.g. 1–1 in sets, more to play). Absent = finished.
  // Unfinished matches are excluded from every derived stat until completed.
  status?: "unfinished";
};

// Highest fidelity: we know the game score of every set.
export type DetailedMatch = MatchBase & {
  fidelity: "sets";
  sets: SetScore[];
};

// Lower fidelity: we only know how many sets each player won, not the
// individual set scores. Still enough for match record, set record,
// decider record, streaks and surface splits.
export type ScoreMatch = MatchBase & {
  fidelity: "matchScore";
  matchScore: Record<PlayerKey, number>;
};

export type Match = DetailedMatch | ScoreMatch;

export type SetScore = {
  alan: number;
  opponent: number;
  tiebreak?: {
    alan: number;
    opponent: number;
  };
};

export type MatchResult = {
  // null when the match is unfinished — there is no winner yet. Every consumer
  // must handle null rather than silently attributing a win.
  winner: PlayerKey | null;
  isUnfinished: boolean;
  matchScore: Record<PlayerKey, number>;
  // Per-set display strings, or null when the match only has a set tally.
  setScores: string[] | null;
  hasSetDetail: boolean;
  isDecider: boolean;
};

// What a single match did to the rivalry — derived on demand for the detail view.
export type MatchContext = {
  matchNumber: number;
  totalMatches: number;
  winner: PlayerKey;
  recordBefore: Record<PlayerKey, number>;
  recordAfter: Record<PlayerKey, number>;
  streakAfter: { winner: PlayerKey; count: number };
  snappedStreak: { player: PlayerKey; count: number } | null;
};

export type StreakState = {
  winner: PlayerKey | null;
  count: number;
};

export type OverviewStats = {
  totalMatches: number;
  detailedMatchCount: number;
  matchRecord: Record<PlayerKey, number>;
  setRecord: Record<PlayerKey, number>;
  deciderRecord: Record<PlayerKey, number>;
  currentStreak: StreakState;
  recentForm: Array<{
    matchId: string;
    winner: PlayerKey;
  }>;
  surfaceSplit: Record<
    Surface,
    {
      played: number;
      alan: number;
      opponent: number;
      setsAlan: number;
      setsOpponent: number;
      decidersAlan: number;
      decidersOpponent: number;
    }
  >;
  // Consecutive-winner runs, newest first (the first entry is the current streak).
  streakHistory: Array<{
    winner: PlayerKey;
    count: number;
  }>;
  // The current win streak within each surface alone (e.g. "on grass, Alan has won the last 2").
  surfaceStreak: Record<Surface, StreakState>;
  sortedMatches: Match[];
};
