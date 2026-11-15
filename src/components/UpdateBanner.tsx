import { useState } from "react";
import { openReleasePage, type AvailableUpdate } from "../lib/updates";
import { useT } from "../lib/i18n";

interface Props {
  update: AvailableUpdate;
  onLater: () => void;
}

/**
 * Small card in the corner. Nothing is installed until the user clicks
 * "Install now", so an open configuration is never interrupted without asking.
 */
export function UpdateBanner({ update, onLater }: Props) {
  const t = useT();
  const [state, setState] = useState<"idle" | "downloading" | "error">("idle");
  const [progress, setProgress] = useState<number | null>(null);

  async function install() {
    setState("downloading");
    try {
      await update.install(setProgress);
    } catch {
      setState("error");
    }
  }

  return (
    <div className="update-banner" role="status">
      <div className="update-title">{t("updateAvailable").replace("{v}", update.version)}</div>

      {state === "idle" && (
        <>
          <p className="note">{t(update.portable ? "updatePortableNote" : "updateInstallNote")}</p>
          <div className="modal-actions">
            <button className="btn" onClick={onLater}>
              {t("later")}
            </button>
            {update.portable ? (
              <button className="btn primary" onClick={() => openReleasePage()}>
                {t("downloadPage")}
              </button>
            ) : (
              <button className="btn primary" onClick={install}>
                {t("installNow")}
              </button>
            )}
          </div>
        </>
      )}

      {state === "downloading" && (
        <>
          <p className="note">{t("updating")}</p>
          <div className="progress">
            <span style={{ width: progress === null ? "35%" : `${Math.round(progress * 100)}%` }} />
          </div>
        </>
      )}

      {state === "error" && (
        <>
          <p className="note field-error">{t("updateFailed")}</p>
          <div className="modal-actions">
            <button className="btn" onClick={onLater}>
              {t("later")}
            </button>
            <button className="btn primary" onClick={() => openReleasePage()}>
              {t("downloadPage")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
