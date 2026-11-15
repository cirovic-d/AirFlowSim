# PC Airflow Simulator

Lightweight Windows app for visualizing airflow inside PC cases: pick a case, configure fans, CPU cooler and GPU, and watch the air move.

This is a visual simulation, not a CFD calculation, and it never controls real fans.

## Status

Phases 1–6 of 11 done – app shell, case drawings, fans, CPU cooler, GPU fit check and animated airflow.

## Download

Every push to `main` builds the app on GitHub Actions. Open the latest run under **Actions → Build Windows** and download the `PC-Airflow-Simulator-windows` artifact. It contains:

- `PC Airflow Simulator_x.y.z_x64-setup.exe` – installer
- `PC-Airflow-Simulator-portable.exe` – portable version

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
