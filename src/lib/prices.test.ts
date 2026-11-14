import { describe, expect, it } from "vitest";
import {
  estimateMarketCap,
  percentChange,
  pricesInRange,
  rangeChangePercent,
  withDailyChange,
  type DailyPrice,
} from "@/lib/prices";

// Newest first, like the real data. Nov 07-08, 2026 is a weekend, so it is missing.
const sample: DailyPrice[] = [
  { date: "2026-11-10", close: 110, volume: 300 },
  { date: "2026-11-09", close: 100, volume: 200 },
  { date: "2026-11-06", close: 125, volume: 100 },
];

describe("percentChange", () => {
  it("computes the change in percent", () => {
    expect(percentChange(100, 110)).toBeCloseTo(10);
    expect(percentChange(125, 100)).toBeCloseTo(-20);
  });

  it("returns null when the previous value is zero", () => {
    expect(percentChange(0, 5)).toBeNull();
  });
});

describe("withDailyChange", () => {
  it("compares each day with the previous trading day", () => {
    const rows = withDailyChange(sample);
    expect(rows[0].changePercent).toBeCloseTo(10); // Tue vs Mon
    expect(rows[1].changePercent).toBeCloseTo(-20); // Mon vs the previous Fri
  });

  it("gives the oldest row no change (N/A)", () => {
    const rows = withDailyChange(sample);
    expect(rows[2].changePercent).toBeNull();
  });

  it("keeps date, close and volume", () => {
    const rows = withDailyChange(sample);
    expect(rows[0]).toMatchObject({
      date: "2026-11-10",
      close: 110,
      volume: 300,
    });
  });

  it("handles empty input", () => {
    expect(withDailyChange([])).toEqual([]);
  });
});

describe("pricesInRange", () => {
  const months: DailyPrice[] = [
    { date: "2026-11-13", close: 4, volume: 1 },
    { date: "2026-10-13", close: 3, volume: 1 },
    { date: "2026-10-12", close: 2, volume: 1 },
    { date: "2026-08-13", close: 1, volume: 1 },
    { date: "2026-08-12", close: 1, volume: 1 },
  ];

  it("1M keeps days back to the same date last month", () => {
    expect(pricesInRange(months, "1M").map((d) => d.date)).toEqual([
      "2026-11-13",
      "2026-10-13",
    ]);
  });

  it("3M keeps days back to the same date three months ago", () => {
    expect(pricesInRange(months, "3M")).toHaveLength(4);
  });

  it("100D keeps everything", () => {
    expect(pricesInRange(months, "100D")).toHaveLength(5);
  });

  it("handles empty input", () => {
    expect(pricesInRange([], "1M")).toEqual([]);
  });
});

describe("rangeChangePercent", () => {
  it("measures from the oldest close in range to the latest", () => {
    expect(rangeChangePercent(sample)).toBeCloseTo(-12); // 125 -> 110
  });

  it("returns null with fewer than two days", () => {
    expect(rangeChangePercent(sample.slice(0, 1))).toBeNull();
  });
});

describe("estimateMarketCap", () => {
  it("multiplies shares by the latest close", () => {
    // AAPL figures from our research: 14,630,318,000 shares x $356.27
    expect(estimateMarketCap(14630318000, 356.27)).toBeCloseTo(
      5212343393860,
      -3,
    );
  });
});
