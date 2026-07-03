import { DeucelineDataset, Match, PlayerKey, SetScore, Surface } from "./schema";

// Raw form input for one new match. Empty optional fields are omitted from the
// stored match, matching the hand-written style of the dataset file.
export type NewMatchInput = {
  date?: string;
  surface: Surface;
  location?: string;
  notes?: string;
} & (
  | { fidelity: "sets"; sets: SetScore[] }
  | { fidelity: "matchScore"; matchScore: Record<PlayerKey, number> }
);

// Appends a new match with the next seq and a matching free id, immutably.
// Shape correctness stays the validator's job: callers run validateDataset on
// the result before showing or serializing it.
export function appendMatch(dataset: DeucelineDataset, input: NewMatchInput): DeucelineDataset {
  const seq = dataset.matches.reduce((max, match) => Math.max(max, match.seq), 0) + 1;
  const ids = new Set(dataset.matches.map((match) => match.id));
  let idNumber = seq;
  while (ids.has(`match-${idNumber}`)) idNumber += 1;

  // Field order mirrors the existing file so the JSON diff stays clean.
  const match = {
    id: `match-${idNumber}`,
    seq,
    ...(input.date ? { date: input.date } : {}),
    surface: input.surface,
    ...(input.location?.trim() ? { location: input.location.trim() } : {}),
    fidelity: input.fidelity,
    ...(input.fidelity === "sets" ? { sets: input.sets } : { matchScore: input.matchScore }),
    ...(input.notes?.trim() ? { notes: input.notes.trim() } : {}),
  } as Match;

  return { ...dataset, matches: [...dataset.matches, match] };
}

// The exact text that belongs in public/data/deuceline-data.json.
export function serializeDataset(dataset: DeucelineDataset): string {
  return `${JSON.stringify(dataset, null, 2)}\n`;
}
