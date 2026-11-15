import { useEffect, useState } from "react";
import type { Screen } from "./types";
import { CASES, findCase } from "./data/cases";
import { LangContext, type Lang } from "./lib/i18n";
import { newId, parseStore, type SavedConfig, type Setup } from "./lib/configs";
import { loadStore, saveStore } from "./lib/storage";
import { Sidebar } from "./components/Sidebar";
import { SimulatorScreen } from "./screens/SimulatorScreen";
import { SavedScreen } from "./screens/SavedScreen";
import { AboutScreen, SettingsScreen } from "./screens/OtherScreens";

const DEFAULT_COLORS = { intake: "#3ad0f0", exhaust: "#ff8a3d" };

function loadLang(): Lang {
  try {
    return localStorage.getItem("lang") === "sr" ? "sr" : "en";
  } catch {
    return "en";
  }
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("simulator");
  const [caseId, setCaseId] = useState(CASES[0].id);
  const [lang, setLang] = useState<Lang>(loadLang);

  // Saved configurations. `loaded` stops us from overwriting the file before it was read.
  const [configs, setConfigs] = useState<SavedConfig[]>([]);
  const [loaded, setLoaded] = useState(false);

  // A loaded configuration to start the simulator from, and a counter that
  // remounts the simulator so it picks it up.
  const [initial, setInitial] = useState<Setup | null>(null);
  const [simKey, setSimKey] = useState(0);

  useEffect(() => {
    loadStore()
      .then((text) => setConfigs(parseStore(text).configs))
      .catch(() => setConfigs([]))
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (loaded) saveStore(JSON.stringify({ version: 1, configs }, null, 2)).catch(() => {});
  }, [configs, loaded]);

  useEffect(() => {
    try {
      localStorage.setItem("lang", lang);
    } catch {
      // Storage unavailable: language just won't be remembered.
    }
  }, [lang]);

  function selectCase(id: string) {
    setInitial(null);
    setCaseId(id);
    setSimKey((k) => k + 1);
  }

  function saveConfig(setup: Setup, name: string) {
    const config: SavedConfig = { ...setup, id: newId(), name, savedAt: new Date().toISOString(), colors: DEFAULT_COLORS };
    setConfigs((prev) => [config, ...prev]);
  }

  function openConfig(config: SavedConfig) {
    setInitial(config);
    setCaseId(config.caseId);
    setSimKey((k) => k + 1);
    setScreen("simulator");
  }

  return (
    <LangContext.Provider value={lang}>
      <div className="app">
        <Sidebar screen={screen} onScreen={setScreen} cases={CASES} caseId={caseId} onCase={selectCase} />
        <main className="content">
          {/* The simulator stays mounted (hidden) so switching screens keeps your setup. */}
          <div className={"screen-slot" + (screen === "simulator" ? "" : " hidden")}>
            <SimulatorScreen
              key={simKey}
              caseProfile={findCase(caseId)}
              initial={initial}
              active={screen === "simulator"}
              onSave={saveConfig}
            />
          </div>
          {screen === "saved" && (
            <SavedScreen
              configs={configs}
              onOpen={openConfig}
              onDelete={(id) => setConfigs((prev) => prev.filter((c) => c.id !== id))}
              onImport={(config) => setConfigs((prev) => [config, ...prev])}
            />
          )}
          {screen === "settings" && <SettingsScreen lang={lang} onLang={setLang} />}
          {screen === "about" && <AboutScreen />}
        </main>
      </div>
    </LangContext.Provider>
  );
}
