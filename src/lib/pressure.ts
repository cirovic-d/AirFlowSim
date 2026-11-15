import type { FactoryFanGroup } from "../types";

export type PressureKind = "positive" | "negative" | "neutral";

export interface FanStats {
  intake: number;
  exhaust: number;
  total: number;
  pressure: PressureKind;
}

// Approximate estimate: compares only the number of intake and exhaust fans.
export function getFanStats(fans: FactoryFanGroup[]): FanStats {
  let intake = 0;
  let exhaust = 0;
  for (const group of fans) {
    if (group.direction === "intake") intake += group.count;
    else exhaust += group.count;
  }

  let pressure: PressureKind = "neutral";
  if (intake > exhaust) pressure = "positive";
  if (exhaust > intake) pressure = "negative";

  return { intake, exhaust, total: intake + exhaust, pressure };
}
