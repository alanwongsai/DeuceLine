export const SURFACES = ["hard", "clay", "grass", "astro"] as const;

export type Surface = (typeof SURFACES)[number];

export type PlayerKey = "alan" | "opponent";

export type DeucelineDataset = {
  schemaVersion: 1;
  rivalry: {
    id: string;
    title: string;
    players: Record<PlayerKey, Player>;
  };
  matches: Match[];
};

export type Player = {
  displayName: string;
};

export type Match = {
  id: string;
  date: string;
  surface: Surface;
  location?: string;
  sets: SetScore[];
  notes?: string;
};

export type SetScore = {
  alan: number;
  opponent: number;
  tiebreak?: {
    alan: number;
    opponent: number;
  };
};

export type MatchResult = {
  winner: PlayerKey;
  matchScore: Record<PlayerKey, number>;
  setScores: string[];
  isDecider: boolean;
};

export type OverviewStats = {
  totalMatches: number;
  matchRecord: Record<PlayerKey, number>;
  setRecord: Record<PlayerKey, number>;
  deciderRecord: Record<PlayerKey, number>;
  currentStreak: {
    winner: PlayerKey | null;
    count: number;
  };
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
    }
  >;
  sortedMatches: Match[];
};
