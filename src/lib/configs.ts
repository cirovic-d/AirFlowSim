import type { AioSize, CpuCooler, FanDirection, GpuConfig, InstalledFan, MountPosition } from "../types";
import { CASES } from "../data/cases";
import { DEFAULT_GPU, getAioPositions, mountAio } from "./components";
import { getSlots } from "./layout";
import { sanitizeSettings, type Settings } from "./settings";

/** Everything needed to rebuild one simulator setup. */
export interface Setup {
  caseId: string;
  fans: InstalledFan[];
  gpu: GpuConfig;
  cooler: CpuCooler;
  fanSpeed: number;
}

export interface AirflowColors {
  intake: string;
  exhaust: string;
}

export interface SavedConfig extends Setup {
  id: string;
  name: string;
  savedAt: string; // ISO date
  colors: AirflowColors;
}

export interface StoreData {
  version: 1;
  configs: SavedConfig[];
  /** Null when the file has no settings yet (first start). */
  settings: Settings | null;
}

const EXPORT_APP = "PC Airflow Simulator";
const EXPORT_FORMAT = 1;

export function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ---------- Saved data file ----------

export function parseStore(text: string): StoreData {
  try {
    const raw = JSON.parse(text);
    const configs = Array.isArray(raw?.configs) ? raw.configs.map(sanitizeConfig).filter(Boolean) : [];
    const settings = raw?.settings ? sanitizeSettings(raw.settings) : null;
    return { version: 1, configs: configs as SavedConfig[], settings };
  } catch {
    return { version: 1, configs: [], settings: null };
  }
}

// ---------- JSON export / import ----------

export function toExportJson(config: SavedConfig): string {
  const { id: _id, ...rest } = config;
  return JSON.stringify({ app: EXPORT_APP, format: EXPORT_FORMAT, config: rest }, null, 2);
}

/** Returns the imported config, or null if the file isn't a valid configuration. */
export function parseImport(text: string): SavedConfig | null {
  try {
    const raw = JSON.parse(text);
    if (raw?.app !== EXPORT_APP || !raw.config) return null;
    return sanitizeConfig({ ...raw.config, id: newId() });
  } catch {
    return null;
  }
}

export function exportFileName(config: SavedConfig) {
  const slug = config.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug || "airflow-config"}.json`;
}

// ---------- Validation ----------
// Files can be edited by hand or come from another version, so every field is
// checked and anything unknown is dropped instead of crashing the app.

const DIRECTIONS: FanDirection[] = ["intake", "exhaust"];
const HEX = /^#[0-9a-f]{6}$/i;

function sanitizeConfig(raw: unknown): SavedConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const setup = sanitizeSetup(r);
  if (!setup) return null;

  const colors = (r.colors ?? {}) as Record<string, unknown>;
  return {
    ...setup,
    id: typeof r.id === "string" && r.id ? r.id : newId(),
    name: typeof r.name === "string" && r.name.trim() ? r.name.trim().slice(0, 80) : "Imported configuration",
    savedAt: typeof r.savedAt === "string" && !isNaN(Date.parse(r.savedAt)) ? r.savedAt : new Date().toISOString(),
    colors: {
      intake: typeof colors.intake === "string" && HEX.test(colors.intake) ? colors.intake : "#3ad0f0",
      exhaust: typeof colors.exhaust === "string" && HEX.test(colors.exhaust) ? colors.exhaust : "#ff8a3d",
    },
  };
}

function sanitizeSetup(r: Record<string, unknown>): Setup | null {
  const caseProfile = CASES.find((c) => c.id === r.caseId);
  if (!caseProfile) return null;
  const slots = getSlots(caseProfile);
  const slotIds = new Set(slots.map((s) => s.id));

  // Fans: known slot, valid direction, one fan per slot. Radiator fans are rebuilt below.
  const seen = new Set<string>();
  const radiatorDirections = new Map<string, FanDirection>(); // slotId → direction
  const fans: InstalledFan[] = [];
  for (const f of Array.isArray(r.fans) ? r.fans : []) {
    if (!f || !slotIds.has(f.slotId) || seen.has(f.slotId) || !DIRECTIONS.includes(f.direction)) continue;
    seen.add(f.slotId);
    if (f.radiator) radiatorDirections.set(f.slotId, f.direction);
    else fans.push({ slotId: f.slotId, direction: f.direction });
  }

  // CPU cooler. An AIO is kept only where this case supports that radiator size.
  // Files from before 240 mm support have no size: they were all 360 mm.
  let cooler: CpuCooler = { type: "tower", direction: "rear" };
  let finalFans = fans;
  const c = (r.cooler ?? {}) as Record<string, unknown>;
  if (c.type === "wraith") cooler = { type: "wraith" };
  if (c.type === "tower") cooler = { type: "tower", direction: c.direction === "front" ? "front" : "rear" };
  const size: AioSize = c.size === 240 ? 240 : 360;
  if (c.type === "aio" && getAioPositions(caseProfile, size).includes(c.position as MountPosition)) {
    const position = c.position as MountPosition;
    cooler = { type: "aio", size, position };
    finalFans = mountAio(fans, slots, position, size).map((f) =>
      f.radiator ? { ...f, direction: radiatorDirections.get(f.slotId) ?? f.direction } : f,
    );
  }

  // GPU
  const g = (r.gpu ?? {}) as Record<string, unknown>;
  const gpu: GpuConfig = {
    fans: g.fans === 1 || g.fans === 2 || g.fans === 3 ? g.fans : DEFAULT_GPU.fans,
    size: g.size === "small" || g.size === "medium" || g.size === "large" || g.size === "custom" ? g.size : DEFAULT_GPU.size,
    customLength: typeof g.customLength === "number" ? g.customLength : DEFAULT_GPU.customLength,
  };

  const fanSpeed = typeof r.fanSpeed === "number" ? Math.min(1, Math.max(0.2, r.fanSpeed)) : 0.7;

  return { caseId: caseProfile.id, fans: finalFans, gpu, cooler, fanSpeed };
}
