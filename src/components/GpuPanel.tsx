import { useState } from "react";
import type { CaseProfile, CpuCooler, GpuConfig, GpuModel, GpuSize } from "../types";
import { GPU_MAX_LENGTH, GPU_MIN_LENGTH, GPU_PRESETS, getGpuFit, getGpuLength } from "../lib/components";
import { findGpu, gpuName, searchGpus } from "../data/gpus";
import { useT } from "../lib/i18n";
import { externalLinkProps } from "../lib/updates";
import { Segmented } from "./Segmented";
import { LoadSlider } from "./Controls";

interface Props {
  caseProfile: CaseProfile;
  gpu: GpuConfig;
  cooler: CpuCooler;
  onChange: (gpu: GpuConfig) => void;
  load: number;
  onLoad: (load: number) => void;
}

export function GpuPanel({ caseProfile, gpu, cooler, onChange, load, onLoad }: Props) {
  const t = useT();
  const [query, setQuery] = useState("");
  const model = findGpu(gpu.modelId);
  const fit = getGpuFit(caseProfile, gpu);
  const length = getGpuLength(gpu);
  const max = caseProfile.clearanceMm.gpuMaxLength;
  const presetLabel = (size: Exclude<GpuSize, "custom">) => `${t(size)} · ${GPU_PRESETS[size]}`;
  const results = searchGpus(query);

  function pick(g: GpuModel) {
    onChange({ ...gpu, modelId: g.id });
    setQuery("");
  }

  function manual() {
    // Keep the size of the picked card, so switching to manual doesn't jump.
    const { modelId: _, ...rest } = gpu;
    onChange(model ? { ...rest, size: "custom", customLength: Math.round(model.lengthMm), fans: model.fans >= 3 ? 3 : model.fans === 2 ? 2 : 1 } : rest);
  }

  return (
    <section>
      <h2>{t("gpuTitle")}</h2>

      <h3>{t("gpuModel")}</h3>
      {model && (
        <div className="gpu-picked">
          <div>
            <div className="gpu-picked-name">{gpuName(model)}</div>
            <div className="muted">{specLine(t, model)}</div>
          </div>
          <button className="btn small" onClick={manual}>
            {t("gpuManual")}
          </button>
        </div>
      )}
      <input
        className="search"
        type="search"
        placeholder={t("gpuSearch")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {(query || !model) && (
        <ul className="gpu-results">
          {results.length === 0 && <li className="note">{t("noResults")}</li>}
          {results.map((g) => (
            <li key={g.id}>
              <button className={"gpu-result" + (g.id === gpu.modelId ? " active" : "")} onClick={() => pick(g)}>
                <span className="gpu-result-name">
                  <i className={"vendor " + g.vendor.toLowerCase()} />
                  {gpuName(g)}
                </span>
                <span className={"gpu-result-len" + (max && g.lengthMm > max ? " too-long" : "")}>{g.lengthMm} mm</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!model && (
        <>
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
        </>
      )}

      <LoadSlider label={t("gpuLoad")} value={load} onChange={onLoad} />
      {model ? (
        <p className="note">
          {t("gpuPowerNote")
            .replace("{w}", String(model.powerW))
            .replace("{now}", String(Math.round((model.powerW * load) / 100)))}{" "}
          <a {...externalLinkProps(model.powerSource)}>{new URL(model.powerSource).hostname.replace("www.", "")}</a>
        </p>
      ) : (
        <p className="note">{t("gpuPowerUnknown")}</p>
      )}

      <div className={"fit-badge " + fit}>
        <span>{t("gpuFit")}</span>
        <strong>
          {t(fit)}
          {length !== null && ` · ${length} mm`}
        </strong>
      </div>
      <p className="note">{t("gpuCheckNote").replace("{max}", String(max))}</p>
      {cooler.type === "aio" && cooler.position === "front" && <p className="note">{t("frontRadNote")}</p>}
      {model && (
        <p className="note">
          {t("gpuSource")}{" "}
          {model.sources.map((url, i) => (
            <span key={url}>
              {i > 0 && ", "}
              <a {...externalLinkProps(url)}>{new URL(url).hostname.replace("www.", "")}</a>
            </span>
          ))}
        </p>
      )}
    </section>
  );
}

function specLine(t: ReturnType<typeof useT>, g: GpuModel) {
  return t("gpuSpecs")
    .replace("{len}", String(g.lengthMm))
    .replace("{fans}", String(g.fans))
    .replace("{thick}", String(g.thicknessMm));
}
