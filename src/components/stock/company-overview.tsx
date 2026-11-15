import { loadPrices, loadProfile } from "@/app/stock/[symbol]/data";
import { CornerBrackets } from "@/components/corner-brackets";
import { FaceDownCard } from "@/components/card-back";
import { FlipReveal } from "@/components/flip-reveal";
import { MarketCapValue } from "@/components/stock/market-cap-value";
import { NOT_AVAILABLE, toSentenceCase } from "@/lib/format";

/** One label/value pair in the card, e.g. SECTOR / Information technology. */
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-micro font-semibold text-muted uppercase">{label}</dt>
      <dd className="mt-1 text-body font-medium text-ink">{children}</dd>
    </div>
  );
}

/**
 * The "Behind the ticker" card: description, sector, industry and market cap, each "N/A"
 * when unavailable.
 */
export async function CompanyOverview({ symbol }: { symbol: string }) {
  const profile = await loadProfile(symbol);
  const prices = await loadPrices(symbol);
  const latestClose = prices?.[0]?.close ?? null;

  return (
    <FlipReveal delayMs={120} className="h-full">
      <section className="relative flex h-full flex-col rounded-md border border-border bg-ivory-gradient p-5 md:p-6">
        <CornerBrackets size={10} inset={7} opacity={0.42} />
        <h2 className="font-display text-h4 text-crimson">Behind the ticker</h2>

        <dl className="mt-5 space-y-4">
          <Field label="Description">
            {profile.description ? (
              <span className="font-normal">{profile.description}</span>
            ) : (
              NOT_AVAILABLE
            )}
          </Field>
          <Field label="Sector">
            {profile.sector ? toSentenceCase(profile.sector) : NOT_AVAILABLE}
          </Field>
          <Field label="Industry">
            {profile.industry
              ? toSentenceCase(profile.industry)
              : NOT_AVAILABLE}
          </Field>
          <Field label="Market cap">
            {profile.marketCap ? (
              <MarketCapValue
                marketCap={profile.marketCap}
                latestClose={latestClose}
                id={`${symbol}-market-cap`}
              />
            ) : (
              NOT_AVAILABLE
            )}
          </Field>
        </dl>
      </section>
    </FlipReveal>
  );
}

export function CompanyOverviewPlaceholder() {
  return (
    <FaceDownCard
      label="Loading the company overview"
      className="h-full min-h-[330px]"
    />
  );
}
