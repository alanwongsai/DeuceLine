// Cloudflare Pages Function: POST /api/update-match
//
// The one-tap "complete / edit an in-progress match" endpoint. It replaces a
// single match by id, but ONLY when the stored match is still unfinished — so
// decided history stays immutable through this endpoint.
//
// Precondition semantics (kept identical in code and ENGINE.md so they can't be
// misread): the sole precondition is that the CURRENTLY STORED match at `id` has
// `status === "unfinished"`. The submitted match may stay unfinished (still
// suspended) or become finished (status omitted). Once it is finished, a later
// call for the same id is rejected — the stored match is no longer unfinished.
// Net effect: only a currently-unfinished match is editable; everything decided
// (original or just-completed) is immutable here.
//
// Shares the password gate, least-privilege token, and GitHub plumbing with
// add-match (see _github.ts).

import { NewMatchInput, replaceMatch, serializeDataset } from "../../src/domain/addMatch";
import { isUnfinished } from "../../src/domain/deriveStats";
import { DatasetValidationError, validateDataset } from "../../src/domain/validateDataset";
import { commitDataset, constantTimeEqual, Env, GitHubOpError, json, readCurrentDataset } from "./_github";

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.GITHUB_TOKEN || !env.ADD_MATCH_PASSWORD) {
    return json({ error: "Publisher is not configured." }, 500);
  }

  // 1. Password gate.
  const provided = request.headers.get("x-deuceline-key") ?? "";
  if (!constantTimeEqual(provided, env.ADD_MATCH_PASSWORD)) {
    return json({ error: "Wrong password." }, 401);
  }

  // 2. Read the target id + replacement match.
  let id: string;
  let input: NewMatchInput;
  try {
    const body = (await request.json()) as { id?: string; match?: NewMatchInput };
    if (!body || typeof body !== "object" || typeof body.id !== "string" || !body.match) {
      throw new Error("missing id or match");
    }
    id = body.id;
    input = body.match;
  } catch {
    return json({ error: "Expected a JSON body like { id, match: … }." }, 400);
  }

  try {
    // 3. Read the current canonical dataset (content + sha).
    const { current, sha } = await readCurrentDataset(env.GITHUB_TOKEN);

    // 4. Guard: the stored match must exist and still be unfinished. This is the
    //    check that keeps decided matches immutable through this endpoint.
    const existing = current.matches.find((match) => match.id === id);
    if (!existing) {
      return json({ error: `No match with id ${id}.` }, 404);
    }
    if (!isUnfinished(existing)) {
      return json({ error: "That match is already finished and can't be updated." }, 422);
    }

    // 5. Replace in place (id + seq preserved) and re-validate server-side.
    let next;
    try {
      next = validateDataset(replaceMatch(current, id, input));
    } catch (reason) {
      const issues = reason instanceof DatasetValidationError ? reason.issues : ["Invalid match."];
      return json({ error: "Match rejected.", issues }, 422);
    }

    // 6. Commit and return the full next dataset for immediate client refresh.
    const message = `Update match ${existing.seq}: ${input.surface}${input.date ? ` on ${input.date}` : ""}`;
    await commitDataset(env.GITHUB_TOKEN, serializeDataset(next), message, sha);

    return json({ ok: true, seq: existing.seq, dataset: next }, 200);
  } catch (reason) {
    if (reason instanceof GitHubOpError) {
      return json({ error: reason.message, ...(reason.detail ? { detail: reason.detail } : {}) }, reason.status);
    }
    return json({ error: "Unexpected publish failure." }, 502);
  }
};
