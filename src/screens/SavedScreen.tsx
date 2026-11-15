import { useState } from "react";
import { findCase } from "../data/cases";
import { exportFileName, parseImport, toExportJson, type SavedConfig } from "../lib/configs";
import { getFanStats } from "../lib/pressure";
import { exportTextFile, importTextFile } from "../lib/storage";
import { useT } from "../lib/i18n";

interface Props {
  configs: SavedConfig[];
  onOpen: (config: SavedConfig) => void;
  onDelete: (id: string) => void;
  onImport: (config: SavedConfig) => void;
}

type Message = { kind: "ok" | "error"; text: string } | null;

export function SavedScreen({ configs, onOpen, onDelete, onImport }: Props) {
  const t = useT();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [message, setMessage] = useState<Message>(null);

  async function handleImport() {
    try {
      const text = await importTextFile();
      if (text === null) return;
      const config = parseImport(text);
      if (!config) return setMessage({ kind: "error", text: t("importInvalid") });
      onImport(config);
      setMessage({ kind: "ok", text: t("importDone").replace("{name}", config.name) });
    } catch {
      setMessage({ kind: "error", text: t("importInvalid") });
    }
  }

  async function handleExport(config: SavedConfig) {
    try {
      const done = await exportTextFile(exportFileName(config), toExportJson(config));
      if (done) setMessage({ kind: "ok", text: t("exportDone") });
    } catch {
      setMessage({ kind: "error", text: t("exportFailed") });
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>{t("navSaved")}</h1>
        <button className="btn" onClick={handleImport}>
          {t("importJson")}
        </button>
      </div>

      {message && <p className={"message " + message.kind}>{message.text}</p>}

      {configs.length === 0 ? (
        <div className="empty">
          <h2>{t("savedEmptyTitle")}</h2>
          <p className="muted">{t("savedEmptyText")}</p>
        </div>
      ) : (
        <ul className="config-list">
          {configs.map((config) => {
            const stats = getFanStats(config.fans);
            return (
              <li key={config.id} className="config-card">
                <div className="config-info">
                  <div className="config-name">{config.name}</div>
                  <div className="muted">
                    {findCase(config.caseId).name} · {new Date(config.savedAt).toLocaleString()}
                  </div>
                  <div className="config-stats">
                    <span>
                      <i className="dot intake" /> {stats.intake} {t("intake")}
                    </span>
                    <span>
                      <i className="dot exhaust" /> {stats.exhaust} {t("exhaust")}
                    </span>
                    <span className={"pressure-" + stats.pressure}>
                      {t("pressure")} ≈ {t(stats.pressure)}
                    </span>
                  </div>
                </div>
                <div className="config-actions">
                  <button className="btn primary" onClick={() => onOpen(config)}>
                    {t("load")}
                  </button>
                  <button className="btn" onClick={() => handleExport(config)}>
                    {t("exportJson")}
                  </button>
                  {confirmId === config.id ? (
                    <button
                      className="btn danger"
                      onClick={() => {
                        onDelete(config.id);
                        setConfirmId(null);
                      }}
                      onBlur={() => setConfirmId(null)}
                      autoFocus
                    >
                      {t("confirmDelete")}
                    </button>
                  ) : (
                    <button className="btn" onClick={() => setConfirmId(config.id)}>
                      {t("delete")}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
