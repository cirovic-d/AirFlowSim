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
  addRow("front", [depth - EDGE, MARGIN + half], [0, FAN]); // top to bottom
  addRow("side", [depth - MARGIN - half, MARGIN + half], [0, FAN]); // top to bottom
  addRow("top", [50 + half, EDGE], [FAN, 0]); // rear to front
  addRow("rear", [EDGE, MARGIN + half], [0, FAN]);
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
