import { DeucelineDataset, Match, PlayerKey, SetScore, Surface } from "./schema";

// Raw form input for one new match. Empty optional fields are omitted from the
// stored match, matching the hand-written style of the dataset file.
export type NewMatchInput = {
  date?: string;
  surface: Surface;
  location?: string;
  notes?: string;
  // Present only for a match suspended before a winner was decided; omitted for
  // a normal finished match.
  status?: "unfinished";
} & (
  | { fidelity: "sets"; sets: SetScore[] }
  | { fidelity: "matchScore"; matchScore: Record<PlayerKey, number> }
);

// Builds one stored match body from raw input for a given id + seq. Field order
// mirrors the existing file so the JSON diff stays clean. Shape correctness
// stays the validator's job: callers run validateDataset on the result before
// showing or serializing it.
function buildMatchBody(input: NewMatchInput, identity: { id: string; seq: number }): Match {
  return {
    id: identity.id,
    seq: identity.seq,
    ...(input.date ? { date: input.date } : {}),
    surface: input.surface,
    ...(input.location?.trim() ? { location: input.location.trim() } : {}),
    fidelity: input.fidelity,
    ...(input.fidelity === "sets" ? { sets: input.sets } : { matchScore: input.matchScore }),
    ...(input.status ? { status: input.status } : {}),
    ...(input.notes?.trim() ? { notes: input.notes.trim() } : {}),
  } as Match;
}

// Appends a new match with the next seq and a matching free id, immutably.
export function appendMatch(dataset: DeucelineDataset, input: NewMatchInput): DeucelineDataset {
  const seq = dataset.matches.reduce((max, match) => Math.max(max, match.seq), 0) + 1;
  const ids = new Set(dataset.matches.map((match) => match.id));
  let idNumber = seq;
  while (ids.has(`match-${idNumber}`)) idNumber += 1;

  const match = buildMatchBody(input, { id: `match-${idNumber}`, seq });
  return { ...dataset, matches: [...dataset.matches, match] };
}

// Replaces one existing match in place from raw input, preserving its original
// id and seq (so chronological order and links are untouched). Throws if the id
// is unknown. The unfinished-only precondition is enforced by callers (the write
// endpoint); this is the pure body-swap they share with the GitHub-editor fallback.
export function replaceMatch(dataset: DeucelineDataset, id: string, input: NewMatchInput): DeucelineDataset {
  const index = dataset.matches.findIndex((match) => match.id === id);
  if (index === -1) throw new Error(`Unknown match id: ${id}`);

  const existing = dataset.matches[index];
  const next = buildMatchBody(input, { id: existing.id, seq: existing.seq });
  const matches = dataset.matches.map((match, i) => (i === index ? next : match));
  return { ...dataset, matches };
}

// The exact text that belongs in public/data/deuceline-data.json.
export function serializeDataset(dataset: DeucelineDataset): string {
  return `${JSON.stringify(dataset, null, 2)}\n`;
}
