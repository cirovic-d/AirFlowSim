# PC Airflow Simulator
## Complete Project Specification – Version 1.0

## 1. Project Overview

Develop a lightweight Windows desktop application called **PC Airflow Simulator**.

The application allows users to select a PC case, configure its fans, choose their airflow direction, configure CPU cooling and GPU dimensions, and visualize how air moves through the case.

The primary goal is to provide an attractive, interactive and easy-to-use airflow visualization tool without requiring advanced PC hardware knowledge.

The application should prioritize:
- Minimalist and premium visual design.
- Smooth, lightweight animations.
- Simple and intuitive controls.
- Accurate case layouts and component compatibility.
- Low CPU and GPU resource consumption.
- Easy configuration management.

This is primarily a visual airflow simulator, NOT a professional CFD (Computational Fluid Dynamics) simulation.

---

## 2. Design and User Interface

### Visual Style

Use a **Premium Hardware Tool** aesthetic.

Design characteristics:
- Dark graphite background.
- Clean, modern typography.
- Subtle accent colors.
- Minimal borders and unnecessary decorations.
- Smooth transitions and subtle animations.
- Professional hardware-monitoring software appearance.

Avoid:
- Excessive RGB effects.
- Overly complicated dashboards.
- Large unnecessary panels.
- Excessive visual effects.

### Layout

Use a left sidebar as the primary navigation.

The main content area should display the selected PC case and its airflow simulation.

A contextual right sidebar may appear when configuring individual components or fan settings.

Suggested layout:

- Left sidebar: Navigation and case selection.
- Center: Large case visualization.
- Right sidebar: Configuration and component settings.
- Bottom or secondary area: Airflow statistics and pressure estimation.

The interface should adapt to different Windows window sizes.

---

## 3. Main Navigation

Keep the navigation simple:

1. Airflow Simulator
2. Saved Configurations
3. Settings
4. About

The Airflow Simulator should be the default screen when opening the application.

---

## 4. Supported PC Cases

Initial supported cases:

- Antec C3 ARGB
- Aura GC1
- Aura GC5
- Aura GC6
- Aura GC7

Each case must have an individual configuration profile containing:

- Case dimensions.
- Visual 2D side-view representation.
- Fan mounting positions.
- Maximum number of fans per position.
- Supported fan sizes.
- Radiator mounting positions.
- Maximum supported radiator dimensions.
- GPU clearance.
- Factory-installed fans and their original positions.

IMPORTANT:

Research and verify actual specifications before implementing each case.

Use official manufacturer documentation whenever possible.

Do not assume that all cases have identical fan layouts or radiator compatibility.

Every case must have its own accurate mounting layout.

---

## 5. Fan Configuration

### Supported Fan Size

For the first version, support 120 mm fans only.

### Mounting Positions

Support all positions available on the selected case:

- Front
- Top
- Side
- Bottom
- Rear

Only display positions supported by the selected case.

### Factory Fans

When a user selects a case, automatically populate its original factory-installed fan configuration.

Users must be able to:
- Remove existing fans.
- Add additional fans.
- Change the direction of each fan.
- Restore the factory configuration.

### Fan Direction

Every fan must have two possible modes:

**Intake**
- Draws air into the case.
- Default visualization color: Cyan/Blue.

**Exhaust**
- Pushes air out of the case.
- Default visualization color: Orange/Red.

The direction should be changeable with a single click.

The animation and airflow visualization must update immediately.

---

## 6. GPU Configuration

Allow users to configure their graphics card.

### GPU Fan Count

Available options:
- 1 fan
- 2 fans
- 3 fans

### GPU Size

Provide two ways to configure GPU dimensions:

1. Presets:
   - Small
   - Medium
   - Large

2. Custom:
   - Manual GPU length entry in millimeters.

The selected GPU should be represented visually inside the case.

The visualization should reflect the selected GPU size.

### Compatibility

If reliable case and GPU dimensions are available, calculate whether the GPU fits inside the selected case.

Display:
- Compatible.
- Not compatible.
- Unknown / insufficient data.

Do not invent compatibility results.

GPU fan count and dimensions should be independently configurable.

---

## 7. CPU Cooling Configuration

Support three CPU cooling configurations.

### A. 360 mm AIO

- One 360 mm radiator.
- Three 120 mm fans.
- Fans must have individually configurable Intake/Exhaust directions.
- Radiator must be selectable only in positions supported by the selected case.

### B. Tower Air Cooler

- One CPU tower cooler.
- One 120 mm fan.
- Configurable airflow direction.

### C. AMD Wraith-style Stock Cooler

- Compact stock-cooler appearance.
- One fan.
- Visualize the requested forward-directed airflow.

The CPU cooler should be visible in the main case visualization.

---

## 8. Airflow Visualization

This is the most important feature of the application.

Use a lightweight 2D visualization system.

### Animation Style

Use animated particles with subtle trails, creating a smoke-like airflow appearance.

Avoid full volumetric smoke simulation or expensive real-time fluid calculations.

The animation should:
- Follow the selected fan directions.
- Show air entering and leaving the case.
- React to configuration changes immediately.
- Have smooth movement.
- Avoid excessive particle counts.
- Remain performant on average Windows PCs.

A Canvas 2D-based particle renderer or another lightweight rendering solution is preferred.

### Colors

Allow users to customize airflow colors.

Default:
- Intake: Cyan/Blue.
- Exhaust: Orange/Red.

### Animation Controls

Provide:
- Play/Pause.
- Restart animation.
- Optional animation speed adjustment.

The animation should never interfere with normal application interaction.

---

## 9. Air Pressure Estimation

Display an estimated case pressure classification:

- Positive Pressure
- Negative Pressure
- Neutral Pressure

Also display:
- Total Intake fans.
- Total Exhaust fans.
- Total installed fans.

The initial calculation can use fan counts and a shared fan speed setting.

Clearly indicate that this is an approximate airflow-pressure estimate.

Fan count alone does not accurately determine real pressure. Fan airflow ratings, RPM, filters, resistance and case restrictions also affect actual pressure.

Do not present the estimate as a precise physical measurement.

---

## 10. Fan Speed

Provide one global fan speed setting that affects all installed fans.

The speed should influence the visual airflow animation.

For example:
- Lower speed = slower particle movement.
- Higher speed = faster particle movement.

This is a visual simulation setting, not a real hardware RPM controller.

The application must NOT attempt to control physical PC fans.

---

## 11. Configuration Management

Implement:

### Save Configuration
Allow users to save their current setup.

### Load Configuration
Allow users to reopen previously saved setups.

### Delete Configuration
Allow users to remove saved setups.

### JSON Export
Allow users to export their configuration as a JSON file.

The exported configuration should contain:
- Case identifier.
- Installed fans and their positions.
- Fan directions.
- GPU configuration.
- CPU cooling configuration.
- Fan speed setting.
- Airflow color preferences.

Also consider JSON import so configurations can be transferred between installations.

No predefined presets are required for the first version.

No side-by-side configuration comparison is required.

---

## 12. Settings

Include:

- Intake color customization.
- Exhaust color customization.
- Animation speed.
- Particle density / visual quality.
- UI animation preferences.
- Theme preferences if applicable.
- Application update settings.
- Reset settings to defaults.

Use sensible default values.

---

## 13. Performance Requirements

Performance is important.

The application should:
- Use lightweight 2D rendering.
- Avoid unnecessary background calculations.
- Avoid expensive particle and smoke effects.
- Update only the necessary visual elements.
- Avoid excessive React component re-rendering if React is used.
- Pause or reduce animation work when the application is minimized or inactive, where practical.

Aim for smooth animation without consuming excessive CPU or GPU resources.

---

## 14. Windows Distribution

Provide two versions:

### Installer
A normal Windows installer with:
- Installation directory selection.
- Start Menu shortcut.
- Optional Desktop shortcut.
- Uninstaller.

### Portable
A portable distribution that can run without a traditional installation.

Keep user configurations and settings separate from application installation files.

---

## 15. Automatic Updates

Implement automatic update checking.

The application should:
- Check for newer versions.
- Notify the user when an update is available.
- Allow the user to install or postpone the update.
- Never interrupt an active configuration without permission.

Use a reliable update source.

---

## 16. Technical Recommendations

Suggested development stack:

- Tauri 2 for the Windows desktop application.
- React + TypeScript for the interface.
- Vite for development and bundling.
- Canvas 2D for airflow particle rendering.
- JSON for case profiles and configuration storage.

The final technology choice can be adjusted if another solution provides a substantially simpler or more reliable implementation.

The application should remain modular.

Recommended architecture:

- UI Layer
- Case Database
- Fan Configuration Manager
- GPU and CPU Component Manager
- Airflow Visualization Engine
- Pressure Estimation Module
- Configuration Storage
- Update Manager

Keep case-specific information in separate data profiles rather than hardcoding it throughout the interface.

This will make adding new cases easier in future versions.

---

## 17. Development Priorities

Implement in the following order:

1. Main application structure and UI.
2. Case selection and accurate case visualization.
3. Fan mounting positions and factory configurations.
4. Fan addition, removal and direction switching.
5. CPU cooler and GPU configuration.
6. Animated airflow visualization.
7. Pressure estimation.
8. Save/Load and JSON export/import.
9. Settings.
10. Automatic updates.
11. Installer and portable packaging.

Do not implement everything as one large component.

Keep the code clean, modular and maintainable.

---

## 18. Important Development Rules

- Do not invent case specifications.
- Verify factory fan configurations.
- Verify radiator and GPU compatibility.
- Keep the visual simulation lightweight.
- Do not implement real hardware fan control.
- Do not introduce unnecessary features.
- Prioritize a working, polished application over excessive complexity.
- Test each major module before moving to the next.
- Make sure all controls are functional, not decorative.

## Final Goal

Deliver a polished, lightweight Windows application that allows users to visually configure PC case airflow, experiment with fan placement and directions, and understand the approximate airflow behavior of their PC case.

The application should feel like a small, premium PC hardware utility rather than a complicated engineering program.