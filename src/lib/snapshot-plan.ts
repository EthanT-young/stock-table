/**
 * Decides which requests the snapshot script should make, in which order.
 *
 * The free key allows 25 requests a day and a full snapshot needs 42, so filling it takes
 * two runs on two days. Each run only asks for what is still missing (or too old), most
 * valuable first:
 *
 *   1. OVERVIEW check   (1 request)   is the key premium? decides what the profile shows
 *   2. LISTING_STATUS   (1 request)   name, exchange and asset type for all 16 companies
 *   3. Sector ETFs      (8 requests)  done as one batch so the sector map comes out complete
 *   4. Daily prices     (1 per company)
 *   5. Share counts     (1 per company)
 *
 * With nothing stored, day one gets items 1-3 and 15 companies' prices (25 requests);
 * day two gets the last company's prices and all 16 share counts (17 requests).
 */

import { SECTOR_ETFS } from "@/lib/alphavantage/sectors";
import type { Snapshot, Timestamped } from "@/lib/snapshot";

export type SnapshotTask =
  | { kind: "overview-check" }
  | { kind: "listing" }
  | { kind: "sector-etf"; etf: string }
  | { kind: "daily"; symbol: string }
  | { kind: "shares"; symbol: string };

/**
 * `maxAgeMs`: items fetched longer ago than this are fetched again. Infinity (the default)
 * means "only fill in what is missing".
 */
export function planSnapshotTasks(
  snapshot: Snapshot,
  symbols: readonly string[],
  now: number,
  maxAgeMs: number = Infinity,
): SnapshotTask[] {
  const needs = (item: Timestamped<unknown> | null | undefined): boolean =>
    !item || now - item.fetchedAt > maxAgeMs;

  const tasks: SnapshotTask[] = [];

  if (needs(snapshot.overviewPremium)) {
    tasks.push({ kind: "overview-check" });
  }

  if (symbols.some((symbol) => needs(snapshot.listings[symbol]))) {
    tasks.push({ kind: "listing" });
  }

  const sectorMapIncomplete = symbols.some(
    (symbol) => !snapshot.sectors?.value[symbol],
  );
  if (sectorMapIncomplete || needs(snapshot.sectors)) {
    for (const etf of SECTOR_ETFS) {
      tasks.push({ kind: "sector-etf", etf });
    }
  }

  for (const symbol of symbols) {
    if (needs(snapshot.daily[symbol])) {
      tasks.push({ kind: "daily", symbol });
    }
  }

  for (const symbol of symbols) {
    if (needs(snapshot.shares[symbol])) {
      tasks.push({ kind: "shares", symbol });
    }
  }

  return tasks;
}
