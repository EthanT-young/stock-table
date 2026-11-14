import { describe, expect, it } from "vitest";
import {
  committedSnapshot,
  createSnapshotReader,
  type Snapshot,
} from "@/lib/snapshot";
import { findTicker } from "@/lib/tickers";

const sample: Snapshot = {
  daily: {
    AAPL: {
      fetchedAt: 1,
      value: [{ date: "2026-11-13", close: 356.27, volume: 39029552 }],
    },
  },
  listings: {
    AAPL: {
      fetchedAt: 2,
      value: {
        symbol: "AAPL",
        name: "Apple Inc",
        exchange: "NASDAQ",
        assetType: "Stock",
      },
    },
  },
  shares: {
    AAPL: { fetchedAt: 3, value: { date: "2026-09-30", shares: 14630318000 } },
  },
  sectors: { fetchedAt: 4, value: { AAPL: "INFORMATION TECHNOLOGY" } },
  overviewPremium: { fetchedAt: 5, value: true },
};

describe("createSnapshotReader", () => {
  const reader = createSnapshotReader(sample);

  it("returns stored items with their fetch time", () => {
    expect(reader.daily("AAPL")?.value[0].close).toBe(356.27);
    expect(reader.listing("AAPL")?.value.name).toBe("Apple Inc");
    expect(reader.shares("AAPL")?.fetchedAt).toBe(3);
    expect(reader.sector("AAPL")).toBe("INFORMATION TECHNOLOGY");
    expect(reader.overviewPremium()?.value).toBe(true);
  });

  it("returns null for missing items", () => {
    expect(reader.daily("MSFT")).toBeNull();
    expect(reader.listing("MSFT")).toBeNull();
    expect(reader.shares("MSFT")).toBeNull();
    expect(reader.sector("MSFT")).toBeNull();
  });

  it("handles a snapshot with no sector or OVERVIEW data yet", () => {
    const empty = createSnapshotReader({
      daily: {},
      listings: {},
      shares: {},
      sectors: null,
      overviewPremium: null,
    });
    expect(empty.sector("AAPL")).toBeNull();
    expect(empty.overviewPremium()).toBeNull();
  });
});

// Checks on the real file in src/data/snapshot.json, so a bad refresh is caught by `npm test`.
describe("committed snapshot", () => {
  it("only contains symbols from the collection", () => {
    const symbols = [
      ...Object.keys(committedSnapshot.daily),
      ...Object.keys(committedSnapshot.listings),
      ...Object.keys(committedSnapshot.shares),
      ...Object.keys(committedSnapshot.sectors?.value ?? {}),
    ];
    for (const symbol of symbols) {
      expect(findTicker(symbol), symbol).toBeDefined();
    }
  });

  it("stores daily prices newest first, with valid numbers", () => {
    for (const [symbol, item] of Object.entries(committedSnapshot.daily)) {
      const dates = item.value.map((day) => day.date);
      expect(dates, symbol).toEqual([...dates].sort().reverse());
      for (const day of item.value) {
        expect(day.close, `${symbol} ${day.date}`).toBeGreaterThan(0);
        expect(Number.isInteger(day.volume), `${symbol} ${day.date}`).toBe(
          true,
        );
      }
    }
  });

  it("records a fetch time on every item", () => {
    const items = [
      ...Object.values(committedSnapshot.daily),
      ...Object.values(committedSnapshot.listings),
      ...Object.values(committedSnapshot.shares),
    ];
    for (const item of items) {
      expect(item.fetchedAt).toBeGreaterThan(0);
    }
  });
});
