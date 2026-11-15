/**
 * The snapshot: a copy of AlphaVantage data committed to the repo (src/data/snapshot.json).
 *
 * It is the last line of defense. When a live call fails and the cache has nothing
 * either, the page shows snapshot data instead. It also lets the app run without an API
 * key at all, e.g. for a reviewer who clones the repo.
 *
 * The data is already parsed (by the same parse functions the live path uses) and each
 * item records when it was fetched. `npm run snapshot` refreshes it.
 *
 * Sector data only ever comes from here: working it out takes 8 requests, too many to do
 * while a page is loading.
 */

import snapshotJson from "@/data/snapshot.json";
import type {
  Listing,
  SharesOutstanding,
} from "@/lib/alphavantage/parse-company";
import type { DailyPrice } from "@/lib/prices";

/** A value plus the time it was fetched from AlphaVantage (ms since epoch). */
export interface Timestamped<T> {
  value: T;
  fetchedAt: number;
}

export interface Snapshot {
  /** Daily prices per symbol, newest first. */
  daily: Record<string, Timestamped<DailyPrice[]>>;
  /** Name, exchange and asset type per symbol (from LISTING_STATUS). */
  listings: Record<string, Timestamped<Listing>>;
  /** Latest quarterly share count per symbol (for the estimated market cap). */
  shares: Record<string, Timestamped<SharesOutstanding>>;
  /** Sector name per symbol, as AlphaVantage writes it, e.g. "INFORMATION TECHNOLOGY". */
  sectors: Timestamped<Record<string, string>> | null;
  /** Whether OVERVIEW was premium-only for the key used. */
  overviewPremium: Timestamped<boolean> | null;
}

/** Read access to one snapshot. Missing items are null. */
export interface SnapshotReader {
  daily(symbol: string): Timestamped<DailyPrice[]> | null;
  listing(symbol: string): Timestamped<Listing> | null;
  shares(symbol: string): Timestamped<SharesOutstanding> | null;
  sector(symbol: string): string | null;
  overviewPremium(): Timestamped<boolean> | null;
}

export function createSnapshotReader(snapshot: Snapshot): SnapshotReader {
  return {
    daily: (symbol) => snapshot.daily[symbol] ?? null,
    listing: (symbol) => snapshot.listings[symbol] ?? null,
    shares: (symbol) => snapshot.shares[symbol] ?? null,
    sector: (symbol) => snapshot.sectors?.value[symbol] ?? null,
    overviewPremium: () => snapshot.overviewPremium,
  };
}

// TypeScript infers a type from the JSON file's contents; we state the intended shape
// instead. The compiler only catches fields of the wrong type here, not missing fields
// or bad values; the snapshot test checks the parts that matter most (known symbols
// only, valid daily prices, a fetch time on every item).
export const committedSnapshot = snapshotJson as Snapshot;

/** The snapshot committed to the repo. */
export const snapshot: SnapshotReader = createSnapshotReader(committedSnapshot);
