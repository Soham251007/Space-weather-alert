# HELIOGUARD · Space Weather Impact Monitoring & Alert System

A real-time, 3D interactive planetary space weather intelligence dashboard. Visualizes solar wind telemetry, geomagnetic storm disturbances (G-scale), radio blackouts (R-scale), radiation storms (S-scale), auroral oval expansion, and power grid/infrastructure vulnerabilities using live feeds from the **NOAA Space Weather Prediction Center (SWPC)**.

---

## Quick Start Guide

For full instructions, deployment steps, and system architecture details, please refer to the [INSTRUCTIONS.md] file included in the root folder.

### Running Locally (Instant 1-Liner)

Using Python:
```bash
python -m http.server 8000
```
Then navigate to `http://localhost:8000` in any modern web browser.

Or open with **VS Code Live Server** by right-clicking `index.html` -> **"Open with Live Server"**.

---

## Key Features

- **3D Interactive WebGL Globe**: Custom Three.js planetary visualization with real-time auroral oval intensity scaling.
- **Official NOAA SWPC Telemetry**: Ingests live Kp index, solar wind speed ($km/s$), magnetic field orientation ($B_z$), and official storm alerts.
- **Multi-Sector Vulnerability Matrix**: Real-time impact gauges for high-voltage power grids, HF communications / GNSS, and orbital satellites.
- **Actionable System Inspector**: Sub-station diagnostics, risk classifications, and mitigation guidelines.
- **Cross-Platform Mobile Alerts**: Instant phone push notifications powered by open-source `ntfy.sh` (zero API keys or registration required).
- **Zero Build Dependencies**: Pure HTML5, CSS3, ES6 JavaScript, and WebGL. Offline resilient with bundled fallback cache.
