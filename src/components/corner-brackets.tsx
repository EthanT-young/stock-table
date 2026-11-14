/**
 * The thin gold corner brackets from the design's Art Deco cards and panels.
 *
 * Drawn with CSS borders rather than an image, so the brackets keep the same size on a
 * panel of any width or height (an image would stretch with the panel).
 */
export function CornerBrackets({
  size,
  inset,
  opacity,
}: {
  /** Length of each bracket arm in px. */
  size: number;
  /** Distance from the panel edge in px. */
  inset: number;
  /** 0 to 1. */
  opacity: number;
}) {
  const corners = [
    "top-0 left-0 border-t border-l",
    "top-0 right-0 border-t border-r",
    "bottom-0 left-0 border-b border-l",
    "bottom-0 right-0 border-b border-r",
  ];
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute"
      style={{ inset, opacity }}
    >
      {corners.map((position) => (
        <span
          key={position}
          className={`absolute border-gold ${position}`}
          style={{ width: size, height: size }}
        />
      ))}
    </span>
  );
}
