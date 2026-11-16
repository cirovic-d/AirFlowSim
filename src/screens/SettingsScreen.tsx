import { useEffect, useState, type ReactNode } from "react";
import { AIR_AMOUNT_MIN, DEFAULT_SETTINGS, type Settings } from "../lib/settings";
import { getDataLocation } from "../lib/storage";
import { useT } from "../lib/i18n";
import { ColorPicker, Toggle } from "../components/Controls";

interface Props {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onReset: () => void;
  onCheckNow: () => Promise<"latest" | "available" | "failed" | "unavailable">;
}

export function SettingsScreen({ settings, onChange, onReset, onCheckNow }: Props) {
  const t = useT();
  const [dataLocation, setDataLocation] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [checkState, setCheckState] = useState<"idle" | "checking" | "latest" | "available" | "failed" | "unavailable">("idle");

  async function checkNow() {
    setCheckState("checking");
    setCheckState(await onCheckNow());
  }

  const checkText = {
    idle: `${t("version")} ${__APP_VERSION__}`,
    checking: t("checking"),
    latest: t("upToDate"),
    available: t("updateFound"),
    failed: t("updateCheckFailed"),
    unavailable: t("updatesUnavailable"),
  }[checkState];

  useEffect(() => {
    getDataLocation().then(setDataLocation, () => setDataLocation(null));
  }, []);

  return (
    <div className="page">
      <h1>{t("navSettings")}</h1>

      <h3>{t("general")}</h3>
      <div className="card settings-card">
        <Row title={t("language")} hint={t("languageHint")}>
          <div className="segmented">
            <button className={settings.lang === "en" ? "active" : ""} onClick={() => onChange({ lang: "en" })}>
              English
            </button>
            <button className={settings.lang === "sr" ? "active" : ""} onClick={() => onChange({ lang: "sr" })}>
              Srpski
            </button>
          </div>
        </Row>
        <Row title={t("uiAnimations")} hint={t("uiAnimationsHint")}>
          <Toggle value={settings.uiAnimations} onChange={(uiAnimations) => onChange({ uiAnimations })} />
        </Row>
      </div>

      <h3>{t("airflow")}</h3>
      <div className="card settings-card">
        <Row title={t("intakeColor")}>
          <ColorPicker value={settings.intakeColor} onChange={(intakeColor) => onChange({ intakeColor })} />
        </Row>
        <Row title={t("exhaustColor")}>
          <ColorPicker value={settings.exhaustColor} onChange={(exhaustColor) => onChange({ exhaustColor })} />
        </Row>
        <Row title={t("animationSpeed")} hint={t("animationSpeedHint")}>
          <div className="range-row">
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={settings.animationSpeed}
              onChange={(e) => onChange({ animationSpeed: e.target.valueAsNumber })}
            />
            <span className="speed-value">{settings.animationSpeed.toFixed(1)}×</span>
          </div>
        </Row>
        <Row title={t("airAmount")} hint={t("airAmountHint")}>
          <div className="range-row">
            <input
              type="range"
              min={AIR_AMOUNT_MIN}
              max="1"
              step="0.05"
              value={settings.airAmount}
              onChange={(e) => onChange({ airAmount: e.target.valueAsNumber })}
            />
            <span className="speed-value">{Math.round(settings.airAmount * 100)}%</span>
          </div>
        </Row>
      </div>

      <h3>{t("updates")}</h3>
      <div className="card settings-card">
        <Row title={t("checkUpdates")} hint={t("checkUpdatesHint")}>
          <Toggle value={settings.checkUpdates} onChange={(checkUpdates) => onChange({ checkUpdates })} />
        </Row>
        <Row title={t("checkNow")} hint={checkText}>
          <button className="btn" disabled={checkState === "checking"} onClick={checkNow}>
            {t("checkNow")}
          </button>
        </Row>
      </div>

      <h3>{t("data")}</h3>
      <div className="card settings-card">
        {dataLocation && (
          <Row title={t("dataLocation")} hint={dataLocation}>
            <span />
          </Row>
        )}
        <Row title={t("resetSettings")} hint={t("resetSettingsHint")}>
          {confirmReset ? (
            <button
              className="btn danger"
              autoFocus
              onBlur={() => setConfirmReset(false)}
              onClick={() => {
                onReset();
                setConfirmReset(false);
              }}
            >
              {t("confirmReset")}
            </button>
          ) : (
            <button
              className="btn"
              disabled={(Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]).every((k) => settings[k] === DEFAULT_SETTINGS[k])}
              onClick={() => setConfirmReset(true)}
            >
              {t("reset")}
            </button>
          )}
        </Row>
      </div>
    </div>
  );
}

function Row({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="setting">
      <div className="setting-text">
        <div className="setting-title">{title}</div>
        {hint && <div className="muted setting-hint">{hint}</div>}
      </div>
      {children}
    </div>
  );
}
