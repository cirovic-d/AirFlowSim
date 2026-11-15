import { invoke, isTauri } from "@tauri-apps/api/core";

// Everything the app remembers between runs is one JSON document.
// In the desktop app it's a file (see src-tauri/src/lib.rs for where it lives).
// In a plain browser (development) it's kept in localStorage instead.

const BROWSER_KEY = "airflowsim-data";

export async function loadStore(): Promise<string> {
  if (isTauri()) return invoke<string>("load_store");
  try {
    return localStorage.getItem(BROWSER_KEY) ?? "";
  } catch {
    return "";
  }
}

export async function saveStore(content: string): Promise<void> {
  if (isTauri()) return invoke("save_store", { content });
  try {
    localStorage.setItem(BROWSER_KEY, content);
  } catch {
    // Storage unavailable: data lives only until the page closes.
  }
}

export async function getDataLocation(): Promise<string | null> {
  return isTauri() ? invoke<string>("data_location") : null;
}

/** Asks where to save, then writes the file. Returns false if the user cancelled. */
export async function exportTextFile(fileName: string, content: string): Promise<boolean> {
  if (isTauri()) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const path = await save({ defaultPath: fileName, filters: [{ name: "JSON", extensions: ["json"] }] });
    if (!path) return false;
    await invoke("write_text_file", { path, content });
    return true;
  }
  // Browser: trigger a normal download.
  const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}

/** Lets the user pick a JSON file and returns its text, or null if cancelled. */
export async function importTextFile(): Promise<string | null> {
  if (isTauri()) {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const path = await open({ multiple: false, filters: [{ name: "JSON", extensions: ["json"] }] });
    if (!path || Array.isArray(path)) return null;
    return invoke<string>("read_text_file", { path });
  }
  // Browser: hidden file input.
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      file.text().then(resolve, () => resolve(null));
    };
    input.click();
  });
}
