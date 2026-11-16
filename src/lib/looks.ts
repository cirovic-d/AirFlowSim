import type { CaseProfile } from "../types";

/** How the parts look. Purely visual: never changes the airflow. */
export interface Looks {
  caseColor: string;
  boardColor: string;
  gpuColor: string;
  ramColor: string;
  ramCount: 2 | 4;
  ramRgb: boolean;
}

export const DEFAULT_LOOKS: Looks = {
  caseColor: "#1c1d22",
  boardColor: "#22252b",
  gpuColor: "#2c2e35",
  ramColor: "#3a3d46",
  ramCount: 2,
  ramRgb: false,
};

/** Quick picks shown next to the color picker. Any color can be chosen. */
export const SWATCHES = ["#1c1d22", "#e9eaed", "#8a8f99", "#2b3a55", "#5a1f24", "#2e4a3a", "#f2c7d3", "#c9a26b"];

const HEX = /^#[0-9a-f]{6}$/i;

export function sanitizeLooks(raw: unknown): Looks {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const color = (v: unknown, d: string) => (typeof v === "string" && HEX.test(v) ? v.toLowerCase() : d);
  return {
    caseColor: color(r.caseColor, DEFAULT_LOOKS.caseColor),
    boardColor: color(r.boardColor, DEFAULT_LOOKS.boardColor),
    gpuColor: color(r.gpuColor, DEFAULT_LOOKS.gpuColor),
    ramColor: color(r.ramColor, DEFAULT_LOOKS.ramColor),
    ramCount: r.ramCount === 4 ? 4 : 2,
    ramRgb: r.ramRgb === true,
  };
}

// ---------- Color helpers ----------

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** True for light colors (e.g. a white case), where dark lines read better. */
export function isLight(hex: string) {
  const [r, g, b] = rgb(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b > 150;
}

/** Mixes a color toward white (amount > 0) or black (amount < 0). */
export function shade(hex: string, amount: number) {
  const target = amount > 0 ? 255 : 0;
  const k = Math.abs(amount);
  const out = rgb(hex).map((c) => Math.round(c + (target - c) * k));
  return "#" + out.map((c) => c.toString(16).padStart(2, "0")).join("");
}

// ---------- Panels ----------

export type PanelKind = "glass" | "mesh" | "solid";

/**
 * Material of each outer panel, for the 3D view. The left side (the one we look
 * through) is glass on every case in the list. The front comes from the profile
 * (unconfirmed = solid); the top is vented where it takes fans.
 */
export function getPanels(c: CaseProfile): Record<"front" | "top" | "left" | "right" | "rear" | "bottom", PanelKind> {
  return {
    front: c.frontPanel ?? "solid",
    top: c.topPanel ?? (c.fanMounts.top ? "mesh" : "solid"),
    left: "glass",
    right: "solid",
    rear: "solid",
    bottom: "solid",
  };
}
