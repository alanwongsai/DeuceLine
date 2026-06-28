import { DeucelineDataset, Match, PlayerKey, SetScore, SURFACES } from "./schema";
import { deriveMatchResult } from "./deriveStats";

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

  if (value.schemaVersion !== 1) {
    issues.push("schemaVersion must be 1.");
  }

  const rivalry = value.rivalry;
  if (!isRecord(rivalry)) {
    issues.push("rivalry must exist.");
  } else {
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

  (["alan", "opponent"] satisfies PlayerKey[]).forEach((playerKey) => {
    const player = value[playerKey];
    if (!isRecord(player)) {
      issues.push(`rivalry.players.${playerKey} must exist.`);
      return;
    }
    if (!isNonEmptyString(player.displayName)) {
      issues.push(`rivalry.players.${playerKey}.displayName is required.`);
    }
  });
}

function validateMatches(matches: unknown[], issues: string[]) {
  const ids = new Set<string>();

  matches.forEach((match, index) => {
    if (!isRecord(match)) {
      issues.push(`matches[${index}] must be an object.`);
      return;
    }

    const id = String(match.id ?? "");
    if (!isNonEmptyString(match.id)) {
      issues.push(`matches[${index}].id is required.`);
    } else if (ids.has(id)) {
      issues.push(`Duplicate match id: ${id}.`);
    } else {
      ids.add(id);
    }

    if (!isIsoDate(match.date)) {
      issues.push(`${matchLabel(match, index)} date must be YYYY-MM-DD.`);
    }

    if (typeof match.surface !== "string" || !SURFACES.includes(match.surface as never)) {
      issues.push(`${matchLabel(match, index)} surface must be hard, clay, grass, or astro.`);
    }

    if ("location" in match && match.location !== undefined && typeof match.location !== "string") {
      issues.push(`${matchLabel(match, index)} location must be a string.`);
    }

    if ("notes" in match && match.notes !== undefined && typeof match.notes !== "string") {
      issues.push(`${matchLabel(match, index)} notes must be a string.`);
    }

    validateSets(match.sets, matchLabel(match, index), issues);
  });
}

function validateSets(value: unknown, label: string, issues: string[]) {
  if (!Array.isArray(value) || value.length === 0) {
    issues.push(`${label} sets must be a non-empty array.`);
    return;
  }

  value.forEach((set, index) => {
    validateSetScore(set, `${label} sets[${index}]`, issues);
  });

  const typedSets = value.filter(isValidSetShape) as SetScore[];
  if (typedSets.length !== value.length) return;

  if (typedSets.some((set) => set.alan === set.opponent)) {
    issues.push(`${label} cannot include a tied set.`);
    return;
  }

  const result = deriveMatchResult({ id: "validation", date: "2000-01-01", surface: "hard", sets: typedSets });
  if (result.matchScore.alan === result.matchScore.opponent) {
    issues.push(`${label} cannot end with a tied match score.`);
  }
}

function validateSetScore(value: unknown, label: string, issues: string[]) {
  if (!isRecord(value)) {
    issues.push(`${label} must be an object.`);
    return;
  }

  if (!isNonNegativeInteger(value.alan)) issues.push(`${label}.alan must be a non-negative integer.`);
  if (!isNonNegativeInteger(value.opponent)) issues.push(`${label}.opponent must be a non-negative integer.`);

  if ("tiebreak" in value && value.tiebreak !== undefined) {
    if (!isRecord(value.tiebreak)) {
      issues.push(`${label}.tiebreak must be an object.`);
    } else {
      if (!isNonNegativeInteger(value.tiebreak.alan)) issues.push(`${label}.tiebreak.alan must be a non-negative integer.`);
      if (!isNonNegativeInteger(value.tiebreak.opponent)) issues.push(`${label}.tiebreak.opponent must be a non-negative integer.`);
    }
  }
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

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function matchLabel(match: Record<string, unknown>, index: number): string {
  return isNonEmptyString(match.id) ? `match ${match.id}` : `matches[${index}]`;
}
