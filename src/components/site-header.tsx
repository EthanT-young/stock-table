import Image from "next/image";
import Link from "next/link";
import { ExploreLink } from "@/components/explore-link";

/** The bar at the top of every page: brand on the left, "Explore stocks" on the right. */
export function SiteHeader() {
  return (
    <header className="relative bg-nav">
      <div className="mx-auto flex h-19 w-full max-w-[1440px] items-center gap-6 px-5 md:h-24 md:px-16">
        <Link href="/" className="flex items-center gap-2.5 rounded-lg">
          <span className="flex size-[27px] items-center justify-center rounded-lg bg-gold-gradient">
            <Image
              src="/suits/brand-spade.svg"
              alt=""
              aria-hidden
              width={20}
              height={20}
            />
          </span>
          <span className="font-display text-[22px] whitespace-nowrap text-crimson sm:text-h3">
            Stock Table
          </span>
        </Link>
        <nav className="ml-auto flex items-center">
          <ExploreLink className="rounded-xl bg-crimson px-3 py-2 text-xs font-medium whitespace-nowrap text-on-crimson" />
        </nav>
      </div>
      {/* Thin gold line along the bottom of the bar */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-px bg-gold-gradient opacity-45"
      />
    </header>
  );
}
