use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::Manager;

/// Makes saves run one at a time (they share the same temporary file).
static SAVE_LOCK: Mutex<()> = Mutex::new(());

fn exe_dir() -> Result<PathBuf, String> {
    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    Ok(exe.parent().ok_or("cannot find the app folder")?.to_path_buf())
}

/// True when the app was installed with the installer (not run as a portable .exe).
fn is_installed() -> bool {
    exe_dir().map(|d| d.join("uninstall.exe").exists()).unwrap_or(false)
}

/// Folder for saved configurations and settings.
///
/// The installer puts `uninstall.exe` next to the app. If it is there, the app
/// is installed and keeps user data in the usual AppData folder. Without it the
/// app runs portable and keeps user data in a folder next to the .exe.
/// Either way, user data is never mixed with the program files.
fn data_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let exe_dir = exe_dir()?;
    let dir = if is_installed() {
        app.path().app_data_dir().map_err(|e| e.to_string())?
    } else {
        exe_dir.join("AirflowSimData")
    };
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

/// Returns the saved data as JSON text, or an empty string on first start.
#[tauri::command]
fn load_store(app: tauri::AppHandle) -> Result<String, String> {
    let path = data_dir(&app)?.join("data.json");
    if !path.exists() {
        return Ok(String::new());
    }
    fs::read_to_string(path).map_err(|e| e.to_string())
}

/// Saves the data. Writes a temporary file first, so a crash can't leave a half-written file.
#[tauri::command]
fn save_store(app: tauri::AppHandle, content: String) -> Result<(), String> {
    let _guard = SAVE_LOCK.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
    let dir = data_dir(&app)?;
    let tmp = dir.join("data.json.tmp");
    fs::write(&tmp, content).map_err(|e| e.to_string())?;
    fs::rename(&tmp, dir.join("data.json")).map_err(|e| e.to_string())
}

/// Folder where user data lives, shown in Settings.
#[tauri::command]
fn data_location(app: tauri::AppHandle) -> Result<String, String> {
    Ok(data_dir(&app)?.to_string_lossy().into_owned())
}

/// Portable copies can't update themselves (the update is an installer),
/// so the app only offers a link to the download page.
#[tauri::command]
fn is_portable() -> bool {
    !is_installed()
}

/// Used by JSON export, with a path the user picked in a save dialog.
#[tauri::command]
fn write_text_file(path: String, content: String) -> Result<(), String> {
    fs::write(path, content).map_err(|e| e.to_string())
}

/// Used by JSON import, with a path the user picked in an open dialog.
#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    fs::read_to_string(path).map_err(|e| e.to_string())
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            load_store,
            save_store,
            data_location,
            is_portable,
            write_text_file,
            read_text_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running PC Airflow Simulator");
}
