import { CornerBrackets } from "@/components/corner-brackets";

/** The two panel styles from the design. */
const TONES = {
  /** Crimson gradient with a gold outline and large gold corner brackets (the hero). */
  crimson: {
    panel: "rounded-[4px] border-border-strong bg-crimson-gradient",
    brackets: { size: 32, inset: 15, opacity: 0.68 },
  },
  /** Warm white with fine gold corner inlays (the 404 page). */
  ivory: {
    panel: "rounded-md border-border bg-panel-404",
    brackets: { size: 10, inset: 7, opacity: 0.42 },
  },
} as const;

/**
 * A feature panel in the Art Deco style of the design, in one of two tones.
 */
export function DecoPanel({
  tone,
  as: Tag = "section",
  className = "",
  children,
}: {
  tone: keyof typeof TONES;
  /** Which HTML element to render (section by default). */
  as?: "section" | "div";
  className?: string;
  children: React.ReactNode;
}) {
  const { panel, brackets } = TONES[tone];
  return (
    <Tag className={`relative overflow-hidden border ${panel} ${className}`}>
      <CornerBrackets {...brackets} />
      <div className="relative">{children}</div>
    </Tag>
  );
}
