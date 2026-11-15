import type { Metadata } from "next";
import { NotFoundPanel } from "@/components/not-found-panel";

// The browser tab title, matching the one a missing company's page shows.
export const metadata: Metadata = {
  title: "Not found · Stock Table",
};

/** Shown (with HTTP status 404) for any address that doesn't exist. */
export default function NotFound() {
  return (
    <NotFoundPanel
      heading="This page isn’t here."
      message="The address may be mistyped, or the page may have moved."
    />
  );
}
