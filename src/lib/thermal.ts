import type { CaseProfile, CpuCooler, GpuConfig, InstalledFan, MountPosition, Slot } from "../types";
import { findGpu } from "../data/gpus";
import { cpuMaxPower, findCpu } from "../data/cpus";
import { getGpuFans, getGpuThickness } from "./components";
import { fanRpm } from "./pressure";
import type { Build } from "./build";

// A rough steady-state estimate, not a simulation. Every number below is a
// simple, documented assumption (see docs/DECISIONS.md, "Temperatura"):
//
//   1. Heat in the case = GPU power + CPU power (unless an AIO blows it out)
//      + 40 W for board, memory, drives and fans.
//   2. Air moved by the fans: 45 CFM per 120 mm fan at 1200 RPM, scaled by RPM,
//      reduced by what's in front of it (mesh, glass, filters, a radiator).
//   3. Air temperature rise = heat / (air density × heat capacity × airflow).
//   4. Part temperature = air reaching it + power × thermal resistance of its cooler.

const AIR_PER_FAN_CFM = 45;
const PASSIVE_CFM = 8; // natural convection with no fans
const OTHER_HEAT_W = 40;
const CFM_TO_M3S = 0.000472;
const AIR_J_PER_M3K = 1.2 * 1005;

/** CPU cooler thermal resistance, °C per W (better coolers are lower). */
const COOLER_RESISTANCE = { tower: 0.35, wraith: 0.6, aio240: 0.27, aio360: 0.23 };

export interface ThermalResult {
  /** Missing parts needed for the estimate. */
  missing: ("gpu" | "cpu")[];
  intakeCfm: number;
  exhaustCfm: number;
  heatW: number;
  gpuW: number;
  cpuW: number;
  /** Air inside the case, °C. */
  caseAir: number;
  gpu: number;
  cpu: number;
  cpuTjmax: number;
  /** ± range shown next to each estimate. */
  spread: (t: number) => number;
  score: number;
}

/** How much a panel or filter in front of a fan slows it down (1 = nothing in the way). */
function restriction(c: CaseProfile, position: MountPosition): number {
  switch (position) {
    case "front":
      return c.frontPanel === "mesh" ? 0.85 : c.frontPanel === "glass" ? 0.6 : 0.65;
    case "top": {
      const top = c.topPanel ?? (c.fanMounts.top ? "mesh" : "solid");
      return top === "mesh" ? 0.85 : 0.6;
    }
    case "rear":
      return 0.9;
    case "bottom":
      return 0.8;
    case "side":
      return 0.75;
  }
}

export function estimateThermals(
  c: CaseProfile,
  slots: Slot[],
  fans: InstalledFan[],
  gpuConfig: GpuConfig,
  cooler: CpuCooler,
  build: Build,
): ThermalResult {
  const gpuModel = findGpu(gpuConfig.modelId);
  const cpuModel = findCpu(build.cpuId);
  const missing: ThermalResult["missing"] = [];
  if (!gpuModel) missing.push("gpu");
  if (!cpuModel) missing.push("cpu");

  const gpuW = gpuModel ? (gpuModel.powerW * build.gpuLoad) / 100 : 0;
  const cpuW = cpuModel ? (cpuMaxPower(cpuModel) * build.cpuLoad) / 100 : 0;

  // Fans
  const slotById = new Map(slots.map((s) => [s.id, s]));
  let intake = 0;
  let exhaust = 0;
  let bottomIntake = 0;
  let frontIntake = 0;
  for (const f of fans) {
    const slot = slotById.get(f.slotId);
    if (!slot) continue;
    const cfm = AIR_PER_FAN_CFM * (fanRpm(f) / 1200) * restriction(c, slot.position) * (f.radiator ? 0.7 : 1);
    if (f.direction === "intake") {
      intake += cfm;
      if (slot.position === "bottom") bottomIntake++;
      if (slot.position === "front" || slot.position === "side") frontIntake++;
    } else exhaust += cfm;
  }
  // Unbalanced fans still push air out through gaps, but less well.
  const flow = Math.min(intake, exhaust) + 0.5 * Math.abs(intake - exhaust) + PASSIVE_CFM;

  // An AIO exhausting through its radiator takes the CPU heat straight out.
  const aioExhaust = cooler.type === "aio" && fans.some((f) => f.radiator && f.direction === "exhaust");
  const heatW = gpuW + (aioExhaust ? 0 : cpuW) + OTHER_HEAT_W;
  const rise = Math.min(40, heatW / (AIR_J_PER_M3K * flow * CFM_TO_M3S));
  const caseAir = build.ambient + rise;

  // GPU: fresh air from bottom intakes reaches it first, front intakes help.
  const gpuInlet = build.ambient + rise * (bottomIntake > 0 ? 0.45 : frontIntake > 0 ? 0.75 : 1);
  const gpuResistance = Math.min(0.22, Math.max(0.09, 0.17 - 0.02 * (getGpuFans(gpuConfig) - 2) - 0.0008 * (getGpuThickness(gpuConfig) - 45)));
  const gpu = Math.min(95, gpuInlet + gpuResistance * gpuW);

  // CPU: an AIO radiator breathes the air on its side of the fans.
  let cpuInlet = build.ambient + rise * 0.85;
  let resistance = cooler.type === "wraith" ? COOLER_RESISTANCE.wraith : COOLER_RESISTANCE.tower;
  if (cooler.type === "aio") {
    resistance = cooler.size === 360 ? COOLER_RESISTANCE.aio360 : COOLER_RESISTANCE.aio240;
    cpuInlet = aioExhaust ? caseAir : build.ambient;
  }
  const cpuTjmax = cpuModel?.tjmaxC ?? 95;
  const cpu = Math.min(cpuTjmax, cpuInlet + resistance * cpuW);

  // Score: low air temperature rise, balanced pressure, fresh air for the GPU, parts not too hot.
  let score = 100 - 3 * Math.max(0, rise - 3);
  if (exhaust === 0) score -= 10;
  if (intake < exhaust * 0.9) score -= 6; // negative pressure pulls in dust through gaps
  if (bottomIntake + frontIntake === 0) score -= 8;
  if (gpuModel) score -= Math.max(0, gpu - 83);
  if (cpuModel && cpu >= cpuTjmax) score -= 10; // at its limit: the CPU slows itself down
  score = Math.round(Math.min(100, Math.max(0, score)));

  return {
    missing,
    intakeCfm: Math.round(intake),
    exhaustCfm: Math.round(exhaust),
    heatW: Math.round(heatW),
    gpuW: Math.round(gpuW),
    cpuW: Math.round(cpuW),
    caseAir,
    gpu,
    cpu,
    cpuTjmax,
    spread: (t) => Math.round(2 + 0.12 * Math.max(0, t - build.ambient)),
    score,
  };
}

export type ScoreLabel = "scoreExcellent" | "scoreGood" | "scoreFair" | "scorePoor";

export function scoreLabel(score: number): ScoreLabel {
  if (score >= 85) return "scoreExcellent";
  if (score >= 70) return "scoreGood";
  if (score >= 50) return "scoreFair";
  return "scorePoor";
}

/** Rule of thumb: (GPU + CPU at full load + 100 W for the rest) × 1.25, rounded up to 50 W. */
export function recommendedPsu(gpuW: number | null, cpuW: number | null): number | null {
  if (gpuW === null || cpuW === null) return null;
  return Math.ceil(((gpuW + cpuW + 100) * 1.25) / 50) * 50;
}
