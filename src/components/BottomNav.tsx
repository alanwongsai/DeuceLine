type BottomNavProps = {
  activeView: "overview" | "matches";
  onAdd: () => void;
  onChange: (view: "overview" | "matches") => void;
};

export function BottomNav({ activeView, onAdd, onChange }: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label="Primary navigation">
      <button
        className={`nav-item ${activeView === "overview" ? "active" : ""}`}
        type="button"
        aria-pressed={activeView === "overview"}
        onClick={() => onChange("overview")}
      >
        <img src="./assets/icons/book-open.svg" alt="" aria-hidden="true" />
        Overview
      </button>
      <button className="add-button" type="button" onClick={onAdd} aria-label="Add match">
        <img src="./assets/icons/plus.svg" alt="" aria-hidden="true" />
      </button>
      <button
        className={`nav-item ${activeView === "matches" ? "active" : ""}`}
        type="button"
        aria-pressed={activeView === "matches"}
        onClick={() => onChange("matches")}
      >
        <img src="./assets/icons/menu.svg" alt="" aria-hidden="true" />
        Matches
      </button>
    </nav>
  );
}
