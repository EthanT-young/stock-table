import Image from "next/image";
import Link from "next/link";

/** The bar at the top of every page: brand on the left, "Explore stocks" on the right. */
export function SiteHeader({ showTagline = false }: { showTagline?: boolean }) {
  return (
    <header className="bg-surface">
      <div className="mx-auto flex h-19 w-full max-w-[1440px] items-center gap-6 px-5 md:h-24 md:px-16">
        <Link href="/" className="flex items-center gap-2.5 rounded-lg">
          <span className="flex size-[27px] items-center justify-center rounded-lg bg-gold">
            <Image
              src="/suits/brand-spade.svg"
              alt=""
              aria-hidden
              width={20}
              height={20}
            />
          </span>
          <span className="font-display text-h3 text-cream">Test Design</span>
        </Link>
        <nav className="ml-auto flex items-center gap-10">
          {/* <Link> navigates inside the app without a full page reload. */}
          <Link
            href="/#collection"
            className="rounded-xl bg-raised px-3 py-2 text-xs font-medium text-gold"
          >
            Explore stocks
          </Link>
          {showTagline && (
            <p className="hidden text-sm font-medium text-muted lg:block">
              A little market clarity.
            </p>
          )}
        </nav>
      </div>
    </header>
  );
}
