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
  clearanceMm: { gpuMaxLength: number; cpuCoolerMaxHeight: number; /** Omitted when not published. */ psuMaxLength?: number };
  /** Omitted when the front panel material is not confirmed. */
  frontPanel?: "mesh" | "glass";
  /**
   * Optional details of the PSU shroud. Default: flat box along the bottom.
   * `none`: no shroud at all (e.g. the PSU sits behind the motherboard tray).
   */
  shroud?: { none?: boolean; inclined?: boolean; bottomFanVent?: boolean; note?: string };
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
  /** Center in mm from the top-left corner of the side view (rear is on the left). */
  cx: number;
  cy: number;
}

export interface InstalledFan {
  slotId: string;
  direction: FanDirection;
  /** True for the fans that belong to the AIO radiator (2 for 240 mm, 3 for 360 mm). */
  radiator?: boolean;
  /** Simulated speed. Visual only: the app never controls real fans. Missing = DEFAULT_RPM. */
  rpm?: number;
}

export type GpuSize = "small" | "medium" | "large" | "custom";

export interface GpuConfig {
  fans: 1 | 2 | 3;
  size: GpuSize;
  /** Used only when size is "custom". */
  customLength: number;
  /** A card from the GPU database. When set, its length, fans and thickness are used instead. */
  modelId?: string;
}

/** One graphics card in the database (src/data/gpus.json). */
export interface GpuModel {
  id: string;
  brand: string;
  model: string;
  vendor: "AMD" | "NVIDIA";
  lengthMm: number;
  fans: number;
  thicknessMm: number;
  sources: string[];
}

export type TowerDirection = "rear" | "front";

export type AioSize = 240 | 360;

export type CpuCooler =
  | { type: "aio"; size: AioSize; position: MountPosition }
  | { type: "tower"; direction: TowerDirection }
  | { type: "wraith" };
