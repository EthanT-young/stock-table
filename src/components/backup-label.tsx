// Shown in US Eastern time, where the stock market is, so data fetched on the evening of
// Nov 13 in New York reads "Nov 13" even though it is already Nov 14 in UTC.
const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "America/New_York",
});

/**
 * The "cached data from <date>" pill. Shown in a section when some of its data is a stored
 * copy (live data was unavailable), so visitors know it may not be current.
 * Renders nothing when everything is current (backupFrom is null).
 */
export function BackupLabel({ backupFrom }: { backupFrom: number | null }) {
  if (backupFrom === null) {
    return null;
  }
  return (
    <p className="inline-flex items-center gap-1.5 rounded-xl bg-track px-2.5 py-1 text-label font-medium text-muted">
      <span aria-hidden>◷</span>
      Cached data from {dateFormat.format(new Date(backupFrom))}
    </p>
  );
}
