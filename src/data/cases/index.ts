import type { CaseProfile } from "../../types";

// Every JSON file in this folder is one case profile.
// To add a new case, just drop a new JSON file here.
const modules = import.meta.glob<CaseProfile>("./*.json", { eager: true, import: "default" });

/** Cases that ship with the app (verified manufacturer data). */
export const CASES: CaseProfile[] = Object.values(modules).sort((a, b) =>
  a.name.localeCompare(b.name),
);

// Cases the user made in the "Custom case" editor. They live in data.json and
// are set here by App, so every lookup below also finds them.
let customCases: CaseProfile[] = [];

export function setCustomCases(list: CaseProfile[]) {
  customCases = list;
}

export function isCustomCase(c: CaseProfile) {
  return c.id.startsWith("custom-");
}

/** Built-in cases first, then the user's own. */
export function allCases(): CaseProfile[] {
  return [...CASES, ...customCases];
}

/** Name without the brand, e.g. "AURA GC5" instead of "GAMDIAS AURA GC5". */
export function shortName(c: CaseProfile): string {
  const prefix = c.manufacturer + " ";
  return c.name.startsWith(prefix) ? c.name.slice(prefix.length) : c.name;
}

export function findCase(id: string): CaseProfile {
  return allCases().find((c) => c.id === id) ?? CASES[0];
}
