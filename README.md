# PC Airflow Simulator

Lightweight Windows app for visualizing airflow inside PC cases: pick a case, configure fans, CPU cooler and GPU, and watch the air move.

This is a visual simulation, not a CFD calculation, and it never controls real fans.

## Status

All 11 phases of the v1.0 spec implemented: case drawings, fans, CPU cooler, GPU fit check, animated airflow, pressure estimate, save/load, JSON export/import, settings, automatic updates, installer and portable builds.

## Download

Get the latest version from **[Releases](https://github.com/cirovic-d/AirFlowSim/releases/latest)**:

- `PC-Airflow-Simulator_x.y.z_x64-setup.exe` – installer (Start Menu shortcut, optional desktop shortcut, uninstaller). Installed copies update themselves.
- `PC-Airflow-Simulator_x.y.z_portable.exe` – portable, no installation. Keeps its data in an `AirflowSimData` folder next to the .exe.

Windows may show a SmartScreen warning because the app isn't code-signed: click **More info → Run anyway**.

## Releasing

Bump the version in `package.json`, `src-tauri/tauri.conf.json` and `src-tauri/Cargo.toml`, then push to `main`. If that version has no release yet, GitHub Actions builds, signs and publishes it.

## Development

Requires Node 22+ and Rust.

```bash
npm install
npm run dev          # UI in the browser
npm run tauri dev    # desktop app
npm run tauri build  # installer
```

## Supported cases

Case profiles live in `src/data/cases/` as JSON files with sources. Add a new case by adding a new JSON file.

- Antec C3 ARGB
- GAMDIAS AURA GC1, GC5, GC6, GC7
- NZXT H7 Flow (2024), S340 Elite

You can also describe your own case in the app (**+ Custom case** under the case list): dimensions, fan and radiator mounts, GPU/CPU clearance. Custom cases are saved with your configurations.

## Graphics card database

`src/data/gpus.json` holds 30 cards (AMD RX 5000–9000, NVIDIA RTX 3000–5000) with length, fan count and thickness, each with sources. Pick one in the GPU tab, or set the size by hand.

## Fan speed (RPM)

Every fan has a simulated speed (500–2000 RPM). It changes how strongly the fan moves air in the animation and its weight in the pressure estimate. It is visual only: the app never reads or controls real fans.
