// validateDataset speaks in dataset paths ("match match-15 sets[0] …") because
// it guards the whole JSON file. The add/update form shows the same issues to a
// person entering one match, so this rewrites them in form terms. It only
// rewords — the rules stay in validateDataset, and anything unrecognised falls
// through with just the match prefix removed.

const REWRITES: ReadonlyArray<[RegExp, (match: RegExpMatchArray) => string]> = [
  [/^cannot end with a tied match score\.$/, () => "It's one set all — enter the match tiebreak (or third set), or mark the match Unfinished."],
  [/^matchScore cannot be tied\.$/, () => "Sets won can't be level for a finished match — fix the tally, or mark the match Unfinished."],
  [/^matchScore must record at least one set\.$/, () => "Enter the sets won."],
  [/^matchScore\.(alan|opponent) must be a non-negative integer\.$/, () => "Sets won: enter a whole number for both players."],
  [/^sets must be a non-empty array\.$/, () => "Enter at least one set score."],
  [/^cannot include a tied set\.$/, () => "A set can't finish level — check the games."],
  [/^has a set after the match was already won/, () => "The match was already won in two sets — clear the extra set."],
  [/^sets\[(\d+)\] (\d+)-(\d+) is not a valid set score (.*)$/, (m) => `Set ${Number(m[1]) + 1}: ${m[2]}-${m[3]} isn't a valid set score ${m[4]}`],
  [/^sets\[(\d+)\]\.(alan|opponent) must be a non-negative integer\.$/, (m) => `Set ${Number(m[1]) + 1}: enter games for both players.`],
  [/^sets\[(\d+)\]\.tiebreak\.(alan|opponent) must be a non-negative integer\.$/, (m) => `Set ${Number(m[1]) + 1} tiebreak: enter points for both players.`],
  [/^sets\[(\d+)\]\.tiebreak (.*)$/, (m) => `Set ${Number(m[1]) + 1} tiebreak ${m[2]}`],
  [/^matchTiebreak\.(alan|opponent) must be a non-negative integer\.$/, () => "Match tiebreak: enter points for both players."],
  [/^matchTiebreak decides the match, so the match cannot be unfinished\.$/, () => "A match tiebreak decides the match — mark it Finished, or clear the tiebreak."],
  [/^matchTiebreak (.*)$/, (m) => `Match tiebreak ${m[1]}`],
  [/^tempC .*$/, () => "Temperature must be a number between -30 and 55 °C."],
  [/^date must be YYYY-MM-DD/, () => "Pick a valid date."],
];

export function describeFormIssue(issue: string): string {
  // Ids are generated without spaces ("match-15"), so the prefix ends at the next space.
  const bare = issue.replace(/^match \S+ /, "");
  for (const [pattern, rewrite] of REWRITES) {
    const found = bare.match(pattern);
    if (found) return rewrite(found);
  }
  return bare.charAt(0).toUpperCase() + bare.slice(1);
}
