import Image from "next/image";
import { DecoPanel } from "@/components/deco-panel";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { StockCard } from "@/components/stock-card";
import { NOT_AVAILABLE, toSentenceCase } from "@/lib/format";
import { snapshot } from "@/lib/snapshot";
import { TICKERS } from "@/lib/tickers";

/**
 * The homepage: a fixed collection of 16 companies.
 *
 * It makes no API requests. Sectors come from the committed snapshot, the same source the
 * details pages use, so a card and its details page always agree. Next.js renders this
 * page once at build time and serves it as static HTML.
 */
export default function HomePage() {
  const sectorOf = (symbol: string): string => {
    const sector = snapshot.sector(symbol);
    return sector ? toSentenceCase(sector) : NOT_AVAILABLE;
  };
  const sectorCount = new Set(
    TICKERS.map((ticker) => snapshot.sector(ticker.symbol)).filter(Boolean),
  ).size;

  return (
    <>
      <SiteHeader showTagline />
      <main className="mx-auto w-full max-w-[1440px] px-5 md:px-16">
        <DecoPanel tone="crimson" className="mt-4 p-6 md:mt-6 md:p-10">
          <p className="text-xs font-medium tracking-[1.2px] text-ivory">
            CURATED. NOT COMPLICATED.
          </p>
          <Image
            src="/suits/hero-spade.svg"
            alt=""
            aria-hidden
            width={34}
            height={34}
            className="absolute top-0 right-0"
          />
          <h1 className="mt-8 font-display text-display leading-[49px] text-hero-heading md:text-hero md:leading-tight">
            Big companies.{" "}
            <span className="block text-hero-italic italic md:inline">
              A clearer view.
            </span>
          </h1>
          <p className="mt-6 max-w-[520px] text-sm text-ivory md:text-lead">
            Explore 16 familiar names. Get the company story, then follow the
            numbers.
          </p>
          <Image
            src="/ornaments/diamond-divider.svg"
            alt=""
            aria-hidden
            width={298}
            height={12}
            className="mt-8"
          />
        </DecoPanel>

        {/* scroll-mt keeps the heading visible when "Explore stocks" jumps here */}
        <section id="collection" className="mt-7 scroll-mt-6 pb-12 md:mt-10">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-[24px] text-crimson md:text-h2">
              The company collection
            </h2>
            <p className="hidden text-small font-medium text-muted md:block">
              {TICKERS.length} companies&nbsp;&nbsp;/&nbsp;&nbsp;{sectorCount}{" "}
              sectors
            </p>
          </div>
          <p className="mt-2 text-small text-muted md:text-body">
            <span className="md:hidden">
              16 familiar names, all in one place.
            </span>
            <span className="hidden md:inline">
              From everyday essentials to what&rsquo;s next. Pick a company to
              look closer.
            </span>
          </p>

          <ul className="mt-6 grid gap-2.5 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
            {TICKERS.map((ticker) => (
              <li key={ticker.symbol}>
                <StockCard ticker={ticker} sector={sectorOf(ticker.symbol)} />
              </li>
            ))}
          </ul>
        </section>
      </main>
      <SiteFooter note="Fixed collection · No live data on this page" />
    </>
  );
}
