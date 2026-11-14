import { describe, expect, it } from "vitest";
import type { KeyValueStore } from "@/lib/alphavantage/cache";
import { AlphaVantageError } from "@/lib/alphavantage/parse";
import { createSnapshotReader, type Snapshot } from "@/lib/snapshot";
import { createStockData } from "@/lib/stock-data";
import { TICKERS } from "@/lib/tickers";

const NOW = Date.UTC(2026, 10, 14, 12); // Nov 14, 2026, 12:00 UTC
const SNAPSHOT_TIME = Date.UTC(2026, 10, 13, 3);

const PREMIUM_BODY = JSON.stringify({
  Information:
    "Thank you for using Alpha Vantage! This is a premium endpoint. You may subscribe to any of the premium plans...",
});

const dailyBody = (close: string) =>
  JSON.stringify({
    "Time Series (Daily)": {
      "2026-11-13": { "4. close": close, "5. volume": "1000" },
      "2026-11-12": { "4. close": "100.00", "5. volume": "900" },
    },
  });

/** A LISTING_STATUS answer covering all 16 companies (AAPL and TSLA with real names). */
const LISTING_CSV = [
  "symbol,name,exchange,assetType,ipoDate,delistingDate,status",
  ...TICKERS.map((ticker) => {
    const name =
      { AAPL: "Apple Inc", TSLA: "Tesla Inc" }[ticker.symbol] ??
      ticker.displayName;
    return `${ticker.symbol},${name},NASDAQ,Stock,2000-01-01,null,Active`;
  }),
].join("\n");

const SHARES_BODY = JSON.stringify({
  data: [
    {
      date: "2026-09-30",
      shares_outstanding_diluted: "1000",
      shares_outstanding_basic: "1000",
    },
  ],
});

/** A fake AlphaVantage: answers per function name and counts the requests. */
function fakeApi(answers: Record<string, string | Error>) {
  const calls: string[] = [];
  const fetchText = async (params: Record<string, string>) => {
    const name = params.function;
    calls.push(params.symbol ? `${name} ${params.symbol}` : name);
    const answer = answers[name];
    if (answer === undefined || answer instanceof Error) {
      throw answer ?? new Error(`no fake answer for ${name}`);
    }
    return answer;
  };
  return { fetchText, calls };
}

function memoryStore(): KeyValueStore {
  const data = new Map<string, unknown>();
  return {
    get: async (key) => data.get(key) ?? null,
    set: async (key, value) => {
      data.set(key, value);
    },
  };
}

const sampleSnapshot: Snapshot = {
  daily: {
    AAPL: {
      fetchedAt: SNAPSHOT_TIME,
      value: [{ date: "2026-11-12", close: 50, volume: 10 }],
    },
  },
  listings: {
    AAPL: {
      fetchedAt: SNAPSHOT_TIME,
      value: {
        symbol: "AAPL",
        name: "Apple Inc",
        exchange: "NASDAQ",
        assetType: "Stock",
      },
    },
  },
  shares: {
    AAPL: {
      fetchedAt: SNAPSHOT_TIME,
      value: { date: "2026-06-30", shares: 10 },
    },
  },
  sectors: {
    fetchedAt: SNAPSHOT_TIME,
    value: { AAPL: "INFORMATION TECHNOLOGY" },
  },
  overviewPremium: { fetchedAt: SNAPSHOT_TIME, value: true },
};

const RATE_LIMITED = new AlphaVantageError({
  kind: "rate-limit",
  message: "slow down",
});

function setup(
  answers: Record<string, string | Error>,
  snap: Snapshot = sampleSnapshot,
) {
  const api = fakeApi(answers);
  const data = createStockData({
    fetchText: api.fetchText,
    snapshot: createSnapshotReader(snap),
    cacheOptions: { store: memoryStore(), now: () => NOW },
  });
  return { ...data, calls: api.calls };
}

describe("getDailyPrices", () => {
  it("returns live prices", async () => {
    const { getDailyPrices } = setup({
      TIME_SERIES_DAILY: dailyBody("110.00"),
    });
    const prices = await getDailyPrices("AAPL");
    expect(prices?.[0]).toEqual({
      date: "2026-11-13",
      close: 110,
      volume: 1000,
    });
  });

  it("falls back to the snapshot when the API fails", async () => {
    const { getDailyPrices } = setup({ TIME_SERIES_DAILY: RATE_LIMITED });
    const prices = await getDailyPrices("AAPL");
    expect(prices?.[0].close).toBe(50);
  });

  it("returns null when no data exists anywhere", async () => {
    const { getDailyPrices } = setup({ TIME_SERIES_DAILY: RATE_LIMITED });
    expect(await getDailyPrices("TSLA")).toBeNull();
  });

  it("serves the second request from the cache", async () => {
    const { getDailyPrices, calls } = setup({
      TIME_SERIES_DAILY: dailyBody("110.00"),
    });
    await getDailyPrices("AAPL");
    await getDailyPrices("AAPL");
    expect(calls).toEqual(["TIME_SERIES_DAILY AAPL"]);
  });
});

describe("getCompanyProfile with a free key", () => {
  const freeKeyAnswers = {
    TIME_SERIES_DAILY: dailyBody("110.00"),
    OVERVIEW: PREMIUM_BODY,
    LISTING_STATUS: LISTING_CSV,
    SHARES_OUTSTANDING: SHARES_BODY,
  };

  it("builds the profile from free endpoints, with an estimated market cap", async () => {
    const { getCompanyProfile } = setup(freeKeyAnswers);
    expect(await getCompanyProfile("AAPL")).toEqual({
      symbol: "AAPL",
      name: "Apple Inc",
      assetType: "Stock",
      exchange: "NASDAQ",
      description: null,
      sector: "INFORMATION TECHNOLOGY",
      industry: null,
      country: null,
      marketCap: { value: 110_000, estimated: true, sharesAsOf: "2026-09-30" },
    });
  });

  it("makes requests in order of importance", async () => {
    const { getCompanyProfile, calls } = setup(freeKeyAnswers);
    await getCompanyProfile("AAPL");
    expect(calls).toEqual([
      "TIME_SERIES_DAILY AAPL",
      "OVERVIEW AAPL",
      "LISTING_STATUS",
      "SHARES_OUTSTANDING AAPL",
    ]);
  });

  it("checks OVERVIEW and LISTING_STATUS once for all companies", async () => {
    const { getCompanyProfile, calls } = setup(freeKeyAnswers);
    await getCompanyProfile("AAPL");
    await getCompanyProfile("TSLA");
    expect(calls.filter((c) => c.startsWith("OVERVIEW"))).toHaveLength(1);
    expect(calls.filter((c) => c === "LISTING_STATUS")).toHaveLength(1);
  });

  it("uses snapshot data when live calls fail", async () => {
    const { getCompanyProfile } = setup({
      TIME_SERIES_DAILY: RATE_LIMITED,
      OVERVIEW: RATE_LIMITED,
      LISTING_STATUS: RATE_LIMITED,
      SHARES_OUTSTANDING: RATE_LIMITED,
    });
    const profile = await getCompanyProfile("AAPL");
    expect(profile.name).toBe("Apple Inc");
    expect(profile.marketCap).toEqual({
      value: 500,
      estimated: true,
      sharesAsOf: "2026-06-30",
    });
  });

  it("shows N/A (null) for anything that isn't available", async () => {
    const { getCompanyProfile } = setup({
      TIME_SERIES_DAILY: RATE_LIMITED,
      OVERVIEW: RATE_LIMITED,
      LISTING_STATUS: RATE_LIMITED,
      SHARES_OUTSTANDING: RATE_LIMITED,
    });
    const profile = await getCompanyProfile("TSLA");
    expect(profile.name).toBeNull();
    expect(profile.sector).toBeNull();
    expect(profile.marketCap).toBeNull();
  });
});

describe("getCompanyProfile with a premium key", () => {
  it("uses OVERVIEW for every field, with the real market cap", async () => {
    const { getCompanyProfile } = setup({
      TIME_SERIES_DAILY: dailyBody("110.00"),
      OVERVIEW: JSON.stringify({
        Symbol: "AAPL",
        AssetType: "Common Stock",
        Name: "Apple Inc",
        Description: "Makes iPhones.",
        Exchange: "NASDAQ",
        Sector: "TECHNOLOGY",
        Industry: "ELECTRONIC COMPUTERS",
        Country: "USA",
        MarketCapitalization: "3352782701000",
      }),
    });
    expect(await getCompanyProfile("AAPL")).toMatchObject({
      description: "Makes iPhones.",
      industry: "ELECTRONIC COMPUTERS",
      country: "USA",
      marketCap: { value: 3352782701000, estimated: false, sharesAsOf: null },
    });
  });
});

describe("edge cases", () => {
  const PREMIUM_KEY_OVERVIEW = JSON.stringify({
    Symbol: "AAPL",
    Name: "Apple Inc",
    MarketCapitalization: "3352782701000",
  });

  it("does not cache an incomplete LISTING_STATUS table, and uses the snapshot row", async () => {
    const partialCsv = [
      "symbol,name,exchange,assetType,ipoDate,delistingDate,status",
      "TSLA,Tesla Inc,NASDAQ,Stock,2010-06-29,null,Active",
    ].join("\n");
    const { getCompanyProfile, calls } = setup({
      TIME_SERIES_DAILY: dailyBody("110.00"),
      OVERVIEW: PREMIUM_BODY,
      LISTING_STATUS: partialCsv,
      SHARES_OUTSTANDING: SHARES_BODY,
    });
    expect((await getCompanyProfile("AAPL")).name).toBe("Apple Inc"); // from the snapshot
    await getCompanyProfile("AAPL");
    // Not cached, so the next page load tries again.
    expect(calls.filter((c) => c === "LISTING_STATUS")).toHaveLength(2);
  });

  it("requests OVERVIEW only once with a premium key", async () => {
    const { getCompanyProfile, calls } = setup({
      TIME_SERIES_DAILY: dailyBody("110.00"),
      OVERVIEW: PREMIUM_KEY_OVERVIEW,
    });
    await getCompanyProfile("AAPL");
    expect(calls.filter((c) => c.startsWith("OVERVIEW"))).toEqual([
      "OVERVIEW AAPL",
    ]);
  });

  it("uses the snapshot's premium-only answer when the OVERVIEW check fails", async () => {
    const { getCompanyProfile } = setup({
      TIME_SERIES_DAILY: dailyBody("110.00"),
      OVERVIEW: RATE_LIMITED,
      LISTING_STATUS: LISTING_CSV,
      SHARES_OUTSTANDING: SHARES_BODY,
    });
    const profile = await getCompanyProfile("AAPL");
    // Treated as a free key: the profile comes from the free endpoints.
    expect(profile.name).toBe("Apple Inc");
    expect(profile.description).toBeNull();
    expect(profile.marketCap?.estimated).toBe(true);
  });

  it("shows no market cap without prices, even when a share count exists", async () => {
    const snap: Snapshot = {
      ...sampleSnapshot,
      shares: {
        TSLA: {
          fetchedAt: SNAPSHOT_TIME,
          value: { date: "2026-06-30", shares: 10 },
        },
      },
    };
    const { getCompanyProfile } = setup(
      {
        TIME_SERIES_DAILY: RATE_LIMITED,
        OVERVIEW: PREMIUM_BODY,
        LISTING_STATUS: LISTING_CSV,
        SHARES_OUTSTANDING: RATE_LIMITED,
      },
      snap,
    );
    const profile = await getCompanyProfile("TSLA");
    expect(profile.marketCap).toBeNull();
    expect(profile.name).toBe("Tesla Inc");
  });
});
