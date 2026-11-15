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
  fanMounts: Partial<Record<MountPosition, FanMount>>;
  radiatorMounts: Partial<Record<MountPosition, number[]>>;
  radiatorNotes?: string;
  factoryFans: FactoryFanGroup[];
  sources: string[];
}

export type Screen = "simulator" | "saved" | "settings" | "about";
