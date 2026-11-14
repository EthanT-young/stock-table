import { describe, expect, it } from "vitest";
import { AlphaVantageError } from "@/lib/alphavantage/parse";
import {
  buildSectorMap,
  parseEtfProfile,
  type EtfProfile,
} from "@/lib/alphavantage/sectors";

// Trimmed from real ETF_PROFILE responses for XLK and XLF (2026-11-13).
const xlkBody = {
  net_assets: "...",
  sectors: [
    { sector: "INFORMATION TECHNOLOGY", weight: "0.993" },
    { sector: "COMMUNICATION SERVICES", weight: "0.00" },
  ],
  holdings: [
    { symbol: "NVDA", description: "NVIDIA CORP", weight: "0.1492" },
    { symbol: "AAPL", description: "APPLE INC", weight: "0.1436" },
    { symbol: "MSFT", description: "MICROSOFT CORP", weight: "0.1128" },
    {
      symbol: "n/a",
      description: "XAK TECHNOLOGY DEC26 XCME 20261218",
      weight: "0.0007",
    },
  ],
};
const xlfBody = {
  sectors: [
    { sector: "FINANCIALS", weight: "0.852" },
    { sector: "CONSUMER DISCRETIONARY", weight: "0.016" },
  ],
  holdings: [
    {
      symbol: "BRK-B",
      description: "BERKSHIRE HATHAWAY INC CLASS B",
      weight: "0.1292",
    },
    { symbol: "JPM", description: "JPMORGAN CHASE & CO", weight: "0.1122" },
    { symbol: "V", description: "VISA INC CLASS A", weight: "0.0891" },
  ],
};

describe("parseEtfProfile", () => {
  it("picks the highest-weighted sector and skips n/a holdings", () => {
    const profile = parseEtfProfile(xlkBody);
    expect(profile.topSector).toBe("INFORMATION TECHNOLOGY");
    expect(profile.holdings.map((h) => h.symbol)).toEqual([
      "NVDA",
      "AAPL",
      "MSFT",
    ]);
    expect(profile.holdings[1].weight).toBeCloseTo(0.1436);
  });

  it("accepts a top sector below 90% (the financials fund reports 85.2%)", () => {
    expect(parseEtfProfile(xlfBody).topSector).toBe("FINANCIALS");
  });

  it("throws on an error body or a missing holdings list", () => {
    expect(() =>
      parseEtfProfile({
        Information: "Our standard API rate limit is 25 requests per day.",
      }),
    ).toThrow(AlphaVantageError);
    expect(() => parseEtfProfile({ sectors: [] })).toThrow(AlphaVantageError);
  });
});

describe("buildSectorMap", () => {
  const profiles = [parseEtfProfile(xlkBody), parseEtfProfile(xlfBody)];

  it("maps each wanted company to its fund's sector", () => {
    expect(buildSectorMap(profiles, ["AAPL", "JPM", "V"])).toEqual({
      AAPL: "INFORMATION TECHNOLOGY",
      JPM: "FINANCIALS",
      V: "FINANCIALS",
    });
  });

  it("leaves out companies not held by any fund", () => {
    expect(buildSectorMap(profiles, ["AAPL", "XOM"])).toEqual({
      AAPL: "INFORMATION TECHNOLOGY",
    });
  });

  it("prefers the fund where the company has the larger weight", () => {
    const overlapping: EtfProfile[] = [
      { topSector: "SMALL", holdings: [{ symbol: "AAPL", weight: 0.01 }] },
      { topSector: "BIG", holdings: [{ symbol: "AAPL", weight: 0.2 }] },
    ];
    expect(buildSectorMap(overlapping, ["AAPL"])).toEqual({ AAPL: "BIG" });
  });

  it("ignores funds with no sector information", () => {
    const noSector: EtfProfile[] = [
      { topSector: null, holdings: [{ symbol: "AAPL", weight: 0.5 }] },
    ];
    expect(buildSectorMap(noSector, ["AAPL"])).toEqual({});
  });
});
