import Link from "next/link";
import { DecoPanel } from "@/components/deco-panel";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

/** The 404 page from the design, with a heading and message that depend on what was missing. */
export function NotFoundPanel({
  heading,
  message,
}: {
  heading: string;
  message: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1440px] px-5 py-8 md:px-16 md:py-12">
        <DecoPanel tone="ivory" className="max-w-[804px] p-6 md:p-9">
          <p className="font-sans text-[72px] leading-none font-bold text-gold-ink md:text-[94px]">
            404
          </p>
          <h1 className="mt-4 font-display text-[26px] text-crimson md:text-[30px]">
            {heading}
          </h1>
          <p className="mt-4 text-body text-muted">{message}</p>
          <Link
            href="/"
            className="mt-12 inline-block rounded-xl bg-crimson px-4 py-3.5 text-sm font-semibold text-on-crimson"
          >
            ←&nbsp;&nbsp;Back to all companies
          </Link>
        </DecoPanel>
      </main>
      <SiteFooter />
    </>
  );
}
