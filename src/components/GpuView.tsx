import type { CaseProfile, GpuConfig } from "../types";
import { getGpuFans, getGpuFit, getGpuLength, getGpuThickness } from "../lib/components";
import { GPU_X as BRACKET_X, PCIE_Y } from "../lib/layout";
import { shade } from "../lib/looks";
import { Arrow } from "./FanShapes";

/**
 * Graphics card seen from the side: backplate on top, heatsink fins in the
 * middle, the colored shroud with its fans on the underside. No logos.
 */
export function GpuView({ caseProfile, gpu, color }: { caseProfile: CaseProfile; gpu: GpuConfig; color: string }) {
  const length = getGpuLength(gpu);
  if (length === null) return null;

  const fit = getGpuFit(caseProfile, gpu);
  const max = caseProfile.clearanceMm.gpuMaxLength;
  const y = PCIE_Y + 6;
  const fans = getGpuFans(gpu);
  const thick = getGpuThickness(gpu);
  const segment = length / fans;
  const fanWidth = Math.min(92, segment - 10);
  const x0 = BRACKET_X;
  const x1 = BRACKET_X + length;

  // Layers from top to bottom: backplate, PCB, fins, shroud.
  const plateH = 3;
  const finTop = y + plateH + 2;
  const shroudTop = y + Math.round(thick * 0.45);
  // The shroud's front end is cut at an angle.
  const cut = Math.min(18, thick * 0.4);
  const shroudPath = `M${x0 + 6} ${shroudTop}H${x1 - cut}L${x1} ${shroudTop + cut}V${y + thick - 4}Q${x1} ${y + thick} ${x1 - 4} ${y + thick}H${x0 + 6}Z`;
  const connectorX = x0 + length * 0.62;

  return (
    <g className={"gpu " + fit}>
      <rect className="gpu-bracket" x="0" y={y - 6} width={BRACKET_X + 2} height={thick + 12} rx="1" />
      {/* Power connector on the top edge */}
      <rect className="gpu-connector" x={connectorX} y={y - 7} width="20" height="8" rx="1.5" />

      <rect className="gpu-body" x={x0} y={y} width={length} height={thick} rx="5" />
      <rect x={x0 + 2} y={y + 1} width={length - 4} height={plateH} rx="1.5" fill={shade(color, 0.14)} />
      <rect className="gpu-pcb" x={x0 + 2} y={y + plateH + 1} width={length - 6} height="2" />
      <rect x={x0 + 4} y={finTop} width={length - 10} height={shroudTop - finTop + 2} fill="url(#fins)" />

      <path d={shroudPath} fill={color} className="gpu-shroud" />
      {/* Accent lines along the shroud */}
      <path className="gpu-accent" stroke={shade(color, 0.3)} d={`M${x0 + 14} ${shroudTop + 6}H${x1 - cut - 8}`} />
      <path className="gpu-accent thin" stroke={shade(color, 0.2)} d={`M${x0 + 14} ${y + thick - 10}H${x1 - 14}`} />

      {Array.from({ length: fans }, (_, i) => {
        const cx = x0 + segment * (i + 0.5);
        return (
          <g key={i}>
            <rect className="gpu-fan" x={cx - fanWidth / 2} y={y + thick - 6} width={fanWidth} height="5" rx="2.5" />
            <rect className="gpu-fan-hub" x={cx - 7} y={y + thick - 7} width="14" height="7" rx="2" />
            {/* GPU fans pull air in from below the card */}
            <Arrow className="gpu-arrow" x1={cx} y1={y + thick + 26} x2={cx} y2={y + thick + 6} />
          </g>
        );
      })}

      <rect className="gpu-outline" x={x0} y={y} width={length} height={thick} rx="5" />

      {fit === "incompatible" && (
        <g className="gpu-limit">
          <path d={`M${BRACKET_X + max} ${y - 22}V${y + thick + 22}`} />
          <text x={BRACKET_X + max - 4} y={y - 26}>
            max {max} mm
          </text>
        </g>
      )}
    </g>
  );
}
