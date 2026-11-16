import type { InstalledFan } from "../types";

export type PressureKind = "positive" | "negative" | "neutral";

// Simulated fan speed. Visual only: the app never reads or controls real fans.
export const DEFAULT_RPM = 1200;
export const MIN_RPM = 500;
export const MAX_RPM = 2000;
export const RPM_STEP = 100;

export function fanRpm(fan: InstalledFan): number {
  return fan.rpm ?? DEFAULT_RPM;
}

/** Relative airflow of a fan: 1 at DEFAULT_RPM. Airflow grows roughly linearly with RPM. */
export function fanStrength(fan: InstalledFan): number {
  return fanRpm(fan) / DEFAULT_RPM;
}

export interface FanStats {
  intake: number;
  exhaust: number;
  total: number;
  pressure: PressureKind;
}

/**
 * Approximate estimate: compares the airflow of intake and exhaust fans, where
 * each fan counts by its speed (two fans at 600 RPM ≈ one fan at 1200 RPM).
 * Fan models, filters and panel restriction are not taken into account.
 */
export function getFanStats(fans: InstalledFan[]): FanStats {
  let intake = 0;
  let intakeFlow = 0;
  let exhaustFlow = 0;
  for (const f of fans) {
    if (f.direction === "intake") {
      intake++;
      intakeFlow += fanStrength(f);
    } else exhaustFlow += fanStrength(f);
  }

  // Within 10% of each other counts as neutral.
  let pressure: PressureKind = "neutral";
  const diff = intakeFlow - exhaustFlow;
  const margin = 0.1 * Math.max(intakeFlow, exhaustFlow);
  if (diff > margin) pressure = "positive";
  if (diff < -margin) pressure = "negative";

  return { intake, exhaust: fans.length - intake, total: fans.length, pressure };
}

export function clampRpm(value: number): number {
  const stepped = Math.round(value / RPM_STEP) * RPM_STEP;
  return Math.min(MAX_RPM, Math.max(MIN_RPM, stepped));
}
