// Wrong-password limiter for the Cloudflare Functions. Files whose name starts
// with "_" are not routed by Cloudflare Pages.
//
// The shared password is the only write gate, so guessing it must be slow: after
// MAX_FAILURES wrong passwords from one IP, that IP is refused (429) — even with
// the right password — until WINDOW_SECONDS pass without another wrong try. The
// count lives in Workers KV (binding RATE_LIMIT), so it covers every hostname the
// Functions answer on, pages.dev included. KV is eventually consistent, so the
// cap is approximate across Cloudflare locations; that's fine for slowing guesses.
// With no binding (local dev, or before it's configured) it fails open to the
// plain password check — the same behaviour as before the limiter existed.

import { PublishResult } from "./_publish";

export const MAX_FAILURES = 10;
export const WINDOW_SECONDS = 60 * 60;

// The slice of Workers KV used here, so tests can pass an in-memory fake.
export interface FailureStore {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options: { expirationTtl: number }): Promise<void>;
}

// The counter key for a client address. An IPv6 user typically controls a whole
// /64 and can hop addresses inside it freely, so IPv6 is counted per /64 prefix.
export function clientBucket(ip: string): string {
  if (!ip.includes(":")) return ip;
  const [head, tail = ""] = ip.split("::");
  const headGroups = head ? head.split(":") : [];
  const tailGroups = ip.includes("::") && tail ? tail.split(":") : [];
  const missing = 8 - headGroups.length - tailGroups.length;
  const groups = ip.includes("::") ? [...headGroups, ...Array(missing).fill("0"), ...tailGroups] : headGroups;
  return `${groups.slice(0, 4).map((group) => group.toLowerCase().replace(/^0+(?=.)/, "")).join(":")}::/64`;
}

export async function limitFailures(
  store: FailureStore | undefined,
  ip: string | null,
  check: () => PublishResult | null,
): Promise<PublishResult | null> {
  if (!store || !ip) return check();
  const key = `fail:${clientBucket(ip)}`;

  // A KV hiccup must not lock the owner out, so read errors count as zero.
  const failures = Number(await store.get(key).catch(() => null)) || 0;
  if (failures >= MAX_FAILURES) {
    return { status: 429, body: { error: "Too many wrong passwords. Try again in an hour." } };
  }

  const denied = check();
  if (denied?.status === 401) {
    await store.put(key, String(failures + 1), { expirationTtl: WINDOW_SECONDS }).catch(() => undefined);
  }
  return denied;
}
