import type { InstalledFan } from "../types";

export type PressureKind = "positive" | "negative" | "neutral";

export interface FanStats {
  intake: number;
  exhaust: number;
  total: number;
  pressure: PressureKind;
}

// Approximate estimate: compares only the number of intake and exhaust fans.
export function getFanStats(fans: InstalledFan[]): FanStats {
  const intake = fans.filter((f) => f.direction === "intake").length;
  const exhaust = fans.length - intake;

  let pressure: PressureKind = "neutral";
  if (intake > exhaust) pressure = "positive";
  if (exhaust > intake) pressure = "negative";

  return { intake, exhaust, total: fans.length, pressure };
}
