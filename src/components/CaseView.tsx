import type { CaseProfile, CpuCooler, FanDirection, GpuConfig, InstalledFan, Slot } from "../types";
import { BOARD, FAN, FAN_THICK, INWARD, PCIE_Y, SOCKET, VIEW_PAD as PAD, getShroud } from "../lib/layout";
import { useT } from "../lib/i18n";
import { Arrow, FaceFanShape } from "./FanShapes";
import { CoolerView, RadiatorView } from "./CoolerView";
import { GpuView } from "./GpuView";

interface Props {
  caseProfile: CaseProfile;
  slots: Slot[];
  fans: InstalledFan[];
  gpu: GpuConfig;
  cooler: CpuCooler;
  onAdd: (slot: Slot) => void;
  onToggle: (slotId: string) => void;
  onRemove: (slotId: string) => void;
  onToggleTower: () => void;
}

/** Side view of the case through the glass panel, drawn to scale in millimetres. */
export function CaseView(props: Props) {
  const { caseProfile, slots, fans, gpu, cooler } = props;
  const { depth, height } = caseProfile.dimensionsMm;
  const fanBySlot = new Map(fans.map((f) => [f.slotId, f]));
  const radSlots = slots.filter((s) => fanBySlot.get(s.id)?.radiator);

  return (
    <svg
      className="case-view"
      viewBox={`${-PAD} ${-PAD} ${depth + PAD * 2} ${height + PAD * 2}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <pattern id="mesh" width="6" height="6" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="3" r="1.1" fill="rgba(255,255,255,0.16)" />
        </pattern>
        <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="rgba(255,255,255,0.10)" />
          <stop offset="1" stopColor="rgba(255,255,255,0.02)" />
        </linearGradient>
        <pattern id="fins" width="4" height="4" patternUnits="userSpaceOnUse">
          <path d="M2 0v4" stroke="rgba(255,255,255,0.16)" strokeWidth="1" />
        </pattern>
        <pattern id="fins-h" width="4" height="4" patternUnits="userSpaceOnUse">
          <path d="M0 2h4" stroke="rgba(255,255,255,0.16)" strokeWidth="1" />
        </pattern>
      </defs>

      <CaseShell caseProfile={caseProfile} />
      <GpuView caseProfile={caseProfile} gpu={gpu} />
      {cooler.type === "aio" && <RadiatorView slots={radSlots} />}
      <CoolerView cooler={cooler} radSlots={radSlots} onToggleTower={props.onToggleTower} />

      {slots.map((slot) => {
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
      })}
    </svg>
  );
}

function CaseShell({ caseProfile }: { caseProfile: CaseProfile }) {
  const { depth, height } = caseProfile.dimensionsMm;
  // Rear of the case is on the left (x = 0), front on the right (x = depth).
  const boardX = BOARD.rearGap;
  const shroud = getShroud(caseProfile);

  return (
    <g className="shell">
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

      {/* Motherboard with CPU socket and PCIe slot */}
      <rect className="board" x={boardX} y={BOARD.topGap} width={BOARD.width} height={BOARD.height} rx="3" />
      <rect className="socket" x={SOCKET.x} y={SOCKET.y} width={SOCKET.size} height={SOCKET.size} rx="3" />
      <rect className="pcie" x={boardX + 20} y={PCIE_Y} width={BOARD.width - 40} height="5" rx="2" />

      {/* Rear I/O (below the rear fan) and expansion slot covers */}
      <rect className="rear-io" x="0" y="168" width="6" height="40" />
      {Array.from({ length: 7 }, (_, i) => (
        <rect key={i} className="slot-cover" x="0" y={215 + i * 16} width="5" height="11" />
      ))}

      {/* PSU shroud */}
      <rect className="shroud" x={shroud.x} y={shroud.y} width={shroud.w} height={shroud.h} rx="4" />
    </g>
  );
}

function isFaceOn(slot: Slot) {
  return slot.position === "side";
}

/** Rectangle of a fan seen edge-on, or the square frame of a face-on fan. */
export function fanBox(slot: Slot) {
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
      <rect className="fan-frame" x={b.x} y={b.y} width={b.w} height={b.h} rx="4" />
      <rect
        className="fan-rotor"
        x={b.x + (horizontal ? 10 : 6)}
        y={b.y + (horizontal ? 6 : 10)}
        width={horizontal ? b.w - 20 : b.w - 12}
        height={horizontal ? b.h - 12 : b.h - 20}
        rx="3"
      />
      <Arrow x1={slot.cx + dx * start} y1={slot.cy + dy * start} x2={slot.cx + dx * end} y2={slot.cy + dy * end} />
    </>
  );
}
