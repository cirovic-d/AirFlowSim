import { useT } from "../lib/i18n";
import { externalLinkProps } from "../lib/updates";

const REPO_URL = "https://github.com/cirovic-d/AirFlowSim";

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
                <a {...externalLinkProps(REPO_URL)}>
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
