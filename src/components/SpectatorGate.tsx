import { FormEvent, useRef, useState } from "react";
import { Modal } from "./Modal";
import { checkPublishKey, storePassword } from "./publishKey";

type SpectatorGateProps = {
  eyebrow: string;
  onClose: () => void;
  // Called once the owner has entered the password; the sheet then shows the form.
  onUnlock: (key: string) => void;
};

// What a visitor sees after tapping + (or Update result) on a device that has no
// stored publish password: a Hawk-Eye replay calling the challenge OUT. The owner
// gets in through "I'm meltcado", which checks the password before opening the
// form. This is courtesy, not security — the write endpoints check the password
// on every submit regardless.
export function SpectatorGate({ eyebrow, onClose, onUnlock }: SpectatorGateProps) {
  const [askingKey, setAskingKey] = useState(false);
  const [key, setKey] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dismissRef = useRef<(() => void) | null>(null);

  const onSubmitKey = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = key.trim();
    if (!trimmed) {
      setError("Enter the publish password first.");
      return;
    }
    setChecking(true);
    setError(null);
    const result = await checkPublishKey(trimmed);
    setChecking(false);
    if (result === "rejected") {
      setError("Challenge unsuccessful again. That's not the password.");
      return;
    }
    if (result === "limited") {
      setError("Out of challenges. Too many wrong passwords, so try again in an hour.");
      return;
    }
    // Only a confirmed key is remembered; an unchecked one is re-checked on submit.
    if (result === "ok") storePassword(trimmed);
    onUnlock(trimmed);
  };

  return (
    <Modal key="gate" titleId="spectatorGateTitle" eyebrow={eyebrow} title="Hawk-Eye replay" onClose={onClose} dismissRef={dismissRef}>
      <div className="hawkeye">
        <svg className="hawkeye-court" viewBox="0 0 240 96" aria-hidden="true">
          <rect x="0" y="0" width="240" height="96" rx="12" style={{ fill: "var(--court)" }} />
          <rect x="150" y="0" width="90" height="96" style={{ fill: "var(--sheet-solid)", opacity: 0.16 }} />
          <line x1="150" y1="0" x2="150" y2="96" strokeWidth="5" style={{ stroke: "var(--sheet-solid)" }} />
          <text x="75" y="54" textAnchor="middle" className="hawkeye-zone">IN</text>
          <text x="208" y="86" textAnchor="middle" className="hawkeye-zone">OUT</text>
          <g className="hawkeye-mark">
            <ellipse cx="172" cy="48" rx="13" ry="8" fill="#d8ec46" style={{ stroke: "var(--sheet-solid)" }} strokeWidth="2" />
          </g>
        </svg>
        <p className="hawkeye-call">OUT!</p>
        <p className="hawkeye-sub">Challenge unsuccessful.</p>
        <p className="hawkeye-line">No no, only meltcado can add this.</p>
      </div>

      {askingKey ? (
        <form className="sheet-actions" onSubmit={onSubmitKey}>
          <label className="field">
            <span className="field-label">Publish password</span>
            <input
              className="text-input"
              type="password"
              value={key}
              autoComplete="off"
              autoFocus
              onChange={(event) => {
                setKey(event.target.value);
                setError(null);
              }}
            />
          </label>
          {error ? (
            <p className="publish-error" role="alert">
              {error}
            </p>
          ) : null}
          <button className="primary-button" type="submit" disabled={checking}>
            {checking ? "Checking…" : "Overrule the call"}
          </button>
        </form>
      ) : (
        <div className="sheet-actions">
          <button className="primary-button" type="button" onClick={() => dismissRef.current?.()}>
            Fine, I'll just watch
          </button>
          <button className="hawkeye-owner" type="button" onClick={() => setAskingKey(true)}>
            I'm meltcado →
          </button>
        </div>
      )}
    </Modal>
  );
}
