import type { CSSProperties } from "react";
import type { CaseProfile, CpuCooler, FanDirection, GpuConfig, InstalledFan, Slot } from "../types";
import { FAN, FAN_THICK, INWARD, VIEW_PAD as PAD, getShroud, shroudTopAt } from "../lib/layout";
import { isLight, shade, type Looks } from "../lib/looks";
import { useT } from "../lib/i18n";
import { Arrow, EdgeFanShape, FaceFanShape } from "./FanShapes";
import { BoardView } from "./BoardView";
import { CoolerView, RadiatorView } from "./CoolerView";
import { GpuView } from "./GpuView";
import { PsuView } from "./PsuView";
import { pcieY, type Build } from "../lib/build";

interface Props {
  caseProfile: CaseProfile;
  slots: Slot[];
  fans: InstalledFan[];
  gpu: GpuConfig;
  cooler: CpuCooler;
  looks: Looks;
  build: Build;
  onAdd: (slot: Slot) => void;
  onToggle: (slotId: string) => void;
  onRemove: (slotId: string) => void;
  onToggleTower: () => void;
}

/** Side view of the case through the glass panel, drawn to scale in millimetres. */
export function CaseView(props: Props) {
  const { caseProfile, slots, fans, gpu, cooler, looks, build } = props;
  const { depth, height } = caseProfile.dimensionsMm;
  const fanBySlot = new Map(fans.map((f) => [f.slotId, f]));
  const radSlots = slots.filter((s) => fanBySlot.get(s.id)?.radiator);
  const sideRad = cooler.type === "aio" && radSlots[0]?.position === "side";
  const sideSlots = slots.filter(isFaceOn);
  const otherSlots = slots.filter((s) => !isFaceOn(s));

  function renderSlot(slot: Slot) {
    const fan = fanBySlot.get(slot.id);
    return fan ? (
      <FanView
        key={slot.id}
        slot={slot}
        fan={fan}
        onToggle={() => props.onToggle(slot.id)}
        onRemove={() => props.onRemove(slot.id)}
      />
    ) : (
      <EmptySlot key={slot.id} slot={slot} onAdd={() => props.onAdd(slot)} />
    );
  }

  // Lines and dots on the case follow its color: light on dark cases, dark on light ones.
  const light = isLight(looks.caseColor);
  const style = {
    "--ink": light ? "0, 0, 0" : "255, 255, 255",
    "--case": looks.caseColor,
    "--case-inner": light ? shade(looks.caseColor, -0.1) : looks.caseColor,
    "--case-shroud": shade(looks.caseColor, light ? -0.18 : 0.05),
  } as CSSProperties;

  return (
    <svg
      className="case-view"
      style={style}
      viewBox={`${-PAD} ${-PAD} ${depth + PAD * 2} ${height + PAD * 2}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <pattern id="mesh" width="6" height="6" patternUnits="userSpaceOnUse">
          <circle className="mesh-dot" cx="3" cy="3" r="1.1" />
        </pattern>
        <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="rgba(255,255,255,0.10)" />
          <stop offset="1" stopColor="rgba(255,255,255,0.02)" />
        </linearGradient>
        <pattern id="fins" width="4" height="4" patternUnits="userSpaceOnUse">
          <path className="fin-path" d="M2 0v4" />
        </pattern>
        <pattern id="fins-h" width="4" height="4" patternUnits="userSpaceOnUse">
          <path className="fin-path" d="M0 2h4" />
        </pattern>
        <linearGradient id="ram-rgb" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff4d6d" />
          <stop offset="0.25" stopColor="#ffb84d" />
          <stop offset="0.5" stopColor="#5dff9b" />
          <stop offset="0.75" stopColor="#4dc3ff" />
          <stop offset="1" stopColor="#b44dff" />
        </linearGradient>
        <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.05" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.55" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.03" />
        </linearGradient>
      </defs>

      <CaseShell caseProfile={caseProfile} looks={looks} build={build} />
      {/* Side-panel fans sit behind the graphics card, so they are drawn first. */}
      {sideRad && <RadiatorView slots={radSlots} />}
      {sideSlots.map(renderSlot)}
      <GpuView caseProfile={caseProfile} gpu={gpu} color={looks.gpuColor} slotY={pcieY(build.board)} />
      {cooler.type === "aio" && !sideRad && <RadiatorView slots={radSlots} />}
      <CoolerView cooler={cooler} radSlots={radSlots} onToggleTower={props.onToggleTower} />
      {otherSlots.map(renderSlot)}
      {/* Faint reflection on the side glass */}
      <rect className="sheen" x="0" y="0" width={depth} height={height} rx="8" fill="url(#sheen)" />
    </svg>
  );
}

function CaseShell({ caseProfile, looks, build }: { caseProfile: CaseProfile; looks: Looks; build: Build }) {
  const { depth, height } = caseProfile.dimensionsMm;
  // Rear of the case is on the left (x = 0), front on the right (x = depth).
  const shroud = getShroud(caseProfile);
  const top = caseProfile.topPanel ?? (caseProfile.fanMounts.top ? "mesh" : "solid");

  return (
    <g className="shell">
      {/* Feet */}
      {[24, depth - 64].map((x) => (
        <rect key={x} className="foot" x={x} y={height - 2} width="40" height="10" rx="3" />
      ))}
      <rect className="case-body" x="0" y="0" width={depth} height={height} rx="8" />

      {caseProfile.frontPanel && (
        <rect
          x={depth - 8}
          y="0"
          width="8"
          height={height}
          rx="4"
          fill={caseProfile.frontPanel === "mesh" ? "url(#mesh)" : "url(#glass)"}
          className="front-panel"
        />
      )}
      {top !== "solid" && (
        <rect x="30" y="0" width={depth - 60} height="6" rx="3" fill={top === "mesh" ? "url(#mesh)" : "url(#glass)"} className="front-panel" />
      )}

      <BoardView looks={looks} format={build.board} />

      {/* Rear I/O (below the rear fan) and expansion slot covers */}
      <rect className="rear-io" x="0" y="168" width="6" height="40" />
      {Array.from({ length: 7 }, (_, i) => (
        <rect key={i} className="slot-cover" x="0" y={215 + i * 16} width="5" height="11" />
      ))}

      {/* PSU shroud (flat or inclined), with a perforated part above a bottom fan */}
      {shroud && (
        <path
          className="shroud"
          d={`M${shroud.x} ${shroud.rearTop}L${shroud.x + shroud.w} ${shroud.frontTop}V${shroud.bottom}H${shroud.x}Z`}
        />
      )}
      {shroud?.vent && (
        <path
          className="shroud-vent"
          d={`M${shroud.vent.from} ${shroudTopAt(shroud, shroud.vent.from)}L${shroud.vent.to} ${shroudTopAt(shroud, shroud.vent.to)}V${shroud.bottom}H${shroud.vent.from}Z`}
        />
      )}
      <PsuView caseProfile={caseProfile} length={build.psuLength} />
    </g>
  );
}

function isFaceOn(slot: Slot) {
  return slot.position === "side";
}

/** Rectangle of a fan seen edge-on, or the square frame of a face-on fan. */
function fanBox(slot: Slot) {
  if (isFaceOn(slot)) return { x: slot.cx - FAN / 2, y: slot.cy - FAN / 2, w: FAN, h: FAN };
  const vertical = slot.position === "front" || slot.position === "rear";
  const w = vertical ? FAN_THICK : FAN;
  const h = vertical ? FAN : FAN_THICK;
  return { x: slot.cx - w / 2, y: slot.cy - h / 2, w, h };
}

function EmptySlot({ slot, onAdd }: { slot: Slot; onAdd: () => void }) {
  const t = useT();
  const b = fanBox(slot);
  const label = `${t("addFan")} – ${t(slot.position)} ${slot.index + 1}`;

  return (
    <g className="empty-slot" onClick={onAdd} role="button" aria-label={label}>
      <title>{label}</title>
      {isFaceOn(slot) ? (
        <circle cx={slot.cx} cy={slot.cy} r={FAN / 2 - 4} />
      ) : (
        <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="4" />
      )}
      <path className="plus" d={`M${slot.cx - 6} ${slot.cy}h12M${slot.cx} ${slot.cy - 6}v12`} />
    </g>
  );
}

interface FanViewProps {
  slot: Slot;
  fan: InstalledFan;
  onToggle: () => void;
  onRemove: () => void;
}

function FanView({ slot, fan, onToggle, onRemove }: FanViewProps) {
  const t = useT();
  const b = fanBox(slot);
  const label = `${t(slot.position)} ${slot.index + 1}: ${t(fan.direction)} – ${t("clickToToggle")}`;

  return (
    <g className={"fan " + fan.direction} onClick={onToggle} role="button" aria-label={label}>
      <title>{label}</title>
      {isFaceOn(slot) ? (
        <FaceFanShape cx={slot.cx} cy={slot.cy} size={FAN} label={fan.direction === "intake" ? "IN" : "OUT"} />
      ) : (
        <EdgeFan slot={slot} direction={fan.direction} />
      )}

      {/* Radiator fans belong to the AIO and can't be removed one by one. */}
      {!fan.radiator && (
        <g
          className="remove"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          role="button"
          aria-label={t("remove")}
        >
          <title>{t("remove")}</title>
          <circle cx={b.x + b.w} cy={b.y} r="9" />
          <path d={`M${b.x + b.w - 3.5} ${b.y - 3.5}l7 7m0 -7l-7 7`} />
        </g>
      )}
    </g>
  );
}

/** A fan seen from the side: a thin frame plus an arrow showing the airflow. */
function EdgeFan({ slot, direction }: { slot: Slot; direction: FanDirection }) {
  const b = fanBox(slot);
  const [ix, iy] = INWARD[slot.position];
  const sign = direction === "intake" ? 1 : -1;
  const dx = ix * sign;
  const dy = iy * sign;
  const horizontal = b.w > b.h;

  // Arrow starts just past the fan and points in the airflow direction.
  const start = FAN_THICK / 2 + 6;
  const end = start + 26;

  return (
    <>
      <EdgeFanShape cx={slot.cx} cy={slot.cy} vertical={!horizontal} thick={FAN_THICK} />
      <Arrow x1={slot.cx + dx * start} y1={slot.cy + dy * start} x2={slot.cx + dx * end} y2={slot.cy + dy * end} />
    </>
  );
}
