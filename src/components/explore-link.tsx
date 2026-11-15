"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * The header's "Explore stocks" link to the company collection on the homepage.
 *
 * From another page it is an ordinary link to "/#collection". On the homepage itself a
 * plain link would scroll but leave keyboard focus up in the header, so the next Tab
 * would jump back to the top. There it scrolls to the collection and moves focus to its
 * heading instead, so keyboard and screen-reader users continue from where they landed.
 */
export function ExploreLink({ className }: { className: string }) {
  const pathname = usePathname(); // the current URL path, e.g. "/" or "/stock/AAPL"

  return (
    <Link
      href="/#collection"
      className={className}
      onClick={(event) => {
        // Leave modified clicks (new tab, new window, download) to the browser.
        const modified =
          event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
        const heading = document.getElementById("collection-heading");
        if (pathname !== "/" || modified || event.button !== 0 || !heading) {
          return;
        }
        event.preventDefault();
        // Add the history entry before scrolling: the browser stores the current scroll
        // position with the entry being left, so Back returns to the top of the page.
        // Only once, so repeat clicks don't pile up entries that Back has to step through.
        if (window.location.hash !== "#collection") {
          window.history.pushState(null, "", "#collection");
        }
        document.getElementById("collection")?.scrollIntoView();
        heading.focus({ preventScroll: true });
      }}
    >
      Explore stocks
    </Link>
  );
}
