// The publish password is stored on this device only — never in the bundle — so
// a visitor with just the link can't reach the write path. It's a credential,
// not canonical data, so localStorage is fine here (see AGENTS.md). A stored key
// also marks this device as the owner's: the add/update sheet skips the
// spectator gate when one is present.
const PASSWORD_KEY = "deuceline.addMatchKey";
const CHECK_ENDPOINT = "/api/check-key";

export function readStoredPassword(): string {
  try {
    return localStorage.getItem(PASSWORD_KEY) ?? "";
  } catch {
    return "";
  }
}

export function storePassword(value: string): void {
  try {
    localStorage.setItem(PASSWORD_KEY, value);
  } catch {
    /* localStorage may be unavailable (private mode); the GitHub-editor fallback still works. */
  }
}

export function clearStoredPassword(): void {
  try {
    localStorage.removeItem(PASSWORD_KEY);
  } catch {
    /* ignore */
  }
}

// "ok": the server accepted the key. "rejected": wrong password. "unknown": the
// check itself couldn't run (offline, Function missing or misconfigured) — the
// write endpoints still check the key on submit, so the caller may let it through.
export type KeyCheck = "ok" | "rejected" | "unknown";

export async function checkPublishKey(key: string): Promise<KeyCheck> {
  try {
    const response = await fetch(CHECK_ENDPOINT, { method: "POST", headers: { "x-deuceline-key": key } });
    if (response.ok) return "ok";
    return response.status === 401 ? "rejected" : "unknown";
  } catch {
    return "unknown";
  }
}
