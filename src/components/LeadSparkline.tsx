import { PointerEvent, useEffect, useMemo, useState } from "react";
import { deriveMatchResult } from "../domain/deriveStats";
import { Match, Player, PlayerKey, TimelinePoint } from "../domain/schema";

export type LeadSparklineProps = {
  timeline: TimelinePoint[];
  matches: Match[];
  players: Record<PlayerKey, Player>;
  mode?: "lead" | "rolling";
  highlightMatchId?: string;
  interactive?: boolean;
  ariaLabel: string;
};

const W = 300;
const H = 96;
const PAD_X = 12;
const PAD_Y = 12;

const xAt = (index: number, count: number) =>
  count <= 1 ? W / 2 : PAD_X + (index / (count - 1)) * (W - PAD_X * 2);

export function LeadSparkline({
  timeline,
  matches,
  players,
  mode = "lead",
  highlightMatchId,
  interactive = true,
  ariaLabel,
}: LeadSparklineProps) {
  const highlightedIndex = timeline.findIndex((point) => point.matchId === highlightMatchId);
  const initial = highlightedIndex >= 0 ? highlightedIndex : Math.max(0, timeline.length - 1);
  const [selectedIndex, setSelectedIndex] = useState(initial);
  useEffect(() => {
    const next = timeline.findIndex((point) => point.matchId === highlightMatchId);
    setSelectedIndex(next >= 0 ? next : Math.max(0, timeline.length - 1));
  }, [highlightMatchId, timeline]);
  const selected = timeline[selectedIndex];
  const maxAbsLead = Math.max(1, ...timeline.map((point) => Math.abs(point.lead)));
  const yAt = (point: TimelinePoint) => {
    if (mode === "rolling") return PAD_Y + (1 - point.rollingWinRateAlan) * (H - PAD_Y * 2);
    return H / 2 - (point.lead / maxAbsLead) * (H / 2 - PAD_Y);
  };
  const points = timeline.map((point, index) => `${xAt(index, timeline.length)},${yAt(point)}`).join(" ");
  const matchMap = useMemo(() => new Map(matches.map((match) => [match.id, match])), [matches]);
  const selectedMatch = selected ? matchMap.get(selected.matchId) : undefined;
  const selectedResult = selectedMatch ? deriveMatchResult(selectedMatch) : null;
  const selectedText = selected && selectedResult?.winner
    ? `Match ${selected.seq} · ${selected.date ? formatShortDate(selected.date) : "date unknown"} · ${players[selectedResult.winner].displayName} won · ${selectedResult.matchScore.alan}—${selectedResult.matchScore.opponent}`
    : "No finished match selected";

  const selectFromPointer = (event: PointerEvent<SVGSVGElement>) => {
    if (!interactive || timeline.length < 2) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    setSelectedIndex(Math.round(ratio * (timeline.length - 1)));
  };

  const chart = (
    <svg
      className={`lead-sparkline-svg lead-sparkline-${mode}`}
      viewBox={`0 0 ${W} ${H}`}
      role={interactive ? undefined : "img"}
      aria-hidden={interactive ? true : undefined}
      aria-label={interactive ? undefined : ariaLabel}
      onPointerDown={selectFromPointer}
    >
      <line x1={PAD_X} x2={W - PAD_X} y1={mode === "lead" ? H / 2 : H / 2} y2={mode === "lead" ? H / 2 : H / 2} className="lead-sparkline-baseline" />
      {timeline.length > 1 ? <polyline pathLength={1} points={points} className="lead-sparkline-line" fill="none" /> : null}
      {timeline.map((point, index) => (
        <circle
          key={point.matchId}
          cx={xAt(index, timeline.length)}
          cy={yAt(point)}
          r={index === selectedIndex ? 5 : 3.2}
          fill={players[point.winner].color}
          className={index === selectedIndex ? "lead-sparkline-point is-selected" : "lead-sparkline-point"}
        />
      ))}
      {selected ? (
        <line
          x1={xAt(selectedIndex, timeline.length)}
          x2={xAt(selectedIndex, timeline.length)}
          y1={PAD_Y / 2}
          y2={H - PAD_Y / 2}
          className="lead-sparkline-reference"
        />
      ) : null}
    </svg>
  );

  return (
    <figure className="lead-sparkline" aria-label={ariaLabel}>
      {chart}
      {interactive && timeline.length > 0 ? (
        <input
          className="lead-sparkline-range"
          type="range"
          min={0}
          max={Math.max(0, timeline.length - 1)}
          step={1}
          value={selectedIndex}
          onChange={(event) => setSelectedIndex(Number(event.target.value))}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
              event.preventDefault();
              setSelectedIndex((index) => Math.max(0, index - 1));
            } else if (event.key === "ArrowRight" || event.key === "ArrowUp") {
              event.preventDefault();
              setSelectedIndex((index) => Math.min(timeline.length - 1, index + 1));
            } else if (event.key === "Home") {
              event.preventDefault();
              setSelectedIndex(0);
            } else if (event.key === "End") {
              event.preventDefault();
              setSelectedIndex(timeline.length - 1);
            }
          }}
          aria-label="Explore rivalry by match"
          aria-valuetext={selectedText}
        />
      ) : null}
      <figcaption className="lead-sparkline-caption" aria-live={interactive ? "polite" : undefined}>
        {selectedText}
      </figcaption>
    </figure>
  );
}

function formatShortDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" }).format(new Date(`${value}T12:00:00`));
}
