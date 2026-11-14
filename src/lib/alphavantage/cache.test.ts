import { describe, expect, it, vi } from "vitest";
import { cached, type KeyValueStore } from "@/lib/alphavantage/cache";

/** An in-memory store that records what was written. */
function fakeStore(initial: Record<string, unknown> = {}) {
  const data = new Map<string, unknown>(Object.entries(initial));
  const store: KeyValueStore = {
    get: async (key) => data.get(key) ?? null,
    set: async (key, value) => {
      data.set(key, value);
    },
  };
  return { store, data };
}

const HOUR = 60 * 60 * 1000;
const NOW = 1_000_000_000_000;
const now = () => NOW;

describe("cached", () => {
  it("returns a fresh stored value without fetching", async () => {
    const { store } = fakeStore({ k: { value: "old", fetchedAt: NOW - HOUR } });
    const fetchFresh = vi.fn(async () => "new");
    const result = await cached("k", 24 * HOUR, fetchFresh, { store, now });
    expect(result).toEqual({
      value: "old",
      fetchedAt: NOW - HOUR,
      stale: false,
    });
    expect(fetchFresh).not.toHaveBeenCalled();
  });

  it("fetches and stores when nothing is stored", async () => {
    const { store, data } = fakeStore();
    const result = await cached("k", HOUR, async () => "new", { store, now });
    expect(result).toEqual({ value: "new", fetchedAt: NOW, stale: false });
    expect(data.get("k")).toEqual({ value: "new", fetchedAt: NOW });
  });

  it("refreshes a value older than maxAge", async () => {
    const { store, data } = fakeStore({
      k: { value: "old", fetchedAt: NOW - 25 * HOUR },
    });
    const result = await cached("k", 24 * HOUR, async () => "new", {
      store,
      now,
    });
    expect(result.value).toBe("new");
    expect(data.get("k")).toEqual({ value: "new", fetchedAt: NOW });
  });

  it("returns the old value, marked stale, when the refresh fails", async () => {
    const { store, data } = fakeStore({
      k: { value: "old", fetchedAt: NOW - 25 * HOUR },
    });
    const result = await cached(
      "k",
      24 * HOUR,
      async () => {
        throw new Error("rate limited");
      },
      { store, now },
    );
    expect(result).toEqual({
      value: "old",
      fetchedAt: NOW - 25 * HOUR,
      stale: true,
    });
    // The failure is not written; the old entry is untouched.
    expect(data.get("k")).toEqual({ value: "old", fetchedAt: NOW - 25 * HOUR });
  });

  it("passes the error on when it fails and nothing is stored", async () => {
    const { store, data } = fakeStore();
    await expect(
      cached(
        "k",
        HOUR,
        async () => {
          throw new Error("rate limited");
        },
        { store, now },
      ),
    ).rejects.toThrow("rate limited");
    expect(data.has("k")).toBe(false);
  });

  it("shares one fetch between simultaneous callers", async () => {
    const { store } = fakeStore();
    const fetchFresh = vi.fn(async () => "new");
    const [a, b] = await Promise.all([
      cached("shared", HOUR, fetchFresh, { store, now }),
      cached("shared", HOUR, fetchFresh, { store, now }),
    ]);
    expect(fetchFresh).toHaveBeenCalledTimes(1);
    expect(a.value).toBe("new");
    expect(b.value).toBe("new");
  });

  it("ignores stored data with an unexpected shape", async () => {
    const { store } = fakeStore({ k: "garbage" });
    const result = await cached("k", HOUR, async () => "new", { store, now });
    expect(result.value).toBe("new");
  });

  it("still works when the store itself fails", async () => {
    const store: KeyValueStore = {
      get: async () => {
        throw new Error("store down");
      },
      set: async () => {
        throw new Error("store down");
      },
    };
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await cached("k", HOUR, async () => "new", { store, now });
    expect(result.value).toBe("new");
    warn.mockRestore();
  });
});
