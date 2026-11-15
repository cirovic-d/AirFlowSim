import type { Lang } from "./i18n";

export interface Settings {
  lang: Lang;
  intakeColor: string;
  exhaustColor: string;
  /** Multiplies the animation time step: 0.5 = half speed, 2 = double. */
  animationSpeed: number;
  /** How much air is drawn, 0.1–1. Maps to the number of particles. */
  airAmount: number;
  /** Small UI transitions (hover fades etc.). Off = everything changes instantly. */
  uiAnimations: boolean;
  checkUpdates: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  lang: "en",
  intakeColor: "#3ad0f0",
  exhaustColor: "#ff8a3d",
  animationSpeed: 1,
  airAmount: 0.45,
  uiAnimations: true,
  checkUpdates: true,
};

export const AIR_AMOUNT_MIN = 0.1;

/** Number of particles for an air amount: 0.1 → 120, 0.45 → 330, 1 → 660. */
export function particlesFor(airAmount: number) {
  return Math.round(60 + airAmount * 600);
}

/** Older versions stored a density level instead of a number. */
const LEGACY_DENSITY: Record<string, number> = { low: 0.2, medium: 0.45, high: 0.75 };

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
    airAmount:
      typeof r.airAmount === "number" && Number.isFinite(r.airAmount)
        ? Math.min(1, Math.max(AIR_AMOUNT_MIN, r.airAmount))
        : typeof r.density === "string" && r.density in LEGACY_DENSITY
          ? LEGACY_DENSITY[r.density]
          : d.airAmount,
    uiAnimations: typeof r.uiAnimations === "boolean" ? r.uiAnimations : d.uiAnimations,
    checkUpdates: typeof r.checkUpdates === "boolean" ? r.checkUpdates : d.checkUpdates,
  };
}
