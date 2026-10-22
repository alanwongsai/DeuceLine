import { describe, expect, it } from "vitest";
import { checkPublishKey } from "./_publish";
import { clientBucket, FailureStore, limitFailures, MAX_FAILURES, WINDOW_SECONDS } from "./_rateLimit";

// In-memory stand-in for Workers KV: records the TTL of each write, can fail.
function memoryKv(options: { explode?: boolean } = {}) {
  const values = new Map<string, string>();
  const ttls: number[] = [];
  const store: FailureStore = {
    async get(key) {
      if (options.explode) throw new Error("kv down");
      return values.get(key) ?? null;
    },
    async put(key, value, { expirationTtl }) {
      if (options.explode) throw new Error("kv down");
      values.set(key, value);
      ttls.push(expirationTtl);
    },
  };
  return { store, values, ttls };
}

const config = { GITHUB_TOKEN: "token", ADD_MATCH_PASSWORD: "secret" };
const attempt = (store: FailureStore | undefined, key: string, ip: string | null = "1.2.3.4") =>
  limitFailures(store, ip, () => checkPublishKey(config, key));

describe("limitFailures", () => {
  it("counts wrong passwords per IP with a sliding window", async () => {
    const { store, values, ttls } = memoryKv();
    expect((await attempt(store, "nope"))?.status).toBe(401);
    expect((await attempt(store, "nope"))?.status).toBe(401);
    expect(values.get("fail:1.2.3.4")).toBe("2");
    expect(ttls).toEqual([WINDOW_SECONDS, WINDOW_SECONDS]);
  });

  it("does not count a correct password or a misconfigured publisher", async () => {
    const { store, values } = memoryKv();
    expect(await attempt(store, "secret")).toBeNull();
    expect((await limitFailures(store, "1.2.3.4", () => checkPublishKey({}, "x")))?.status).toBe(500);
    expect(values.size).toBe(0);
  });

  it("locks an IP out after the cap, even with the right password", async () => {
    const { store } = memoryKv();
    for (let i = 0; i < MAX_FAILURES; i += 1) expect((await attempt(store, "nope"))?.status).toBe(401);
    expect((await attempt(store, "nope"))?.status).toBe(429);
    expect((await attempt(store, "secret"))?.status).toBe(429);
    // Another IP is unaffected.
    expect(await attempt(store, "secret", "5.6.7.8")).toBeNull();
  });

  it("fails open to the plain check without a store, an IP, or a working KV", async () => {
    expect((await attempt(undefined, "nope"))?.status).toBe(401);
    expect(await attempt(undefined, "secret")).toBeNull();
    expect(await attempt(memoryKv().store, "secret", null)).toBeNull();
    const broken = memoryKv({ explode: true }).store;
    expect((await attempt(broken, "nope"))?.status).toBe(401);
    expect(await attempt(broken, "secret")).toBeNull();
  });
});

describe("clientBucket", () => {
  it("keeps IPv4 as is and groups IPv6 by /64", () => {
    expect(clientBucket("1.2.3.4")).toBe("1.2.3.4");
    expect(clientBucket("2001:0DB8:0000:0001:aaaa:bbbb:cccc:dddd")).toBe("2001:db8:0:1::/64");
    expect(clientBucket("2001:db8:0:1::5")).toBe("2001:db8:0:1::/64");
    expect(clientBucket("2001:db8::1")).toBe("2001:db8:0:0::/64");
    expect(clientBucket("::1")).toBe("0:0:0:0::/64");
  });

  it("locks out a whole IPv6 /64 together", async () => {
    const { store } = memoryKv();
    for (let i = 0; i < MAX_FAILURES; i += 1) await attempt(store, "nope", `2001:db8:0:1::${i + 1}`);
    expect((await attempt(store, "secret", "2001:db8:0:1::ffff"))?.status).toBe(429);
    expect(await attempt(store, "secret", "2001:db8:0:2::1")).toBeNull();
  });
});
