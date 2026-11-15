import type { CaseProfile, FanDirection, InstalledFan, Slot } from "../types";
import { BOARD, FAN, FAN_THICK, INWARD, SHROUD_HEIGHT } from "../lib/layout";
import { useT } from "../lib/i18n";

interface Props {
  caseProfile: CaseProfile;
  slots: Slot[];
  fans: InstalledFan[];
  onAdd: (slot: Slot) => void;
  onToggle: (slotId: string) => void;
  onRemove: (slotId: string) => void;
}

const PAD = 48; // room around the case for exhaust arrows

/** Side view of the case, drawn to scale in millimetres. */
export function CaseView({ caseProfile, slots, fans, onAdd, onToggle, onRemove }: Props) {
  const { depth, height } = caseProfile.dimensionsMm;
  const fanBySlot = new Map(fans.map((f) => [f.slotId, f]));

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
      </defs>

      <CaseShell caseProfile={caseProfile} />

      {slots.map((slot) => {
        const fan = fanBySlot.get(slot.id);
        return fan ? (
          <FanView
            key={slot.id}
            slot={slot}
            direction={fan.direction}
            onToggle={() => onToggle(slot.id)}
            onRemove={() => onRemove(slot.id)}
          />
        ) : (
          <EmptySlot key={slot.id} slot={slot} onAdd={() => onAdd(slot)} />
        );
      })}
    </svg>
  );
}

function CaseShell({ caseProfile }: { caseProfile: CaseProfile }) {
  const { depth, height } = caseProfile.dimensionsMm;
  const boardX = depth - BOARD.rearGap - BOARD.width;
  const shroudY = height - SHROUD_HEIGHT;
  const hasFrontFans = !!caseProfile.fanMounts.front;
  const shroudX = hasFrontFans ? 40 : 0;

  return (
    <g className="shell">
      <rect className="case-body" x="0" y="0" width={depth} height={height} rx="8" />

      {caseProfile.frontPanel && (
        <rect
          x="0"
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
      <rect className="socket" x={boardX + 110} y={BOARD.topGap + 60} width="40" height="40" rx="3" />
      <rect className="pcie" x={boardX + 20} y={BOARD.topGap + 170} width={BOARD.width - 40} height="5" rx="2" />

      {/* Rear I/O and expansion slot covers */}
      <rect className="rear-io" x={depth - 6} y={BOARD.topGap + 4} width="6" height="44" />
      {Array.from({ length: 7 }, (_, i) => (
        <rect key={i} className="slot-cover" x={depth - 5} y={BOARD.topGap + 160 + i * 20} width="5" height="14" />
      ))}

      {/* PSU shroud */}
      <rect className="shroud" x={shroudX} y={shroudY} width={depth - shroudX} height={SHROUD_HEIGHT} rx="4" />
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
  direction: FanDirection;
  onToggle: () => void;
  onRemove: () => void;
}

function FanView({ slot, direction, onToggle, onRemove }: FanViewProps) {
  const t = useT();
  const b = fanBox(slot);
  const label = `${t(slot.position)} ${slot.index + 1}: ${t(direction)} – ${t("clickToToggle")}`;

  return (
    <g className={"fan " + direction} onClick={onToggle} role="button" aria-label={label}>
      <title>{label}</title>
      {isFaceOn(slot) ? <FaceFan slot={slot} direction={direction} /> : <EdgeFan slot={slot} direction={direction} />}

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

  // Arrow starts just past the fan and points in the airflow direction.
  const start = FAN_THICK / 2 + 6;
  const end = start + 26;
  const x1 = slot.cx + dx * start;
  const y1 = slot.cy + dy * start;
  const x2 = slot.cx + dx * end;
  const y2 = slot.cy + dy * end;
  // Arrow head: two short lines going back from the tip.
  const hx = -dx * 8;
  const hy = -dy * 8;
  const px = -dy * 7;
  const py = dx * 7;

  return (
    <>
      <rect className="fan-frame" x={b.x} y={b.y} width={b.w} height={b.h} rx="4" />
      <rect
        className="fan-rotor"
        x={b.x + (b.w > b.h ? 10 : 6)}
        y={b.y + (b.w > b.h ? 6 : 10)}
        width={b.w > b.h ? b.w - 20 : b.w - 12}
        height={b.w > b.h ? b.h - 12 : b.h - 20}
        rx="3"
      />
      <path
        className="fan-arrow"
        d={`M${x1} ${y1}L${x2} ${y2}M${x2} ${y2}l${hx + px} ${hy + py}M${x2} ${y2}l${hx - px} ${hy - py}`}
      />
    </>
  );
}

/** A fan facing the viewer: frame, blades and an IN/OUT label. */
function FaceFan({ slot, direction }: { slot: Slot; direction: FanDirection }) {
  const r = FAN / 2 - 6;
  const blades = Array.from({ length: 7 }, (_, i) => i * (360 / 7));

  return (
    <>
      <rect className="fan-frame" x={slot.cx - FAN / 2 + 2} y={slot.cy - FAN / 2 + 2} width={FAN - 4} height={FAN - 4} rx="12" />
      <circle className="fan-ring" cx={slot.cx} cy={slot.cy} r={r} />
      <g transform={`translate(${slot.cx} ${slot.cy})`}>
        {blades.map((angle) => (
          <path
            key={angle}
            className="fan-blade"
            transform={`rotate(${angle})`}
            d={`M0 -14 C 18 -22, 30 -34, 22 -${r - 6} C 12 -40, 4 -30, 0 -14Z`}
          />
        ))}
        <circle className="fan-hub" r="14" />
        <text className="fan-label" y="1">
          {direction === "intake" ? "IN" : "OUT"}
        </text>
      </g>
    </>
  );
}
