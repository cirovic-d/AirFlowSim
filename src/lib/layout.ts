import type { CaseProfile, MountPosition, Slot } from "../types";

// All sizes in millimetres. The side view looks through the glass (left) panel
// at the motherboard: the rear I/O is on the left, the case front on the right.
export const FAN = 120;
export const FAN_THICK = 25;
const EDGE = 16; // distance from an outer wall to the fan's center line
const MARGIN = 40; // space before the first fan in a row

export const SHROUD_HEIGHT = 100;
export const BOARD = { width: 244, height: 305, rearGap: 15, topGap: 32 }; // ATX board
export const SOCKET = { x: BOARD.rearGap + 94, y: BOARD.topGap + 60, size: 40 };
export const PCIE_Y = BOARD.topGap + 170;
export const GPU_THICK = 42; // dual-slot card seen from the side
export const GPU_X = 4; // the card's bracket sits at the rear wall
export const VIEW_PAD = 48; // room around the case in the drawing, for arrows

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Shroud {
  x: number;
  w: number;
  /** Height of the shroud's top edge at the rear and at the front end. */
  rearTop: number;
  frontTop: number;
  bottom: number;
  /** Open (perforated) part above a bottom fan, if the case has one. */
  vent: { from: number; to: number } | null;
}

/**
 * PSU shroud. It stops short of the front when the case has front fans.
 * Some cases (Antec C3) have an inclined top that is lower toward the front.
 * Returns null for cases without a shroud (NZXT H7 Flow 2024).
 */
export function getShroud(c: CaseProfile): Shroud | null {
  if (c.shroud?.none) return null;
  const { depth, height } = c.dimensionsMm;
  const w = c.fanMounts.front ? depth - 40 : depth;
  const rearTop = height - SHROUD_HEIGHT;
  const frontTop = c.shroud?.inclined ? height - SHROUD_HEIGHT * 0.65 : rearTop;

  let vent = null;
  if (c.shroud?.bottomFanVent && c.fanMounts.bottom) {
    const xs = getSlots(c).filter((s) => s.position === "bottom").map((s) => s.cx);
    vent = { from: Math.min(...xs) - FAN / 2, to: Math.max(...xs) + FAN / 2 };
  }
  return { x: 0, w, rearTop, frontTop, bottom: height, vent };
}

/** Y of the shroud's top edge at a given x. */
export function shroudTopAt(s: Shroud, x: number) {
  const t = Math.min(1, Math.max(0, (x - s.x) / s.w));
  return s.rearTop + (s.frontTop - s.rearTop) * t;
}

/** True when the point is inside the solid part of the shroud. */
export function inShroud(s: Shroud, x: number, y: number) {
  if (x <= s.x || x >= s.x + s.w || y <= shroudTopAt(s, x)) return false;
  return !(s.vent && x > s.vent.from && x < s.vent.to);
}

// Which way is "into the case" for a fan mounted at each position.
export const INWARD: Record<MountPosition, [number, number]> = {
  front: [-1, 0],
  rear: [1, 0],
  top: [0, 1],
  bottom: [0, -1],
  side: [0, 0], // side fans face the viewer
};

/**
 * Builds the fan slots for a case. Which positions exist and how many fans
 * each one holds come from the verified case profile. The exact millimetre
 * offsets are approximated from the case dimensions.
 */
export function getSlots(c: CaseProfile): Slot[] {
  const { depth, height } = c.dimensionsMm;
  const slots: Slot[] = [];

  function addRow(position: MountPosition, start: [number, number], step: [number, number]) {
    const count = c.fanMounts[position]?.max120 ?? 0;
    for (let i = 0; i < count; i++) {
      slots.push({
        id: `${position}-${i + 1}`,
        position,
        index: i,
        cx: start[0] + step[0] * i,
        cy: start[1] + step[1] * i,
      });
    }
  }

  const half = FAN / 2;
  // Short cases (Versa H18) leave less room above the first fan of a vertical row.
  const top = (p: MountPosition) =>
    Math.min(MARGIN, Math.max(0, (height - (c.fanMounts[p]?.max120 ?? 0) * FAN) / 2)) + half;
  addRow("front", [depth - EDGE, top("front")], [0, FAN]); // top to bottom
  addRow("side", [depth - MARGIN - half, top("side")], [0, FAN]); // top to bottom
  addRow("top", [50 + half, EDGE], [FAN, 0]); // rear to front
  addRow("rear", [EDGE, top("rear")], [0, FAN]);
  addRow("bottom", [depth - MARGIN - half, height - EDGE], [-FAN, 0]); // front to rear

  return slots;
}

/** Factory fans fill the first slots of their position, in slot order. */
export function getFactoryFans(c: CaseProfile, slots: Slot[]) {
  return c.factoryFans.flatMap((group) =>
    slots
      .filter((s) => s.position === group.position)
      .slice(0, group.count)
      .map((s) => ({ slotId: s.id, direction: group.direction })),
  );
}

/** Default direction when the user adds a new fan. */
export function defaultDirection(position: MountPosition) {
  return position === "top" || position === "rear" ? "exhaust" : "intake";
}
