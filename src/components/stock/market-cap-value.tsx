import { formatMarketCap, formatShortDate, formatUsd } from "@/lib/format";
import type { MarketCap } from "@/lib/stock-data";

/**
 * The market cap value. An estimated value gets an "est." button that opens a short
 * explanation of how it was calculated.
 *
 * The explanation uses the browser's built-in popover (`popover` and `popoverTarget`
 * attributes): it opens on click or tap, works from the keyboard, and closes with Esc or a
 * click elsewhere, all without any JavaScript of our own.
 */
export function MarketCapValue({
  marketCap,
  latestClose,
  id,
}: {
  marketCap: MarketCap;
  latestClose: number | null;
  id: string;
}) {
  if (!marketCap.estimated) {
    return <>{formatMarketCap(marketCap.value)}</>;
  }
  const popoverId = `${id}-explained`;
  const sharesPart = marketCap.sharesAsOf
    ? `Shares outstanding (quarter ending ${formatShortDate(marketCap.sharesAsOf)})`
    : "Shares outstanding";
  const closePart =
    latestClose !== null
      ? `latest close (${formatUsd(latestClose)})`
      : "latest close";
  return (
    <>
      ≈ {formatMarketCap(marketCap.value)}{" "}
      {/* The screen-reader name starts with the visible "est." so voice-control users can
          say "click est" (WCAG 2.5.3). */}
      <button
        type="button"
        popoverTarget={popoverId}
        className="ml-1 rounded-md bg-track px-1.5 py-0.5 text-label font-semibold text-gold-ink underline decoration-dotted underline-offset-2"
        aria-label="est. (estimated market cap): how it is calculated"
      >
        est.
      </button>
      <span
        id={popoverId}
        popover="auto"
        className="m-auto max-w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-border bg-surface p-4 text-small text-ink shadow-xl backdrop:bg-black/40"
      >
        <strong className="block font-semibold">Estimated market cap</strong>
        <span className="mt-2 block text-muted">
          {sharesPart} × {closePart}.
        </span>
      </span>
    </>
  );
}
