import { describe, expect, it } from "vitest";
import { planSnapshotTasks } from "@/lib/snapshot-plan";
import type { Snapshot } from "@/lib/snapshot";
import { TICKERS } from "@/lib/tickers";

const SYMBOLS = TICKERS.map((ticker) => ticker.symbol);
const DAY = 24 * 60 * 60 * 1000;
const NOW = 100 * DAY;

function emptySnapshot(): Snapshot {
  return {
    daily: {},
    listings: {},
    shares: {},
    sectors: null,
    overviewPremium: null,
  };
}

describe("planSnapshotTasks", () => {
  it("plans all 42 requests for an empty snapshot, most valuable first", () => {
    const tasks = planSnapshotTasks(emptySnapshot(), SYMBOLS, NOW);
    expect(tasks).toHaveLength(42);
    expect(tasks.slice(0, 3)).toEqual([
      { kind: "overview-check" },
      { kind: "listing" },
      { kind: "sector-etf", etf: "XLK" },
    ]);
    expect(tasks.filter((t) => t.kind === "sector-etf")).toHaveLength(8);
    expect(tasks.filter((t) => t.kind === "daily")).toHaveLength(16);
    expect(tasks.filter((t) => t.kind === "shares")).toHaveLength(16);
    // Day one (25 requests) ends with 15 companies' daily prices.
    expect(tasks[24]).toEqual({ kind: "daily", symbol: "XOM" });
  });

  it("plans nothing when everything is present", () => {
    const full = emptySnapshot();
    full.overviewPremium = { fetchedAt: NOW, value: true };
    full.sectors = {
      fetchedAt: NOW,
      value: Object.fromEntries(SYMBOLS.map((s) => [s, "SECTOR"])),
    };
    for (const symbol of SYMBOLS) {
      full.daily[symbol] = { fetchedAt: NOW, value: [] };
      full.listings[symbol] = {
        fetchedAt: NOW,
        value: { symbol, name: symbol, exchange: "NYSE", assetType: "Stock" },
      };
      full.shares[symbol] = {
        fetchedAt: NOW,
        value: { date: "2026-09-30", shares: 1 },
      };
    }
    expect(planSnapshotTasks(full, SYMBOLS, NOW)).toEqual([]);
  });

  it("refetches all sector ETFs if any company is missing a sector", () => {
    const partial = emptySnapshot();
    partial.sectors = {
      fetchedAt: NOW,
      value: { AAPL: "INFORMATION TECHNOLOGY" },
    };
    const tasks = planSnapshotTasks(partial, SYMBOLS, NOW);
    expect(tasks.filter((t) => t.kind === "sector-etf")).toHaveLength(8);
  });

  it("only refetches items older than maxAge when one is given", () => {
    const snap = emptySnapshot();
    snap.daily.AAPL = { fetchedAt: NOW - 2 * DAY, value: [] };
    snap.daily.MSFT = { fetchedAt: NOW - DAY / 2, value: [] };
    const daily = planSnapshotTasks(snap, ["AAPL", "MSFT"], NOW, DAY).filter(
      (t) => t.kind === "daily",
    );
    expect(daily).toEqual([{ kind: "daily", symbol: "AAPL" }]);
  });
});
