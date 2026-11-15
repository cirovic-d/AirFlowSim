import type { CaseProfile, GpuConfig } from "../types";
import { getGpuFit, getGpuLength } from "../lib/components";
import { GPU_THICK, GPU_X as BRACKET_X, PCIE_Y } from "../lib/layout";
import { Arrow } from "./FanShapes";

/** Graphics card seen from the side, with its fans on the underside. */
export function GpuView({ caseProfile, gpu }: { caseProfile: CaseProfile; gpu: GpuConfig }) {
  const length = getGpuLength(gpu);
  if (length === null) return null;

  const fit = getGpuFit(caseProfile, gpu);
  const max = caseProfile.clearanceMm.gpuMaxLength;
  const y = PCIE_Y + 6;
  const segment = length / gpu.fans;
  const fanWidth = Math.min(92, segment - 10);

  return (
    <g className={"gpu " + fit}>
      <rect className="gpu-bracket" x="0" y={y - 6} width={BRACKET_X + 2} height={GPU_THICK + 12} rx="1" />
      <rect className="gpu-body" x={BRACKET_X} y={y} width={length} height={GPU_THICK} rx="5" />
      <rect className="gpu-stripe" x={BRACKET_X + 10} y={y + 8} width={length - 20} height="3" rx="1.5" />

      {Array.from({ length: gpu.fans }, (_, i) => {
        const cx = BRACKET_X + segment * (i + 0.5);
        return (
          <g key={i}>
            <rect className="gpu-fan" x={cx - fanWidth / 2} y={y + GPU_THICK - 7} width={fanWidth} height="5" rx="2.5" />
            {/* GPU fans pull air in from below the card */}
            <Arrow className="gpu-arrow" x1={cx} y1={y + GPU_THICK + 26} x2={cx} y2={y + GPU_THICK + 6} />
          </g>
        );
      })}

      {fit === "incompatible" && (
        <g className="gpu-limit">
          <path d={`M${BRACKET_X + max} ${y - 22}V${y + GPU_THICK + 22}`} />
          <text x={BRACKET_X + max - 4} y={y - 26}>
            max {max} mm
          </text>
        </g>
      )}
    </g>
  );
}
