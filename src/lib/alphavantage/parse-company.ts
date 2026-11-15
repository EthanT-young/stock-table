/**
 * Reading the AlphaVantage responses that describe a company:
 * OVERVIEW (premium), LISTING_STATUS (free fallback for name/exchange/asset type)
 * and SHARES_OUTSTANDING (free, used to estimate market cap).
 */

import {
  AlphaVantageError,
  isRecord,
  throwIfProblem,
} from "@/lib/alphavantage/parse";

/**
 * Converts an OVERVIEW text field to a string or null.
 * AlphaVantage marks missing values in several ways ("None", "-", empty), and the spec
 * wants all of them shown as "N/A", so they all become null here.
 */
function textOrNull(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed === "" || trimmed === "None" || trimmed === "-") {
    return null;
  }
  return trimmed;
}

/** Same as textOrNull, but for numeric fields like MarketCapitalization. */
function numberOrNull(value: unknown): number | null {
  const text = textOrNull(value);
  if (text === null) {
    return null;
  }
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

/** The OVERVIEW fields the details page uses. Any of them can be missing (null). */
export interface Overview {
  assetType: string | null;
  name: string | null;
  description: string | null;
  exchange: string | null;
  sector: string | null;
  industry: string | null;
  marketCap: number | null;
  country: string | null;
}

/**
 * Reads an OVERVIEW response. With a free key this throws an AlphaVantageError of kind
 * "premium". An empty object (AlphaVantage's answer for symbols it has no data on)
 * throws kind "error".
 */
export function parseOverview(body: unknown): Overview {
  throwIfProblem(body);
  if (!isRecord(body) || Object.keys(body).length === 0) {
    throw new AlphaVantageError({
      kind: "error",
      message: "OVERVIEW returned no data for this symbol.",
    });
  }
  return {
    assetType: textOrNull(body["AssetType"]),
    name: textOrNull(body["Name"]),
    description: textOrNull(body["Description"]),
    exchange: textOrNull(body["Exchange"]),
    sector: textOrNull(body["Sector"]),
    industry: textOrNull(body["Industry"]),
    marketCap: numberOrNull(body["MarketCapitalization"]),
    country: textOrNull(body["Country"]),
  };
}

/** One row of LISTING_STATUS. */
export interface Listing {
  symbol: string;
  name: string;
  exchange: string;
  assetType: string;
}

/**
 * Reads a LISTING_STATUS response, which is CSV text, not JSON:
 *
 *   symbol,name,exchange,assetType,ipoDate,delistingDate,status
 *   AAPL,Apple Inc,NASDAQ,Stock,1980-12-12,null,Active
 *
 * If AlphaVantage refuses the request it sends a JSON error instead, so a body that
 * starts with "{" is checked for a problem first.
 *
 * AlphaVantage does not quote fields, so a plain split on commas is enough. Only the
 * symbols in `wanted` are kept (the full list has over 10,000 rows).
 */
export function parseListingStatus(
  text: string,
  wanted: readonly string[],
): Listing[] {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) {
    throwIfProblem(JSON.parse(trimmed));
  }

  const [headerLine, ...rows] = trimmed.split(/\r?\n/);
  const header = headerLine.split(",");
  const column = (name: string): number => {
    const index = header.indexOf(name);
    if (index === -1) {
      throw new AlphaVantageError({
        kind: "error",
        message: `LISTING_STATUS is missing the "${name}" column.`,
      });
    }
    return index;
  };
  const symbolColumn = column("symbol");
  const nameColumn = column("name");
  const exchangeColumn = column("exchange");
  const assetTypeColumn = column("assetType");

  const wantedSet = new Set(wanted);
  const listings: Listing[] = [];
  for (const row of rows) {
    const cells = row.split(",");
    const symbol = cells[symbolColumn];
    if (wantedSet.has(symbol)) {
      listings.push({
        symbol,
        name: cells[nameColumn],
        exchange: cells[exchangeColumn],
        assetType: cells[assetTypeColumn],
      });
    }
  }
  return listings;
}

/** The latest quarterly share count from SHARES_OUTSTANDING. */
export interface SharesOutstanding {
  /** End of the quarter the count belongs to, "YYYY-MM-DD". */
  date: string;
  /**
   * Basic shares outstanding, or diluted when basic is missing (a quarterly average, so
   * market cap is an estimate).
   */
  shares: number;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A share count field as a number, or null if it is missing, not a number or not positive. */
function countOrNull(value: unknown): number | null {
  const count = numberOrNull(value);
  return count !== null && count > 0 ? count : null;
}

/**
 * The share count in one row, or null if the row has none. Market cap is conventionally
 * basic shares x price, so basic is preferred; diluted (which also counts options and
 * convertible securities) is the fallback.
 */
function shareCount(row: Record<string, unknown>): number | null {
  return (
    countOrNull(row["shares_outstanding_basic"]) ??
    countOrNull(row["shares_outstanding_diluted"])
  );
}

/**
 * Reads a SHARES_OUTSTANDING response:
 *
 *   { "symbol": "AAPL", "status": "success",
 *     "data": [ { "date": "2026-09-30", "shares_outstanding_basic": "14630318000",
 *                 "shares_outstanding_diluted": "14630318000" }, ... ] }
 *
 * Returns only the most recent quarter. Older rows contain known quirks (duplicate
 * dates, counts from before stock splits), so they are never used. Rows without a
 * "YYYY-MM-DD" date or a share count are skipped.
 */
export function parseSharesOutstanding(body: unknown): SharesOutstanding {
  throwIfProblem(body);
  const data = isRecord(body) ? body["data"] : undefined;
  const rows = Array.isArray(data) ? data : [];

  // Keep only usable rows, then find the newest ourselves instead of trusting the order.
  let newest: SharesOutstanding | null = null;
  for (const row of rows) {
    if (!isRecord(row)) {
      continue;
    }
    const date = row["date"];
    const shares = shareCount(row);
    if (typeof date !== "string" || !ISO_DATE.test(date) || shares === null) {
      continue;
    }
    // "YYYY-MM-DD" strings compare in date order.
    if (newest === null || date > newest.date) {
      newest = { date, shares };
    }
  }

  if (newest === null) {
    throw new AlphaVantageError({
      kind: "error",
      message: "SHARES_OUTSTANDING returned no usable data.",
    });
  }
  return newest;
}
