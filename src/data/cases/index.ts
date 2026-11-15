import type { CaseProfile } from "../../types";

// Every JSON file in this folder is one case profile.
// To add a new case, just drop a new JSON file here.
const modules = import.meta.glob<CaseProfile>("./*.json", { eager: true, import: "default" });

export const CASES: CaseProfile[] = Object.values(modules).sort((a, b) =>
  a.name.localeCompare(b.name),
);

export function findCase(id: string): CaseProfile {
  return CASES.find((c) => c.id === id) ?? CASES[0];
}
