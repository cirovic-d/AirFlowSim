import type { Lang } from "./i18n";

export type Density = "low" | "medium" | "high";

export interface Settings {
  lang: Lang;
  intakeColor: string;
  exhaustColor: string;
  /** Multiplies the animation time step: 0.5 = half speed, 2 = double. */
  animationSpeed: number;
  density: Density;
  /** Small UI transitions (hover fades etc.). Off = everything changes instantly. */
  uiAnimations: boolean;
  checkUpdates: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  lang: "en",
  intakeColor: "#3ad0f0",
  exhaustColor: "#ff8a3d",
  animationSpeed: 1,
  density: "medium",
  uiAnimations: true,
  checkUpdates: true,
};

/** Particle count for each density level. */
export const PARTICLES: Record<Density, number> = { low: 160, medium: 320, high: 520 };

const HEX = /^#[0-9a-f]{6}$/i;

/** Fills in defaults for anything missing or invalid. */
export function sanitizeSettings(raw: unknown): Settings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_SETTINGS;
  return {
    lang: r.lang === "sr" || r.lang === "en" ? r.lang : d.lang,
    intakeColor: typeof r.intakeColor === "string" && HEX.test(r.intakeColor) ? r.intakeColor : d.intakeColor,
    exhaustColor: typeof r.exhaustColor === "string" && HEX.test(r.exhaustColor) ? r.exhaustColor : d.exhaustColor,
    animationSpeed:
      typeof r.animationSpeed === "number" ? Math.min(2, Math.max(0.5, r.animationSpeed)) : d.animationSpeed,
    density: r.density === "low" || r.density === "medium" || r.density === "high" ? r.density : d.density,
    uiAnimations: typeof r.uiAnimations === "boolean" ? r.uiAnimations : d.uiAnimations,
    checkUpdates: typeof r.checkUpdates === "boolean" ? r.checkUpdates : d.checkUpdates,
  };
}
