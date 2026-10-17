# HELIOGUARD · Space Weather Impact Alert System
## Client Handover & Deployment Guide

Welcome to the **HELIOGUARD Space Weather Impact Monitoring & Alert System**. This document provides quick, step-by-step instructions on how to run, inspect, and deploy the application.

---

## 1. Quick Start (Run Locally)

Because HELIOGUARD uses modern **JavaScript ES Modules** (`type="module"`) to load modular components (`app.js`, `globe.js`, `api.js`), modern web browsers require the files to be served through a local HTTP server rather than opened via double-clicking `file:///`.

Choose any of the simple options below:

### Option A: Using Python (Recommended — No setup required)
Most Windows, macOS, and Linux systems already have Python installed.

1. Open your terminal or Command Prompt in this project folder.
2. Run:
   ```bash
   python -m http.server 8000
   ```
   *(On some Windows systems, type `py -m http.server 8000`)*
3. Open your web browser and navigate to:
   ```
   http://localhost:8000
   ```

---

### Option B: Using VS Code (1-Click)
1. Open the project folder in **Visual Studio Code**.
2. If not already installed, install the popular **Live Server** extension (by Ritwick Dey).
3. Right-click on `index.html` in the file explorer and click **"Open with Live Server"**.
4. The dashboard will automatically launch in your default web browser.

---

### Option C: Using Node.js / npx
If you have Node.js installed:
```bash
npx serve .
```
or
```bash
npx http-server -p 8000
```
Then navigate to `http://localhost:8000` or the URL printed in the terminal.

---

## 2. System Overview & Core Features

HELIOGUARD is a real-time, zero-dependency client-side telemetry dashboard and 3D globe:

1. **3D Interactive Space Weather Globe**:
   - Built on Three.js WebGL with custom deep-space starfield and country boundary projections.
   - Dynamic auroral oval that expands toward mid-latitudes as the geomagnetic Kp index rises.
   - Clickable infrastructure nodes and live NOAA event pins.
   - Smooth camera fly-to targeting and marker selection.

2. **Live NOAA SWPC Data Ingestion**:
   - Fetches real-time space weather bulletins from the NOAA Space Weather Prediction Center (`services.swpc.noaa.gov`):
     - Planetary Kp Index (geomagnetic activity)
     - Solar Wind Speed ($km/s$) and Interplanetary Magnetic Field ($B_z$)
     - NOAA G-Scale (Geomagnetic), R-Scale (Radio Blackout), and S-Scale (Radiation Storm)
     - Real-time space weather warning, watch, and alert bulletins.
   - **Offline Resilient**: Bundled with a local cache (`data/`) so the dashboard displays full planetary telemetry even if the workstation is offline or NOAA endpoints undergo maintenance.

3. **Multi-Sector Vulnerability Matrix**:
   - Categorizes alerts and risks across three critical sectors:
     - ⚡ **Power Grid & High-Voltage Transmission** (Geomagnetically Induced Currents / GIC)
     - 📡 **Communications & GNSS Navigation** (HF radio blackouts, satellite navigation scintillation)
     - 🛰️ **Satellite Operations & Trans-Polar Aviation** (Internal electrostatic charging, solar radiation dose rates)

4. **System Diagnostics & Mitigation Inspector**:
   - The bottom console drawer provides actionable engineering protocols and failure modes for any selected infrastructure node or alert bulletin.

5. **Cross-Platform Mobile Push Alerts**:
   - Built-in notification dispatcher powered by the open-source `ntfy.sh` push pub-sub standard.
   - Send instant alerts to any Android, iOS device, or desktop browser with zero account registration or third-party API keys.
   - Configurable minimum severity triggers and QR code scanner for quick phone pairing.

---

## 3. Project File Structure

```
Space weather alert/
│
├── index.html               # Main dashboard UI & 3D HUD entry point
├── INSTRUCTIONS.md          # Client documentation & handover guide (this file)
├── README.md                # Project summary & documentation reference
│
├── css/
│   └── style.css            # Dark cosmic glassmorphism design system & responsive layout
│
├── js/
│   ├── app.js               # Application coordinator & event dispatcher
│   ├── globe.js             # 3D interactive WebGL Earth, starfield & auroral shaders
│   ├── api.js               # NOAA SWPC REST ingestion, alert parsers & cache management
│   ├── data.js              # Planetary infrastructure registry & simulation presets
│   ├── fallback_alerts.js   # Bundled official NOAA bulletin fallback dataset
│   ├── notifications.js     # Mobile push notification manager (ntfy.sh pub-sub)
│   └── audio.js             # Procedural Web Audio API sound generator (no audio files needed)
│
├── data/
│   ├── alerts_cache.json    # Local snapshot of official space weather alerts
│   ├── kp_index_cache.json  # Local snapshot of planetary K-index data
│   ├── scales_cache.json    # Local snapshot of NOAA G, R, and S scales
│   ├── solar_wind_mag_cache.json   # Local snapshot of Bz magnetic field readings
│   └── solar_wind_speed_cache.json # Local snapshot of solar wind velocities
│
└── vendor/
    ├── three.min.js         # Three.js 3D graphics library (locally bundled)
    ├── OrbitControls.js     # Smooth camera orbit and damping controls
    ├── world_countries.json # GeoJSON polygon data for world borders
    └── world_land.json      # GeoJSON landmass boundary data
```

---

## 4. Deploying to Production / Web Hosting

Because this project is entirely static (HTML, CSS, JavaScript, and JSON):
- **No build steps** (`npm run build`, Webpack, Vite, etc.) are needed.
- You can deploy the folder directly to any web host or CDN:
  - **GitHub Pages**: Push this directory to a repository and enable GitHub Pages in Settings.
  - **Netlify / Vercel**: Drag and drop the folder into the dashboard for an instant HTTPS URL.
  - **AWS S3 + CloudFront / Cloudflare Pages / Apache / Nginx**: Copy all files to the web root (`public_html` or `/var/www/html`).

---

## 5. Troubleshooting & FAQ

- **Why is the globe or scripts not loading when I double-click `index.html`?**  
  Modern browsers block JavaScript ES Modules (`import ... from ...`) when opened directly from the hard drive (`file:///` protocol) due to browser CORS security. Always serve the project through a local HTTP server (such as Python `python -m http.server` or VS Code Live Server as described in Section 1).

- **Are any external API keys or paid accounts required?**  
  No. All space weather data is ingested directly from the publicly accessible NOAA Space Weather Prediction Center (SWPC) open science endpoints. Mobile push notifications use the open-source `ntfy.sh` public protocol, which requires no account, API key, or credit card.

- **Can this be hosted on an offline or air-gapped intranet?**  
  Yes. All 3D libraries (`Three.js`), fonts, controls, and geographical GeoJSON data are bundled locally in the `/vendor` and `/data` directories. If the system loses connection to NOAA, it automatically falls back to the embedded telemetry cache without crashing.
