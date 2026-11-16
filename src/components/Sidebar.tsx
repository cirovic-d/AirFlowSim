import { useState } from "react";
import type { CaseProfile, Screen } from "../types";
import { useT, type TKey } from "../lib/i18n";
import { Icon, type IconName } from "./Icon";
import { isCustomCase, shortName } from "../data/cases";

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
  onNewCase: () => void;
  onEditCase: (id: string) => void;
}

export function Sidebar({ screen, onScreen, cases, caseId, onCase, onNewCase, onEditCase }: Props) {
  const t = useT();
  const [query, setQuery] = useState("");
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = cases.filter((c) => words.every((w) => `${c.name} ${c.manufacturer}`.toLowerCase().includes(w)));

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
          <input
            className="search case-search"
            type="search"
            placeholder={t("caseSearch")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {shown.length === 0 && <p className="note case-empty">{t("noResults")}</p>}
          {shown.map((c) => (
            <div key={c.id} className="case-row">
              <button className={"case-item" + (c.id === caseId ? " active" : "")} onClick={() => onCase(c.id)}>
                <span className="case-name">{shortName(c)}</span>
                <span className="case-maker">{isCustomCase(c) ? t("customTag") : c.manufacturer}</span>
              </button>
              {isCustomCase(c) && (
                <button className="case-edit" onClick={() => onEditCase(c.id)} title={t("editCase")} aria-label={t("editCase")}>
                  ✎
                </button>
              )}
            </div>
          ))}
          <button className="case-new" onClick={onNewCase}>
            + {t("newCustomCase")}
          </button>
        </div>
      )}
    </aside>
  );
}
