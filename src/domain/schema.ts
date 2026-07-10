export const SURFACES = ["hard", "clay", "grass", "astro"] as const;

export type Surface = (typeof SURFACES)[number];

// Felt weather conditions — a small, editable vocabulary. Recorded as a set of
// tags (overlapping is fine: hot AND windy), never derived. Extend by adding a
// tag here and a label in src/components/weather.tsx.
export const WEATHER_TAGS = ["sunny", "cloudy", "windy", "hot"] as const;

export type WeatherTag = (typeof WEATHER_TAGS)[number];

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
  // Raw input, both optional and absent by default (early matches have neither):
  // felt weather as a set of tags (overlapping allowed), and a rough temperature
  // in °C glanced off a phone. Never derived.
  conditions?: WeatherTag[];
  tempC?: number;
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

// One point on the rivalry timeline — the state of the rivalry *after* a given
// finished match. Ordered oldest→newest so the lead curve reads left→right.
// `seq` is the x-axis (always present); `date` is display-only and may be null
// for early matches recorded before dates were tracked.
export type TimelinePoint = {
  seq: number;
  matchId: string;
  date: string | null;
  winner: PlayerKey;
  // Running head-to-head after this match, and the signed lead (Alan − opponent:
  // positive = Alan ahead). The curve plots `lead`.
  cumulative: Record<PlayerKey, number>;
  lead: number;
  // Alan's win share over the last up-to-five finished matches ending here (0–1)
  // — the rolling form trend.
  rollingWinRateAlan: number;
};

// Date-derived rhythm of the rivalry. Computed only from finished matches that
// carry a date; undated early matches are counted separately, never guessed.
export type Cadence = {
  datedCount: number;
  undatedCount: number;
  lastMatchDate: string | null;
  daysSinceLast: number | null;
  playedLast30: number;
  playedLast90: number;
  longestGapDays: number | null;
  longestGap: { fromDate: string; toDate: string } | null;
};

// How much of the finished rivalry history can support each analytical view.
// These are deliberately counts rather than percentages so the UI can state
// its evidence plainly (for example, "2 of 8 matches have dates").
export type DataCoverage = {
  finishedMatches: number;
  datedMatches: number;
  detailedScoreMatches: number;
  weatherMatches: number;
};

// Game-level evidence is available only for matches with full set scores. Keep
// the numerator and denominator beside the result so every UI can disclose the
// strength of the evidence instead of presenting a partial total as complete.
export type GamesTally = {
  games: Record<PlayerKey, number>;
  detailedMatchCount: number;
  finishedMatchCount: number;
  biggestSetMargin: {
    matchId: string;
    score: string;
    winner: PlayerKey;
    margin: number;
  } | null;
};

export type ScorelineDistribution = {
  straightSets: Record<PlayerKey, number>;
  deciders: Record<PlayerKey, number>;
  averageSetsPerMatch: number | null;
  finishedMatchCount: number;
};

// `lead` is a positive magnitude for the named player. A player who has never
// led has no extreme rather than a misleading zero-valued "lead".
export type LeadExtreme = {
  lead: number;
  matchId: string;
  seq: number;
} | null;

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
  // The rivalry as it built up, oldest→newest: cumulative lead + rolling form.
  timeline: TimelinePoint[];
  // Completeness of the raw input behind date-, score- and weather-led views.
  coverage: DataCoverage;
  sortedMatches: Match[];
};
