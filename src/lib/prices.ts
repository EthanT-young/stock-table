/**
 * Calculations on daily prices: day-over-day change, chart ranges and the
 * estimated market cap. Pure functions only; fetching lives elsewhere.
 */

/** One trading day from TIME_SERIES_DAILY. Dates are "YYYY-MM-DD". */
export interface DailyPrice {
  date: string;
  close: number;
  volume: number;
}

/** A table row: a trading day plus its change from the previous trading day. */
export interface PriceRow extends DailyPrice {
  /** Percent change vs. the previous trading day, or null when there is none (oldest row). */
  changePercent: number | null;
}

/** Percent change from `previous` to `current`, e.g. 100 -> 101 is 1 (meaning +1%). */
export function percentChange(
  previous: number,
  current: number,
): number | null {
  if (previous === 0) {
    return null; // avoid dividing by zero; shown as N/A
  }
  return ((current - previous) / previous) * 100;
}

/**
 * Adds the day-over-day change to each row.
 *
 * Expects prices sorted newest first (the order we display them in), so the
 * "previous trading day" of row i is row i + 1. Weekends and holidays are not in
 * the data, so Monday is automatically compared with Friday. The oldest row has
 * no previous day in the dataset, so its change is null ("N/A").
 */
export function withDailyChange(
  newestFirst: readonly DailyPrice[],
): PriceRow[] {
  return newestFirst.map((day, index) => {
    const previousDay = newestFirst[index + 1];
    return {
      ...day, // copy date, close and volume into the new object
      changePercent: previousDay
        ? percentChange(previousDay.close, day.close)
        : null,
    };
  });
}

/** The chart range buttons. */
export type ChartRange = "1M" | "3M" | "100D";

/**
 * Returns the prices that fall inside a chart range, still newest first.
 * 1M and 3M count calendar months back from the latest trading day;
 * 100D is everything we have (the free tier returns the latest 100 trading days).
 */
export function pricesInRange(
  newestFirst: readonly DailyPrice[],
  range: ChartRange,
): DailyPrice[] {
  if (range === "100D" || newestFirst.length === 0) {
    return [...newestFirst];
  }
  const monthsBack = range === "1M" ? 1 : 3;
  const cutoff = new Date(newestFirst[0].date); // latest trading day, midnight UTC
  cutoff.setUTCMonth(cutoff.getUTCMonth() - monthsBack);
  const cutoffIso = cutoff.toISOString().slice(0, 10); // back to "YYYY-MM-DD"
  // "YYYY-MM-DD" strings sort the same way as the dates they represent.
  return newestFirst.filter((day) => day.date >= cutoffIso);
}

/**
 * Percent change across a whole range: from the oldest close in the range to the
 * latest. Drives the "+12.84% in 100D" badge. Null if there are fewer than 2 days.
 */
export function rangeChangePercent(
  newestFirstInRange: readonly DailyPrice[],
): number | null {
  if (newestFirstInRange.length < 2) {
    return null;
  }
  const latest = newestFirstInRange[0];
  const oldest = newestFirstInRange[newestFirstInRange.length - 1];
  return percentChange(oldest.close, latest.close);
}

/**
 * Estimated market cap = shares outstanding x latest close.
 * AlphaVantage reports a quarterly average share count, not today's exact count,
 * so the result is an estimate (shown with "est." in the UI).
 */
export function estimateMarketCap(
  sharesOutstanding: number,
  latestClose: number,
): number {
  return sharesOutstanding * latestClose;
}
