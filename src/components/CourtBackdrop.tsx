import { Player, PlayerKey } from "../domain/schema";

// A stylised top-down tennis court drawn behind the hero score. The net sits at
// the horizontal centre (under the score divider) and each half is faintly
// tinted in that player's identity colour. Decorative only.
export function CourtBackdrop({ players }: { players: Record<PlayerKey, Player> }) {
  return (
    <svg
      className="court-backdrop"
      viewBox="0 0 360 240"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <rect x="0" y="0" width="180" height="240" fill={players.alan.color} opacity="0.2" />
      <rect x="180" y="0" width="180" height="240" fill={players.opponent.color} opacity="0.2" />
      <g fill="none" stroke="#f8fff2" strokeOpacity="0.5" strokeWidth="2" strokeLinejoin="round">
        <rect x="36" y="44" width="288" height="152" rx="3" />
        <line x1="36" y1="64" x2="324" y2="64" />
        <line x1="36" y1="176" x2="324" y2="176" />
        <line x1="102" y1="64" x2="102" y2="176" />
        <line x1="258" y1="64" x2="258" y2="176" />
        <line x1="102" y1="120" x2="258" y2="120" />
      </g>
      <line x1="180" y1="40" x2="180" y2="200" stroke="#f8fff2" strokeOpacity="0.72" strokeWidth="3" />
    </svg>
  );
}
