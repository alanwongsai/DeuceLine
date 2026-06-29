# Maintenance Log

Keep this file for known follow-ups that are intentionally outside the current MVP scope.

## Backlog

- Tighten detailed set-score validation before expanding score tracking.
  - Current runtime validation rejects tied sets and tied match outcomes, but it does not enforce full tennis scoring rules.
  - Examples still worth catching later: impossible set scores, inconsistent tiebreak winners, and tiebreak details on non-`7-6` sets.
  - This is intentionally deferred because V1 mostly records finished-match summaries, and detailed per-set scoring is not yet a primary workflow.
