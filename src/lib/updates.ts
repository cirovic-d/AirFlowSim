import { invoke, isTauri } from "@tauri-apps/api/core";

export const RELEASES_URL = "https://github.com/cirovic-d/AirFlowSim/releases/latest";

export interface AvailableUpdate {
  version: string;
  /** Portable copies don't install updates, they link to the download page. */
  portable: boolean;
  /** Downloads and runs the installer. The installer closes the app when it starts. */
  install: (onProgress: (fraction: number | null) => void) => Promise<void>;
}

/** Null when the app is up to date, or when running outside the desktop app. */
export async function checkForUpdate(): Promise<AvailableUpdate | null> {
  if (!isTauri()) return null;
  const { check } = await import("@tauri-apps/plugin-updater");
  const [update, portable] = await Promise.all([check(), invoke<boolean>("is_portable")]);
  if (!update) return null;

  return {
    version: update.version,
    portable,
    install: async (onProgress) => {
      let total = 0;
      let done = 0;
      await update.downloadAndInstall((event) => {
        if (event.event === "Started") total = event.data.contentLength ?? 0;
        if (event.event === "Progress") {
          done += event.data.chunkLength;
          onProgress(total ? done / total : null);
        }
      });
    },
  };
}

export async function openReleasePage() {
  if (!isTauri()) {
    window.open(RELEASES_URL, "_blank");
    return;
  }
  const { openUrl } = await import("@tauri-apps/plugin-opener");
  await openUrl(RELEASES_URL);
}

export function canCheckForUpdates() {
  return isTauri();
}
