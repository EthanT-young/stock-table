import { NotFoundPanel } from "@/components/not-found-panel";

/** Shown (with HTTP status 404) for /stock/<symbol> when the symbol isn't one of the 16. */
export default function UnknownTicker() {
  return (
    <NotFoundPanel
      heading="This ticker isn’t in our collection."
      message="Stock Table covers 16 companies. You can browse them all from the homepage."
    />
  );
}
