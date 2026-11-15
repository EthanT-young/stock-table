import { describe, expect, it } from "vitest";
import {
  formatCompactVolume,
  formatDate,
  formatMarketCap,
  formatPercent,
  formatPrice,
  formatShortDate,
  formatUsd,
  formatVolume,
  toSentenceCase,
} from "@/lib/format";

describe("prices and volume", () => {
  it("formats prices with two decimals and thousands separators", () => {
    expect(formatPrice(237.49)).toBe("237.49");
    expect(formatPrice(1234.5)).toBe("1,234.50");
    expect(formatUsd(237.49)).toBe("$237.49");
  });

  it("formats volume as a whole number with separators", () => {
    expect(formatVolume(42186500)).toBe("42,186,500");
  });

  it("shortens volume with K, M and B suffixes for phones", () => {
    expect(formatCompactVolume(45234567)).toBe("45.2M");
    expect(formatCompactVolume(1300000000)).toBe("1.3B");
    expect(formatCompactVolume(980000)).toBe("980.0K");
    expect(formatCompactVolume(12000000)).toBe("12.0M");
  });
});

describe("formatPercent", () => {
  it("adds a plus sign to gains and a minus sign to losses", () => {
    expect(formatPercent(1.18)).toBe("+1.18%");
    expect(formatPercent(-0.43)).toBe("−0.43%");
  });

  it("rounds to two decimals", () => {
    expect(formatPercent(12.8449)).toBe("+12.84%");
    expect(formatPercent(-0.716)).toBe("−0.72%");
  });

  it("shows values that round to zero without a sign", () => {
    expect(formatPercent(0)).toBe("0.00%");
    expect(formatPercent(0.004)).toBe("0.00%");
    expect(formatPercent(-0.004)).toBe("0.00%");
  });
});

describe("formatMarketCap", () => {
  it("uses T, B and M suffixes", () => {
    expect(formatMarketCap(5212343393860)).toBe("$5.21T");
    expect(formatMarketCap(801900000000)).toBe("$801.90B");
    expect(formatMarketCap(950000000)).toBe("$950.00M");
  });

  it("shows small values in full", () => {
    expect(formatMarketCap(12345)).toBe("$12,345");
  });
});

describe("dates", () => {
  it("formats AlphaVantage dates without shifting the day", () => {
    expect(formatDate("2026-11-13")).toBe("Nov 13, 2026");
    expect(formatDate("2026-01-01")).toBe("Jan 01, 2026");
    expect(formatShortDate("2026-11-13")).toBe("Nov 13");
  });
});

describe("toSentenceCase", () => {
  it("converts AlphaVantage's uppercase sector labels", () => {
    expect(toSentenceCase("INFORMATION TECHNOLOGY")).toBe(
      "Information technology",
    );
    expect(toSentenceCase("HEALTHCARE")).toBe("Healthcare");
    expect(toSentenceCase("ENERGY")).toBe("Energy");
  });
});
