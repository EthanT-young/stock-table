/**
 * The only code that sends requests to AlphaVantage.
 *
 * Every request goes through three gates:
 *   1. Live calls must be enabled (see liveCallsEnabled below). Otherwise the app runs
 *      on stored data only.
 *   2. The rate limiter must grant a slot within `maxWaitMs`, so a page never hangs
 *      waiting for the quota.
 *   3. If AlphaVantage answers with a rate-limit message anyway, answers with a server
 *      error (HTTP 5xx), or can't deliver its full response within 5 seconds, all calls
 *      pause for a minute, so we stop sending requests that will fail and pages fall
 *      back to stored data straight away.
 *
 * It returns the raw response text; the parse functions turn it into data and throw on
 * error bodies.
 */

import "server-only"; // build error if a browser-side component ever imports this file
import { AlphaVantageError, findProblem } from "@/lib/alphavantage/parse";
import { RateLimiter } from "@/lib/alphavantage/rate-limiter";

const BASE_URL = "https://www.alphavantage.co/query";
const REQUEST_TIMEOUT_MS = 5_000;
/** How long all calls pause after AlphaVantage refuses a request, fails or can't be reached. */
const PAUSE_AFTER_FAILURE_MS = 60_000;
/** How long a page waits for a rate-limit slot before using stored data instead. */
const PAGE_MAX_WAIT_MS = 3_000;

/** Environment variables as plain name/value pairs (process.env fits this shape). */
export type Env = Record<string, string | undefined>;

/**
 * Live calls are on when an API key is set and either:
 *   - this is the production site on Vercel (VERCEL_ENV=production), or
 *   - AV_LIVE=true is set (for trying the real API locally).
 * Local development and Vercel preview sites use stored data by default, because every
 * page reload or preview visit would otherwise spend part of the 25-requests-per-day
 * quota.
 *
 * Environment variables are read here, inside a function that runs per request, so the
 * values come from the running server rather than being fixed when the app is built.
 */
export function liveCallsEnabled(env: Env = process.env): boolean {
  if (!env.ALPHAVANTAGE_API_KEY) {
    return false;
  }
  return env.VERCEL_ENV === "production" || env.AV_LIVE === "true";
}

// One rate limiter for the whole server process, kept on `globalThis` so every copy of
// this module shares it (Next.js may load separate copies of a module per route).
const LIMITER_KEY = Symbol.for("stock-showcase.alphavantage.limiter");
type GlobalWithLimiter = typeof globalThis & { [LIMITER_KEY]?: RateLimiter };

function sharedLimiter(): RateLimiter {
  const global = globalThis as GlobalWithLimiter;
  global[LIMITER_KEY] ??= new RateLimiter();
  return global[LIMITER_KEY];
}

/** Everything the client depends on, replaceable in tests. */
export interface ClientDeps {
  fetch: typeof fetch;
  limiter: RateLimiter;
  env: Env;
}

function defaultDeps(): ClientDeps {
  return { fetch, limiter: sharedLimiter(), env: process.env };
}

/**
 * Sends one request, e.g. fetchAlphaVantage({ function: "TIME_SERIES_DAILY", symbol: "AAPL" }).
 * Returns the response body as text (JSON for most functions, CSV for LISTING_STATUS).
 * Throws an AlphaVantageError if the request can't be made.
 */
export async function fetchAlphaVantage(
  params: Record<string, string>,
  maxWaitMs: number = PAGE_MAX_WAIT_MS,
  deps: ClientDeps = defaultDeps(),
): Promise<string> {
  if (!liveCallsEnabled(deps.env)) {
    throw new AlphaVantageError({
      kind: "error",
      message: "Live AlphaVantage calls are turned off; using stored data.",
    });
  }

  if (!(await deps.limiter.acquire(maxWaitMs))) {
    throw new AlphaVantageError({
      kind: "rate-limit",
      message: "No request slot available within the wait limit.",
    });
  }

  const url = new URL(BASE_URL);
  for (const [name, value] of Object.entries(params)) {
    url.searchParams.set(name, value);
  }
  url.searchParams.set("apikey", deps.env.ALPHAVANTAGE_API_KEY ?? "");

  let response: Response;
  let text: string;
  try {
    response = await deps.fetch(url, {
      cache: "no-store", // never let Next.js or the platform cache raw responses
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    // The body arrives after the headers and the 5-second timeout still applies while
    // it does, so it is read inside this try: a body that stalls counts as unreachable.
    text = await response.text();
  } catch (error) {
    // Timeout or network failure: AlphaVantage is unreachable. Pause so the page's other
    // requests (and other visitors') use stored data at once instead of each waiting
    // for its own timeout.
    deps.limiter.pauseFor(PAUSE_AFTER_FAILURE_MS);
    throw new AlphaVantageError({
      kind: "error",
      message: `AlphaVantage could not be reached: ${String(error)}`,
    });
  }
  if (!response.ok) {
    // A 5xx status means AlphaVantage itself is struggling, so pause as for a timeout.
    // A 4xx status means something about this one request was wrong; others may work.
    if (response.status >= 500) {
      deps.limiter.pauseFor(PAUSE_AFTER_FAILURE_MS);
    }
    throw new AlphaVantageError({
      kind: "error",
      message: `AlphaVantage responded with HTTP ${response.status}.`,
    });
  }

  if (text.trimStart().startsWith("{")) {
    const problem = findProblem(JSON.parse(text));
    if (problem?.kind === "rate-limit") {
      deps.limiter.pauseFor(PAUSE_AFTER_FAILURE_MS);
    }
  }
  return text;
}
