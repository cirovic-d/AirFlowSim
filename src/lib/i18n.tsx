import { createContext, useContext } from "react";

export type Lang = "en" | "sr";

const en = {
  appName: "Airflow Simulator",
  navSimulator: "Airflow Simulator",
  navSaved: "Saved Configurations",
  navSettings: "Settings",
  navAbout: "About",
  cases: "Cases",
  caseSpecs: "Case specifications",
  dimensions: "Dimensions",
  gpuMax: "Max GPU length",
  cpuMax: "Max CPU cooler height",
  psuMax: "Max PSU length",
  fanMounts: "Fan mounts (120 mm)",
  radiators: "Radiator support",
  factoryFans: "Factory fans",
  none: "None",
  intake: "Intake",
  exhaust: "Exhaust",
  totalFans: "Total fans",
  pressure: "Pressure",
  positive: "Positive",
  negative: "Negative",
  neutral: "Neutral",
  approxNote: "Approximate estimate based on fan count only. Real pressure also depends on fan airflow, RPM, filters and case restrictions.",
  directionUnverified: "Direction assumed (not stated by manufacturer)",
  stagePlaceholder: "Case visualization arrives in the next phase.",
  sources: "Sources",
  front: "Front",
  top: "Top",
  side: "Side",
  bottom: "Bottom",
  rear: "Rear",
  savedEmptyTitle: "No saved configurations yet",
  savedEmptyText: "Configurations you save from the simulator will appear here.",
  language: "Language",
  languageHint: "Interface language",
  aboutText: "A lightweight tool for visualizing airflow inside PC cases. This is a visual simulation, not a CFD calculation, and it never controls real hardware fans.",
  version: "Version",
  repository: "Repository",
};

type Dict = typeof en;

const sr: Dict = {
  appName: "Airflow Simulator",
  navSimulator: "Simulator protoka",
  navSaved: "Sačuvane konfiguracije",
  navSettings: "Podešavanja",
  navAbout: "O aplikaciji",
  cases: "Kućišta",
  caseSpecs: "Specifikacije kućišta",
  dimensions: "Dimenzije",
  gpuMax: "Maks. dužina GPU-a",
  cpuMax: "Maks. visina CPU hladnjaka",
  psuMax: "Maks. dužina napajanja",
  fanMounts: "Mesta za ventilatore (120 mm)",
  radiators: "Podrška za radijator",
  factoryFans: "Fabrički ventilatori",
  none: "Nema",
  intake: "Usis",
  exhaust: "Izduv",
  totalFans: "Ukupno ventilatora",
  pressure: "Pritisak",
  positive: "Pozitivan",
  negative: "Negativan",
  neutral: "Neutralan",
  approxNote: "Okvirna procena samo na osnovu broja ventilatora. Stvarni pritisak zavisi i od protoka, RPM-a, filtera i otpora kućišta.",
  directionUnverified: "Smer pretpostavljen (proizvođač ga ne navodi)",
  stagePlaceholder: "Prikaz kućišta stiže u sledećoj fazi.",
  sources: "Izvori",
  front: "Napred",
  top: "Gore",
  side: "Bočno",
  bottom: "Dole",
  rear: "Pozadi",
  savedEmptyTitle: "Još nema sačuvanih konfiguracija",
  savedEmptyText: "Konfiguracije koje sačuvaš u simulatoru pojaviće se ovde.",
  language: "Jezik",
  languageHint: "Jezik interfejsa",
  aboutText: "Lagan alat za prikaz protoka vazduha u PC kućištima. Ovo je vizuelna simulacija, ne CFD proračun, i nikad ne upravlja pravim ventilatorima.",
  version: "Verzija",
  repository: "Repozitorijum",
};

export type TKey = keyof Dict;

const DICTS: Record<Lang, Dict> = { en, sr };

export const LangContext = createContext<Lang>("en");

// Returns a translate function for the current language.
export function useT() {
  const lang = useContext(LangContext);
  return (key: TKey) => DICTS[lang][key];
}
