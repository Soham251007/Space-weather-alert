/**
 * Space Weather API Connector & Parser
 * Fetches real-time space weather telemetry from NOAA Space Weather Prediction Center (SWPC)
 * without requiring any API keys. Includes offline caching fallback and intelligent parsing.
 */

import { INFRASTRUCTURE_REGISTRY, SCENARIO_PRESETS } from './data.js';
import { FALLBACK_RAW_ALERTS } from './fallback_alerts.js';

const NOAA_ENDPOINTS = {
  alerts: 'https://services.swpc.noaa.gov/products/alerts.json',
  kpIndex: 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json',
  solarWindSpeed: 'https://services.swpc.noaa.gov/products/summary/solar-wind-speed.json',
  solarWindMag: 'https://services.swpc.noaa.gov/products/summary/solar-wind-mag-field.json',
  scales: 'https://services.swpc.noaa.gov/products/noaa-scales.json'
};

const LOCAL_FALLBACKS = {
  alerts: 'data/alerts_cache.json',
  kpIndex: 'data/kp_index_cache.json',
  solarWindSpeed: 'data/solar_wind_speed_cache.json',
  solarWindMag: 'data/solar_wind_mag_cache.json',
  scales: 'data/scales_cache.json'
};

export class SpaceWeatherAPI {
  constructor() {
    this.currentScenario = SCENARIO_PRESETS[0]; // Live by default
    this.telemetry = {
      kp: 1.67,
      solarWindSpeed: 380,
      bz: -1.5,
      density: 5.2,
      scales: { G: 0, R: 0, S: 0 },
      overallStatus: 'status-nominal',
      statusLabel: 'NOMINAL / QUIET',
      lastUpdated: new Date()
    };
    // Initialize synchronously with official bundled NOAA alerts (no network delay, immune to CORS/offline)
    this.rawAlerts = FALLBACK_RAW_ALERTS;
    this.parsedAlerts = this.parseNoaaAlerts(FALLBACK_RAW_ALERTS);
    this.isFetching = false;
  }

  /**
   * Immediately load cached alerts for instant UI render on startup
   */
  async loadInitialCache() {
    if (this.parsedAlerts && this.parsedAlerts.length > 0) {
      return this.parsedAlerts;
    }
    this.rawAlerts = FALLBACK_RAW_ALERTS;
    this.parsedAlerts = this.parseNoaaAlerts(FALLBACK_RAW_ALERTS);
    return this.parsedAlerts;
  }

  /**
   * Safe fetch with timeout and fallback to local cache
   */
  async fetchWithFallback(url, fallbackUrl) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn(`[SpaceWeatherAPI] Primary fetch failed for ${url}: ${err.message}. Using fallback.`);
      try {
        const fallbackRes = await fetch(fallbackUrl);
        return await fallbackRes.json();
      } catch (fallbackErr) {
        console.error(`[SpaceWeatherAPI] Fallback also failed for ${fallbackUrl}:`, fallbackErr);
        return null;
      }
    }
  }

  /**
   * Load real-time data from NOAA SWPC
   */
  async loadLiveTelemetry() {
    this.isFetching = true;
    try {
      const [alertsData, kpData, speedData, magData, scalesData] = await Promise.all([
        this.fetchWithFallback(NOAA_ENDPOINTS.alerts, LOCAL_FALLBACKS.alerts),
        this.fetchWithFallback(NOAA_ENDPOINTS.kpIndex, LOCAL_FALLBACKS.kpIndex),
        this.fetchWithFallback(NOAA_ENDPOINTS.solarWindSpeed, LOCAL_FALLBACKS.solarWindSpeed),
        this.fetchWithFallback(NOAA_ENDPOINTS.solarWindMag, LOCAL_FALLBACKS.solarWindMag),
        this.fetchWithFallback(NOAA_ENDPOINTS.scales, LOCAL_FALLBACKS.scales)
      ]);

      // 1. Process Kp Index
      if (Array.isArray(kpData) && kpData.length > 0) {
        const latestKp = kpData[kpData.length - 1];
        this.telemetry.kp = parseFloat(latestKp.Kp) || 1.67;
      }

      // 2. Process Solar Wind Speed
      if (Array.isArray(speedData) && speedData.length > 0) {
        this.telemetry.solarWindSpeed = Math.round(speedData[0].proton_speed) || 380;
      }

      // 3. Process Solar Wind Magnetic Field (Bz)
      if (Array.isArray(magData) && magData.length > 0) {
        this.telemetry.bz = parseFloat(magData[0].bz_gsm) || 0.0;
      }

      // 4. Process NOAA Scales (G, R, S)
      if (scalesData && typeof scalesData === 'object') {
        const currentScale = scalesData['0'] || scalesData[0] || {};
        this.telemetry.scales = {
          G: parseInt(currentScale?.G?.Scale || 0, 10),
          R: parseInt(currentScale?.R?.Scale || 0, 10),
          S: parseInt(currentScale?.S?.Scale || 0, 10)
        };
      }

      // Derive Overall Status
      this.evaluateOverallStatus();

      // 5. Parse Alerts
      if (Array.isArray(alertsData) && alertsData.length > 0) {
        this.rawAlerts = alertsData;
        this.parsedAlerts = this.parseNoaaAlerts(alertsData);
      } else {
        // Fallback or preserve active alerts if network returned empty or null
        if (!this.parsedAlerts || this.parsedAlerts.length === 0) {
          this.rawAlerts = FALLBACK_RAW_ALERTS;
          this.parsedAlerts = this.parseNoaaAlerts(FALLBACK_RAW_ALERTS);
        }
      }

      this.telemetry.lastUpdated = new Date();
      return {
        telemetry: this.telemetry,
        alerts: this.parsedAlerts
      };
    } catch (err) {
      console.error('[SpaceWeatherAPI] Critical error loading telemetry:', err);
      if (!this.parsedAlerts || this.parsedAlerts.length === 0) {
        this.rawAlerts = FALLBACK_RAW_ALERTS;
        this.parsedAlerts = this.parseNoaaAlerts(FALLBACK_RAW_ALERTS);
      }
      return {
        telemetry: this.telemetry,
        alerts: this.parsedAlerts
      };
    } finally {
      this.isFetching = false;
    }
  }

  /**
   * Evaluate the overall planetary threat status
   */
  evaluateOverallStatus() {
    const kp = this.telemetry.kp;
    const g = this.telemetry.scales.G;
    const r = this.telemetry.scales.R;
    const s = this.telemetry.scales.S;
    const bz = this.telemetry.bz;

    if (g >= 5 || kp >= 8.5) {
      this.telemetry.overallStatus = 'status-critical';
      this.telemetry.statusLabel = 'EXTREME G5 STORM';
    } else if (g >= 4 || kp >= 7.5 || bz < -15) {
      this.telemetry.overallStatus = 'status-severe';
      this.telemetry.statusLabel = 'SEVERE G4 STORM';
    } else if (g >= 3 || kp >= 6 || r >= 3 || s >= 3) {
      this.telemetry.overallStatus = 'status-strong';
      this.telemetry.statusLabel = 'STRONG SPACE WEATHER';
    } else if (g >= 1 || kp >= 4 || r >= 1 || s >= 1) {
      this.telemetry.overallStatus = 'status-moderate';
      this.telemetry.statusLabel = 'ACTIVE / ELEVATED';
    } else {
      this.telemetry.overallStatus = 'status-nominal';
      this.telemetry.statusLabel = 'NOMINAL / QUIET';
    }
  }

  /**
   * Parse NOAA alert messages into structured alert objects
   */
  parseNoaaAlerts(rawAlerts) {
    const list = [];
    const seenTitles = new Set();

    for (const item of rawAlerts) {
      const msg = item.message || '';
      const lines = msg.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const productId = item.product_id || 'ALERT';
      const issueDate = item.issue_datetime || new Date().toISOString();

      // Find the main announcement line (usually line 3 or 4 after Header/Serial/Time)
      let title = '';
      for (const line of lines) {
        if (/^(ALERT|WARNING|WATCH|SUMMARY|CONTINUED ALERT):/i.test(line)) {
          title = line;
          break;
        }
      }
      if (!title && lines.length > 3) {
        title = lines[3];
      } else if (!title) {
        title = lines[0] || 'Space Weather Notification';
      }

      // Extract official message code and serial number from NOAA bulletin
      let messageCode = productId;
      let serialNumber = '';
      for (const line of lines) {
        if (line.includes('Message Code:')) messageCode = line.split(':')?.[1]?.trim() || messageCode;
        if (line.includes('Serial Number:')) serialNumber = line.split(':')?.[1]?.trim() || '';
      }

      // Deduplicate similar continuous alerts
      const cleanKey = title.substring(0, 45).toLowerCase();
      if (seenTitles.has(cleanKey)) continue;
      seenTitles.add(cleanKey);

      // Determine Category, Scale, and Severity
      const analysis = this.classifyAlert(title, msg, productId);

      // Map to an impacted geographic infrastructure target
      const target = this.matchImpactTarget(analysis.category, analysis.scale, title);

      const timing = this.parseTimingDetails(lines, issueDate, msg, title);
      const summaryText = this.extractSummary(lines, title);
      const plain = this.generatePlainEnglishSummary(analysis.category, analysis.scale, title, summaryText);

      list.push({
        id: `alert-${list.length + 1}`,
        rawProductId: productId,
        officialCode: messageCode,
        serialNumber: serialNumber ? `Serial #${serialNumber}` : '',
        authority: 'NOAA Space Weather Prediction Center (SWPC) · Boulder, CO',
        issue_datetime: issueDate,
        issuedAt: timing.issuedAt,
        expectedHit: timing.expectedHit,
        title: title,
        plainTitle: plain.plainTitle,
        summary: summaryText,
        whatIsHappening: plain.whatIsHappening,
        whatToExpect: plain.whatToExpect,
        affectedAreas: target ? `${target.name}, ${target.region}` : plain.affectedAreas,
        category: analysis.category,
        severity: analysis.severity,
        scale: analysis.scale,
        impactDetails: analysis.impactDetails,
        target: target,
        rawMessage: msg
      });

      if (list.length >= 25) break; // Keep top 25 relevant unique alerts
    }

    return list;
  }

  /**
   * Classify an alert into:
   * - power_grid
   * - communication_navigation
   * - satellite_aviation
   * - general_storm
   */
  classifyAlert(title, msg, productId) {
    const fullText = (title + ' ' + msg).toLowerCase();

    // 1. POWER GRID & GEOMAGNETIC INDUCED CURRENTS (GIC)
    if (
      fullText.includes('geomagnetic storm') ||
      fullText.includes('k-index') ||
      fullText.includes('induced current') ||
      fullText.includes('power grid') ||
      fullText.includes('voltage control') ||
      productId.startsWith('K0') ||
      productId.startsWith('A')
    ) {
      let scale = 'G1';
      let severity = 'moderate';
      if (fullText.includes('g5') || fullText.includes('k-index of 9')) {
        scale = 'G5'; severity = 'critical';
      } else if (fullText.includes('g4') || fullText.includes('k-index of 8')) {
        scale = 'G4'; severity = 'critical';
      } else if (fullText.includes('g3') || fullText.includes('k-index of 7')) {
        scale = 'G3'; severity = 'high';
      } else if (fullText.includes('g2') || fullText.includes('k-index of 6')) {
        scale = 'G2'; severity = 'moderate';
      } else if (fullText.includes('k-index of 5') || fullText.includes('k-index of 4')) {
        scale = 'G1'; severity = 'moderate';
      }

      return {
        category: 'power_grid',
        scale,
        severity,
        impactDetails: {
          hazard: 'Geomagnetically Induced Current (GIC) surge',
          atRisk: 'High-latitude EHV bulk transmission lines and step-up transformers',
          mitigation: 'Implement neutral grounding series blocking capacitors and shed long-distance power transfers.'
        }
      };
    }

    // 2. SATELLITE OPERATIONS & AVIATION RADIATION
    if (
      fullText.includes('electron 2mev') ||
      fullText.includes('proton flux') ||
      fullText.includes('radiation storm') ||
      fullText.includes('spacecraft') ||
      fullText.includes('satellite') ||
      fullText.includes('thermospheric') ||
      fullText.includes('single event upset') ||
      productId.startsWith('EF') ||
      productId.startsWith('P1') ||
      productId.startsWith('P2')
    ) {
      let scale = 'S1';
      let severity = 'moderate';
      if (fullText.includes('s5') || fullText.includes('exceeded 100,000pfu')) {
        scale = 'S5'; severity = 'critical';
      } else if (fullText.includes('s4') || fullText.includes('exceeded 10,000pfu')) {
        scale = 'S4'; severity = 'critical';
      } else if (fullText.includes('s3') || fullText.includes('exceeded 1,000pfu')) {
        scale = 'S3'; severity = 'high';
      } else if (fullText.includes('s2') || fullText.includes('electron 2mev')) {
        scale = 'S2'; severity = 'moderate';
      }

      return {
        category: 'satellite_aviation',
        scale,
        severity,
        impactDetails: {
          hazard: 'Spacecraft internal dielectric charging & polar flight radiation dosage',
          atRisk: 'LEO/GEO satellites, polar commercial flights, high-altitude avionics',
          mitigation: 'Command satellites into low-drag orientation; divert polar flights away from 75°N Arctic routes.'
        }
      };
    }

    // 3. COMMUNICATIONS & NAVIGATION (HF / GNSS)
    if (
      fullText.includes('radio blackout') ||
      fullText.includes('radio emission') ||
      fullText.includes('radio burst') ||
      fullText.includes('pca') ||
      fullText.includes('scintillation') ||
      fullText.includes('x-ray flux') ||
      productId.startsWith('TII') ||
      productId.startsWith('TIV') ||
      productId.startsWith('X') ||
      productId.startsWith('R')
    ) {
      let scale = 'R1';
      let severity = 'moderate';
      if (fullText.includes('r5') || fullText.includes('extreme radio blackout')) {
        scale = 'R5'; severity = 'critical';
      } else if (fullText.includes('r4') || fullText.includes('severe radio blackout')) {
        scale = 'R4'; severity = 'critical';
      } else if (fullText.includes('r3') || fullText.includes('strong radio blackout')) {
        scale = 'R3'; severity = 'high';
      } else if (fullText.includes('type iv') || fullText.includes('type ii')) {
        scale = 'R2'; severity = 'moderate';
      }

      return {
        category: 'communication_navigation',
        scale,
        severity,
        impactDetails: {
          hazard: 'Ionospheric absorption and GPS scintillation',
          atRisk: 'Trans-oceanic HF radio, maritime GNSS locks, aviation RNAV precision approaches',
          mitigation: 'Switch to polar SATCOM relays; enforce terrestrial VOR/ILS backups for aviation.'
        }
      };
    }

    // DEFAULT: GENERAL SPACE WEATHER
    return {
      category: 'power_grid',
      scale: 'G1',
      severity: 'moderate',
      impactDetails: {
        hazard: 'Minor geomagnetic field fluctuations',
        atRisk: 'High-latitude power infrastructure and sub-auroral HF communication links',
        mitigation: 'Continue automated telemetry monitoring.'
      }
    };
  }

  /**
   * Extract a concise readable summary from NOAA message lines
   */
  extractSummary(lines, title) {
    const summaryLines = [];
    let collecting = false;

    for (const line of lines) {
      if (line.startsWith('Potential Impacts:') || line.startsWith('Description:')) {
        collecting = true;
        summaryLines.push(line);
        continue;
      }
      if (collecting) {
        if (/^(NOAA Space Weather|For more information|Space Weather Message)/i.test(line)) {
          break;
        }
        summaryLines.push(line);
      }
    }

    if (summaryLines.length > 0) {
      return summaryLines.join(' ');
    }

    // Fallback: look for descriptive comments or thresholds
    for (const line of lines) {
      if (line !== title && (line.includes('Threshold') || line.includes('Comment:') || line.includes('Highest') || line.includes('Begin Time:'))) {
        summaryLines.push(line);
      }
    }

    return summaryLines.length > 0 ? summaryLines.join(' | ') : 'Active space weather disturbance monitored by NOAA SWPC sensors.';
  }

  /**
   * Parse exact official issue date/time and expected hit/impact window from NOAA messages
   */
  parseTimingDetails(lines, issueDatetimeStr, rawMsg, title) {
    let issueTimeStr = '';
    let validFromStr = '';
    let validToStr = '';
    let thresholdReachedStr = '';
    let beginTimeStr = '';
    let predictedDaysStr = '';

    for (const line of lines) {
      if (line.startsWith('Issue Time:')) issueTimeStr = line.replace('Issue Time:', '').trim();
      else if (line.startsWith('Valid From:')) validFromStr = line.replace('Valid From:', '').trim();
      else if (line.startsWith('Valid To:') || line.startsWith('Now Valid Until:')) {
        validToStr = line.replace(/^(Valid To:|Now Valid Until:)/, '').trim();
      }
      else if (line.startsWith('Threshold Reached:')) thresholdReachedStr = line.replace('Threshold Reached:', '').trim();
      else if (line.startsWith('Begin Time:')) beginTimeStr = line.replace('Begin Time:', '').trim();
      else if (line.includes('Predicted by Day:') || line.startsWith('Oct') || line.startsWith('Sep') || line.startsWith('May') || line.startsWith('Mar')) {
        if (line.includes('G1') || line.includes('G2') || line.includes('G3') || line.includes('G4') || line.includes('G5')) {
          predictedDaysStr = line.trim();
        }
      }
    }

    let issuedAt = issueTimeStr;
    if (!issuedAt && issueDatetimeStr) {
      try {
        const d = new Date(issueDatetimeStr.replace(' ', 'T') + 'Z');
        if (!isNaN(d.getTime())) {
          issuedAt = d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short', timeZone: 'UTC' });
        } else {
          issuedAt = issueDatetimeStr.substring(0, 16) + ' UTC';
        }
      } catch (e) {
        issuedAt = issueDatetimeStr;
      }
    }

    let expectedHit = '';
    const upper = (title + ' ' + (rawMsg || '')).toUpperCase();

    if (validFromStr && validToStr) {
      expectedHit = `${validFromStr} to ${validToStr} (Active Impact Window)`;
    } else if (validFromStr) {
      expectedHit = `From ${validFromStr} onward (Onset in progress)`;
    } else if (thresholdReachedStr) {
      expectedHit = `${thresholdReachedStr} (Threshold Crossed · Active Now)`;
    } else if (beginTimeStr) {
      expectedHit = `${beginTimeStr} (Impact Started · In Progress)`;
    } else if (predictedDaysStr) {
      expectedHit = `${predictedDaysStr} (Predicted Arrival)`;
    } else if (upper.includes('WATCH')) {
      expectedHit = `Within 24 to 48 hours of issue time (Inbound CME)`;
    } else if (upper.includes('WARNING')) {
      expectedHit = `Active Now / Next 1 to 6 Hours (High Alert Window)`;
    } else if (upper.includes('ALERT')) {
      expectedHit = `Active Now (Threshold breached)`;
    } else {
      expectedHit = `${issuedAt} (Live Telemetry Event)`;
    }

    return {
      issuedAt: issuedAt || 'Real-time NOAA SWPC Bulletin',
      expectedHit: expectedHit
    };
  }

  /**
   * Generates clean, human-friendly text descriptions without brackets or technical jargon
   */
  generatePlainEnglishSummary(category, scale, title, summary) {
    let plainTitle = title.replace(/^(ALERT|WARNING|WATCH|SUMMARY|CONTINUED ALERT):\s*/i, '').trim();
    let whatIsHappening = '';
    let whatToExpect = '';
    let affectedAreas = '';

    const t = (title + ' ' + summary).toLowerCase();

    if (t.includes('g5') || t.includes('k-index of 9')) {
      plainTitle = 'Extreme G5 Solar Superstorm Warning';
      whatIsHappening = 'An extreme G5 geomagnetic superstorm caused by multiple massive coronal mass ejections is striking Earth.';
      whatToExpect = 'Widespread high-voltage power grid voltage collapse risks, transformer overheating, satellite surface charging, and total HF radio blackouts.';
      affectedAreas = 'Global high-to-mid latitudes (North America down to 40°N, Scandinavia, UK, New Zealand).';
    } else if (t.includes('g4') || t.includes('k-index of 8')) {
      plainTitle = 'Severe G4 Solar Storm Warning';
      whatIsHappening = 'A severe G4 geomagnetic storm from a fast solar CME is impacting Earth’s magnetic shield.';
      whatToExpect = 'Possible power grid voltage regulation alarms, spacecraft orientation irregularities, and GPS navigation lock degradation.';
      affectedAreas = 'High-latitude power corridors (North America and Northern Europe poleward of 45°N).';
    } else if (t.includes('g3') || t.includes('k-index of 7')) {
      plainTitle = 'Strong G3 Solar Storm Alert';
      whatIsHappening = 'A strong G3 geomagnetic storm is driving intense electric currents into the upper atmosphere.';
      whatToExpect = 'Intermittent satellite tracking loss, GPS positional drift, and voltage alarms on long-distance transmission lines.';
      affectedAreas = 'Northern tier countries (Canada, Alaska, Scandinavia, Scotland).';
    } else if (t.includes('g1') || t.includes('g2') || t.includes('k-index of 4') || t.includes('k-index of 5')) {
      plainTitle = 'Moderate Geomagnetic Storm Watch (G1-G2)';
      whatIsHappening = 'A minor-to-moderate geomagnetic disturbance from an inbound solar wind stream or CME flank.';
      whatToExpect = 'Weak power grid fluctuations, minor satellite operations impact, and bright auroral displays in high latitudes.';
      affectedAreas = 'Poleward of 60° geomagnetic latitude (Northern Canada, Alaska, Northern Maine/Michigan).';
    } else if (t.includes('electron') || t.includes('2mev')) {
      plainTitle = 'Satellite Electron Radiation Surge Alert';
      whatIsHappening = 'A high-energy relativistic electron flux surge (>1,000 pfu) detected in geostationary orbit.';
      whatToExpect = 'Deep dielectric internal charging on commercial and weather satellites, risking electrostatic discharges and electronic anomalies.';
      affectedAreas = 'Geostationary and medium Earth orbit (GEO/MEO satellite constellations).';
    } else if (t.includes('proton') || t.includes('radiation') || t.includes('pca')) {
      plainTitle = 'Polar Cap Aviation Radiation & Blackout Alert';
      whatIsHappening = 'A solar proton radiation storm detected entering the polar ionosphere.';
      whatToExpect = 'Polar cap HF radio absorption blackout (PCA) and elevated radiation dose rates on polar flight routes requiring flight track diversions.';
      affectedAreas = 'Arctic trans-polar aviation routes (60°N to 90°N latitude).';
    } else if (t.includes('type iv') || t.includes('type ii') || t.includes('radio emission')) {
      plainTitle = 'Solar Flare Radio Shockwave Alert';
      whatIsHappening = 'Intense solar radio shockwave emissions observed following an energetic solar flare and coronal mass ejection.';
      whatToExpect = 'Sudden daylight HF radio signal fading and confirmation of a coronal mass ejection heading into space.';
      affectedAreas = 'Sunlit hemisphere and equatorial communications links.';
    } else {
      whatIsHappening = summary || 'Active space weather event detected by NOAA Space Weather Prediction Center sensors.';
      whatToExpect = 'Monitored fluctuations across planetary infrastructure systems.';
      affectedAreas = 'High-latitude corridors and monitored satellite orbits.';
    }

    return { plainTitle, whatIsHappening, whatToExpect, affectedAreas };
  }

  /**
   * Map category to a concrete geographic infrastructure hotspot
   */
  matchImpactTarget(category, scale, title) {
    const t = (title || '').toLowerCase();
    const hash = t.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);

    if (category === 'power_grid') {
      if (t.includes('nordic') || t.includes('scandinavia')) return INFRASTRUCTURE_REGISTRY.powerGrids[2]; // Nordic
      if (t.includes('quebec') || t.includes('canada')) return INFRASTRUCTURE_REGISTRY.powerGrids[0]; // Quebec
      if (t.includes('uk') || t.includes('scotland')) return INFRASTRUCTURE_REGISTRY.powerGrids[3]; // UK
      if (t.includes('pjm') || t.includes('atlantic')) return INFRASTRUCTURE_REGISTRY.powerGrids[1]; // PJM
      const grids = INFRASTRUCTURE_REGISTRY.powerGrids;
      return grids[hash % grids.length];
    }

    if (category === 'communication_navigation') {
      if (t.includes('polar') || t.includes('pca')) return INFRASTRUCTURE_REGISTRY.commsNav[0]; // Polar PCA
      if (t.includes('scintillation') || t.includes('gps')) return INFRASTRUCTURE_REGISTRY.commsNav[1]; // Singapore
      if (t.includes('atlantic')) return INFRASTRUCTURE_REGISTRY.commsNav[3]; // North Atlantic
      const comms = INFRASTRUCTURE_REGISTRY.commsNav;
      return comms[hash % comms.length];
    }

    if (category === 'satellite_aviation') {
      if (t.includes('flight') || t.includes('aviation')) return INFRASTRUCTURE_REGISTRY.satAviation[1]; // Cross-polar 1
      if (t.includes('drag') || t.includes('leo')) return INFRASTRUCTURE_REGISTRY.satAviation[3]; // LEO Drag
      if (t.includes('charging') || t.includes('geo')) return INFRASTRUCTURE_REGISTRY.satAviation[4]; // GEO Charging
      const sats = INFRASTRUCTURE_REGISTRY.satAviation;
      return sats[hash % sats.length];
    }

    return INFRASTRUCTURE_REGISTRY.powerGrids[0];
  }

  /**
   * Apply a scenario preset (Live or Simulation)
   */
  setScenario(presetId) {
    const preset = SCENARIO_PRESETS.find(p => p.id === presetId) || SCENARIO_PRESETS[0];
    this.currentScenario = preset;

    if (preset.isLive) {
      if (!this.parsedAlerts || this.parsedAlerts.length === 0) {
        this.rawAlerts = FALLBACK_RAW_ALERTS;
        this.parsedAlerts = this.parseNoaaAlerts(FALLBACK_RAW_ALERTS);
      }
      return this.loadLiveTelemetry();
    }

    // Apply simulated scenario parameters
    this.telemetry = {
      kp: preset.kp,
      solarWindSpeed: preset.solarWindSpeed,
      bz: preset.bz,
      density: preset.density,
      scales: {
        G: parseInt(preset.gScale.replace('G', ''), 10) || 0,
        R: parseInt(preset.rScale.replace('R', ''), 10) || 0,
        S: parseInt(preset.sScale.replace('S', ''), 10) || 0
      },
      overallStatus: preset.statusClass,
      statusLabel: preset.statusText,
      lastUpdated: new Date()
    };

    // Parse real archived NOAA bulletins
    this.parsedAlerts = (preset.officialAlerts || []).map((off, idx) => {
      let targetObj = null;
      if (off.targetId) {
        targetObj = [
          ...INFRASTRUCTURE_REGISTRY.powerGrids,
          ...INFRASTRUCTURE_REGISTRY.commsNav,
          ...INFRASTRUCTURE_REGISTRY.satAviation
        ].find(item => item.id === off.targetId);
      }
      if (!targetObj) {
        targetObj = this.matchImpactTarget(off.category, off.scale, off.title);
      }

      const plain = this.generatePlainEnglishSummary(off.category, off.scale, off.title, off.summary);

      // Clean timing derivation
      let expectedHitTime = off.expectedHit;
      if (!expectedHitTime) {
        if (off.title.includes('WARNING') || off.title.includes('ALERT')) {
          expectedHitTime = `${off.issue_datetime} UTC (Active CME Impact)`;
        } else {
          expectedHitTime = `${off.issue_datetime} UTC`;
        }
      }

      let issuedFormatted = off.issuedAt || `${off.issue_datetime} UTC`;

      return {
        id: off.id || `noaa-archive-${idx}`,
        rawProductId: off.product_id,
        officialCode: off.officialCode || off.product_id,
        serialNumber: off.serial ? `Serial #${off.serial}` : '',
        authority: off.authority || 'NOAA Space Weather Prediction Center (SWPC) · Boulder, CO',
        issue_datetime: off.issue_datetime,
        issuedAt: issuedFormatted,
        expectedHit: expectedHitTime,
        title: off.title,
        plainTitle: plain.plainTitle,
        summary: off.summary,
        whatIsHappening: plain.whatIsHappening,
        whatToExpect: plain.whatToExpect,
        affectedAreas: targetObj ? `${targetObj.name}, ${targetObj.region}` : plain.affectedAreas,
        category: off.category,
        severity: off.severity,
        scale: off.scale,
        impactDetails: {
          hazard: off.summary,
          atRisk: targetObj?.name || 'Critical Space Infrastructure',
          mitigation: targetObj?.mitigations?.[0] || 'Activate emergency contingency protocols.'
        },
        target: targetObj,
        rawMessage: `${off.title}\n${off.summary}\n${off.comment || ''}`
      };
    });

    return Promise.resolve({
      telemetry: this.telemetry,
      alerts: this.parsedAlerts
    });
  }
}
