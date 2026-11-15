import type { CaseProfile, Screen } from "../types";
import { useT, type TKey } from "../lib/i18n";
import { Icon, type IconName } from "./Icon";

const NAV: { screen: Screen; label: TKey; icon: IconName }[] = [
  { screen: "simulator", label: "navSimulator", icon: "flow" },
  { screen: "saved", label: "navSaved", icon: "folder" },
  { screen: "settings", label: "navSettings", icon: "settings" },
  { screen: "about", label: "navAbout", icon: "info" },
];

interface Props {
  screen: Screen;
  onScreen: (screen: Screen) => void;
  cases: CaseProfile[];
  caseId: string;
  onCase: (id: string) => void;
}

export function Sidebar({ screen, onScreen, cases, caseId, onCase }: Props) {
  const t = useT();

  return (
    <aside className="sidebar">
      <div className="brand">
        <img src="/logo.svg" alt="" width={28} height={28} />
        <span>{t("appName")}</span>
      </div>

      <nav className="nav">
        {NAV.map((item) => (
          <button
            key={item.screen}
            className={"nav-item" + (screen === item.screen ? " active" : "")}
            onClick={() => onScreen(item.screen)}
          >
            <Icon name={item.icon} />
            {t(item.label)}
          </button>
        ))}
      </nav>

      {screen === "simulator" && (
        <div className="case-list">
          <div className="section-label">{t("cases")}</div>
          {cases.map((c) => (
            <button
              key={c.id}
              className={"case-item" + (c.id === caseId ? " active" : "")}
              onClick={() => onCase(c.id)}
            >
              <span className="case-name">{c.name.replace("GAMDIAS ", "")}</span>
              <span className="case-maker">{c.manufacturer}</span>
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}
