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
export type ChartRange = "5D" | "1M" | "3M";

/** 5D covers five trading days of change: the latest day plus the five before it. */
const FIVE_DAY_POINTS = 6;

/**
 * The same day of the month `months` calendar months before a "YYYY-MM-DD" date. When that
 * month is shorter, the result is its last day: Mar 31 minus one month is Feb 28 (Feb 29
 * in a leap year), not Mar 3 as plain month arithmetic on a Date would give.
 */
function sameDayMonthsEarlier(isoDate: string, months: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  // Months in Date.UTC count from 0, and an out-of-range month rolls into the
  // neighboring year, so January minus one month is December of the year before.
  const firstOfTarget = new Date(Date.UTC(year, month - 1 - months, 1));
  const targetYear = firstOfTarget.getUTCFullYear();
  const targetMonth = firstOfTarget.getUTCMonth();
  // Day 0 of the following month is the last day of the target month.
  const lastDay = new Date(
    Date.UTC(targetYear, targetMonth + 1, 0),
  ).getUTCDate();
  const result = new Date(
    Date.UTC(targetYear, targetMonth, Math.min(day, lastDay)),
  );
  return result.toISOString().slice(0, 10); // back to "YYYY-MM-DD"
}

/**
 * Returns the prices that fall inside a chart range, still newest first.
 * 5D is the latest trading day and the 5 before it (weekends and holidays aren't in the
 * data, so this is a trading week). 1M and 3M keep days on or after the same date 1 or 3
 * calendar months before the latest trading day (or that month's last day, if it is
 * shorter).
 */
export function pricesInRange(
  newestFirst: readonly DailyPrice[],
  range: ChartRange,
): DailyPrice[] {
  if (range === "5D") {
    return newestFirst.slice(0, FIVE_DAY_POINTS);
  }
  if (newestFirst.length === 0) {
    return [];
  }
  const monthsBack = range === "1M" ? 1 : 3;
  const cutoff = sameDayMonthsEarlier(newestFirst[0].date, monthsBack);
  // "YYYY-MM-DD" strings sort the same way as the dates they represent.
  return newestFirst.filter((day) => day.date >= cutoff);
}

/**
 * Percent change across a whole range: from the oldest close in the range to the
 * latest. Drives the "+4.40% in 1M" badge. Null if there are fewer than 2 days.
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
