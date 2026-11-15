import { describe, expect, it } from "vitest";
import { AlphaVantageError } from "@/lib/alphavantage/parse";
import {
  parseListingStatus,
  parseOverview,
  parseSharesOutstanding,
} from "@/lib/alphavantage/parse-company";

const PREMIUM_ENDPOINT =
  "Thank you for using Alpha Vantage! This is a premium endpoint. You may subscribe to any of the premium plans at https://www.alphavantage.co/premium/ to instantly unlock all premium endpoints";

describe("parseOverview", () => {
  it("throws a premium error for a free key", () => {
    try {
      parseOverview({ Information: PREMIUM_ENDPOINT });
      expect.unreachable("should have thrown");
    } catch (error) {
      expect((error as AlphaVantageError).kind).toBe("premium");
    }
  });

  it("reads the fields the page shows", () => {
    // Trimmed from a real (older) AAPL OVERVIEW response.
    const overview = parseOverview({
      Symbol: "AAPL",
      AssetType: "Common Stock",
      Name: "Apple Inc",
      Description:
        "Apple Inc. is an American multinational technology company...",
      Exchange: "NASDAQ",
      Country: "USA",
      Sector: "TECHNOLOGY",
      Industry: "ELECTRONIC COMPUTERS",
      MarketCapitalization: "3352782701000",
      PERatio: "35.37",
    });
    expect(overview).toEqual({
      symbol: "AAPL",
      assetType: "Common Stock",
      name: "Apple Inc",
      description:
        "Apple Inc. is an American multinational technology company...",
      exchange: "NASDAQ",
      sector: "TECHNOLOGY",
      industry: "ELECTRONIC COMPUTERS",
      marketCap: 3352782701000,
      country: "USA",
    });
  });

  it('turns "None", "-", empty and missing fields into null', () => {
    const overview = parseOverview({
      Symbol: "XYZ",
      Description: "None",
      Sector: "-",
      Industry: "",
      MarketCapitalization: "None",
    });
    expect(overview.description).toBeNull();
    expect(overview.sector).toBeNull();
    expect(overview.industry).toBeNull();
    expect(overview.marketCap).toBeNull();
    expect(overview.country).toBeNull();
  });

  it("throws for an empty response", () => {
    expect(() => parseOverview({})).toThrow(AlphaVantageError);
  });
});

describe("parseListingStatus", () => {
  // Real rows from LISTING_STATUS (2026-11-13).
  const csv = [
    "symbol,name,exchange,assetType,ipoDate,delistingDate,status",
    "A,Agilent Technologies Inc,NYSE,Stock,1999-11-18,null,Active",
    "AAPL,Apple Inc,NASDAQ,Stock,1980-12-12,null,Active",
    "GOOGL,Alphabet Inc - Class A,NASDAQ,Stock,2004-08-19,null,Active",
    "V,Visa Inc - Class A,NYSE,Stock,2008-03-19,null,Active",
  ].join("\r\n");

  it("keeps only the wanted symbols", () => {
    expect(parseListingStatus(csv, ["AAPL", "V"])).toEqual([
      {
        symbol: "AAPL",
        name: "Apple Inc",
        exchange: "NASDAQ",
        assetType: "Stock",
      },
      {
        symbol: "V",
        name: "Visa Inc - Class A",
        exchange: "NYSE",
        assetType: "Stock",
      },
    ]);
  });

  it("does not match symbols that only share a prefix", () => {
    expect(parseListingStatus(csv, ["AA"])).toEqual([]);
  });

  it("throws on a JSON error body", () => {
    expect(() =>
      parseListingStatus(
        JSON.stringify({
          Information: "Our standard API rate limit is 25 requests per day.",
        }),
        ["AAPL"],
      ),
    ).toThrow(AlphaVantageError);
  });

  it("throws when a column is missing", () => {
    expect(() =>
      parseListingStatus("symbol,name\nAAPL,Apple Inc", ["AAPL"]),
    ).toThrow(/exchange/);
  });
});

describe("parseSharesOutstanding", () => {
  it("returns the newest quarter's share count, with rows out of order", () => {
    // Trimmed from a real AAPL response (2026-11-13), rows deliberately out of order.
    const result = parseSharesOutstanding({
      symbol: "AAPL",
      status: "success",
      data: [
        {
          date: "2026-06-30",
          shares_outstanding_diluted: "14714676000",
          shares_outstanding_basic: "14714676000",
        },
        {
          date: "2026-09-30",
          shares_outstanding_diluted: "14630318000",
          shares_outstanding_basic: "14630318000",
        },
      ],
    });
    expect(result).toEqual({ date: "2026-09-30", shares: 14630318000 });
  });

  it("prefers the basic share count over diluted", () => {
    const result = parseSharesOutstanding({
      data: [
        {
          date: "2026-09-30",
          shares_outstanding_basic: "3200000000",
          shares_outstanding_diluted: "3500000000",
        },
      ],
    });
    expect(result.shares).toBe(3200000000);
  });

  it("uses the diluted count when basic is missing or not a number", () => {
    const result = parseSharesOutstanding({
      data: [
        { date: "2026-09-30", shares_outstanding_diluted: "3500000000" },
        {
          date: "2026-06-30",
          shares_outstanding_basic: "None",
          shares_outstanding_diluted: "3400000000",
        },
      ],
    });
    expect(result).toEqual({ date: "2026-09-30", shares: 3500000000 });
    expect(
      parseSharesOutstanding({
        data: [
          {
            date: "2026-06-30",
            shares_outstanding_basic: "None",
            shares_outstanding_diluted: "3400000000",
          },
        ],
      }).shares,
    ).toBe(3400000000);
  });

  it("ignores rows without a valid date", () => {
    const result = parseSharesOutstanding({
      data: [
        { shares_outstanding_basic: "999" },
        { date: "latest", shares_outstanding_basic: "888" },
        { date: "2026-09-30", shares_outstanding_basic: "1000" },
      ],
    });
    expect(result).toEqual({ date: "2026-09-30", shares: 1000 });
  });

  it("skips a newer row that has no share count", () => {
    const result = parseSharesOutstanding({
      data: [
        { date: "2026-09-30", shares_outstanding_basic: "None" },
        { date: "2026-06-30", shares_outstanding_basic: "1000" },
      ],
    });
    expect(result).toEqual({ date: "2026-06-30", shares: 1000 });
  });

  it("throws when there is no data", () => {
    expect(() => parseSharesOutstanding({ symbol: "AAPL", data: [] })).toThrow(
      AlphaVantageError,
    );
  });

  it("throws an AlphaVantageError when no row is usable", () => {
    for (const data of [
      ["2026-09-30", 42, null],
      [{ date: "2026-09-30" }, { shares_outstanding_basic: "1000" }],
    ]) {
      expect(
        () => parseSharesOutstanding({ data }),
        JSON.stringify(data),
      ).toThrow(AlphaVantageError);
    }
  });
});
