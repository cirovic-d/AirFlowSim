/** A fan facing the viewer: square frame, ring, blades, hub and an optional label. */
export function FaceFanShape({ cx, cy, size, label }: { cx: number; cy: number; size: number; label?: string }) {
  const r = size / 2 - 6;
  const blades = Array.from({ length: 7 }, (_, i) => i * (360 / 7));
  const hub = size * 0.12;
  // Blade drawn for size 120, then scaled.
  const k = size / 120;

  return (
    <>
      <rect className="fan-frame" x={cx - size / 2 + 2} y={cy - size / 2 + 2} width={size - 4} height={size - 4} rx={size / 10} />
      <circle className="fan-ring" cx={cx} cy={cy} r={r} />
      <g transform={`translate(${cx} ${cy})`}>
        {blades.map((angle) => (
          <path
            key={angle}
            className="fan-blade"
            transform={`rotate(${angle}) scale(${k})`}
            d="M0 -14 C 18 -22, 30 -34, 22 -48 C 12 -40, 4 -30, 0 -14Z"
          />
        ))}
        <circle className="fan-hub" r={hub} />
        {label && (
          <text className="fan-label" y="1">
            {label}
          </text>
        )}
      </g>
    </>
  );
}

/** Straight arrow from (x1, y1) to (x2, y2) with a small head. */
export function Arrow({ x1, y1, x2, y2, className = "fan-arrow" }: { x1: number; y1: number; x2: number; y2: number; className?: string }) {
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const dx = (x2 - x1) / len;
  const dy = (y2 - y1) / len;
  const hx = -dx * 8;
  const hy = -dy * 8;
  const px = -dy * 7;
  const py = dx * 7;
  return (
    <path
      className={className}
      d={`M${x1} ${y1}L${x2} ${y2}M${x2} ${y2}l${hx + px} ${hy + py}M${x2} ${y2}l${hx - px} ${hy - py}`}
    />
  );
}

/**
 * A fan seen edge-on (from the side): frame, hub and slanted blades.
 * Drawn horizontally (120 × 25 mm) and turned for front/rear fans.
 */
export function EdgeFanShape({ cx, cy, vertical, len = 120, thick = 25 }: { cx: number; cy: number; vertical: boolean; len?: number; thick?: number }) {
  const x = cx - len / 2;
  const y = cy - thick / 2;
  const hub = len * 0.14;
  const blades = [0, 1, 2].flatMap((i) => {
    const d = hub + 6 + i * ((len / 2 - hub - 14) / 2);
    return [-1, 1].map((side) => ({ x1: cx + side * d, x2: cx + side * (d + 9) }));
  });

  return (
    <g transform={vertical ? `rotate(90 ${cx} ${cy})` : undefined}>
      <rect className="fan-frame" x={x} y={y} width={len} height={thick} rx="4" />
      {/* corner pads */}
      <rect className="fan-pad" x={x + 2} y={y + 2} width="9" height={thick - 4} rx="2" />
      <rect className="fan-pad" x={x + len - 11} y={y + 2} width="9" height={thick - 4} rx="2" />
      {blades.map((b, i) => (
        <path key={i} className="fan-blade-edge" d={`M${b.x1} ${y + 5}L${b.x2} ${y + thick - 5}`} />
      ))}
      <rect className="fan-hub-edge" x={cx - hub} y={y + 4} width={hub * 2} height={thick - 8} rx="3" />
    </g>
  );
}
