import { useEffect, useState, type CSSProperties } from "react";
import type { Screen } from "./types";
import { CASES, findCase } from "./data/cases";
import { LangContext } from "./lib/i18n";
import { newId, parseStore, type SavedConfig, type Setup } from "./lib/configs";
import { DEFAULT_SETTINGS, type Settings } from "./lib/settings";
import { loadStore, saveStore } from "./lib/storage";
import { canCheckForUpdates, checkForUpdate, type AvailableUpdate } from "./lib/updates";
import { UpdateBanner } from "./components/UpdateBanner";
import { Sidebar } from "./components/Sidebar";
import { SimulatorScreen } from "./screens/SimulatorScreen";
import { SavedScreen } from "./screens/SavedScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { AboutScreen } from "./screens/OtherScreens";

/** Language from older versions, which kept it in localStorage. */
function legacyLang(): Settings["lang"] {
  try {
    return localStorage.getItem("lang") === "sr" ? "sr" : "en";
  } catch {
    return "en";
  }
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("simulator");
  const [caseId, setCaseId] = useState(CASES[0].id);

  // Saved data. `loaded` stops us from overwriting the file before it was read.
  const [configs, setConfigs] = useState<SavedConfig[]>([]);
  const [settings, setSettings] = useState<Settings>({ ...DEFAULT_SETTINGS, lang: legacyLang() });
  const [loaded, setLoaded] = useState(false);

  // A loaded configuration to start the simulator from, and a counter that
  // remounts the simulator so it picks it up.
  const [initial, setInitial] = useState<Setup | null>(null);
  const [simKey, setSimKey] = useState(0);

  const [update, setUpdate] = useState<AvailableUpdate | null>(null);
  const [startupCheckDone, setStartupCheckDone] = useState(false);

  useEffect(() => {
    loadStore()
      .then((text) => {
        const data = parseStore(text);
        setConfigs(data.configs);
        if (data.settings) setSettings(data.settings);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  // Save shortly after the last change, so dragging a slider doesn't write the file dozens of times.
  useEffect(() => {
    if (!loaded) return;
    const timer = setTimeout(() => {
      saveStore(JSON.stringify({ version: 1, configs, settings }, null, 2)).catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [configs, settings, loaded]);

  // Check for updates once, after the saved settings are known.
  useEffect(() => {
    if (!loaded || startupCheckDone) return;
    setStartupCheckDone(true);
    if (settings.checkUpdates) checkForUpdate().then(setUpdate, () => {});
  }, [loaded, startupCheckDone, settings.checkUpdates]);

  async function checkNow(): Promise<"latest" | "available" | "failed" | "unavailable"> {
    if (!canCheckForUpdates()) return "unavailable";
    try {
      const found = await checkForUpdate();
      setUpdate(found);
      return found ? "available" : "latest";
    } catch {
      return "failed";
    }
  }

  function updateSettings(patch: Partial<Settings>) {
    setSettings((prev) => ({ ...prev, ...patch }));
  }

  function selectCase(id: string) {
    setInitial(null);
    setCaseId(id);
    setSimKey((k) => k + 1);
  }

  function saveConfig(setup: Setup, name: string) {
    const config: SavedConfig = {
      ...setup,
      id: newId(),
      name,
      savedAt: new Date().toISOString(),
      colors: { intake: settings.intakeColor, exhaust: settings.exhaustColor },
    };
    setConfigs((prev) => [config, ...prev]);
  }

  function openConfig(config: SavedConfig) {
    // The airflow colors are part of a configuration, so opening one applies them.
    updateSettings({ intakeColor: config.colors.intake, exhaustColor: config.colors.exhaust });
    setInitial(config);
    setCaseId(config.caseId);
    setSimKey((k) => k + 1);
    setScreen("simulator");
  }

  // Airflow colors are also used by the CSS (fan outlines, legend dots).
  const style = { "--intake": settings.intakeColor, "--exhaust": settings.exhaustColor } as CSSProperties;

  return (
    <LangContext.Provider value={settings.lang}>
      <div className={"app" + (settings.uiAnimations ? "" : " no-anim")} style={style}>
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
              settings={settings}
              onAirAmount={(airAmount) => updateSettings({ airAmount })}
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
          {screen === "settings" && (
            <SettingsScreen
              settings={settings}
              onChange={updateSettings}
              onReset={() => setSettings(DEFAULT_SETTINGS)}
              onCheckNow={checkNow}
            />
          )}
          {screen === "about" && <AboutScreen />}
        </main>
        {update && <UpdateBanner key={update.version} update={update} onLater={() => setUpdate(null)} />}
      </div>
    </LangContext.Provider>
  );
}
