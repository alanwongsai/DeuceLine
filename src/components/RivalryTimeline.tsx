import { Cadence, Player, PlayerKey, TimelinePoint } from "../domain/schema";

type RivalryTimelineProps = {
  timeline: TimelinePoint[];
  cadence: Cadence;
  players: Record<PlayerKey, Player>;
};

// SVG canvas in user units (scaled to the panel width via viewBox).
const W = 300;
const H = 120;
const PAD_X = 10;
const PAD_Y = 14;
const MID_Y = H / 2;

const xAt = (index: number, count: number) =>
  count <= 1 ? W / 2 : PAD_X + (index / (count - 1)) * (W - PAD_X * 2);

// The rivalry timeline: a lead curve (cumulative Alan−Andy over every finished
// match), a rolling-form sparkline, and the date-derived cadence. The curve is
// indexed by match order, so it reads correctly even when early matches have no
// date — dates only enrich the cadence strip below.
export function RivalryTimeline({ timeline, cadence, players }: RivalryTimelineProps) {
  const count = timeline.length;
  const last = timeline[count - 1];
  const maxAbsLead = Math.max(1, ...timeline.map((p) => Math.abs(p.lead)));
  const leadY = (lead: number) => MID_Y - (lead / maxAbsLead) * (MID_Y - PAD_Y);
  const leadPoints = timeline.map((p, i) => `${xAt(i, count)},${leadY(p.lead)}`).join(" ");

  const leaderCaption = (() => {
    if (!last) return "No finished matches yet";
    if (last.lead === 0) return `Level at ${last.cumulative.alan}—${last.cumulative.opponent} after ${count}`;
    const key: PlayerKey = last.lead > 0 ? "alan" : "opponent";
    return `${players[key].displayName} ahead by ${Math.abs(last.lead)} after ${count} match${count === 1 ? "" : "es"}`;
  })();

  const chartLabel = last
    ? `Cumulative match lead. ${leaderCaption}.`
    : "Cumulative match lead. No finished matches yet.";

  return (
    <section className="panel panel-timeline" aria-label="Rivalry timeline">
      <div className="panel-header">
        <h2>Rivalry timeline</h2>
        <span>{count > 0 ? `Match 1 → ${count}` : "—"}</span>
      </div>

      <figure className="timeline-figure">
        <svg className="timeline-lead" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={chartLabel}>
          {/* Zero line — the rivalry drawn level. Above = Alan, below = Andy. */}
          <line x1={PAD_X} y1={MID_Y} x2={W - PAD_X} y2={MID_Y} className="timeline-baseline" />
          {count > 1 ? (
            <polyline points={leadPoints} className="timeline-line" fill="none" />
          ) : null}
          {timeline.map((p, i) => (
            <circle
              key={p.matchId}
              cx={xAt(i, count)}
              cy={leadY(p.lead)}
              r={3.5}
              fill={players[p.winner].color}
            />
          ))}
        </svg>
        <div className="timeline-axis" aria-hidden="true">
          <span style={{ color: players.alan.color }}>{players.alan.displayName} ahead ↑</span>
          <span style={{ color: players.opponent.color }}>↓ {players.opponent.displayName} ahead</span>
        </div>
      </figure>

      <p className="timeline-caption">{leaderCaption}</p>

      <div className="cadence-strip" aria-label="Match cadence">
        <div className="cadence-cell">
          <strong>{cadence.daysSinceLast === null ? "—" : `${cadence.daysSinceLast}d`}</strong>
          <span>Since last</span>
        </div>
        <div className="cadence-cell">
          <strong>{cadence.datedCount === 0 ? "—" : cadence.playedLast30}</strong>
          <span>Last 30d</span>
        </div>
        <div className="cadence-cell">
          <strong>{cadence.datedCount === 0 ? "—" : cadence.playedLast90}</strong>
          <span>Last 90d</span>
        </div>
      </div>
      {cadence.undatedCount > 0 ? (
        <p className="cadence-note">
          + {cadence.undatedCount} earlier match{cadence.undatedCount === 1 ? "" : "es"} without a recorded date
        </p>
      ) : null}

      {count > 1 ? (
        <div className="form-trend">
          <div className="form-trend-head">
            <span style={{ color: players.alan.color }}>{players.alan.displayName} form</span>
            <span>Rolling last 5 · {Math.round(last.rollingWinRateAlan * 100)}%</span>
          </div>
          <svg
            className="timeline-form"
            viewBox={`0 0 ${W} 48`}
            role="img"
            aria-label={`${players.alan.displayName} rolling win rate over the last five matches, currently ${Math.round(
              last.rollingWinRateAlan * 100,
            )} percent.`}
          >
            <line x1={PAD_X} y1={24} x2={W - PAD_X} y2={24} className="timeline-baseline" />
            <polyline
              points={timeline.map((p, i) => `${xAt(i, count)},${48 - PAD_Y - p.rollingWinRateAlan * (48 - PAD_Y * 2)}`).join(" ")}
              className="timeline-line timeline-line-form"
              fill="none"
              style={{ stroke: players.alan.color }}
            />
          </svg>
        </div>
      ) : null}
    </section>
  );
}
