/**
 * Reading AlphaVantage responses.
 *
 * AlphaVantage always answers with HTTP 200, even for errors, so we cannot rely on the
 * status code. Instead we inspect the JSON body: errors and limits arrive as a body with
 * an "Information", "Note" or "Error Message" key instead of the expected data.
 *
 * Everything here is a pure function on already-downloaded data (no network).
 */

import type { DailyPrice } from "@/lib/prices";

/** Why a response did not contain usable data. */
export type ProblemKind =
  /** Temporary: too many requests. Never cached; try again later or use the snapshot. */
  | "rate-limit"
  /** Permanent for this key: the endpoint or option needs a paid plan. Safe to cache. */
  | "premium"
  /** Anything else (bad symbol, missing key, unexpected shape). Never cached. */
  | "error";

export interface Problem {
  kind: ProblemKind;
  message: string;
}

/** Thrown by the parse functions when a body cannot be read as the expected data. */
export class AlphaVantageError extends Error {
  readonly kind: ProblemKind;

  constructor(problem: Problem) {
    super(problem.message);
    this.name = "AlphaVantageError";
    this.kind = problem.kind;
  }
}

/**
 * JSON arrives as `unknown`, TypeScript's "could be anything" type (similar to Object
 * in Java, but you must check it before using it). This check narrows it to a plain
 * object with string keys. The `value is ...` return type tells the compiler that
 * after `if (isRecord(x))`, x can be used as an object.
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// The rate-limit check must run BEFORE the premium check: AlphaVantage's rate-limit
// messages also mention "premium plans" (as an upsell), and mistaking a temporary rate
// limit for a permanent premium answer would cache the wrong thing for 24 hours.
const RATE_LIMIT_PATTERN =
  /rate limit|requests per (second|minute|day)|sparingly|call frequency/i;
const PREMIUM_PATTERN = /premium endpoint|premium feature|premium function/i;

/**
 * Looks for an AlphaVantage error or limit message in a response body.
 * Returns null when the body has none (it may still fail to parse later).
 */
export function findProblem(body: unknown): Problem | null {
  if (!isRecord(body)) {
    return { kind: "error", message: "Response was not a JSON object." };
  }
  const errorMessage = body["Error Message"];
  if (typeof errorMessage === "string") {
    return { kind: "error", message: errorMessage };
  }
  const notice = body["Information"] ?? body["Note"];
  if (typeof notice === "string") {
    if (RATE_LIMIT_PATTERN.test(notice)) {
      return { kind: "rate-limit", message: notice };
    }
    if (PREMIUM_PATTERN.test(notice)) {
      return { kind: "premium", message: notice };
    }
    return { kind: "error", message: notice };
  }
  return null;
}

/** Throws an AlphaVantageError if the body is an error or limit message. */
function throwIfProblem(body: unknown): void {
  const problem = findProblem(body);
  if (problem) {
    throw new AlphaVantageError(problem);
  }
}

/** Converts a numeric string like "356.2700" to a number, or throws if it isn't one. */
export function toNumber(value: unknown, field: string): number {
  const parsed = typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(parsed)) {
    throw new AlphaVantageError({
      kind: "error",
      message: `Expected a number for "${field}", got ${JSON.stringify(value)}.`,
    });
  }
  return parsed;
}

/**
 * Reads a TIME_SERIES_DAILY response.
 *
 * The body looks like:
 *   { "Meta Data": {...},
 *     "Time Series (Daily)": {
 *       "2026-11-13": { "1. open": "...", "4. close": "356.2700", "5. volume": "39029552" },
 *       ... } }
 *
 * Returns the days sorted newest first.
 */
export function parseDailySeries(body: unknown): DailyPrice[] {
  throwIfProblem(body);
  const series = isRecord(body) ? body["Time Series (Daily)"] : undefined;
  if (!isRecord(series)) {
    throw new AlphaVantageError({
      kind: "error",
      message: 'Missing "Time Series (Daily)" in response.',
    });
  }

  const days: DailyPrice[] = Object.entries(series).map(([date, values]) => {
    const fields = isRecord(values) ? values : {};
    return {
      date,
      close: toNumber(fields["4. close"], `${date} close`),
      volume: toNumber(fields["5. volume"], `${date} volume`),
    };
  });

  // Don't rely on the order of keys in the JSON: sort explicitly, newest first.
  // "YYYY-MM-DD" strings compare in date order.
  days.sort((a, b) => b.date.localeCompare(a.date));
  return days;
}
