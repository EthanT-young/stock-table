import { describe, expect, it } from "vitest";
import {
  NOT_AVAILABLE,
  formatDate,
  formatMarketCap,
  formatPercent,
  formatPrice,
  formatShortDate,
  formatUsd,
  formatVolume,
  orNotAvailable,
  toSentenceCase,
} from "@/lib/format";

describe("orNotAvailable", () => {
  it("shows N/A for missing values", () => {
    expect(orNotAvailable(null, formatPrice)).toBe(NOT_AVAILABLE);
    expect(orNotAvailable(undefined, formatPrice)).toBe("N/A");
  });

  it("formats present values, including zero", () => {
    expect(orNotAvailable(0, formatPrice)).toBe("0.00");
    expect(orNotAvailable(237.49, formatUsd)).toBe("$237.49");
  });
});

describe("prices and volume", () => {
  it("formats prices with two decimals and thousands separators", () => {
    expect(formatPrice(237.49)).toBe("237.49");
    expect(formatPrice(1234.5)).toBe("1,234.50");
    expect(formatUsd(237.49)).toBe("$237.49");
  });

  it("formats volume as a whole number with separators", () => {
    expect(formatVolume(42186500)).toBe("42,186,500");
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
