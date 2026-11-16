import type { GpuModel } from "../types";
import data from "./gpus.json";

/** Graphics cards with verified length, fan count and thickness. Sorted by name. */
export const GPUS: GpuModel[] = (data as GpuModel[]).slice().sort((a, b) => gpuName(a).localeCompare(gpuName(b)));

export function gpuName(g: GpuModel) {
  return `${g.brand} ${g.model}`;
}

export function findGpu(id: string | undefined): GpuModel | undefined {
  return id ? GPUS.find((g) => g.id === id) : undefined;
}

/** Cards whose name contains every word of the query. */
export function searchGpus(query: string): GpuModel[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return GPUS.filter((g) => {
    const name = `${gpuName(g)} ${g.vendor}`.toLowerCase();
    return words.every((w) => name.includes(w));
  });
}
