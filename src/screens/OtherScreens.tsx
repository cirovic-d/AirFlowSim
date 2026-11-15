import { useT, type Lang } from "../lib/i18n";

const REPO_URL = "https://github.com/cirovic-d/AirFlowSim";

export function SavedScreen() {
  const t = useT();
  return (
    <div className="page">
      <h1>{t("navSaved")}</h1>
      <div className="empty">
        <h2>{t("savedEmptyTitle")}</h2>
        <p className="muted">{t("savedEmptyText")}</p>
      </div>
    </div>
  );
}

export function SettingsScreen({ lang, onLang }: { lang: Lang; onLang: (l: Lang) => void }) {
  const t = useT();
  return (
    <div className="page">
      <h1>{t("navSettings")}</h1>
      <div className="card">
        <div className="setting">
          <div>
            <div className="setting-title">{t("language")}</div>
            <div className="muted">{t("languageHint")}</div>
          </div>
          <div className="segmented">
            <button className={lang === "en" ? "active" : ""} onClick={() => onLang("en")}>
              English
            </button>
            <button className={lang === "sr" ? "active" : ""} onClick={() => onLang("sr")}>
              Srpski
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AboutScreen() {
  const t = useT();
  return (
    <div className="page">
      <h1>{t("navAbout")}</h1>
      <div className="card about">
        <img src="/logo.svg" alt="" width={56} height={56} />
        <div>
          <div className="setting-title">PC Airflow Simulator</div>
          <p className="muted">{t("aboutText")}</p>
          <dl className="spec-list">
            <div className="spec-row">
              <dt>{t("version")}</dt>
              <dd>{__APP_VERSION__}</dd>
            </div>
            <div className="spec-row">
              <dt>{t("repository")}</dt>
              <dd>
                <a href={REPO_URL} target="_blank" rel="noreferrer">
                  cirovic-d/AirFlowSim
                </a>
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
