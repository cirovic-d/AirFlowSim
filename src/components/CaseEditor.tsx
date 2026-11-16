import { useState } from "react";
import type { CaseProfile, MountPosition } from "../types";
import {
  CUSTOM_POSITIONS,
  DEFAULT_FORM,
  LIMITS,
  buildCustomCase,
  formFromCase,
  formValid,
  maxFans,
  numberOk,
  radiatorOptions,
  type CustomCaseForm,
  type LimitKey,
  type RadiatorChoice,
} from "../lib/customCase";
import { useT, type TKey } from "../lib/i18n";
import { Segmented } from "./Segmented";

interface Props {
  /** The custom case to edit, or null for a new one. */
  editing: CaseProfile | null;
  onSave: (c: CaseProfile) => void;
  onDelete: (id: string) => void;
  onCancel: () => void;
}

const NUMBERS: { key: LimitKey; label: TKey }[] = [
  { key: "depth", label: "depthMm" },
  { key: "width", label: "widthMm" },
  { key: "height", label: "heightMm" },
  { key: "gpuMax", label: "gpuMax" },
  { key: "cpuMax", label: "cpuMax" },
];

/** Modal for making or editing a "Custom case". */
export function CaseEditor({ editing, onSave, onDelete, onCancel }: Props) {
  const t = useT();
  const [form, setForm] = useState<CustomCaseForm>(() => (editing ? formFromCase(editing) : DEFAULT_FORM));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const valid = formValid(form);

  function setMount(p: MountPosition, count: number) {
    // Drop a radiator size or installed fans that no longer fit.
    const radiator = radiatorOptions(count).includes(form.radiators[p]) ? form.radiators[p] : 0;
    setForm({
      ...form,
      mounts: { ...form.mounts, [p]: count },
      installed: { ...form.installed, [p]: Math.min(form.installed[p], count) },
      radiators: { ...form.radiators, [p]: radiator },
    });
  }

  return (
    <div className="modal-backdrop" onMouseDown={onCancel}>
      <form
        className="modal wide"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === "Escape" && onCancel()}
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onSave(buildCustomCase(form, editing?.id));
        }}
      >
        <h2>{editing ? t("editCase") : t("newCustomCase")}</h2>

        <div className="editor-grid">
          <label className="field wide">
            <span className="muted">{t("caseName")}</span>
            <input autoFocus maxLength={60} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          {NUMBERS.map(({ key, label }) => (
            <label key={key} className="field">
              <span className="muted">{t(label)}</span>
              <input
                type="number"
                min={LIMITS[key][0]}
                max={LIMITS[key][1]}
                value={Number.isNaN(form[key]) ? "" : form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.valueAsNumber })}
              />
              {!numberOk(key, form[key]) && (
                <span className="field-error">
                  {LIMITS[key][0]}–{LIMITS[key][1]} mm
                </span>
              )}
            </label>
          ))}
        </div>

        <table className="mount-table">
          <thead>
            <tr>
              <th />
              <th>{t("fanMounts")}</th>
              <th>{t("installedFans")}</th>
              <th>{t("radiatorMax")}</th>
            </tr>
          </thead>
          <tbody>
            {CUSTOM_POSITIONS.map((p) => {
              // Fewer slots fit while the size is being typed in, so limit to what fits now.
              const limit = maxFans(p, numberOk("depth", form.depth) ? form.depth : 320, numberOk("height", form.height) ? form.height : 320);
              const count = Math.min(form.mounts[p], limit);
              return (
                <tr key={p}>
                  <td>{t(p)}</td>
                  <td>
                    <Segmented
                      value={String(count)}
                      onChange={(v) => setMount(p, Number(v))}
                      options={[0, 1, 2, 3].map((n) => ({ value: String(n), label: String(n), disabled: n > limit }))}
                    />
                  </td>
                  <td>
                    <Segmented
                      value={String(Math.min(form.installed[p], count))}
                      onChange={(v) => setForm({ ...form, installed: { ...form.installed, [p]: Number(v) } })}
                      options={[0, 1, 2, 3].map((n) => ({ value: String(n), label: String(n), disabled: n > count }))}
                    />
                  </td>
                  <td>
                    <Segmented
                      value={String(radiatorOptions(count).includes(form.radiators[p]) ? form.radiators[p] : 0)}
                      onChange={(v) => setForm({ ...form, radiators: { ...form.radiators, [p]: Number(v) as RadiatorChoice } })}
                      options={([0, 240, 360] as RadiatorChoice[]).map((size) => ({
                        value: String(size),
                        label: size ? `${size}` : t("none"),
                        disabled: !radiatorOptions(count).includes(size) || p === "side",
                      }))}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="editor-row">
          <label>
            <input type="checkbox" checked={form.shroud} onChange={(e) => setForm({ ...form, shroud: e.target.checked })} />
            {t("psuShroud")}
          </label>
          <span className="muted">{t("frontPanel")}</span>
          <Segmented
            value={form.frontPanel || "none"}
            onChange={(v) => setForm({ ...form, frontPanel: v === "none" ? "" : (v as "mesh" | "glass") })}
            options={[
              { value: "mesh", label: t("mesh") },
              { value: "glass", label: t("glass") },
              { value: "none", label: t("solid") },
            ]}
          />
        </div>
        <p className="note">{t("installedNote")}</p>

        <div className="modal-actions">
          {editing &&
            (confirmDelete ? (
              <button type="button" className="btn danger" onClick={() => onDelete(editing.id)} autoFocus onBlur={() => setConfirmDelete(false)}>
                {t("confirmDeleteCase")}
              </button>
            ) : (
              <button type="button" className="btn" onClick={() => setConfirmDelete(true)}>
                {t("delete")}
              </button>
            ))}
          <span className="spacer" />
          <button type="button" className="btn" onClick={onCancel}>
            {t("cancel")}
          </button>
          <button type="submit" className="btn primary" disabled={!valid}>
            {t("save")}
          </button>
        </div>
      </form>
    </div>
  );
}
