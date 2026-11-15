import type { AioSize, CaseProfile, GpuConfig, GpuSize, InstalledFan, MountPosition, Slot } from "../types";

// ---------- GPU ----------

/** Typical card lengths for the presets, in mm. */
export const GPU_PRESETS: Record<Exclude<GpuSize, "custom">, number> = {
  small: 200,
  medium: 270,
  large: 330,
};

export const GPU_MIN_LENGTH = 100;
export const GPU_MAX_LENGTH = 450;

export const DEFAULT_GPU: GpuConfig = { fans: 2, size: "medium", customLength: 300 };

/** Card length in mm, or null when a custom length is missing or out of range. */
export function getGpuLength(gpu: GpuConfig): number | null {
  if (gpu.size !== "custom") return GPU_PRESETS[gpu.size];
  const ok = Number.isFinite(gpu.customLength) && gpu.customLength >= GPU_MIN_LENGTH && gpu.customLength <= GPU_MAX_LENGTH;
  return ok ? gpu.customLength : null;
}

export type GpuFit = "compatible" | "incompatible" | "unknown";

/** Compares the card with the manufacturer's max GPU length. */
export function getGpuFit(c: CaseProfile, gpu: GpuConfig): GpuFit {
  const length = getGpuLength(gpu);
  const max = c.clearanceMm.gpuMaxLength;
  if (length === null || !max) return "unknown";
  return length <= max ? "compatible" : "incompatible";
}

// ---------- AIO (240 mm or 360 mm) ----------

export const AIO_SIZES: AioSize[] = [240, 360];

/** Positions where this case officially supports a radiator of this size. */
export function getAioPositions(c: CaseProfile, size: AioSize): MountPosition[] {
  return (Object.keys(c.radiatorMounts) as MountPosition[]).filter(
    (p) => c.radiatorMounts[p]!.includes(size) && (c.fanMounts[p]?.max120 ?? 0) >= size / 120,
  );
}

/** Radiator sizes this case supports somewhere. */
export function getAioSizes(c: CaseProfile): AioSize[] {
  return AIO_SIZES.filter((size) => getAioPositions(c, size).length > 0);
}

/** Puts the radiator fans (2 or 3) on the first slots of a position. */
export function mountAio(fans: InstalledFan[], slots: Slot[], position: MountPosition, size: AioSize): InstalledFan[] {
  const radSlots = slots.filter((s) => s.position === position).slice(0, size / 120);
  const radIds = new Set(radSlots.map((s) => s.id));
  const direction = position === "front" || position === "bottom" ? "intake" : "exhaust";
  return [
    ...removeAio(fans).filter((f) => !radIds.has(f.slotId)),
    ...radSlots.map((s) => ({ slotId: s.id, direction, radiator: true }) as InstalledFan),
  ];
}

export function removeAio(fans: InstalledFan[]): InstalledFan[] {
  return fans.filter((f) => !f.radiator);
}
