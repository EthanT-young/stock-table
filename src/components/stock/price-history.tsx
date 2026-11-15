import { loadPrices } from "@/app/stock/[symbol]/data";
import { FaceDownCard } from "@/components/card-back";
import { FlipReveal } from "@/components/flip-reveal";
import {
  NOT_AVAILABLE,
  formatCompactVolume,
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

/**
 * The panel frame and heading, turned over like a card when it appears. The subtitle
 * with the number of days only shows when there are rows to count.
 */
function HistoryPanel({
  rowCount,
  children,
}: {
  rowCount?: number; // the "?" makes it optional; it is undefined when there is no data
  children: React.ReactNode;
}) {
  return (
    <FlipReveal delayMs={240}>
      <section className="overflow-hidden rounded-md border border-border bg-surface">
        <div className="flex flex-wrap items-start justify-between gap-3 p-5 md:p-6">
          <div>
            <h2 className="font-display text-[24px] text-crimson md:text-h3">
              Daily history
            </h2>
            {rowCount !== undefined && (
              <p className="mt-1 text-xs text-muted">
                {rowCount} trading {rowCount === 1 ? "day" : "days"} · Newest
                first
              </p>
            )}
          </div>
        </div>
        {children}
      </section>
    </FlipReveal>
  );
}

/**
 * The list of historical prices: date, close, volume and % change from the previous
 * trading day, newest first. The rows scroll inside a fixed-height box while the column
 * headings stay in place. Phones show shorter dates and volumes so all four columns fit.
 */
export async function PriceHistory({ symbol }: { symbol: string }) {
  const prices = await loadPrices(symbol);
  if (!prices || prices.length === 0) {
    return (
      <HistoryPanel>
        <p className="px-5 pb-5 text-body text-muted md:px-6 md:pb-6">
          Price history isn&rsquo;t available right now. Please try again later.
        </p>
      </HistoryPanel>
    );
  }
  const rows = withDailyChange(prices);

  return (
    <HistoryPanel rowCount={rows.length}>
      {/* tabIndex lets keyboard users focus the box and scroll it with the arrow keys.
          role="region" makes it a named area, so screen readers announce the label. */}
      <div
        role="region"
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
                className="w-[27%] pl-5 font-semibold md:w-[34%] md:pl-6"
              >
                Date
              </th>
              <th scope="col" className="w-[26%] font-semibold md:w-[22%]">
                Close (USD)
              </th>
              <th scope="col" className="w-[23%] font-semibold md:w-[26%]">
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
                <td>
                  <span className="md:hidden">
                    {formatCompactVolume(row.volume)}
                  </span>
                  <span className="hidden md:inline">
                    {formatVolume(row.volume)}
                  </span>
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
    </HistoryPanel>
  );
}

export function PriceHistoryPlaceholder() {
  return (
    <FaceDownCard
      label="Loading the price history"
      className="h-[410px] md:h-[480px]"
    />
  );
}
