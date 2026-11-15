export type MountPosition = "front" | "top" | "side" | "bottom" | "rear";
export type FanDirection = "intake" | "exhaust";

export interface FanMount {
  max120: number;
  note?: string;
}

export interface FactoryFanGroup {
  position: MountPosition;
  count: number;
  direction: FanDirection;
  directionVerified: boolean;
}

export interface CaseProfile {
  id: string;
  name: string;
  manufacturer: string;
  variantNote?: string;
  dimensionsMm: { depth: number; width: number; height: number };
  clearanceMm: { gpuMaxLength: number; cpuCoolerMaxHeight: number; psuMaxLength: number };
  /** Omitted when the front panel material is not confirmed. */
  frontPanel?: "mesh" | "glass";
  fanMounts: Partial<Record<MountPosition, FanMount>>;
  radiatorMounts: Partial<Record<MountPosition, number[]>>;
  radiatorNotes?: string;
  factoryFans: FactoryFanGroup[];
  sources: string[];
}

export type Screen = "simulator" | "saved" | "settings" | "about";

/** One place in the case where a 120 mm fan can be mounted. */
export interface Slot {
  id: string;
  position: MountPosition;
  index: number;
  /** Center in mm, measured from the case's top-front corner (side view). */
  cx: number;
  cy: number;
}

export interface InstalledFan {
  slotId: string;
  direction: FanDirection;
}
