import { Player, PlayerKey } from "../domain/schema";

// The hero scoreboard IS a full top-down tennis court, split down the net: the
// left half is tinted in Alan's identity colour, the right half in Andy's. White
// chalk lines draw the full court (doubles box, service boxes, centre + service
// lines, baseline marks); a soft dark "pocket" sits behind each player's score so
// the big numbers stay readable over the court markings. Decorative only — half
// colours come from the dataset (players); chalk/net/pocket are skin tokens, set
// via inline style because SVG presentation attributes don't resolve var().
export function CourtBackdrop({ players }: { players: Record<PlayerKey, Player> }) {
  return (
    <svg
      className="court-backdrop"
      viewBox="0 0 360 240"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="court-pocket-left" cx="0.5" cy="0.46" r="0.62">
          <stop offset="0" style={{ stopColor: "var(--court-pocket)", stopOpacity: 0.5 }} />
          <stop offset="1" style={{ stopColor: "var(--court-pocket)", stopOpacity: 0 }} />
        </radialGradient>
        <radialGradient id="court-pocket-right" cx="0.5" cy="0.46" r="0.62">
          <stop offset="0" style={{ stopColor: "var(--court-pocket)", stopOpacity: 0.5 }} />
          <stop offset="1" style={{ stopColor: "var(--court-pocket)", stopOpacity: 0 }} />
        </radialGradient>
      </defs>

      <rect x="0" y="0" width="180" height="240" fill={players.alan.color} />
      <rect x="180" y="0" width="180" height="240" fill={players.opponent.color} />
      <rect x="0" y="0" width="360" height="240" style={{ fill: "var(--court-lighten)" }} />

      <g
        fill="none"
        strokeWidth="2"
        strokeLinecap="square"
        strokeLinejoin="round"
        style={{ stroke: "var(--court-line)" }}
      >
        <rect x="24" y="30" width="312" height="180" />
        <line x1="24" y1="54" x2="336" y2="54" />
        <line x1="24" y1="186" x2="336" y2="186" />
        <line x1="84" y1="54" x2="84" y2="186" />
        <line x1="276" y1="54" x2="276" y2="186" />
        <line x1="84" y1="120" x2="276" y2="120" />
        <line x1="24" y1="114" x2="24" y2="126" />
        <line x1="336" y1="114" x2="336" y2="126" />
      </g>

      <rect x="0" y="0" width="180" height="240" fill="url(#court-pocket-left)" />
      <rect x="180" y="0" width="180" height="240" fill="url(#court-pocket-right)" />

      <line
        x1="180"
        y1="22"
        x2="180"
        y2="218"
        strokeWidth="4.5"
        style={{ stroke: "var(--court-net)" }}
      />
    </svg>
  );
}
