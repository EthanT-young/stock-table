import { CornerBrackets } from "@/components/corner-brackets";

/**
 * The panel used on the 404 page: warm white with fine gold corner inlays, in the Art Deco
 * style of the design.
 */
export function DecoPanel({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`relative overflow-hidden rounded-md border border-border bg-panel-404 ${className}`}
    >
      <CornerBrackets size={10} inset={7} opacity={0.42} />
      <div className="relative">{children}</div>
    </section>
  );
}
