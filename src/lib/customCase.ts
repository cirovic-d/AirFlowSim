import type { CaseProfile, MountPosition } from "../types";

// A "Custom case" is a case the user describes in the editor. It becomes a
// normal CaseProfile, so the drawing, airflow and checks work the same way.

export const CUSTOM_POSITIONS: MountPosition[] = ["front", "top", "rear", "bottom", "side"];

export type RadiatorChoice = 0 | 240 | 360;

export interface CustomCaseForm {
  name: string;
  depth: number;
  width: number;
  height: number;
  gpuMax: number;
  cpuMax: number;
  shroud: boolean;
  frontPanel: "mesh" | "glass" | "";
  mounts: Record<MountPosition, number>;
  /** Fans installed when the case is opened (front/bottom/side intake, top/rear exhaust). */
  installed: Record<MountPosition, number>;
  radiators: Record<MountPosition, RadiatorChoice>;
}

/** Allowed ranges for the numbers in the editor, in mm. */
export const LIMITS = {
  depth: [320, 600],
  width: [150, 320],
  height: [320, 650],
  gpuMax: [150, 500],
  cpuMax: [40, 250],
} as const satisfies Record<string, readonly [number, number]>;

export type LimitKey = keyof typeof LIMITS;

export const DEFAULT_FORM: CustomCaseForm = {
  name: "",
  depth: 450,
  width: 220,
  height: 480,
  gpuMax: 350,
  cpuMax: 165,
  shroud: true,
  frontPanel: "mesh",
  mounts: { front: 3, top: 2, rear: 1, bottom: 0, side: 0 },
  installed: { front: 3, top: 0, rear: 1, bottom: 0, side: 0 },
  radiators: { front: 360, top: 240, rear: 0, bottom: 0, side: 0 },
};

/**
 * How many 120 mm fans fit at a position for these dimensions. Uses the same
 * spacing as the drawing (see getSlots in layout.ts).
 */
export function maxFans(position: MountPosition, depth: number, height: number): number {
  const fit = (space: number) => Math.max(0, Math.floor(space / 120) + 1);
  switch (position) {
    case "front":
    case "side":
      return Math.min(3, fit(height - 160));
    case "top":
      return Math.min(3, fit(depth - 170));
    case "bottom":
      return Math.min(3, fit(depth - 160));
    case "rear":
      return 1; // lower rear slots would sit on the expansion slots
  }
}

/** Radiator sizes that fit the fans at a position. */
export function radiatorOptions(fans: number): RadiatorChoice[] {
  if (fans >= 3) return [0, 240, 360];
  if (fans === 2) return [0, 240];
  return [0];
}

export function numberOk(key: LimitKey, value: number) {
  const [min, max] = LIMITS[key];
  return Number.isFinite(value) && value >= min && value <= max;
}

export function formValid(form: CustomCaseForm) {
  return form.name.trim().length > 0 && (Object.keys(LIMITS) as LimitKey[]).every((k) => numberOk(k, form[k]));
}

/** Builds the case profile. `id` is kept when editing an existing custom case. */
export function buildCustomCase(form: CustomCaseForm, id?: string): CaseProfile {
  const fanMounts: CaseProfile["fanMounts"] = {};
  const radiatorMounts: CaseProfile["radiatorMounts"] = {};
  const factoryFans: CaseProfile["factoryFans"] = [];
  for (const p of CUSTOM_POSITIONS) {
    const count = Math.min(Math.max(0, Math.round(form.mounts[p] || 0)), maxFans(p, form.depth, form.height));
    if (count === 0) continue;
    fanMounts[p] = { max120: count };
    const installed = Math.min(count, Math.max(0, Math.round(form.installed[p] || 0)));
    if (installed > 0) {
      const direction = p === "top" || p === "rear" ? "exhaust" : "intake";
      factoryFans.push({ position: p, count: installed, direction, directionVerified: true });
    }
    const rad = radiatorOptions(count).includes(form.radiators[p]) ? form.radiators[p] : 0;
    if (rad) radiatorMounts[p] = rad === 360 ? [120, 240, 360] : [120, 240];
  }

  return {
    id: id ?? "custom-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: form.name.trim().slice(0, 60),
    manufacturer: "Custom",
    dimensionsMm: { depth: Math.round(form.depth), width: Math.round(form.width), height: Math.round(form.height) },
    clearanceMm: { gpuMaxLength: Math.round(form.gpuMax), cpuCoolerMaxHeight: Math.round(form.cpuMax) },
    ...(form.frontPanel ? { frontPanel: form.frontPanel } : {}),
    // Without a shroud the PSU area is open. With one, air may still pass to bottom fans.
    shroud: form.shroud ? { bottomFanVent: !!fanMounts.bottom } : { none: true },
    fanMounts,
    radiatorMounts,
    factoryFans,
    sources: [],
  };
}

/** The editor form for an existing custom case. */
export function formFromCase(c: CaseProfile): CustomCaseForm {
  const mounts = { ...DEFAULT_FORM.mounts };
  const installed = { ...DEFAULT_FORM.installed };
  const radiators = { ...DEFAULT_FORM.radiators };
  for (const p of CUSTOM_POSITIONS) {
    mounts[p] = c.fanMounts[p]?.max120 ?? 0;
    installed[p] = (c.factoryFans ?? []).filter((g) => g.position === p).reduce((n, g) => n + g.count, 0);
    const sizes = c.radiatorMounts[p] ?? [];
    radiators[p] = sizes.includes(360) ? 360 : sizes.includes(240) ? 240 : 0;
  }
  return {
    name: c.name,
    depth: c.dimensionsMm.depth,
    width: c.dimensionsMm.width,
    height: c.dimensionsMm.height,
    gpuMax: c.clearanceMm.gpuMaxLength,
    cpuMax: c.clearanceMm.cpuCoolerMaxHeight,
    shroud: !c.shroud?.none,
    frontPanel: c.frontPanel ?? "",
    mounts,
    installed,
    radiators,
  };
}

/** Rebuilds a custom case read from data.json, so a hand-edited file can't break the app. */
export function sanitizeCustomCase(raw: unknown): CaseProfile | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<CaseProfile>;
  if (typeof r.id !== "string" || !r.id.startsWith("custom-") || typeof r.name !== "string") return null;
  try {
    const form = formFromCase(r as CaseProfile);
    const clamp = (key: LimitKey) => {
      const [min, max] = LIMITS[key];
      form[key] = Math.min(max, Math.max(min, Number(form[key]) || min));
    };
    (Object.keys(LIMITS) as LimitKey[]).forEach(clamp);
    if (!form.name.trim()) return null;
    return buildCustomCase(form, r.id);
  } catch {
    return null;
  }
}
