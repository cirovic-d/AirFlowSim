import { BOARD, SOCKET } from "../lib/layout";
import { shade, type Looks } from "../lib/looks";
import { boardLayout, type BoardFormat } from "../lib/build";

// Motherboard seen face-on through the glass. A generic layout for the chosen
// size (not a specific model), in mm from the case's top-left corner.
const X = BOARD.rearGap;
const Y = BOARD.topGap;

export function BoardView({ looks, format }: { looks: Looks; format: BoardFormat }) {
  const b = boardLayout(format, looks.ramCount);
  const { w: W, h: H } = b;
  const pcb = looks.boardColor;
  const slot = shade(pcb, -0.35);
  const holes = [
    [7, 7], [W - 7, 7], [7, H - 7], [W - 7, H - 7], [90, 7], [90, H - 7], [7, 150], [W - 7, 150], [160, 150],
  ].filter(([x, y]) => x < W - 5 && y < H - 5);

  return (
    <g className="mobo">
      <rect className="pcb" x={X} y={Y} width={W} height={H} rx="3" fill={pcb} />
      {holes.map(([cx, cy], i) => (
        <circle key={i} className="mount-hole" cx={X + cx} cy={Y + cy} r="3.2" />
      ))}

      {/* Rear I/O cover and VRM heatsinks around the socket */}
      <rect className="metal" x={X + 2} y={Y + 4} width="38" height={b.ioHeight} rx="4" />
      <path className="metal-line" d={`M${X + 8} ${Y + 20}h26M${X + 8} ${Y + b.ioHeight - 12}h26`} />
      <rect className="metal" x={X + 56} y={Y + 8} width={b.vrmWidth} height="28" rx="4" />
      <path className="fin-lines" d={finLines(X + 62, Y + 12, b.vrmWidth - 8, 20, 8)} />
      <rect className="metal" x={X + 50} y={Y + 46} width="28" height="74" rx="4" />
      <path className="fin-lines" d={finLinesH(X + 54, Y + 52, 20, 62, 8)} />

      {/* CPU socket with the processor */}
      <rect className="socket-frame" x={SOCKET.x - 4} y={SOCKET.y - 4} width={SOCKET.size + 8} height={SOCKET.size + 8} rx="3" />
      <rect className="cpu-ihs" x={SOCKET.x + 4} y={SOCKET.y + 4} width={SOCKET.size - 8} height={SOCKET.size - 8} rx="2" />

      {/* Memory slots and sticks (seen from above: thin strips) */}
      {b.dimmX.map((x, i) => (
        <rect key={i} x={X + x - 2.5} y={Y + 10} width="5" height={b.dimmLen} rx="1" fill={slot} />
      ))}
      {b.filled.map((i) => (
        <g key={i}>
          <rect className="ram" x={X + b.dimmX[i] - 3.5} y={Y + 7} width="7" height={b.dimmLen + 6} rx="1.5" fill={looks.ramColor} />
          {looks.ramRgb && <rect x={X + b.dimmX[i] - 2} y={Y + 10} width="4" height={b.dimmLen} rx="1" fill="url(#ram-rgb)" />}
        </g>
      ))}

      {/* 24-pin power connector on the front edge */}
      <rect className="connector" x={X + W - 12} y={Y + Math.min(92, H - 70)} width="9" height="56" rx="1.5" />

      {/* PCIe slots (the first one is reinforced), M.2 heatsink, chipset, battery */}
      <rect className="pcie-main" x={X + 20} y={b.pcieY - 1} width={Math.min(W, 244) - 40} height="7" rx="2" />
      {b.full && <rect className="metal" x={X + 46} y={b.pcieY + 26} width="110" height="13" rx="3" />}
      {b.extraPcie.map((y) => (
        <rect key={y} className="pcie" x={X + 20} y={y} width={Math.min(W, 244) - 90} height="4" rx="1.5" fill={slot} />
      ))}
      {b.full && (
        <>
          <rect className="metal" x={X + Math.min(W, 244) - 64} y={Y + H - 72} width="50" height="46" rx="5" />
          <circle className="battery" cx={X + 150} cy={Y + H - 40} r="8" />
        </>
      )}
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
