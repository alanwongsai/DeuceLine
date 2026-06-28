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

  return (
    <main className="screen">
      <header className="app-header">
        <p className="eyebrow">Track the rivalry. Set by set.</p>
        <h1>Deuceline</h1>
        <p>{dataset.rivalry.title}</p>
      </header>

      <section className="hero-score" aria-label="Head-to-head score">
        <div className="score-grid">
          <ScoreSide name={playerNames.alan} value={stats.matchRecord.alan} />
          <span className="score-divider">—</span>
          <ScoreSide name={playerNames.opponent} value={stats.matchRecord.opponent} />
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
          <span>{playerNames.alan}—{playerNames.opponent}</span>
        </div>
        <div className="surface-list">
          {SURFACES.map((surface) => {
            const row = stats.surfaceSplit[surface];
            return (
              <div className="surface-row" key={surface}>
                <span>{surfaceLabels[surface]}</span>
                <div className="surface-track">
                  <div className={`surface-fill surface-${surface}`} style={{ width: `${row.played ? Math.max(10, (row.alan / row.played) * 100) : 0}%` }} />
                </div>
                <strong>
                  {row.alan}—{row.opponent}
                </strong>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function ScoreSide({ name, value }: { name: string; value: number }) {
  return (
    <div className="score-side">
      <span>{name}</span>
      <strong>{value}</strong>
    </div>
  );
}
