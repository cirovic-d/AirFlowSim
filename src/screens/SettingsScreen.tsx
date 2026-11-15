import { useEffect, useState, type ReactNode } from "react";
import { DEFAULT_SETTINGS, type Density, type Settings } from "../lib/settings";
import { getDataLocation } from "../lib/storage";
import { useT } from "../lib/i18n";
import { Segmented } from "../components/Segmented";

interface Props {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onReset: () => void;
}

export function SettingsScreen({ settings, onChange, onReset }: Props) {
  const t = useT();
  const [dataLocation, setDataLocation] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

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
        <Row title={t("density")} hint={t("densityHint")}>
          <div className="seg-fixed">
            <Segmented<Density>
              value={settings.density}
              onChange={(density) => onChange({ density })}
              options={[
                { value: "low", label: t("low") },
                { value: "medium", label: t("medium") },
                { value: "high", label: t("high") },
              ]}
            />
          </div>
        </Row>
      </div>

      <h3>{t("updates")}</h3>
      <div className="card settings-card">
        <Row title={t("checkUpdates")} hint={t("checkUpdatesHint")}>
          <Toggle value={settings.checkUpdates} onChange={(checkUpdates) => onChange({ checkUpdates })} />
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
              disabled={JSON.stringify(settings) === JSON.stringify(DEFAULT_SETTINGS)}
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

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button role="switch" aria-checked={value} className={"toggle" + (value ? " on" : "")} onClick={() => onChange(!value)}>
      <span />
    </button>
  );
}

function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="color-picker">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
      <span className="color-swatch" style={{ background: value }} />
      <span className="color-hex">{value.toUpperCase()}</span>
    </label>
  );
}
