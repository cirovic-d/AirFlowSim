import { useEffect, useState } from "react";
import type { Screen } from "./types";
import { CASES, findCase } from "./data/cases";
import { LangContext, type Lang } from "./lib/i18n";
import { Sidebar } from "./components/Sidebar";
import { SimulatorScreen } from "./screens/SimulatorScreen";
import { AboutScreen, SavedScreen, SettingsScreen } from "./screens/OtherScreens";

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

  useEffect(() => {
    try {
      localStorage.setItem("lang", lang);
    } catch {
      // Storage unavailable: language just won't be remembered.
    }
  }, [lang]);

  return (
    <LangContext.Provider value={lang}>
      <div className="app">
        <Sidebar
          screen={screen}
          onScreen={setScreen}
          cases={CASES}
          caseId={caseId}
          onCase={setCaseId}
        />
        <main className="content">
          {screen === "simulator" && <SimulatorScreen key={caseId} caseProfile={findCase(caseId)} />}
          {screen === "saved" && <SavedScreen />}
          {screen === "settings" && <SettingsScreen lang={lang} onLang={setLang} />}
          {screen === "about" && <AboutScreen />}
        </main>
      </div>
    </LangContext.Provider>
  );
}
