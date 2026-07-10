import { useEffect, useMemo, useState } from "react";
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

  const content = useMemo(() => {
    if (error) return <ErrorState message={error} onRetry={refreshDataset} />;
    if (!dataset) return <LoadingState />;
    if (activeView === "matches") return <MatchesPage dataset={dataset} onUpdateMatch={setEditingMatch} />;
    return <OverviewPage dataset={dataset} onUpdateMatch={setEditingMatch} />;
  }, [activeView, dataset, error]);

  return (
    <div className="app-shell">
      {content}
      <BottomNav activeView={activeView} onAdd={() => setIsAddOpen(true)} onChange={setActiveView} />
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
      <p className="eyebrow">Deuceline</p>
      <h1>Loading rivalry data</h1>
      <p>Reading the shared repo-hosted dataset.</p>
    </main>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <main className="state-panel error-panel">
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
    </main>
  );
}
