import type { CaseProfile } from "../types";
import { getShroud } from "../lib/layout";
import { psuPlacement } from "../lib/build";

/** Power supply seen from the side. Behind a shroud it's drawn as a faint outline. */
export function PsuView({ caseProfile, length }: { caseProfile: CaseProfile; length: number }) {
  const p = psuPlacement(caseProfile, length);
  if (!p) return null;
  const hidden = !!getShroud(caseProfile);
  const vents = [];
  for (let x = p.x + 12; x < p.x + p.w - 30; x += 7) vents.push(`M${x} ${p.y + 14}v${p.h - 28}`);

  return (
    <g className={"psu" + (hidden ? " ghost" : "")}>
      <rect className="psu-body" x={p.x} y={p.y} width={p.w} height={p.h} rx="4" />
      <path className="psu-vents" d={vents.join("")} />
      {/* Modular sockets on the side facing the inside of the case */}
      <rect className="psu-sockets" x={p.x + p.w - 22} y={p.y + 12} width="14" height={p.h - 24} rx="2" />
    </g>
  );
}
