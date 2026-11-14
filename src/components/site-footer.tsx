/** The line at the bottom of every page, with an optional note on the right. */
export function SiteFooter({ note }: { note?: string }) {
  return (
    <footer className="mx-auto mt-auto w-full max-w-[1440px] px-5 pb-8 md:px-16">
      <div className="flex flex-col gap-2 border-t border-line pt-5 text-xs text-muted sm:flex-row sm:justify-between">
        <p className="font-medium">
          Test Design&nbsp;&nbsp;/&nbsp;&nbsp;A little market clarity.
        </p>
        {note && <p>{note}</p>}
      </div>
    </footer>
  );
}
