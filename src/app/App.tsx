import { CSSProperties, useEffect, useRef, useState } from "react";
import { AddMatchSheet } from "../components/AddMatchSheet";
import { BottomNav } from "../components/BottomNav";
import { loadDataset } from "../data/loadDataset";
import { DeucelineDataset, Match } from "../domain/schema";
import { DatasetValidationError } from "../domain/validateDataset";
import { MatchesPage } from "../pages/MatchesPage";
import { OverviewPage } from "../pages/OverviewPage";

type ViewKey = "overview" | "matches";

export function App() {
  const [dataset, setDataset] = useState<DeucelineDataset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ViewKey>("overview");
  const [isAddOpen, setIsAddOpen] = useState(false);
  // App is the single owner of the edit sheet, so an unfinished match can be
  // updated from either page without two competing edit-sheet routes.
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const shouldFocusView = useRef(false);

  const refreshDataset = () => {
    setError(null);
    loadDataset()
      .then(setDataset)
      .catch((reason: unknown) => {
        if (reason instanceof DatasetValidationError) {
          setError(reason.issues.join("\n"));
          return;
        }
        setError(reason instanceof Error ? reason.message : "Unknown dataset error.");
      });
  };

  useEffect(() => {
    refreshDataset();
  }, []);

  useEffect(() => {
    if (!dataset || !shouldFocusView.current) return;
    shouldFocusView.current = false;
    window.scrollTo({ top: 0, behavior: "auto" });
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>("[data-page-title]")?.focus({ preventScroll: true });
    });
  }, [activeView, dataset]);

  const changeView = (view: ViewKey) => {
    if (view === activeView) return;
    shouldFocusView.current = true;
    setActiveView(view);
  };

  const content = error ? (
    <ErrorState message={error} onRetry={refreshDataset} />
  ) : !dataset ? (
    <LoadingState />
  ) : activeView === "matches" ? (
    <MatchesPage dataset={dataset} onUpdateMatch={setEditingMatch} />
  ) : (
    <OverviewPage dataset={dataset} onUpdateMatch={setEditingMatch} onShowMatches={() => changeView("matches")} />
  );

  return (
    <div
      className="app-shell"
      style={dataset ? ({ "--player-alan": dataset.rivalry.players.alan.color, "--player-opponent": dataset.rivalry.players.opponent.color } as CSSProperties) : undefined}
    >
      {content}
      <BottomNav
        activeView={activeView}
        addDisabled={!dataset}
        onAdd={() => setIsAddOpen(true)}
        onChange={changeView}
      />
      {isAddOpen && dataset ? (
        <AddMatchSheet dataset={dataset} onClose={() => setIsAddOpen(false)} onPublished={setDataset} />
      ) : null}
      {editingMatch && dataset ? (
        <AddMatchSheet
          dataset={dataset}
          editMatch={editingMatch}
          onClose={() => setEditingMatch(null)}
          onPublished={setDataset}
        />
      ) : null}
    </div>
  );
}

function LoadingState() {
  return (
    <main className="state-panel">
      <div role="status" aria-live="polite">
        <p className="eyebrow">Deuceline</p>
        <h1>Loading rivalry data</h1>
        <p>Reading the shared repo-hosted dataset.</p>
      </div>
    </main>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <main className="state-panel error-panel">
      <div role="alert">
        <p className="eyebrow">Dataset Error</p>
        <h1>Data needs attention</h1>
        <p>Deuceline couldn&apos;t read the latest shared match data. Reload it, then try again.</p>
        <button className="primary-button" type="button" onClick={onRetry}>
          Reload data
        </button>
        <details className="error-details">
          <summary>Technical details</summary>
          <pre>{message}</pre>
        </details>
      </div>
    </main>
  );
}
