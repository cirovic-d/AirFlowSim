import type { CpuCooler, Slot } from "../types";
import { FAN, FAN_THICK, INWARD, SOCKET } from "../lib/layout";
import { useT } from "../lib/i18n";
import { Arrow, FaceFanShape } from "./FanShapes";

const RAD_THICK = 27;
const CX = SOCKET.x + SOCKET.size / 2;
const CY = SOCKET.y + SOCKET.size / 2;

interface Props {
  cooler: CpuCooler;
  radSlots: Slot[];
  onToggleTower: () => void;
}

export function CoolerView({ cooler, radSlots, onToggleTower }: Props) {
  if (cooler.type === "tower") return <Tower direction={cooler.direction} onToggle={onToggleTower} />;
  if (cooler.type === "wraith") return <Wraith />;
  return <Pump radSlots={radSlots} />;
}

/** Tower cooler: fin stack on the socket with one fan on its front side. */
function Tower({ direction, onToggle }: { direction: "rear" | "front"; onToggle: () => void }) {
  const t = useT();
  const fanX = CX + 25;
  const label = `${t("towerCooler")}: ${t(direction === "rear" ? "towardRear" : "towardFront")} – ${t("clickToToggle")}`;

  return (
    <g className="cpu-cooler" onClick={onToggle} role="button" aria-label={label}>
      <title>{label}</title>
      <rect className="heatsink" x={CX - 25} y={CY - 75} width="50" height="150" rx="3" />
      <rect className="fins" x={CX - 25} y={CY - 75} width="50" height="150" rx="3" />
      <rect className="fan-frame" x={fanX} y={CY - FAN / 2} width={FAN_THICK} height={FAN} rx="4" />
      <rect className="fan-rotor" x={fanX + 6} y={CY - FAN / 2 + 10} width={FAN_THICK - 12} height={FAN - 20} rx="3" />
      {direction === "rear" ? (
        <Arrow x1={CX - 32} y1={CY} x2={CX - 60} y2={CY} />
      ) : (
        <Arrow x1={fanX + FAN_THICK + 6} y1={CY} x2={fanX + FAN_THICK + 34} y2={CY} />
      )}
    </g>
  );
}

/** AMD Wraith-style stock cooler: a compact fan facing the glass panel. */
function Wraith() {
  return (
    <g className="cpu-cooler static">
      <rect className="heatsink" x={CX - 46} y={CY - 46} width="92" height="92" rx="14" />
      <FaceFanShape cx={CX} cy={CY} size={84} />
    </g>
  );
}

/** AIO pump block on the socket with two tubes to the radiator. */
function Pump({ radSlots }: { radSlots: Slot[] }) {
  if (radSlots.length === 0) return null;
  const first = radSlots[0];
  const [ix, iy] = INWARD[first.position];

  // Point on the radiator's inner face, near its rear/top end, where the tubes connect.
  const offset = FAN_THICK / 2 + RAD_THICK;
  const tx = first.cx + ix * offset;
  const ty = first.cy + iy * offset;

  return (
    <g className="cpu-cooler static">
      {[-8, 8].map((d) => (
        <path
          key={d}
          className="tube"
          d={
            iy !== 0
              ? `M${CX + d} ${CY - 18} C ${CX + d} ${ty + 40}, ${tx + d} ${ty + 40}, ${tx + d} ${ty}`
              : `M${CX + 18} ${CY + d} C ${tx - 60} ${CY + d}, ${tx - 40} ${ty + d}, ${tx} ${ty + d}`
          }
        />
      ))}
      <rect className="pump" x={CX - 26} y={CY - 26} width="52" height="52" rx="10" />
      <circle className="pump-cap" cx={CX} cy={CY} r="14" />
    </g>
  );
}

/** Radiator body (240 or 360 mm), on the inner side of its fans. */
export function RadiatorView({ slots }: { slots: Slot[] }) {
  if (slots.length === 0) return null;

  // Side panel (Antec C3): the fans face the viewer, so the radiator sits right behind them.
  if (slots[0].position === "side") {
    const top = Math.min(...slots.map((s) => s.cy)) - FAN / 2 - 6;
    return (
      <g className="radiator">
        <rect x={slots[0].cx - FAN / 2 - 6} y={top} width={FAN + 12} height={FAN * slots.length + 12} rx="3" fill="url(#fins-h)" />
      </g>
    );
  }

  const [ix, iy] = INWARD[slots[0].position];
  const offset = FAN_THICK / 2 + RAD_THICK / 2;
  const xs = slots.map((s) => s.cx + ix * offset);
  const ys = slots.map((s) => s.cy + iy * offset);
  const vertical = ix !== 0;

  const x = vertical ? xs[0] - RAD_THICK / 2 : Math.min(...xs) - FAN / 2 - 12;
  const y = vertical ? Math.min(...ys) - FAN / 2 - 12 : ys[0] - RAD_THICK / 2;
  const length = FAN * slots.length + 24;
  const w = vertical ? RAD_THICK : length;
  const h = vertical ? length : RAD_THICK;

  return (
    <g className="radiator">
      <rect x={x} y={y} width={w} height={h} rx="3" fill={vertical ? "url(#fins-h)" : "url(#fins)"} />
    </g>
  );
}
