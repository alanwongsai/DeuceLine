import { StatCard } from "../components/StatCard";
import { deriveOverviewStats } from "../domain/deriveStats";
import { DeucelineDataset, PlayerKey, Surface, SURFACES } from "../domain/schema";

const surfaceLabels: Record<Surface, string> = {
  hard: "Hard",
  clay: "Clay",
  grass: "Grass",
  astro: "Astro",
};

export function OverviewPage({ dataset }: { dataset: DeucelineDataset }) {
  const stats = deriveOverviewStats(dataset.matches);
  const playerNames = {
    alan: dataset.rivalry.players.alan.displayName,
    opponent: dataset.rivalry.players.opponent.displayName,
  };
  const lead = stats.matchRecord.alan - stats.matchRecord.opponent;
  const leaderText =
    lead === 0
      ? "Rivalry is level"
      : `${lead > 0 ? playerNames.alan : playerNames.opponent} leads by ${Math.abs(lead)} match${Math.abs(lead) === 1 ? "" : "es"}`;
  const streak = stats.currentStreak.winner
    ? `${stats.currentStreak.winner === "alan" ? "W" : "L"}${stats.currentStreak.count}`
    : "—";
  const surfacesByPlayed = [...SURFACES].sort(
    (a, b) => stats.surfaceSplit[b].played - stats.surfaceSplit[a].played,
  );

  return (
    <main className="screen">
      <header className="app-header">
        <p className="eyebrow">Track the rivalry. Set by set.</p>
        <h1>Deuceline</h1>
        <p>{dataset.rivalry.title}</p>
      </header>

      <section className="hero-score" aria-label="Head-to-head score">
        <div className="score-grid">
          <span className="score-name score-name-left">{playerNames.alan}</span>
          <span aria-hidden="true" />
          <span className="score-name score-name-right">{playerNames.opponent}</span>
          <strong className="score-val score-val-left">{stats.matchRecord.alan}</strong>
          <span className="score-divider">—</span>
          <strong className="score-val score-val-right">{stats.matchRecord.opponent}</strong>
        </div>
        <p>{leaderText}</p>
        <span>{stats.totalMatches} matches played</span>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Recent form</h2>
          <span>Newest first</span>
        </div>
        <div className="form-row" aria-label="Recent form newest first">
          {stats.recentForm.map((item) => (
            <span className={`form-dot ${item.winner === "alan" ? "win" : "loss"}`} key={item.matchId}>
              {item.winner === "alan" ? "W" : "L"}
            </span>
          ))}
        </div>
      </section>

      <section className="stat-grid" aria-label="Rivalry statistics">
        <StatCard label="Match record" value={`${stats.matchRecord.alan}—${stats.matchRecord.opponent}`} />
        <StatCard label="Set record" value={`${stats.setRecord.alan}—${stats.setRecord.opponent}`} />
        <StatCard label="Deciders" value={`${stats.deciderRecord.alan}—${stats.deciderRecord.opponent}`} />
        <StatCard label="Current streak" value={streak} detail={streak === "—" ? undefined : stats.currentStreak.winner === "alan" ? playerNames.alan : playerNames.opponent} />
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>By surface</h2>
          <span className="surface-legend">
            <span className="legend-item">
              <i className="legend-dot fill-alan" aria-hidden="true" />
              {playerNames.alan}
            </span>
            <span className="legend-item">
              <i className="legend-dot fill-andy" aria-hidden="true" />
              {playerNames.opponent}
            </span>
          </span>
        </div>
        <div className="surface-list">
          {surfacesByPlayed.map((surface) => {
            const row = stats.surfaceSplit[surface];
            const played = row.played;
            return (
              <div className={`surface-row ${played ? "" : "surface-row-empty"}`} key={surface}>
                <span>
                  {surfaceLabels[surface]}
                  {played ? <em className="surface-count"> · {played}</em> : null}
                </span>
                <div className="surface-track surface-h2h">
                  {played ? (
                    <>
                      <span className="h2h-fill fill-alan" style={{ width: `${(row.alan / played) * 100}%` }} />
                      <span className="h2h-fill fill-andy" style={{ width: `${(row.opponent / played) * 100}%` }} />
                    </>
                  ) : null}
                </div>
                <strong>{played ? `${row.alan}—${row.opponent}` : "—"}</strong>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
