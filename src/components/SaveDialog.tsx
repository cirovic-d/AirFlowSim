import { useState } from "react";
import { useT } from "../lib/i18n";

interface Props {
  defaultName: string;
  onSave: (name: string) => void;
  onCancel: () => void;
}

/** Small modal asking for a configuration name. */
export function SaveDialog({ defaultName, onSave, onCancel }: Props) {
  const t = useT();
  const [name, setName] = useState(defaultName);
  const trimmed = name.trim();

  return (
    <div className="modal-backdrop" onMouseDown={onCancel}>
      <form
        className="modal"
        onMouseDown={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (trimmed) onSave(trimmed);
        }}
        onKeyDown={(e) => e.key === "Escape" && onCancel()}
      >
        <h2>{t("saveConfig")}</h2>
        <label className="field">
          <span className="muted">{t("configName")}</span>
          <input autoFocus maxLength={80} value={name} onChange={(e) => setName(e.target.value)} onFocus={(e) => e.target.select()} />
        </label>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onCancel}>
            {t("cancel")}
          </button>
          <button type="submit" className="btn primary" disabled={!trimmed}>
            {t("save")}
          </button>
        </div>
      </form>
    </div>
  );
}
