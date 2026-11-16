import type { CaseProfile, CpuCooler, GpuConfig } from "../types";
import { findGpu } from "../data/gpus";
import { cpuMaxPower, findCpu } from "../data/cpus";
import { getGpuFit, getGpuLength } from "./components";
import { BOARD_SIZES, boardFit, type Build, type Fit } from "./build";
import { recommendedPsu } from "./thermal";

export interface Check {
  id: "gpu" | "board" | "cooler" | "psuLength" | "psuWatts";
  fit: Fit;
  /** What was compared, e.g. "330 / 360 mm". */
  detail: string;
  noteKey?: "byStandard" | "eatxWidth" | "notSpecified" | "notPublished" | "pickParts";
}

/** Every build check that applies to this setup. */
export function buildChecks(c: CaseProfile, gpu: GpuConfig, cooler: CpuCooler, build: Build): Check[] {
  const checks: Check[] = [];

  const length = getGpuLength(gpu);
  checks.push({ id: "gpu", fit: getGpuFit(c, gpu), detail: `${length ?? "?"} / ${c.clearanceMm.gpuMaxLength} mm` });

  const board = boardFit(c, build.board);
  const size = BOARD_SIZES[build.board];
  const eatx = c.motherboards?.eatxMaxWidth;
  checks.push({
    id: "board",
    fit: board.fit,
    detail: `${build.board} ${size.h} × ${size.w} mm` + (board.noteKey === "eatxWidth" && eatx ? ` (max ${eatx} mm)` : ""),
    noteKey: board.noteKey,
  });

  if (cooler.type === "tower") {
    const max = c.clearanceMm.cpuCoolerMaxHeight;
    checks.push({ id: "cooler", fit: build.towerHeight <= max ? "compatible" : "incompatible", detail: `${build.towerHeight} / ${max} mm` });
  }

  const psuMax = c.clearanceMm.psuMaxLength;
  checks.push(
    psuMax
      ? { id: "psuLength", fit: build.psuLength <= psuMax ? "compatible" : "incompatible", detail: `${build.psuLength} / ${psuMax} mm` }
      : { id: "psuLength", fit: "unknown", detail: `${build.psuLength} mm`, noteKey: "notPublished" },
  );

  const gpuModel = findGpu(gpu.modelId);
  const cpuModel = findCpu(build.cpuId);
  const need = recommendedPsu(gpuModel?.powerW ?? null, cpuModel ? cpuMaxPower(cpuModel) : null);
  checks.push(
    need
      ? { id: "psuWatts", fit: build.psuWatts >= need ? "compatible" : "incompatible", detail: `${build.psuWatts} / ≥ ${need} W` }
      : { id: "psuWatts", fit: "unknown", detail: `${build.psuWatts} W`, noteKey: "pickParts" },
  );

  return checks;
}
