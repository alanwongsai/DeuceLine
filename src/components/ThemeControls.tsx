import { useEffect, useState } from "react";

const SKINS = [
  ["wimbledon", "Wimbledon"],
  ["roland-garros", "Roland-Garros"],
  ["us-open", "US Open"],
  ["australian-open", "Australian Open"],
] as const;
type Skin = typeof SKINS[number][0];
type Mode = "day" | "evening";

// These are device preferences only. Match data still comes from the repository.
function readPreferences(): { skin: Skin; mode: Mode } {
  try {
    const saved = JSON.parse(localStorage.getItem("deuceline-appearance") ?? "null");
    return {
      skin: SKINS.some(([key]) => key === saved?.skin) ? saved.skin : "wimbledon",
      mode: saved?.mode === "evening" ? "evening" : "day",
    };
  } catch {
    return { skin: "wimbledon", mode: "day" };
  }
}

export function ThemeControls() {
  const [appearance, setAppearance] = useState(readPreferences);
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.skin = appearance.skin;
    root.dataset.mode = appearance.mode;
    const color = getComputedStyle(root).getPropertyValue("--base").trim();
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", color);
    try { localStorage.setItem("deuceline-appearance", JSON.stringify(appearance)); } catch { /* Storage may be unavailable. */ }
  }, [appearance]);

  return (
    <header className="appearance-header">
      <div className="brandbar">
        <div><span className="brand">Deuceline</span><span className="brand-caption">Matchday Journal · v{__APP_VERSION__}</span></div>
        <button className="mode-button" type="button" aria-label="Evening mode" aria-pressed={appearance.mode === "evening"}
          onClick={() => setAppearance((value) => ({ ...value, mode: value.mode === "day" ? "evening" : "day" }))}>
          {appearance.mode === "day" ? "Evening" : "Daylight"}
        </button>
      </div>
      <div className="theme-picker" role="group" aria-label="Grand Slam appearance">
        {SKINS.map(([key, label]) => <button key={key} type="button" data-theme={key} aria-pressed={appearance.skin === key}
          onClick={() => setAppearance((value) => ({ ...value, skin: key }))}><i aria-hidden="true" />{label}</button>)}
      </div>
    </header>
  );
}
