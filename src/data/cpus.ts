import type { CpuModel } from "../types";
import data from "./cpus.json";

/** AMD processors, in the order of the list. */
export const CPUS: CpuModel[] = data as CpuModel[];

export function findCpu(id: string | undefined): CpuModel | undefined {
  return id ? CPUS.find((c) => c.id === id) : undefined;
}

/**
 * AMD's socket power limit (PPT) = TDP × 1.35. This is the most the processor
 * draws at stock settings, used here as its power at 100 % load.
 */
export function cpuMaxPower(cpu: CpuModel) {
  return Math.round(cpu.tdpW * 1.35);
}
