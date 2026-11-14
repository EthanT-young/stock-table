import { loadPrices } from "@/app/stock/[symbol]/data";
import { BackupLabel } from "@/components/backup-label";
import { Skeleton } from "@/components/skeleton";
import {
  NOT_AVAILABLE,
  formatDate,
  formatPercent,
  formatPrice,
  formatShortDate,
  formatVolume,
} from "@/lib/format";
import { withDailyChange } from "@/lib/prices";

/** Green for gains, red for losses, grey for no change or N/A. */
function changeColor(changePercent: number | null): string {
  if (changePercent === null) return "text-muted";
  const rounded = Math.round(changePercent * 100) / 100; // matches what is displayed
  if (rounded > 0) return "text-positive";
  if (rounded < 0) return "text-negative";
  return "text-muted";
}

/** The panel frame and heading, shared by the table and its loading placeholder. */
function HistoryPanel({
  backupFrom,
  children,
}: {
  backupFrom: number | null;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-md border border-border bg-surface">
      <div className="flex flex-wrap items-start justify-between gap-3 p-5 md:p-6">
        <div>
          <h2 className="font-display text-[24px] text-crimson md:text-h3">
            Daily history
          </h2>
          <p className="mt-1 text-xs text-muted">
            100 trading days · Newest first
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BackupLabel backupFrom={backupFrom} />
          <p className="hidden rounded-xl bg-raised px-3 py-2 text-xs font-medium text-gold-ink sm:block">
            TIME_SERIES_DAILY · compact
          </p>
        </div>
      </div>
      {children}
    </section>
  );
}

/**
 * The list of historical prices: date, close, volume and % change from the previous
 * trading day, newest first. The rows scroll inside a fixed-height box while the column
 * headings stay in place. Phones hide the volume column to keep rows readable.
 */
export async function PriceHistory({ symbol }: { symbol: string }) {
  const prices = await loadPrices(symbol);
  if (!prices) {
    return (
      <HistoryPanel backupFrom={null}>
        <p className="px-6 pb-6 text-body text-muted">
          Price history isn&rsquo;t available right now. Please try again later.
        </p>
      </HistoryPanel>
    );
  }
  const rows = withDailyChange(prices.value);

  return (
    <HistoryPanel backupFrom={prices.backupFrom}>
      {/* tabIndex lets keyboard users focus the box and scroll it with the arrow keys. */}
      <div
        tabIndex={0}
        aria-label={`${symbol} daily price history, scrollable`}
        className="history-scroll h-[308px] overflow-y-auto md:h-[378px]"
      >
        <table className="w-full table-fixed text-left">
          <caption className="sr-only">
            Daily closing price, volume and change from the previous trading day
            for {symbol}, newest first
          </caption>
          <thead className="sticky top-0 z-10 bg-table-header text-label font-semibold text-muted">
            <tr className="h-[42px]">
              <th
                scope="col"
                className="w-[40%] pl-5 font-semibold md:w-[34%] md:pl-6"
              >
                Date
              </th>
              <th scope="col" className="w-[30%] font-semibold md:w-[22%]">
                Close (USD)
              </th>
              <th
                scope="col"
                className="hidden w-[26%] font-semibold md:table-cell"
              >
                Volume
              </th>
              <th scope="col" className="font-semibold">
                <span className="md:hidden">Change</span>
                <span className="hidden md:inline">Daily change</span>
              </th>
            </tr>
          </thead>
          <tbody className="text-sm text-ink tabular-nums">
            {rows.map((row) => (
              <tr
                key={row.date}
                className="h-11 odd:bg-surface even:bg-surface-alt md:h-12"
              >
                <td className="pl-5 md:pl-6">
                  <span className="md:hidden">{formatShortDate(row.date)}</span>
                  <span className="hidden md:inline">
                    {formatDate(row.date)}
                  </span>
                </td>
                <td>{formatPrice(row.close)}</td>
                <td className="hidden md:table-cell">
                  {formatVolume(row.volume)}
                </td>
                <td className={`font-medium ${changeColor(row.changePercent)}`}>
                  {row.changePercent === null
                    ? NOT_AVAILABLE
                    : formatPercent(row.changePercent)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="px-5 py-4 text-xs text-muted md:px-6 md:py-5">
        <span className="md:hidden">Showing latest days · Scroll for more</span>
        <span className="hidden md:inline">
          {rows.length} rows available&nbsp;&nbsp;·&nbsp;&nbsp;Change vs.
          previous trading day&nbsp;&nbsp;·&nbsp;&nbsp;Oldest row: N/A
        </span>
      </p>
    </HistoryPanel>
  );
}

export function PriceHistorySkeleton() {
  return (
    <HistoryPanel backupFrom={null}>
      <div className="fade-in-late space-y-4 px-5 pb-6 md:px-6">
        {[0, 1, 2, 3, 4, 5].map((row) => (
          <Skeleton key={row} className="h-4 w-full" />
        ))}
      </div>
    </HistoryPanel>
  );
}
