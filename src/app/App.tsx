import { useEffect, useMemo, useState } from "react";
import { BottomNav } from "../components/BottomNav";
import { loadDataset } from "../data/loadDataset";
import { DeucelineDataset } from "../domain/schema";
import { DatasetValidationError } from "../domain/validateDataset";
import { MatchesPage } from "../pages/MatchesPage";
import { OverviewPage } from "../pages/OverviewPage";

type ViewKey = "overview" | "matches";

export function App() {
  const [dataset, setDataset] = useState<DeucelineDataset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ViewKey>("overview");
  const [isAddOpen, setIsAddOpen] = useState(false);

  useEffect(() => {
    loadDataset()
      .then(setDataset)
      .catch((reason: unknown) => {
        if (reason instanceof DatasetValidationError) {
          setError(reason.issues.join("\n"));
          return;
        }
        setError(reason instanceof Error ? reason.message : "Unknown dataset error.");
      });
  }, []);

  const content = useMemo(() => {
    if (error) return <ErrorState message={error} />;
    if (!dataset) return <LoadingState />;
    if (activeView === "matches") return <MatchesPage dataset={dataset} />;
    return <OverviewPage dataset={dataset} />;
  }, [activeView, dataset, error]);

  return (
    <div className="app-shell">
      {content}
      <BottomNav activeView={activeView} onAdd={() => setIsAddOpen(true)} onChange={setActiveView} />
      {isAddOpen ? <AddMatchPlaceholder onClose={() => setIsAddOpen(false)} /> : null}
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

function ErrorState({ message }: { message: string }) {
  return (
    <main className="state-panel error-panel">
      <p className="eyebrow">Dataset Error</p>
      <h1>Data needs attention</h1>
      <pre>{message}</pre>
    </main>
  );
}

function AddMatchPlaceholder({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="addMatchTitle" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="eyebrow">Add Match</p>
            <h2 id="addMatchTitle">Coming next</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close add match dialog">
            ×
          </button>
        </div>
        <p>
          V1 reads from <code>public/data/deuceline-data.json</code> so everyone opening the GitHub Pages link sees the same record.
        </p>
        <p>For now, add matches by editing that JSON file. The future editor should commit back to the repo or use a protected sync flow.</p>
        <button className="primary-button" type="button" onClick={onClose}>
          Got it
        </button>
      </section>
    </div>
  );
}
