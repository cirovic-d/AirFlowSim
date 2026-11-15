import type { CaseProfile, CpuCooler, GpuConfig, GpuSize } from "../types";
import { GPU_MAX_LENGTH, GPU_MIN_LENGTH, GPU_PRESETS, getGpuFit, getGpuLength } from "../lib/components";
import { useT } from "../lib/i18n";
import { Segmented } from "./Segmented";

interface Props {
  caseProfile: CaseProfile;
  gpu: GpuConfig;
  cooler: CpuCooler;
  onChange: (gpu: GpuConfig) => void;
}

export function GpuPanel({ caseProfile, gpu, cooler, onChange }: Props) {
  const t = useT();
  const fit = getGpuFit(caseProfile, gpu);
  const length = getGpuLength(gpu);
  const presetLabel = (size: Exclude<GpuSize, "custom">) => `${t(size)} · ${GPU_PRESETS[size]}`;

  return (
    <section>
      <h2>{t("gpuTitle")}</h2>

      <h3>{t("gpuFans")}</h3>
      <Segmented
        value={String(gpu.fans) as "1" | "2" | "3"}
        onChange={(v) => onChange({ ...gpu, fans: Number(v) as GpuConfig["fans"] })}
        options={[
          { value: "1", label: "1" },
          { value: "2", label: "2" },
          { value: "3", label: "3" },
        ]}
      />

      <h3>{t("gpuSize")}</h3>
      <div className="size-grid">
        {(["small", "medium", "large"] as const).map((size) => (
          <button
            key={size}
            className={"size-btn" + (gpu.size === size ? " active" : "")}
            onClick={() => onChange({ ...gpu, size })}
          >
            {presetLabel(size)}
          </button>
        ))}
        <button
          className={"size-btn" + (gpu.size === "custom" ? " active" : "")}
          onClick={() => onChange({ ...gpu, size: "custom" })}
        >
          {t("custom")}
        </button>
      </div>

      {gpu.size === "custom" && (
        <label className="field">
          <span className="muted">{t("lengthMm")}</span>
          <input
            type="number"
            min={GPU_MIN_LENGTH}
            max={GPU_MAX_LENGTH}
            value={Number.isNaN(gpu.customLength) ? "" : gpu.customLength}
            onChange={(e) => onChange({ ...gpu, customLength: e.target.valueAsNumber })}
          />
          {length === null && <span className="field-error">{t("customRange")}</span>}
        </label>
      )}

      <div className={"fit-badge " + fit}>
        <span>{t("gpuFit")}</span>
        <strong>
          {t(fit)}
          {length !== null && ` · ${length} mm`}
        </strong>
      </div>
      <p className="note">{t("gpuCheckNote").replace("{max}", String(caseProfile.clearanceMm.gpuMaxLength))}</p>
      {cooler.type === "aio" && cooler.position === "front" && <p className="note">{t("frontRadNote")}</p>}
    </section>
  );
}
