/**
 * A small cache for AlphaVantage results, with a "use old data if the refresh fails" rule.
 *
 *   cached(key, maxAgeMs, fetchFresh)
 *
 *   1. A stored result younger than maxAgeMs is returned without calling the API.
 *   2. Otherwise fetchFresh() runs. If it succeeds, the result is stored and returned.
 *   3. If it fails, the last stored result is returned even though it is old, so the
 *      page still has data while AlphaVantage is unavailable.
 *   4. If it fails and nothing was ever stored, the error is passed on and the caller
 *      falls back to the snapshot committed in the repo.
 *
 * Only successful results are ever written, so an error or rate-limit message can never
 * end up in the cache.
 *
 * Storage is Vercel's Runtime Cache (getCache from @vercel/functions). On Vercel it is
 * shared by all server instances and survives deploys; when running locally the same call
 * automatically uses an in-memory cache, so there is no separate code path.
 */

import { getCache } from "@vercel/functions";

/** The minimal storage operations we need. Vercel's RuntimeCache already fits this shape. */
export interface KeyValueStore {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown, options?: { ttl?: number }): Promise<void>;
}

/** What gets written to the store for each key. */
interface StoredEntry<T> {
  value: T;
  /** When the value was fetched from AlphaVantage (ms since epoch). */
  fetchedAt: number;
}

/** What callers get back. */
export interface CachedResult<T> {
  value: T;
  /** When the value was fetched from AlphaVantage (ms since epoch). */
  fetchedAt: number;
}

/**
 * How long the store keeps an entry. Much longer than any maxAge, so that an old value is
 * still there to fall back on when AlphaVantage is unavailable for a while.
 */
const STORE_TTL_SECONDS = 90 * 24 * 60 * 60; // 90 days

/**
 * Put in front of every key ("daily:AAPL" is stored as "v1:daily:AAPL"). Entries outlive
 * deploys and are read back without checking the value's shape, so bump this whenever
 * the shape of a stored value changes: the new code then ignores the old entries instead
 * of misreading them.
 */
const KEY_VERSION = "v1";

let defaultStore: KeyValueStore | undefined;

/** The real store, created on first use (it reads Vercel's environment variables). */
function getDefaultStore(): KeyValueStore {
  defaultStore ??= getCache({ namespace: "stock-showcase" });
  return defaultStore;
}

// Requests currently in progress, by key. If two parts of a page ask for the same data at
// the same moment, they share one API call instead of making two.
//
// It lives on `globalThis` (the one global object of the server process) rather than in a
// normal module variable because Next.js can load separate copies of a module for
// different routes; a module variable would then not be shared.
const IN_FLIGHT_KEY = Symbol.for("stock-showcase.cache.inFlight");
type GlobalWithInFlight = typeof globalThis & {
  [IN_FLIGHT_KEY]?: Map<string, Promise<unknown>>;
};

function inFlightRequests(): Map<string, Promise<unknown>> {
  const global = globalThis as GlobalWithInFlight;
  global[IN_FLIGHT_KEY] ??= new Map();
  return global[IN_FLIGHT_KEY];
}

/** Checks that something read from the store has the shape we wrote. */
function isStoredEntry(entry: unknown): entry is StoredEntry<unknown> {
  return (
    typeof entry === "object" &&
    entry !== null &&
    "value" in entry &&
    "fetchedAt" in entry &&
    typeof entry.fetchedAt === "number"
  );
}

/** Reads an entry, treating storage problems as "nothing stored". */
async function readEntry<T>(
  store: KeyValueStore,
  key: string,
): Promise<StoredEntry<T> | null> {
  try {
    const entry = await store.get(key);
    // The store returns `unknown`; we trust the value's type because only this module
    // writes these keys, and only with StoredEntry<T> objects.
    return isStoredEntry(entry) ? (entry as StoredEntry<T>) : null;
  } catch (error) {
    console.warn(`Cache read failed for ${key}:`, error);
    return null;
  }
}

/** Writes an entry. A storage problem is logged but doesn't fail the page. */
async function writeEntry<T>(
  store: KeyValueStore,
  key: string,
  entry: StoredEntry<T>,
): Promise<void> {
  try {
    await store.set(key, entry, { ttl: STORE_TTL_SECONDS });
  } catch (error) {
    console.warn(`Cache write failed for ${key}:`, error);
  }
}

export interface CacheOptions {
  /** Storage to use. Tests pass an in-memory fake; the app uses Vercel's Runtime Cache. */
  store?: KeyValueStore;
  /** Clock to use (ms since epoch). Tests pass a fake clock. */
  now?: () => number;
}

/**
 * Returns the value for `key`, fetching it with `fetchFresh` when the stored copy is
 * missing or older than `maxAgeMs`. See the top of this file for the full rules.
 */
export async function cached<T>(
  key: string,
  maxAgeMs: number,
  fetchFresh: () => Promise<T>,
  options: CacheOptions = {},
): Promise<CachedResult<T>> {
  const store = options.store ?? getDefaultStore();
  const now = options.now ?? Date.now;
  const storeKey = `${KEY_VERSION}:${key}`;

  const stored = await readEntry<T>(store, storeKey);
  if (stored && now() - stored.fetchedAt < maxAgeMs) {
    return { value: stored.value, fetchedAt: stored.fetchedAt };
  }

  const inFlight = inFlightRequests();
  let refresh = inFlight.get(storeKey) as Promise<StoredEntry<T>> | undefined;
  if (!refresh) {
    refresh = (async () => {
      const value = await fetchFresh();
      const entry: StoredEntry<T> = { value, fetchedAt: now() };
      await writeEntry(store, storeKey, entry);
      return entry;
    })();
    inFlight.set(storeKey, refresh);
    // Forget the request once it has finished, whether it succeeded or failed.
    refresh.then(
      () => inFlight.delete(storeKey),
      () => inFlight.delete(storeKey),
    );
  }

  try {
    const fresh = await refresh;
    return { value: fresh.value, fetchedAt: fresh.fetchedAt };
  } catch (error) {
    if (stored) {
      return { value: stored.value, fetchedAt: stored.fetchedAt }; // old, but better than nothing
    }
    throw error;
  }
}
