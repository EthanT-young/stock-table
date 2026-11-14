import { CardBack } from "@/components/card-back";

/**
 * Wraps a finished section in a two-sided card that starts face down and turns over to
 * reveal it (the "card-flip-in" animation in globals.css).
 *
 * Because the loading placeholder is the same face-down card, React swapping the
 * placeholder for this component looks like one card being turned over.
 */
export function FlipReveal({
  delayMs = 0,
  className = "",
  children,
}: {
  /** Wait before turning over, so sections that arrive together flip one after another. */
  delayMs?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flip-scene ${className}`}>
      <div
        className="flip-card h-full"
        style={{ animationDelay: `${delayMs}ms` }}
      >
        <div className="flip-front h-full">{children}</div>
        <CardBack className="flip-back" />
      </div>
    </div>
  );
}
