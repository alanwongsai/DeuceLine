type BottomNavProps = {
  activeView: "overview" | "matches";
  onAdd: () => void;
  onChange: (view: "overview" | "matches") => void;
};

export function BottomNav({ activeView, onAdd, onChange }: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label="Primary navigation">
      <button className={`nav-item ${activeView === "overview" ? "active" : ""}`} type="button" onClick={() => onChange("overview")}>
        <span aria-hidden="true">⌁</span>
        Overview
      </button>
      <button className="add-button" type="button" onClick={onAdd} aria-label="Add match">
        +
      </button>
      <button className={`nav-item ${activeView === "matches" ? "active" : ""}`} type="button" onClick={() => onChange("matches")}>
        <span aria-hidden="true">≡</span>
        Matches
      </button>
    </nav>
  );
}
