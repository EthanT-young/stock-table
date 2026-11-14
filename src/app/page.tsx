import Image from "next/image";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { StockCard } from "@/components/stock-card";
import { NOT_AVAILABLE, toSentenceCase } from "@/lib/format";
import { snapshot } from "@/lib/snapshot";
import { TICKERS } from "@/lib/tickers";

/** The decorative playing cards in the hero (desktop only). */
const HERO_CARDS = ["spade", "diamond", "club"] as const;

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
        <section className="relative mt-4 flex flex-col gap-8 rounded-xl border-[1.5px] border-dashed border-border-hero bg-raised p-5 md:mt-6 md:flex-row md:p-9">
          <div className="flex-1">
            <p className="inline-block rounded-xl bg-surface px-3 py-2 text-xs font-medium text-gold">
              CURATED. NOT COMPLICATED.
            </p>
            <h1 className="mt-5 pr-10 font-display text-[35px] leading-tight text-cream md:mt-6 md:pr-0 md:text-hero">
              Big companies. A clearer view.
            </h1>
            <p className="mt-3 max-w-[650px] text-sm text-muted md:text-lead">
              Explore 16 familiar names. Get the company story,
              <br className="hidden md:inline" /> then follow the numbers.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 md:mt-8">
              <p className="rounded-xl bg-gold px-3 py-2 text-xs font-medium text-on-gold">
                16 companies
              </p>
              <p className="rounded-xl bg-surface px-3 py-2 text-xs font-medium text-cream">
                100 trading days of prices
              </p>
            </div>
          </div>

          {/* Phone: a single suit in the corner. Desktop: playing cards and a note. */}
          <Image
            src="/suits/spade.svg"
            alt=""
            aria-hidden
            width={34}
            height={34}
            className="absolute top-5 right-5 md:hidden"
          />
          <div className="hidden w-[270px] shrink-0 flex-col items-center justify-between md:flex">
            <div className="flex gap-3.5">
              {HERO_CARDS.map((suit) => (
                <div
                  key={suit}
                  className="relative h-[94px] w-[58px] rounded-md border border-gold bg-cream"
                >
                  <Image
                    src={`/suits/card-${suit}-small.svg`}
                    alt=""
                    aria-hidden
                    width={12}
                    height={12}
                    className="absolute top-[5px] left-[4px]"
                  />
                  <Image
                    src={`/suits/card-${suit}.svg`}
                    alt=""
                    aria-hidden
                    width={35}
                    height={35}
                    className="absolute top-[25px] left-[11px]"
                  />
                </div>
              ))}
            </div>
            <div className="mt-6 w-full rounded-xl bg-burgundy px-4.5 py-3.5 text-cream">
              <p className="text-lead font-semibold">
                Small list. Big perspective.
              </p>
              <p className="mt-1 text-xs">
                A focused place to start exploring.
              </p>
            </div>
          </div>
        </section>

        {/* scroll-mt keeps the heading visible when "Explore stocks" jumps here */}
        <section id="collection" className="mt-7 scroll-mt-6 pb-12 md:mt-10">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-[24px] text-cream md:text-h2">
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
