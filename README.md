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

- Antec C3 ARGB, NX260, NX410
- be quiet! Pure Base 500DX
- Cooler Master MasterBox Q300L, MasterBox TD500 Mesh
- Corsair 3000D Airflow, 4000D Airflow, 5000D Airflow
- DeepCool CC560, CH370, Matrexx 55 Mesh
- Fractal Design Meshify 2, North, Pop Air, Torrent
- GAMDIAS AURA GC1, GC5, GC6, GC7
- GameMax Forge MB
- Lian Li Lancool 207, Lancool 216, O11 Dynamic EVO, O11 Vision
- Montech Air 100 ARGB, Air 903 Base, Air 903 Max, X3 Mesh
- MSI MAG Forge 100R, MAG Forge M100R
- NZXT H5 Flow (2024), H6 Flow, H7 Flow (2024), H9 Flow (2025), H710, S340 Elite
- Phanteks Eclipse G360A, XT Pro Ultra
- Thermaltake Versa H18
- Zalman i3 Neo, S2

140/160/180 mm fans are drawn in 120 mm slots (the slot count is kept).

You can also describe your own case in the app (**+ Custom case** under the case list): dimensions, fan and radiator mounts, GPU/CPU clearance. Custom cases are saved with your configurations.

## Graphics card database

`src/data/gpus.json` holds 32 cards (AMD RX 5000–9000, NVIDIA RTX 3000–5000, incl. PowerColor Red Dragon RX 6800 and RTX 3070 Ti Founders Edition) with length, fan count, thickness and reference power, each with sources. Pick one in the GPU tab, or set the size by hand.

## Processors

`src/data/cpus.json` holds a small AMD list: Ryzen 5 3600, 3600X, 5600X, 7500F, 7600X and Ryzen 7 5700X, 5800X, 5800X3D, 7800X3D, 9800X3D (TDP and max temperature, with sources). Max power under full load is taken as TDP × 1.35 (AMD's PPT rule).

## Build tab and build check

The **Build** tab picks the motherboard size (Mini-ITX, Mini-DTX, Flex-ATX, Micro-ATX, ATX, E-ATX, SSI-CEB, SSI-EEB, XL-ATX) and the power supply (wattage, length). Each case lists the board sizes its maker supports; the board is drawn to its real size in 2D and 3D. The **Case** tab shows a build check: graphics card length, board size, tower cooler height (entered in the CPU tab), power supply length (when the maker publishes a limit) and wattage (recommended = (GPU + CPU max power + 100 W) × 1.25, rounded up to 50 W).

## Airflow score and temperatures

Pick a CPU and a graphics card from the list, set the load (0–100 %) of each and the room temperature. The bottom bar shows an airflow score (0–100) and approximate temperatures of the air in the case, the GPU and the CPU, each with a ± range. It's a simple heat balance (heat of the parts vs. air moved by the fans, reduced by mesh/glass/radiators), not a fluid simulation; the formulas are in `docs/DECISIONS.md`.

## Look and 3D view

The **Build** tab also sets the colors of the case, graphics card, motherboard and memory (any color), the number of RAM sticks (2 or 4) and RGB on the memory. It is visual only and saved with each configuration. Parts are drawn as a typical layout, without brand logos.

The **2D / 3D** switch above the drawing opens a rotatable 3D model (drag to rotate, scroll to zoom, optional auto-rotate). It's a general model built from the case's dimensions, fan slots and panel materials (glass, mesh or solid), with detailed parts: board with VRM fins, memory, the graphics card's fin stack and fans, tower fins and heat pipes, AIO pump and radiator, the power supply and cables. The airflow animation is shown only in 2D.

## Fan speed (RPM)

Every fan has a simulated speed (500–2000 RPM). It changes how strongly the fan moves air in the animation and its weight in the pressure estimate. It is visual only: the app never reads or controls real fans.
