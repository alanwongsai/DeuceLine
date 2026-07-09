import { DeucelineDataset, PlayerKey, SetScore, SURFACES, WEATHER_TAGS } from "./schema";
import { deriveSetWinner } from "./deriveStats";

export class DatasetValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Invalid Deuceline dataset:\n${issues.join("\n")}`);
    this.name = "DatasetValidationError";
  }
}

export function validateDataset(value: unknown): DeucelineDataset {
  const issues: string[] = [];

  if (!isRecord(value)) {
    throw new DatasetValidationError(["Dataset must be an object."]);
  }

  validateKnownKeys(value, "dataset", ["schemaVersion", "rivalry", "matches"], issues);

  if (value.schemaVersion !== 2) {
    issues.push("schemaVersion must be 2.");
  }

  const rivalry = value.rivalry;
  if (!isRecord(rivalry)) {
    issues.push("rivalry must exist.");
  } else {
    validateKnownKeys(rivalry, "rivalry", ["id", "title", "players"], issues);
    if (!isNonEmptyString(rivalry.id)) issues.push("rivalry.id is required.");
    if (!isNonEmptyString(rivalry.title)) issues.push("rivalry.title is required.");
    validatePlayers(rivalry.players, issues);
  }

  if (!Array.isArray(value.matches)) {
    issues.push("matches must be an array.");
  } else {
    validateMatches(value.matches, issues);
  }

  if (issues.length > 0) {
    throw new DatasetValidationError(issues);
  }

  return value as DeucelineDataset;
}

function validatePlayers(value: unknown, issues: string[]) {
  if (!isRecord(value)) {
    issues.push("rivalry.players must exist.");
    return;
  }

  validateKnownKeys(value, "rivalry.players", ["alan", "opponent"], issues);

  (["alan", "opponent"] satisfies PlayerKey[]).forEach((playerKey) => {
    const player = value[playerKey];
    if (!isRecord(player)) {
      issues.push(`rivalry.players.${playerKey} must exist.`);
      return;
    }
    validateKnownKeys(player, `rivalry.players.${playerKey}`, ["displayName", "color", "abbr"], issues);
    if (!isNonEmptyString(player.displayName)) {
      issues.push(`rivalry.players.${playerKey}.displayName is required.`);
    }
    if (!isHexColor(player.color)) {
      issues.push(`rivalry.players.${playerKey}.color must be a hex color like #b85c3d.`);
    }
    if (!isNonEmptyString(player.abbr)) {
      issues.push(`rivalry.players.${playerKey}.abbr is required.`);
    }
  });
}

function validateMatches(matches: unknown[], issues: string[]) {
  const ids = new Set<string>();
  const seqs = new Set<number>();

  matches.forEach((match, index) => {
    if (!isRecord(match)) {
      issues.push(`matches[${index}] must be an object.`);
      return;
    }

    const label = matchLabel(match, index);
    validateKnownKeys(match, label, matchKeys(match), issues);

    const id = String(match.id ?? "");
    if (!isNonEmptyString(match.id)) {
      issues.push(`matches[${index}].id is required.`);
    } else if (ids.has(id)) {
      issues.push(`Duplicate match id: ${id}.`);
    } else {
      ids.add(id);
    }

    if (!isPositiveInteger(match.seq)) {
      issues.push(`${label} seq must be a positive integer.`);
    } else if (seqs.has(match.seq)) {
      issues.push(`Duplicate match seq: ${match.seq}.`);
    } else {
      seqs.add(match.seq);
    }

    // date is optional, but must be a real YYYY-MM-DD when present.
    if (match.date !== undefined && !isIsoDate(match.date)) {
      issues.push(`${label} date must be YYYY-MM-DD when present.`);
    }

    if (typeof match.surface !== "string" || !SURFACES.includes(match.surface as never)) {
      issues.push(`${label} surface must be hard, clay, grass, or astro.`);
    }

    if (match.location !== undefined && typeof match.location !== "string") {
      issues.push(`${label} location must be a string.`);
    }

    if (match.notes !== undefined && typeof match.notes !== "string") {
      issues.push(`${label} notes must be a string.`);
    }

    validateConditions(match.conditions, label, issues);

    // tempC is optional; a rough phone reading, so a wide sane range, no decimals rule.
    if (match.tempC !== undefined && (typeof match.tempC !== "number" || !Number.isFinite(match.tempC) || match.tempC < -30 || match.tempC > 55)) {
      issues.push(`${label} tempC must be a number between -30 and 55 when present.`);
    }

    // status is optional; when present it must be exactly "unfinished".
    if (match.status !== undefined && match.status !== "unfinished") {
      issues.push(`${label} status must be "unfinished" when present.`);
    }

    validateFidelity(match, label, issues);
  });
}

function validateConditions(value: unknown, label: string, issues: string[]) {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    issues.push(`${label} conditions must be an array when present.`);
    return;
  }
  const seen = new Set<unknown>();
  value.forEach((tag) => {
    if (typeof tag !== "string" || !WEATHER_TAGS.includes(tag as never)) {
      issues.push(`${label} conditions has unknown weather tag: ${String(tag)}.`);
    } else if (seen.has(tag)) {
      issues.push(`${label} conditions has a duplicate weather tag: ${tag}.`);
    } else {
      seen.add(tag);
    }
  });
}

function validateFidelity(match: Record<string, unknown>, label: string, issues: string[]) {
  // An unfinished match has no winner yet, so the "must be decisive" checks are
  // relaxed for it (a tied match score is allowed). Bad-data checks still apply.
  const isUnfinished = match.status === "unfinished";
  if (match.fidelity === "sets") {
    validateSets(match.sets, label, issues, isUnfinished);
  } else if (match.fidelity === "matchScore") {
    validateMatchScore(match.matchScore, label, issues, isUnfinished);
  } else {
    issues.push(`${label} fidelity must be "sets" or "matchScore".`);
  }
}

function validateSets(value: unknown, label: string, issues: string[], isUnfinished: boolean) {
  if (!Array.isArray(value) || value.length === 0) {
    issues.push(`${label} sets must be a non-empty array.`);
    return;
  }

  value.forEach((set, index) => {
    validateSetScore(set, `${label} sets[${index}]`, issues);
  });

  const typedSets = value.filter(isValidSetShape) as SetScore[];
  if (typedSets.length !== value.length) return;

  // A single tied set is bad data regardless of match status.
  if (typedSets.some((set) => set.alan === set.opponent)) {
    issues.push(`${label} cannot include a tied set.`);
    return;
  }

  if (isUnfinished) return;

  const tally = { alan: 0, opponent: 0 };
  typedSets.forEach((set) => {
    tally[deriveSetWinner(set)] += 1;
  });
  if (tally.alan === tally.opponent) {
    issues.push(`${label} cannot end with a tied match score.`);
  }
}

function validateMatchScore(value: unknown, label: string, issues: string[], isUnfinished: boolean) {
  if (!isRecord(value)) {
    issues.push(`${label} matchScore must be an object.`);
    return;
  }

  validateKnownKeys(value, `${label} matchScore`, ["alan", "opponent"], issues);

  const { alan, opponent } = value;
  if (!isNonNegativeInteger(alan) || !isNonNegativeInteger(opponent)) {
    if (!isNonNegativeInteger(alan)) issues.push(`${label} matchScore.alan must be a non-negative integer.`);
    if (!isNonNegativeInteger(opponent)) issues.push(`${label} matchScore.opponent must be a non-negative integer.`);
    return;
  }

  // A tied tally is only allowed while the match is unfinished.
  if (!isUnfinished && alan === opponent) {
    issues.push(`${label} matchScore cannot be tied.`);
  }
  if (alan + opponent === 0) {
    issues.push(`${label} matchScore must record at least one set.`);
  }
}

function validateSetScore(value: unknown, label: string, issues: string[]) {
  if (!isRecord(value)) {
    issues.push(`${label} must be an object.`);
    return;
  }

  validateKnownKeys(value, label, ["alan", "opponent", "tiebreak"], issues);

  if (!isNonNegativeInteger(value.alan)) issues.push(`${label}.alan must be a non-negative integer.`);
  if (!isNonNegativeInteger(value.opponent)) issues.push(`${label}.opponent must be a non-negative integer.`);

  if (value.tiebreak !== undefined) {
    if (!isRecord(value.tiebreak)) {
      issues.push(`${label}.tiebreak must be an object.`);
    } else {
      validateKnownKeys(value.tiebreak, `${label}.tiebreak`, ["alan", "opponent"], issues);
      if (!isNonNegativeInteger(value.tiebreak.alan)) issues.push(`${label}.tiebreak.alan must be a non-negative integer.`);
      if (!isNonNegativeInteger(value.tiebreak.opponent)) issues.push(`${label}.tiebreak.opponent must be a non-negative integer.`);
    }
  }
}

function validateKnownKeys(value: Record<string, unknown>, label: string, allowedKeys: string[], issues: string[]) {
  const allowed = new Set(allowedKeys);
  Object.keys(value).forEach((key) => {
    if (!allowed.has(key)) {
      issues.push(`${label} has unknown field: ${key}.`);
    }
  });
}

function matchKeys(match: Record<string, unknown>): string[] {
  const baseKeys = ["id", "seq", "date", "surface", "location", "conditions", "tempC", "notes", "status", "fidelity"];
  if (match.fidelity === "sets") return [...baseKeys, "sets"];
  if (match.fidelity === "matchScore") return [...baseKeys, "matchScore"];
  return [...baseKeys, "sets", "matchScore"];
}

function isValidSetShape(value: unknown): value is SetScore {
  return isRecord(value) && isNonNegativeInteger(value.alan) && isNonNegativeInteger(value.opponent);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1;
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function matchLabel(match: Record<string, unknown>, index: number): string {
  return isNonEmptyString(match.id) ? `match ${match.id}` : `matches[${index}]`;
}
