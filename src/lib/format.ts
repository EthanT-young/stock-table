/**
 * Turns raw numbers and dates into the text shown on screen.
 * Every function here is pure (same input, same output), which keeps them easy to test.
 */

/** What the spec says to show when a value is not available. */
export const NOT_AVAILABLE = "N/A";

/**
 * Formats a value that might be missing: null or undefined become "N/A",
 * anything else goes through the given formatter.
 *
 * `<T>` is a generic type parameter, the same idea as `<T>` in Java.
 */
export function orNotAvailable<T>(
  value: T | null | undefined,
  format: (present: T) => string,
): string {
  if (value === null || value === undefined) {
    return NOT_AVAILABLE;
  }
  return format(value);
}

// Intl.NumberFormat is the built-in locale-aware formatter (like java.text.NumberFormat).
// Creating them once and reusing them is cheaper than creating one per call.
const twoDecimals = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const wholeNumber = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

/** 237.49 -> "237.49", 1234.5 -> "1,234.50" (table cells; the column header says USD). */
export function formatPrice(value: number): string {
  return twoDecimals.format(value);
}

/** 237.49 -> "$237.49" (the large price at the top of the chart). */
export function formatUsd(value: number): string {
  return `$${twoDecimals.format(value)}`;
}

/** 42186500 -> "42,186,500" */
export function formatVolume(value: number): string {
  return wholeNumber.format(value);
}

/**
 * 1.18 -> "+1.18%", -0.43 -> "−0.43%".
 * Uses the typographic minus sign (U+2212), as in the design. Values that round
 * to zero are shown as "0.00%" so we never print "+0.00%" or "−0.00%".
 */
export function formatPercent(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  if (rounded === 0) {
    return "0.00%";
  }
  const sign = rounded > 0 ? "+" : "−";
  return `${sign}${twoDecimals.format(Math.abs(rounded))}%`;
}

/** 5212343393860 -> "$5.21T", 801900000000 -> "$801.90B", 950000000 -> "$950.00M". */
export function formatMarketCap(value: number): string {
  const units: [number, string][] = [
    [1e12, "T"],
    [1e9, "B"],
    [1e6, "M"],
  ];
  for (const [size, suffix] of units) {
    if (Math.abs(value) >= size) {
      return `$${twoDecimals.format(value / size)}${suffix}`;
    }
  }
  return `$${wholeNumber.format(value)}`;
}

// AlphaVantage dates look like "2026-11-13" and have no time zone. JavaScript reads
// that as midnight UTC, so we must also *format* in UTC. Otherwise a server or browser
// west of UTC would show the previous day (Nov 12 instead of Nov 13).
const longDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});
const shortDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  timeZone: "UTC",
});

/** "2026-11-13" -> "Nov 13, 2026" */
export function formatDate(isoDate: string): string {
  return longDate.format(new Date(isoDate));
}

/** "2026-11-13" -> "Nov 13" (phone table and chart axis). */
export function formatShortDate(isoDate: string): string {
  return shortDate.format(new Date(isoDate));
}

/** "INFORMATION TECHNOLOGY" -> "Information technology" (AlphaVantage sector labels). */
export function toSentenceCase(text: string): string {
  const lower = text.trim().toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}
