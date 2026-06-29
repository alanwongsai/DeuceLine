import { useState } from "react";
import { CourtBackdrop } from "../components/CourtBackdrop";
import { MatchDetail } from "../components/MatchDetail";
import { StatCard } from "../components/StatCard";
import { deriveOverviewStats } from "../domain/deriveStats";
import { DeucelineDataset, Match, PlayerKey, Surface, SURFACES } from "../domain/schema";

const surfaceLabels: Record<Surface, string> = {
  hard: "Hard",
  clay: "Clay",
  grass: "Grass",
  astro: "Astro",
};

export function OverviewPage({ dataset }: { dataset: DeucelineDataset }) {
  const stats = deriveOverviewStats(dataset.matches);
  const players = dataset.rivalry.players;
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const playerNames = {
    alan: players.alan.displayName,
    opponent: players.opponent.displayName,
  };
  const lead = stats.matchRecord.alan - stats.matchRecord.opponent;
  const leaderText =
    lead === 0
      ? "Rivalry is level"
      : `${lead > 0 ? playerNames.alan : playerNames.opponent} leads by ${Math.abs(lead)} match${Math.abs(lead) === 1 ? "" : "es"}`;
  const streakWinner = stats.currentStreak.winner;
  const winRate = (key: PlayerKey) =>
    stats.totalMatches === 0 ? 0 : Math.round((stats.matchRecord[key] / stats.totalMatches) * 100);
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
        <CourtBackdrop players={players} />
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
          {stats.recentForm.map((item) => {
            const match = dataset.matches.find((candidate) => candidate.id === item.matchId);
            return (
              <button
                type="button"
                className="form-dot"
                key={item.matchId}
                style={{ background: players[item.winner].color }}
                onClick={() => match && setSelectedMatch(match)}
                aria-label={`${playerNames[item.winner]} won — open match detail`}
              >
                {players[item.winner].abbr}
              </button>
            );
          })}
        </div>
      </section>

      <section className="stat-grid" aria-label="Rivalry statistics">
        <StatCard label="Match record" value={`${stats.matchRecord.alan}—${stats.matchRecord.opponent}`} />
        <StatCard label="Set record" value={`${stats.setRecord.alan}—${stats.setRecord.opponent}`} />
        <StatCard label="Win rate" value={`${winRate("alan")}% · ${winRate("opponent")}%`} />
        <StatCard
          label="Current streak"
          value={streakWinner ? String(stats.currentStreak.count) : "—"}
          detail={streakWinner ? playerNames[streakWinner] : undefined}
          accentColor={streakWinner ? players[streakWinner].color : undefined}
        />
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>By surface</h2>
          <span className="surface-legend">
            <span className="legend-item">
              <i className="legend-dot" style={{ background: players.alan.color }} aria-hidden="true" />
              {playerNames.alan}
            </span>
            <span className="legend-item">
              <i className="legend-dot" style={{ background: players.opponent.color }} aria-hidden="true" />
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
                      <span className="h2h-fill" style={{ width: `${(row.alan / played) * 100}%`, background: players.alan.color }} />
                      <span className="h2h-fill" style={{ width: `${(row.opponent / played) * 100}%`, background: players.opponent.color }} />
                    </>
                  ) : null}
                </div>
                <strong>{played ? `${row.alan}—${row.opponent}` : "—"}</strong>
              </div>
            );
          })}
        </div>
      </section>

      {selectedMatch ? (
        <MatchDetail
          match={selectedMatch}
          players={players}
          matches={dataset.matches}
          onClose={() => setSelectedMatch(null)}
        />
      ) : null}
    </main>
  );
}
