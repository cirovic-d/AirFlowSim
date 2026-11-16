import type { CaseProfile } from "../types";
import { BOARD } from "./layout";

// ---------- Motherboard formats ----------

export const BOARD_FORMATS = [
  "Mini-ITX",
  "Mini-DTX",
  "Flex-ATX",
  "Micro-ATX",
  "ATX",
  "E-ATX",
  "SSI-CEB",
  "SSI-EEB",
  "XL-ATX",
] as const;
export type BoardFormat = (typeof BOARD_FORMATS)[number];

/**
 * Board size as mounted in a tower: w = rear-to-front (depth), h = top-to-bottom.
 * Standard sizes; E-ATX has no single standard, 277 mm wide is the common one.
 */
export const BOARD_SIZES: Record<BoardFormat, { w: number; h: number }> = {
  "Mini-ITX": { w: 170, h: 170 },
  "Mini-DTX": { w: 170, h: 203 },
  "Flex-ATX": { w: 191, h: 229 },
  "Micro-ATX": { w: 244, h: 244 },
  ATX: { w: 244, h: 305 },
  "E-ATX": { w: 277, h: 305 },
  "SSI-CEB": { w: 267, h: 305 },
  "SSI-EEB": { w: 330, h: 305 },
  "XL-ATX": { w: 262, h: 345 },
};

/** Top edge of the first PCIe x16 slot (the graphics card hangs below it). */
export function pcieY(format: BoardFormat) {
  // Small boards (ITX, DTX) have the slot near their bottom edge.
  return BOARD.topGap + (BOARD_SIZES[format].h < 200 ? 156 : 170);
}

// ---------- Everything about the build that isn't fans or cooling ----------

export const PSU_WATTS = [450, 550, 650, 750, 850, 1000, 1200, 1600];

export interface Build {
  board: BoardFormat;
  cpuId?: string;
  /** Load in % (0–100). */
  cpuLoad: number;
  gpuLoad: number;
  /** Room temperature, °C. */
  ambient: number;
  psuWatts: number;
  psuLength: number;
  /** Height of the tower cooler, mm (only used for the tower cooler). */
  towerHeight: number;
}

export const DEFAULT_BUILD: Build = {
  board: "ATX",
  cpuLoad: 100,
  gpuLoad: 100,
  ambient: 25,
  psuWatts: 750,
  psuLength: 160,
  towerHeight: 155,
};

export const LIMITS = {
  ambient: [10, 40],
  psuLength: [100, 260],
  towerHeight: [30, 200],
} as const;

const clamp = (v: number, [lo, hi]: readonly [number, number]) => Math.min(hi, Math.max(lo, v));

export function sanitizeBuild(raw: unknown, knownCpu: (id: string) => boolean): Build {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);
  const b: Build = {
    board: BOARD_FORMATS.includes(r.board as BoardFormat) ? (r.board as BoardFormat) : DEFAULT_BUILD.board,
    cpuLoad: clamp(Math.round(num(r.cpuLoad, 100)), [0, 100]),
    gpuLoad: clamp(Math.round(num(r.gpuLoad, 100)), [0, 100]),
    ambient: clamp(Math.round(num(r.ambient, 25)), LIMITS.ambient),
    psuWatts: PSU_WATTS.includes(r.psuWatts as number) ? (r.psuWatts as number) : DEFAULT_BUILD.psuWatts,
    psuLength: clamp(Math.round(num(r.psuLength, 160)), LIMITS.psuLength),
    towerHeight: clamp(Math.round(num(r.towerHeight, 155)), LIMITS.towerHeight),
  };
  if (typeof r.cpuId === "string" && knownCpu(r.cpuId)) b.cpuId = r.cpuId;
  return b;
}

// ---------- Motherboard fit ----------

export type Fit = "compatible" | "incompatible" | "unknown";

/** Does this board format fit the case, according to the formats its maker lists? */
export function boardFit(c: CaseProfile, format: BoardFormat): { fit: Fit; noteKey?: "byStandard" | "eatxWidth" | "notSpecified" } {
  const listed = c.motherboards?.formats;
  if (!listed) return { fit: "unknown", noteKey: "notSpecified" };
  if (listed.includes(format)) {
    const max = c.motherboards?.eatxMaxWidth;
    if (format === "E-ATX" && max && max < BOARD_SIZES["E-ATX"].w) return { fit: "compatible", noteKey: "eatxWidth" };
    return { fit: "compatible" };
  }
  // Flex-ATX uses the Micro-ATX mounting holes and slot positions (it's a smaller Micro-ATX).
  if (format === "Flex-ATX" && listed.includes("Micro-ATX")) return { fit: "compatible", noteKey: "byStandard" };
  // Mini-DTX uses Mini-ITX holes but is taller and needs a second slot: not listed = can't say.
  if (format === "Mini-DTX" && listed.includes("Mini-ITX")) return { fit: "unknown" };
  return { fit: "incompatible" };
}

/**
 * Where the parts of a generic board of this size go, relative to its top-left
 * corner (x, w) and to the case top (pcieY, extraPcie). Used by the 2D and 3D views.
 */
export function boardLayout(format: BoardFormat, ramCount: 2 | 4) {
  const { w, h } = BOARD_SIZES[format];
  const small = w < 200; // ITX and DTX boards have two memory slots
  const dimmStart = small ? w - 26 : Math.min(w, 244) - 79;
  const dimmX = (small ? [0, 1] : [0, 1, 2, 3]).map((i) => dimmStart + 9 * i);
  // Two sticks go in the second and fourth slot, as board manuals recommend.
  const filled = small ? [0, 1] : ramCount === 4 ? [0, 1, 2, 3] : [1, 3];
  const y0 = pcieY(format);
  const extraPcie: number[] = [];
  for (let y = y0 + 80; y + 10 < BOARD.topGap + h - 50; y += 40) extraPcie.push(y);
  return {
    w,
    h,
    dimmX,
    filled,
    dimmLen: 133,
    vrmWidth: dimmStart - 62,
    ioHeight: Math.min(108, h - 60),
    pcieY: y0,
    extraPcie,
    /** Tall enough for the M.2 heatsink, chipset and battery. */
    full: h >= 244,
  };
}

export const PSU_HEIGHT = 86; // ATX power supply: 150 × 86 mm face, length varies
export const PSU_WIDTH = 150;

/**
 * Where the power supply sits in the side view, or null when it's in a separate
 * chamber behind the motherboard tray or at the top (not visible from this side).
 */
export function psuPlacement(c: CaseProfile, length: number) {
  const pos = c.psuPosition ?? "bottom";
  if (pos === "behind" || pos === "top") return null;
  const { depth, height } = c.dimensionsMm;
  const len = Math.min(length, depth - 20);
  const x = pos === "front" ? depth - 10 - len : 6;
  return { x, y: height - 6 - PSU_HEIGHT, w: len, h: PSU_HEIGHT };
}
