/**
 * The two functions the pages call to get data:
 *
 *   getDailyPrices(symbol)     100 trading days, newest first
 *   getCompanyProfile(symbol)  everything for the "Behind the ticker" card
 *
 * Each piece of data is looked up in this order:
 *   1. our cache, if the stored copy is recent enough        (no API request)
 *   2. AlphaVantage, if live calls are on and the quota allows
 *   3. the last copy we stored, even if old
 *   4. the snapshot committed in the repo
 * so a page always shows something.
 */

import "server-only";
import { cached, type CacheOptions } from "@/lib/alphavantage/cache";
import { fetchAlphaVantage } from "@/lib/alphavantage/client";
import { AlphaVantageError, parseDailySeries } from "@/lib/alphavantage/parse";
import {
  parseListingStatus,
  parseOverview,
  parseSharesOutstanding,
  type Listing,
  type Overview,
  type SharesOutstanding,
} from "@/lib/alphavantage/parse-company";
import { estimateMarketCap, type DailyPrice } from "@/lib/prices";
import {
  snapshot,
  type SnapshotReader,
  type Timestamped,
} from "@/lib/snapshot";
import { TICKERS } from "@/lib/tickers";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** How long each kind of data counts as current. */
export const MAX_AGE_MS = {
  daily: DAY_MS, // closing prices change once per trading day
  overviewCheck: DAY_MS, // whether OVERVIEW is premium-only for our key
  overview: DAY_MS,
  listing: 7 * DAY_MS, // names and exchanges almost never change
  shares: 30 * DAY_MS, // share counts change once a quarter
};

export interface MarketCap {
  value: number;
  /** True when calculated as shares outstanding x latest close (no OVERVIEW access). */
  estimated: boolean;
  /** Quarter the share count belongs to ("YYYY-MM-DD"), for estimated values. */
  sharesAsOf: string | null;
}

/** Everything the "Behind the ticker" card shows. null means "N/A". */
export interface CompanyProfile {
  symbol: string;
  name: string | null;
  assetType: string | null;
  exchange: string | null;
  description: string | null;
  sector: string | null;
  industry: string | null;
  country: string | null;
  marketCap: MarketCap | null;
}

/** What the loaders depend on, replaceable in tests. */
export interface StockDataDeps {
  /** Sends one AlphaVantage request and returns the body text. */
  fetchText: (params: Record<string, string>) => Promise<string>;
  snapshot: SnapshotReader;
  cacheOptions?: CacheOptions;
}

export function createStockData(deps: StockDataDeps) {
  /**
   * Steps 1-4 from the top of the file for one piece of data. Returns null only when
   * nothing is available anywhere.
   */
  async function load<T>(
    key: string,
    maxAgeMs: number,
    fetchFresh: () => Promise<T>,
    fromSnapshot: () => Timestamped<T> | null,
  ): Promise<T | null> {
    try {
      const result = await cached(key, maxAgeMs, fetchFresh, deps.cacheOptions);
      return result.value; // fresh, or the last stored copy if the refresh failed
    } catch {
      return fromSnapshot()?.value ?? null;
    }
  }

  async function fetchJson(params: Record<string, string>): Promise<unknown> {
    return JSON.parse(await deps.fetchText(params));
  }

  function loadDaily(symbol: string): Promise<DailyPrice[] | null> {
    return load(
      `daily:${symbol}`,
      MAX_AGE_MS.daily,
      async () =>
        parseDailySeries(
          await fetchJson({ function: "TIME_SERIES_DAILY", symbol }),
        ),
      () => deps.snapshot.daily(symbol),
    );
  }

  /** Calls OVERVIEW and reports either the data or that it is premium-only. */
  async function fetchOverview(
    symbol: string,
  ): Promise<{ premium: true } | { premium: false; overview: Overview }> {
    try {
      const overview = parseOverview(
        await fetchJson({ function: "OVERVIEW", symbol }),
      );
      return { premium: false, overview };
    } catch (error) {
      if (error instanceof AlphaVantageError && error.kind === "premium") {
        return { premium: true }; // a definite answer, so it may be cached
      }
      throw error; // rate limit or other failure: never cached
    }
  }

  /**
   * OVERVIEW data, or null when it is premium-only or unavailable.
   *
   * Whether OVERVIEW is premium-only depends on the API key, not on the company, so one
   * check (cached for a day) covers all 16 companies: with a free key that is a single
   * request per day instead of one per company.
   */
  async function loadOverview(symbol: string): Promise<Overview | null> {
    // If the check has to call OVERVIEW and the key has access, that call already
    // returned this company's data; keep it so we don't request it a second time.
    let fetchedByCheck: Overview | undefined;
    const check = await load(
      "overview-check",
      MAX_AGE_MS.overviewCheck,
      async () => {
        const result = await fetchOverview(symbol);
        if (!result.premium) {
          fetchedByCheck = result.overview;
        }
        return result.premium;
      },
      () => deps.snapshot.overviewPremium(),
    );
    // If we can't tell (no answer anywhere), treat it like premium-only: fields show N/A.
    if (check === null || check) {
      return null;
    }
    return load(
      `overview:${symbol}`,
      MAX_AGE_MS.overview,
      async () => {
        if (fetchedByCheck) {
          return fetchedByCheck;
        }
        const result = await fetchOverview(symbol);
        if (result.premium) {
          // The key lost premium access since the check; treat it as a failed fetch.
          throw new AlphaVantageError({
            kind: "premium",
            message: "OVERVIEW is premium-only.",
          });
        }
        return result.overview;
      },
      () => null, // the snapshot doesn't store OVERVIEW data
    );
  }

  /** Fetches LISTING_STATUS once and keeps our companies' rows, keyed by symbol. */
  async function fetchAllListings(): Promise<Record<string, Listing>> {
    const text = await deps.fetchText({ function: "LISTING_STATUS" });
    const symbols = TICKERS.map((ticker) => ticker.symbol);
    const rows = parseListingStatus(text, symbols);
    const missing = symbols.filter(
      (symbol) => !rows.some((row) => row.symbol === symbol),
    );
    if (missing.length > 0) {
      // An incomplete table must not be cached for a week as if it were a full answer.
      throw new AlphaVantageError({
        kind: "error",
        message: `LISTING_STATUS has no row for ${missing.join(", ")}.`,
      });
    }
    return Object.fromEntries(rows.map((row) => [row.symbol, row]));
  }

  async function loadListing(symbol: string): Promise<Listing | null> {
    // One LISTING_STATUS request covers all 16 companies, so the whole table is cached
    // under one key and each page picks its own row.
    const table = await load(
      "listing",
      MAX_AGE_MS.listing,
      fetchAllListings,
      () => null, // the snapshot stores rows one by one; used just below
    );
    // Not in the table (or no table at all): use the snapshot's row instead.
    return table?.[symbol] ?? deps.snapshot.listing(symbol)?.value ?? null;
  }

  function loadShares(symbol: string): Promise<SharesOutstanding | null> {
    return load(
      `shares:${symbol}`,
      MAX_AGE_MS.shares,
      async () =>
        parseSharesOutstanding(
          await fetchJson({ function: "SHARES_OUTSTANDING", symbol }),
        ),
      () => deps.snapshot.shares(symbol),
    );
  }

  /** Daily prices, newest first, or null if none are available anywhere. */
  function getDailyPrices(symbol: string): Promise<DailyPrice[] | null> {
    return loadDaily(symbol);
  }

  /**
   * The company profile. Requests are made one after another in order of importance
   * (prices, OVERVIEW check, listing, share count), so if the per-minute quota runs out
   * part-way, the most important data has already been fetched.
   */
  async function getCompanyProfile(symbol: string): Promise<CompanyProfile> {
    const daily = await loadDaily(symbol);
    const overview = await loadOverview(symbol);

    if (overview) {
      // Premium key: OVERVIEW has every field, including the real market cap.
      return {
        symbol,
        name: overview.name,
        assetType: overview.assetType,
        exchange: overview.exchange,
        description: overview.description,
        sector: overview.sector,
        industry: overview.industry,
        country: overview.country,
        marketCap:
          overview.marketCap === null
            ? null
            : { value: overview.marketCap, estimated: false, sharesAsOf: null },
      };
    }

    // No OVERVIEW data. Usually because it is premium-only for our key (free key); with
    // a premium key it can also mean OVERVIEW couldn't be fetched right now. Build what
    // we can from free endpoints; the OVERVIEW-only fields show N/A.
    const listing = await loadListing(symbol);
    const shares = await loadShares(symbol);
    const latestClose = daily?.[0]?.close;
    const marketCap: MarketCap | null =
      shares && latestClose !== undefined
        ? {
            value: estimateMarketCap(shares.shares, latestClose),
            estimated: true,
            sharesAsOf: shares.date,
          }
        : null;

    return {
      symbol,
      name: listing?.name ?? null,
      assetType: listing?.assetType ?? null,
      exchange: listing?.exchange ?? null,
      description: null,
      sector: deps.snapshot.sector(symbol),
      industry: null,
      country: null,
      marketCap,
    };
  }

  return { getDailyPrices, getCompanyProfile };
}

// The real loaders used by the pages.
const stockData = createStockData({
  fetchText: (params) => fetchAlphaVantage(params),
  snapshot,
});

export const getDailyPrices = stockData.getDailyPrices;
export const getCompanyProfile = stockData.getCompanyProfile;
