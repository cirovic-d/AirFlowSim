import { BOARD, PCIE_Y, SOCKET } from "../lib/layout";
import { shade, type Looks } from "../lib/looks";

// Motherboard seen face-on through the glass. Positions are a typical ATX
// layout (generic, not a specific model), in mm from the case's top-left corner.
const X = BOARD.rearGap;
const Y = BOARD.topGap;
const W = BOARD.width;
const H = BOARD.height;

/** x of the four DIMM slots, right of the CPU socket. */
export const DIMM_X = [180, 189, 198, 207];
export const DIMM_TOP = Y + 10;
export const DIMM_LEN = 133;

export function BoardView({ looks }: { looks: Looks }) {
  const pcb = looks.boardColor;
  const slot = shade(pcb, -0.35);
  const holes = [
    [X + 7, Y + 7], [X + W - 7, Y + 7], [X + 7, Y + H - 7], [X + W - 7, Y + H - 7],
    [X + 90, Y + 7], [X + 90, Y + H - 7], [X + 7, Y + 150], [X + W - 7, Y + 150], [X + 160, Y + 150],
  ];
  // Two sticks go in the second and fourth slot, as board manuals recommend.
  const filled = looks.ramCount === 4 ? [0, 1, 2, 3] : [1, 3];

  return (
    <g className="mobo">
      <rect className="pcb" x={X} y={Y} width={W} height={H} rx="3" fill={pcb} />
      {holes.map(([cx, cy], i) => (
        <circle key={i} className="mount-hole" cx={cx} cy={cy} r="3.2" />
      ))}

      {/* Rear I/O cover and VRM heatsinks around the socket */}
      <rect className="metal" x={X + 2} y={Y + 4} width="38" height="108" rx="4" />
      <path className="metal-line" d={`M${X + 8} ${Y + 20}h26M${X + 8} ${Y + 96}h26`} />
      <rect className="metal" x={X + 56} y={Y + 8} width="104" height="28" rx="4" />
      <path className="fin-lines" d={finLines(X + 62, Y + 12, 96, 20, 8)} />
      <rect className="metal" x={X + 50} y={Y + 46} width="28" height="74" rx="4" />
      <path className="fin-lines" d={finLinesH(X + 54, Y + 52, 20, 62, 8)} />

      {/* CPU socket with the processor */}
      <rect className="socket-frame" x={SOCKET.x - 4} y={SOCKET.y - 4} width={SOCKET.size + 8} height={SOCKET.size + 8} rx="3" />
      <rect className="cpu-ihs" x={SOCKET.x + 4} y={SOCKET.y + 4} width={SOCKET.size - 8} height={SOCKET.size - 8} rx="2" />

      {/* Memory slots and sticks (seen from above: thin strips) */}
      {DIMM_X.map((x, i) => (
        <rect key={i} x={x - 2.5} y={DIMM_TOP} width="5" height={DIMM_LEN} rx="1" fill={slot} />
      ))}
      {filled.map((i) => (
        <g key={i}>
          <rect className="ram" x={DIMM_X[i] - 3.5} y={DIMM_TOP - 3} width="7" height={DIMM_LEN + 6} rx="1.5" fill={looks.ramColor} />
          {looks.ramRgb && <rect x={DIMM_X[i] - 2} y={DIMM_TOP} width="4" height={DIMM_LEN} rx="1" fill="url(#ram-rgb)" />}
        </g>
      ))}

      {/* 24-pin power connector on the right edge */}
      <rect className="connector" x={X + W - 12} y={Y + 92} width="9" height="56" rx="1.5" />

      {/* PCIe slots (the first one is reinforced), M.2 heatsink and chipset */}
      <rect className="pcie-main" x={X + 20} y={PCIE_Y - 1} width={W - 40} height="7" rx="2" />
      <rect className="metal" x={X + 46} y={PCIE_Y + 26} width="110" height="13" rx="3" />
      <rect className="pcie" x={X + 20} y={PCIE_Y + 80} width={W - 90} height="4" rx="1.5" fill={slot} />
      <rect className="pcie" x={X + 20} y={PCIE_Y + 120} width={W - 90} height="4" rx="1.5" fill={slot} />
      <rect className="metal" x={X + W - 64} y={Y + H - 72} width="50" height="46" rx="5" />
      <circle className="battery" cx={X + 150} cy={Y + H - 40} r="8" />
    </g>
  );
}

/** Vertical fin lines inside a heatsink. */
function finLines(x: number, y: number, w: number, h: number, step: number) {
  let d = "";
  for (let i = 0; i <= w; i += step) d += `M${x + i} ${y}v${h}`;
  return d;
}

function finLinesH(x: number, y: number, w: number, h: number, step: number) {
  let d = "";
  for (let i = 0; i <= h; i += step) d += `M${x} ${y + i}h${w}`;
  return d;
}
