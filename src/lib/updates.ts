import { invoke, isTauri } from "@tauri-apps/api/core";

export const RELEASES_URL = "https://github.com/cirovic-d/AirFlowSim/releases/latest";

export interface AvailableUpdate {
  version: string;
  /** Portable copies don't install updates, they link to the download page. */
  portable: boolean;
  /** Downloads and runs the installer. The installer closes the app when it starts. */
  install: (onProgress: (fraction: number | null) => void) => Promise<void>;
}

/** Link that opens in the default browser (see openExternal). */
export function externalLinkProps(url: string) {
  return {
    href: url,
    onClick: (e: { preventDefault: () => void }) => {
      e.preventDefault();
      openExternal(url).catch(() => {});
    },
  };
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

/**
 * Opens a web page in the user's default browser. In the desktop app a plain
 * link would try to load the page inside the app window instead.
 */
export async function openExternal(url: string) {
  if (!isTauri()) {
    window.open(url, "_blank", "noopener");
    return;
  }
  const { openUrl } = await import("@tauri-apps/plugin-opener");
  await openUrl(url);
}

export function openReleasePage() {
  return openExternal(RELEASES_URL);
}

export function canCheckForUpdates() {
  return isTauri();
}
