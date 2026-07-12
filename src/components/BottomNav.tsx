type BottomNavProps = {
  activeView: "overview" | "matches";
  addDisabled?: boolean;
  onAdd: () => void;
  onChange: (view: "overview" | "matches") => void;
};

export function BottomNav({ activeView, addDisabled = false, onAdd, onChange }: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label="Primary navigation">
      <button
        className={`nav-item ${activeView === "overview" ? "active" : ""}`}
        type="button"
        aria-current={activeView === "overview" ? "page" : undefined}
        onClick={() => onChange("overview")}
      >
        <img src="./assets/icons/book-open.svg" alt="" aria-hidden="true" />
        Overview
      </button>
      <button className="add-button" type="button" onClick={onAdd} aria-label="Add match" disabled={addDisabled}>
        <img src="./assets/icons/plus.svg" alt="" aria-hidden="true" />
      </button>
      <button
        className={`nav-item ${activeView === "matches" ? "active" : ""}`}
        type="button"
        aria-current={activeView === "matches" ? "page" : undefined}
        onClick={() => onChange("matches")}
      >
        <img src="./assets/icons/menu.svg" alt="" aria-hidden="true" />
        Matches
      </button>
    </nav>
  );
}
