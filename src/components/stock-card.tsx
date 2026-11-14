import Link from "next/link";
import { CornerBrackets } from "@/components/corner-brackets";
import { LogoTile } from "@/components/logo-tile";
import { SuitIcon } from "@/components/suit-icon";
import type { Suit, Ticker } from "@/lib/tickers";

/**
 * Ticker pill color per suit: each suit has its own light shade from the design. (Tailwind
 * only generates classes it finds written out in full, so these must be complete class
 * names, not built from parts.)
 */
const PILL_COLOR: Record<Suit, string> = {
  spade: "bg-pill-spade",
  heart: "bg-pill-heart",
  club: "bg-pill-club",
  diamond: "bg-pill-diamond",
};

/**
 * One company on the homepage, linking to its details page.
 * Phones get a compact row; wider screens get the tall card from the desktop design.
 */
export function StockCard({
  ticker,
  sector,
}: {
  ticker: Ticker;
  sector: string;
}) {
  return (
    <Link
      href={`/stock/${ticker.symbol}`}
      className="group relative block rounded-md border border-border bg-surface transition-colors hover:border-crimson focus-visible:border-crimson"
    >
      {/* Phone layout */}
      <div className="flex items-center gap-3.5 p-3.5 sm:hidden">
        <LogoTile symbol={ticker.symbol} name={ticker.displayName} size={46} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-semibold text-crimson">
            {ticker.displayName}
          </p>
          <p className="mt-1.5 truncate text-micro font-medium text-muted">
            {ticker.symbol}&nbsp;&nbsp;·&nbsp;&nbsp;{sector}
          </p>
        </div>
        <div className="flex flex-col items-center gap-1">
          <span aria-hidden className="text-[19px] font-medium text-crimson">
            ↗
          </span>
          <SuitIcon suit={ticker.suit} size={13} />
        </div>
      </div>

      {/* Wider layout */}
      <div className="relative hidden h-[174px] flex-col p-5 sm:flex">
        <CornerBrackets size={10} inset={7} opacity={0.42} />
        <div className="flex items-center gap-4">
          <LogoTile
            symbol={ticker.symbol}
            name={ticker.displayName}
            size={48}
          />
          <span
            className={`rounded-xl px-3 py-2 text-xs font-medium text-pill-text ${PILL_COLOR[ticker.suit]}`}
          >
            {ticker.symbol}
          </span>
          <span
            aria-hidden
            className="ml-auto font-display text-[22px] text-crimson transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          >
            ↗
          </span>
        </div>
        <p className="mt-auto truncate font-display text-card text-crimson">
          {ticker.displayName}
        </p>
        <div className="mt-2.5 flex items-center justify-between">
          <p className="truncate text-small text-muted">{sector}</p>
          <SuitIcon suit={ticker.suit} size={22} />
        </div>
      </div>
    </Link>
  );
}
