import { loadPrices } from "@/app/stock/[symbol]/data";
import { PriceChart } from "@/components/stock/price-chart";

/**
 * The chart section. Runs on the server: loads the prices, then hands them to the
 * browser-side <PriceChart>. While the prices load, the page shows the roulette instead.
 */
export async function PricePerformance({ symbol }: { symbol: string }) {
  const prices = await loadPrices(symbol);
  if (!prices || prices.length === 0) {
    return (
      <section className="blur-fade-in flex min-h-[374px] flex-col rounded-md border border-border bg-surface p-6 lg:min-h-[408px]">
        <h2 className="text-label font-semibold text-muted uppercase">
          Price performance
        </h2>
        <p className="m-auto text-body text-muted">
          Price data isn&rsquo;t available right now. Please try again later.
        </p>
      </section>
    );
  }
  return <PriceChart prices={prices} />;
}
