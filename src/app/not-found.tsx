import { NotFoundPanel } from "@/components/not-found-panel";

/** Shown (with HTTP status 404) for any address that doesn't exist. */
export default function NotFound() {
  return (
    <NotFoundPanel
      heading="This page isn’t here."
      message="The address may be mistyped, or the page may have moved."
    />
  );
}
