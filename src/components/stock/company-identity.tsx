import { loadIdentity } from "@/app/stock/[symbol]/data";
import { LogoTile } from "@/components/logo-tile";
import { FaceDownCard } from "@/components/card-back";
import { FlipReveal } from "@/components/flip-reveal";
import { NOT_AVAILABLE, toSentenceCase } from "@/lib/format";

/**
 * The company header: logo, name, "SYMBOL · EXCHANGE · ASSET TYPE", and chips for the
 * sector and (only when OVERVIEW provides it) the country.
 *
 * This is an async server component: it runs on the server, waits for the data, and sends
 * finished HTML. While it waits, the page shows <CompanyIdentityPlaceholder /> instead.
 */
export async function CompanyIdentity({ symbol }: { symbol: string }) {
  // Only the identity fields, so the header doesn't wait for prices or share counts.
  const identity = await loadIdentity(symbol);
  const name = identity.name ?? NOT_AVAILABLE;

  return (
    <FlipReveal>
      <div>
        <div className="flex items-start gap-4">
          <LogoTile symbol={symbol} name={name} size={64} />
          <div className="min-w-0">
            <h1 className="font-display text-[30px] leading-tight text-crimson md:text-[44px]">
              {name}
            </h1>
            <p className="mt-1 text-xs font-medium text-muted md:text-small">
              {symbol}&nbsp;&nbsp;·&nbsp;&nbsp;
              {identity.exchange ?? NOT_AVAILABLE}
              &nbsp;&nbsp;·&nbsp;&nbsp;{identity.assetType ?? NOT_AVAILABLE}
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2.5">
          <p className="rounded-xl bg-raised px-3 py-2 text-xs font-medium text-gold-ink">
            {identity.sector
              ? toSentenceCase(identity.sector)
              : `Sector ${NOT_AVAILABLE}`}
          </p>
          {identity.country && (
            <p className="rounded-xl bg-positive-bg px-3 py-2 text-xs font-medium text-positive">
              {identity.country}
            </p>
          )}
        </div>
      </div>
    </FlipReveal>
  );
}

export function CompanyIdentityPlaceholder() {
  return (
    <FaceDownCard
      label="Loading company details"
      className="h-[120px] md:h-[124px]"
    />
  );
}
