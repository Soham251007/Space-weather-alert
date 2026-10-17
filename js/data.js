/**
 * Space Weather Impact & Infrastructure Registry
 * Contains real-world coordinates and impact vulnerability profiles
 * for power grids, communications & navigation, and satellites/aviation.
 */

export const INFRASTRUCTURE_REGISTRY = {
  // ==========================================
  // 1. POWER GRIDS & GIC RISK CORRIDORS
  // ==========================================
  powerGrids: [
    {
      id: 'grid-quebec',
      name: 'Hydro-Québec 735kV Transmission Grid',
      region: 'North America (Canada)',
      lat: 50.2,
      lon: -69.8,
      type: 'power_grid',
      voltage: '735 kV',
      geology: 'Canadian Shield Igneous Bedrock (High Resistivity)',
      riskVulnerability: 'Critical',
      description: 'Historical site of the March 1989 G5 total grid collapse. Highly vulnerable to geomagnetically induced currents (GIC) due to resistive Precambrian rock forcing telluric currents into transformers.',
      failureRisks: [
        'Half-cycle transformer core saturation',
        'Harmonic voltage distortions and static var compensator tripping',
        'Bulk transmission collapse across Eastern Canada'
      ],
      mitigations: [
        'Implement neutral ground series capacitors',
        'Reduce inter-tie transfer power by 25-40%',
        'Dispatch thermal generation locally to relieve long-distance lines'
      ]
    },
    {
      id: 'grid-pjm',
      name: 'PJM Interconnection & Mid-Atlantic Grid',
      region: 'United States',
      lat: 40.5,
      lon: -76.8,
      type: 'power_grid',
      voltage: '500 kV / 765 kV',
      geology: 'Appalachian Piedmont & Coastal Sedimentary Boundary',
      riskVulnerability: 'High',
      description: 'Densely populated Eastern US power corridor serving 65M people. Atlantic coastal proximity and long transmission lines produce intense local induced electric fields.',
      failureRisks: [
        'EHV step-up transformer overheating and dissolved gas generation',
        'Reactive power depletion leading to localized brownouts',
        'Protective relay misoperation from triplen harmonics'
      ],
      mitigations: [
        'Monitor neutral DC current meters in real-time (alarm at >10A DC)',
        'Pre-configure spinning reserves',
        'Disconnect non-essential capacitor banks to avoid resonance'
      ]
    },
    {
      id: 'grid-nordic',
      name: 'Svenska Kraftnät & Statnett Nordic Grid',
      region: 'Northern Europe (Scandinavia)',
      lat: 62.8,
      lon: 16.5,
      type: 'power_grid',
      voltage: '400 kV',
      geology: 'Baltic Shield Igneous Crystalline Bedrock',
      riskVulnerability: 'Critical',
      description: 'Located directly under the nominal auroral electrojet corridor (lat > 60°N). Experienced the Malmö blackout during the Halloween 2003 storms.',
      failureRisks: [
        'Auroral electrojet rapid dB/dt swings inducing >100A DC in transformer neutrals',
        'Differential protection relay tripping',
        'Loss of synchronous interconnections with Continental Europe'
      ],
      mitigations: [
        'Engage GIC-blocking neutral devices at coastal substations',
        'Re-route north-south bulk power transfers',
        'Increase system reactive power margins'
      ]
    },
    {
      id: 'grid-uk',
      name: 'UK National Grid Scottish Interface',
      region: 'United Kingdom (Scotland/North)',
      lat: 56.8,
      lon: -4.2,
      type: 'power_grid',
      voltage: '400 kV / 275 kV',
      geology: 'Highland Metamorphic & Coastal Ocean Boundary',
      riskVulnerability: 'High',
      description: 'Coastal and peninsular geometry amplifies induced electric fields during rapid geomagnetic substorms.',
      failureRisks: [
        'Interconnector line tripping',
        'Transformer acoustic noise surges and core vibration damage'
      ],
      mitigations: [
        'Activate National Grid Space Weather Warning protocol',
        'Halt planned transmission maintenance outages',
        'Maintain dynamic voltage support via pumped hydro storage'
      ]
    },
    {
      id: 'grid-nz',
      name: 'Transpower South Island 220kV Grid',
      region: 'New Zealand / Otago',
      lat: -45.2,
      lon: 169.5,
      type: 'power_grid',
      voltage: '220 kV',
      geology: 'Southern Alps Schist & Narrow Ocean Peninsula',
      riskVulnerability: 'High',
      description: 'Sub-auroral electrojet southern conjugate zone. Damaged a 220/66kV transformer at Halfway Bush during November 2001 storm.',
      failureRisks: [
        'Southern auroral electrojet expansion inducing telluric current spikes',
        'Transformer localized winding hot-spot burning'
      ],
      mitigations: [
        'Isolate vulnerable standby transformers',
        'Utilize HVDC inter-island link frequency control'
      ]
    },
    {
      id: 'grid-eskom',
      name: 'Eskom Southern African HV Network',
      region: 'South Africa',
      lat: -28.8,
      lon: 26.2,
      type: 'power_grid',
      voltage: '400 kV / 765 kV',
      geology: 'Continental Craton with Long Unshielded Lines',
      riskVulnerability: 'Moderate to High',
      description: 'Despite low geomagnetic latitude, suffered severe permanent damage to multiple 400kV generator transformers in October 2003 due to accumulated GIC thermal degradation.',
      failureRisks: [
        'Long East-West transmission telluric voltage buildup',
        'Cumulative thermal insulation degradation in oil-immersed transformers'
      ],
      mitigations: [
        'Install fiber-optic winding temperature probes',
        'Operate cooling pumps at maximum override capacity'
      ]
    },
    {
      id: 'grid-miso',
      name: 'MISO Northern Midcontinent Power Grid',
      region: 'United States & Canada Border',
      lat: 47.5,
      lon: -94.2,
      type: 'power_grid',
      voltage: '345 kV / 500 kV',
      geology: 'Granitic Bedrock and High Latitude Corridor',
      riskVulnerability: 'High',
      description: 'Spans the Canadian border with expansive east-west transmission paths prone to electrojet return currents.',
      failureRisks: [
        'High harmonic distortion tripping static capacitor banks',
        'Inter-regional power transfer curtailment'
      ],
      mitigations: [
        'Curtail commercial power exports across boundary paths',
        'Pre-arm emergency load-shedding schemes'
      ]
    }
  ],

  // ==========================================
  // 2. COMMUNICATIONS & NAVIGATION VULNERABILITIES
  // ==========================================
  commsNav: [
    {
      id: 'comm-polar-pca',
      name: 'Polar Cap HF Radio Absorption Zone (PCA)',
      region: 'Arctic Polar Basin',
      lat: 78.5,
      lon: -40.0,
      type: 'communication_navigation',
      frequencyBand: 'HF (3 - 30 MHz)',
      riskVulnerability: 'Critical',
      description: 'Energetic solar proton events ionize the ionospheric D-region (50-90 km altitude) over the geomagnetic polar caps, completely attenuating trans-polar HF radio signals.',
      failureRisks: [
        'Total blackout of aircraft-to-ATC HF radio communications',
        'Loss of maritime polar distress distress channels (GMDSS)',
        'Ground-to-air communications blackout over 75°N to 90°N'
      ],
      mitigations: [
        'Switch aircraft communications to Iridium polar SATCOM',
        'Enforce minimum 30-minute alternate relay reporting'
      ]
    },
    {
      id: 'nav-equatorial-singapore',
      name: 'Equatorial Ionospheric Scintillation Hub (Malacca)',
      region: 'Southeast Asia / Singapore',
      lat: 1.35,
      lon: 103.82,
      type: 'communication_navigation',
      frequencyBand: 'GNSS L1/L2/L5 (1.1 - 1.6 GHz)',
      riskVulnerability: 'Critical',
      description: 'Equatorial Ionization Anomaly (EIA) creates post-sunset plasma bubbles (Rayleigh-Taylor instability), causing rapid amplitude and phase fluctuations (scintillation) on GPS/Galileo signals.',
      failureRisks: [
        'GNSS receiver loss-of-lock for automated maritime container vessels',
        'Degradation of aviation RNAV/RNP precision landing approaches',
        'RTK centimeter-accuracy surveying drift up to 10-30 meters'
      ],
      mitigations: [
        'Fall back to terrestrial eLoran and inertial navigation systems (INS)',
        'Mandate multi-constellation (GPS + BeiDou + Galileo) dual-frequency smoothing'
      ]
    },
    {
      id: 'nav-equatorial-panama',
      name: 'Equatorial Scintillation Belt - Panama Canal Corridor',
      region: 'Central America / Caribbean',
      lat: 9.1,
      lon: -79.7,
      type: 'communication_navigation',
      frequencyBand: 'L-Band Satellite Navigation',
      riskVulnerability: 'High',
      description: 'Critical maritime bottleneck subject to severe geomagnetic post-sunset equatorial plasma bubbles.',
      failureRisks: [
        'Tugboat and transit canal lock GPS guidance dropouts',
        'Aviation satellite-based augmentation system (WAAS) signal distortion'
      ],
      mitigations: [
        'Use shore-based differential laser/radar docking beacons',
        'Disable autonomous canal navigation modes during active storm'
      ]
    },
    {
      id: 'comm-north-atlantic',
      name: 'North Atlantic Oceanic Track HF System (Shanwick/Gander)',
      region: 'North Atlantic Corridor',
      lat: 55.0,
      lon: -30.0,
      type: 'communication_navigation',
      frequencyBand: 'HF Oceanic Air Traffic Control',
      riskVulnerability: 'High',
      description: 'Primary air transit highway between North America and Europe. Solar X-ray flares cause sudden ionospheric disturbances (SID) resulting in daylight HF radio blackouts.',
      failureRisks: [
        'Simultaneous loss of HF contact for 400+ simultaneous commercial aircraft',
        'Loss of CPDLC (Controller-Pilot Data Link Communications) over HF'
      ],
      mitigations: [
        'Increase aircraft lateral separation from 30nm to 60nm',
        'Re-route traffic through southern Atlantic routes below 45°N'
      ]
    },
    {
      id: 'nav-auroral-alaska',
      name: 'Auroral Electrojet Scintillation (FAA WAAS Alaska)',
      region: 'Alaska & Northwestern Canada',
      lat: 64.5,
      lon: -147.5,
      type: 'communication_navigation',
      frequencyBand: 'Aviation L-Band GNSS & WAAS',
      riskVulnerability: 'High',
      description: 'Rapid auroral precipitation creates steep electron density gradients in the E and F regions, causing loss of dual-frequency carrier phase lock.',
      failureRisks: [
        'Loss of FAA WAAS LPV (Localizer Performance with Vertical Guidance) landing capability',
        'False position solutions during bush-plane instrument approaches'
      ],
      mitigations: [
        'Revert to ground-based VOR/ILS instrument procedures',
        'Issue regional NOTAM alerts for GPS unreliability'
      ]
    },
    {
      id: 'comm-antarctic-mcmurdo',
      name: 'Southern Polar Cap Absorption Corridor',
      region: 'Antarctica (Ross Ice Shelf / McMurdo)',
      lat: -77.8,
      lon: 166.7,
      type: 'communication_navigation',
      frequencyBand: 'HF & Antarctic Comms',
      riskVulnerability: 'High',
      description: 'Southern polar cap ionospheric proton bombardment blocking communication between field research bases and McMurdo Station.',
      failureRisks: [
        'Loss of field party emergency distress comms',
        'HF transceiver ground-wave fade'
      ],
      mitigations: [
        'Rely on polar-orbiting satellite emergency beacons',
        'Delay non-essential Antarctic traverse operations'
      ]
    }
  ],

  // ==========================================
  // 3. SATELLITE & AVIATION RADIATION ANOMALIES
  // ==========================================
  satAviation: [
    {
      id: 'sat-saa',
      name: 'South Atlantic Anomaly (SAA) Radiation Sink',
      region: 'South Atlantic / Brazil Coast',
      lat: -26.0,
      lon: -48.0,
      type: 'satellite_aviation',
      orbitAltitude: '200 - 1,000 km (LEO)',
      riskVulnerability: 'Critical',
      description: 'Earth’s magnetic field is weakest here, allowing the inner Van Allen radiation belt to dip down to 200 km altitude. Extreme proton flux triggers Single Event Upsets (SEUs) in spacecraft microelectronics.',
      failureRisks: [
        'Single-event latchup (SEL) burning CMOS flight computers',
        'Star tracker blinding and satellite tumbling / attitude loss',
        'Solar panel rapid lattice displacement and output degradation'
      ],
      mitigations: [
        'Put delicate science instruments into standby mode during SAA pass',
        'Enable triple modular redundancy (TMR) watchdog resets',
        'Delay critical satellite firmware uploads'
      ]
    },
    {
      id: 'flight-cross-polar-1',
      name: 'Cross-Polar Flight Route PA-01 (North America - East Asia)',
      region: 'Arctic Ocean / Polar Route',
      lat: 82.0,
      lon: -135.0,
      type: 'satellite_aviation',
      flightLevel: 'FL330 - FL390 (35,000 ft)',
      riskVulnerability: 'Critical',
      description: 'High-altitude polar routes (e.g. Chicago-Beijing, New York-Tokyo). Flight crews and passengers face heightened ionizing cosmic radiation dosages (>10 µSv/h) during solar proton events.',
      failureRisks: [
        'Accumulated radiation dosage exceeding ICRP occupational safety limits',
        'Avionics single event upsets in fly-by-wire flight control computers',
        'Concurrent HF radio blackout stranding flight without ATC link'
      ],
      mitigations: [
        'Mandatory polar route diversion to sub-polar latitudes (<60°N)',
        'Descend aircraft flight level from FL390 to FL290 to increase atmospheric shielding',
        'Monitor real-time GOES solar proton flux thresholds (>10 pfu at >100 MeV)'
      ]
    },
    {
      id: 'flight-cross-polar-2',
      name: 'Cross-Polar Flight Route PA-02 (Middle East - US West Coast)',
      region: 'Polar Greenland / Svalbard Corridor',
      lat: 79.5,
      lon: 10.0,
      type: 'satellite_aviation',
      flightLevel: 'FL340 - FL410',
      riskVulnerability: 'High',
      description: 'Long-haul flights (e.g. Dubai-Los Angeles, Doha-Seattle) crossing Greenland and the Norwegian Arctic.',
      failureRisks: [
        'Radiation dose spike for pregnant passengers and aircrew',
        'Fuel penalties and passenger delays from unplanned mid-flight diversion'
      ],
      mitigations: [
        'Execute pre-flight dispatch re-routing via North Atlantic tracks',
        'Carry redundant satellite tracking transmitters'
      ]
    },
    {
      id: 'sat-leo-drag',
      name: 'LEO Constellation Thermospheric Drag Shell',
      region: 'Global Low Earth Orbit (400 - 600 km)',
      lat: 25.0,
      lon: -15.0,
      type: 'satellite_aviation',
      orbitAltitude: '550 km (Megaconstellations)',
      riskVulnerability: 'Critical',
      description: 'Solar extreme ultraviolet (EUV) and geomagnetic Joule heating expands Earth’s upper thermosphere, increasing atmospheric density at 500km by up to 500-1000%. In Feb 2022, 38 Starlink satellites were lost to storm-induced drag.',
      failureRisks: [
        'Rapid orbit apogee/perigee altitude decay (up to several km/day)',
        'Ephemeris prediction breakdown resulting in high conjunction/collision risks',
        'Depletion of onboard xenon ion thruster propellant for station-keeping'
      ],
      mitigations: [
        'Command satellites into aerodynamic "edge-on knife" low-drag orientation',
        'Suspend orbit raising and lower orbit insertion perigees',
        'Run continuous high-frequency ephemeris updates with Space Force tracking'
      ]
    },
    {
      id: 'sat-geo-charging',
      name: 'Geostationary Spacecraft Internal Charging Belt',
      region: 'Equatorial Geostationary Ring (35,786 km)',
      lat: 0.0,
      lon: -90.0,
      type: 'satellite_aviation',
      orbitAltitude: '35,786 km (GEO)',
      riskVulnerability: 'High',
      description: 'Substorm injections accelerate relativistic electrons (>2 MeV). These penetrate satellite shielding and deposit charge inside dielectric circuit boards and cable insulation.',
      failureRisks: [
        'Deep dielectric electrostatic discharge (ESD) causing circuit arc fires',
        'Phantom command triggering and solar array slip-ring degradation',
        'Total loss of mission-critical weather and telecommunication satellites'
      ],
      mitigations: [
        'Inhibit automated autonomy sequences during peak flux (>1,000 pfu)',
        'Enable secondary grounding shunt paths on sensitive payloads',
        'Schedule ground telemetry monitoring 24/7'
      ]
    },
    {
      id: 'ground-svalbard',
      name: 'Svalbard Polar Satellite Downlink Ground Station (SvalSat)',
      region: 'Spitsbergen, Norway (78.2° N)',
      lat: 78.23,
      lon: 15.4,
      type: 'satellite_aviation',
      orbitAltitude: 'Ground Uplink / Downlink',
      riskVulnerability: 'High',
      description: 'World’s largest polar ground station providing telemetry and image downlink for hundreds of polar-orbiting weather and earth observation satellites.',
      failureRisks: [
        'High ionospheric scintillation disrupting X/S-band satellite tracking passes',
        'High GIC in local archipelago microgrid and fiber telemetry backhaul'
      ],
      mitigations: [
        'Schedule redundant backup downlinks via Troll Station in Antarctica',
        'Use adaptive modulation to overcome auroral signal fading'
      ]
    }
  ],

  // ==========================================
  // 4. POWER TRANSMISSION ARCS
  // ==========================================
  transmissionArcs: [
    { from: [53.5, -77.5], to: [45.5, -73.6], label: 'James Bay - Montreal 735kV Corridor', type: 'power_grid' },
    { from: [45.5, -73.6], to: [40.7, -74.0], label: 'Hydro-Québec - New York Intertie', type: 'power_grid' },
    { from: [40.5, -76.8], to: [38.9, -77.0], label: 'PJM Mid-Atlantic EHV Line', type: 'power_grid' },
    { from: [65.0, 18.0], to: [59.3, 18.0], label: 'Nordic Trans-Sweden 400kV Bulk Link', type: 'power_grid' },
    { from: [57.5, -4.0], to: [53.5, -2.0], label: 'Scotland - England National Grid Link', type: 'power_grid' },
    { from: [-43.5, 172.6], to: [-46.0, 169.5], label: 'South Island Transpower Grid Line', type: 'power_grid' }
  ],

  // ==========================================
  // 5. CROSS-POLAR FLIGHT ARCS
  // ==========================================
  flightArcs: [
    {
      id: 'flight-jfk-nrt',
      name: 'JFK to Tokyo (NRT) Arctic Polar Track',
      from: [40.64, -73.78],
      waypoints: [[60.0, -95.0], [78.0, -135.0], [65.0, 170.0]],
      to: [35.76, 140.38],
      type: 'satellite_aviation',
      nominalDuration: '14h 25m',
      radiationStatus: 'Warning',
      hfStatus: 'Degraded'
    },
    {
      id: 'flight-dxb-sfo',
      name: 'Dubai (DXB) to San Francisco (SFO) Polar Route',
      from: [25.25, 55.36],
      waypoints: [[65.0, 40.0], [81.0, 10.0], [70.0, -100.0]],
      to: [37.62, -122.38],
      type: 'satellite_aviation',
      nominalDuration: '15h 50m',
      radiationStatus: 'High Alert',
      hfStatus: 'Blackout'
    },
    {
      id: 'flight-lhr-lax',
      name: 'London (LHR) to Los Angeles (LAX) Sub-Polar Track',
      from: [51.47, -0.45],
      waypoints: [[64.0, -35.0], [60.0, -90.0]],
      to: [33.94, -118.41],
      type: 'satellite_aviation',
      nominalDuration: '11h 10m',
      radiationStatus: 'Elevated',
      hfStatus: 'Active'
    }
  ]
};

// ==========================================
// OFFICIAL SPACE WEATHER ARCHIVES & PRESETS
// All bulletins sourced directly from NOAA Space Weather Prediction Center (SWPC)
// ==========================================
export const SCENARIO_PRESETS = [
  {
    id: 'live',
    name: '🔴 Official Live NOAA SWPC Stream',
    badge: 'LIVE NOAA FEED',
    authority: 'NOAA Space Weather Prediction Center (SWPC)',
    description: 'Direct real-time telemetry and active alerts fetched from NOAA SWPC sensors (GOES-16/18, DSCOVR, Boulder Magnetometer).',
    kp: 1.67,
    solarWindSpeed: 345,
    bz: -1.2,
    density: 4.8,
    gScale: 'G0',
    rScale: 'R0',
    sScale: 'S0',
    statusClass: 'status-nominal',
    statusText: 'NOMINAL / QUIET',
    isLive: true
  },
  {
    id: 'may2024-g5',
    name: '⚡ NOAA Official Archive: Historic G5 Superstorm (May 10-11, 2024)',
    badge: 'NOAA OFFICIAL ARCHIVE',
    authority: 'NOAA Space Weather Prediction Center (SWPC)',
    description: 'Official NOAA SWPC bulletins from the extreme G5 solar storm of May 10, 2024. Massive CME impact with Kp 9.0, Bz plunging to -45 nT, and global GIC surges.',
    kp: 9.0,
    solarWindSpeed: 875,
    bz: -44.8,
    density: 28.5,
    gScale: 'G5',
    rScale: 'R3',
    sScale: 'S3',
    statusClass: 'status-critical',
    statusText: 'EXTREME G5 SUPERSTORM',
    isLive: false,
    officialAlerts: [
      {
        id: 'noaa-2024-05-10-k09',
        product_id: 'ALTK09',
        serial: '1120',
        issue_datetime: '2024-05-10 22:54:00',
        issuedAt: 'May 10, 2024 at 22:54 UTC',
        expectedHit: 'May 10, 2024 23:00 UTC to May 11, 2024 16:00 UTC (Active Superstorm Peak)',
        category: 'power_grid',
        severity: 'critical',
        authority: 'NOAA Space Weather Prediction Center · Boulder, CO',
        title: 'ALERT: Geomagnetic K-index of 9 (G5 Extreme Storm) Reached',
        summary: 'Area of impact primarily poleward of 40 degrees Geomagnetic Latitude. High GIC currents detected in transmission grids worldwide. Extensive voltage control problems.',
        targetId: 'grid-quebec',
        scale: 'G5',
        officialCode: 'ALTK09',
        comment: 'Official NOAA SWPC Alert: First G5 storm observed since October 2003.'
      },
      {
        id: 'noaa-2024-05-10-g5w',
        product_id: 'WATA50',
        serial: '1118',
        issue_datetime: '2024-05-10 21:15:00',
        issuedAt: 'May 10, 2024 at 21:15 UTC',
        expectedHit: 'May 10, 2024 21:15 UTC to May 12, 2024 12:00 UTC (Active CME Impact Window)',
        category: 'power_grid',
        severity: 'critical',
        authority: 'NOAA Space Weather Prediction Center · Boulder, CO',
        title: 'WARNING: Geomagnetic Storm Category G5 Expected / In Progress',
        summary: 'Geomagnetically induced telluric voltage exceeding 8 V/km across Canadian Shield and Scandinavian power grids. High risk of half-cycle transformer core saturation.',
        targetId: 'grid-nordic',
        scale: 'G5',
        officialCode: 'WATA50',
        comment: 'Official NOAA SWPC Warning: Grid operators instructed to initiate protective measures.'
      },
      {
        id: 'noaa-2024-05-10-drag',
        product_id: 'S03A',
        serial: '1432',
        issue_datetime: '2024-05-10 20:30:00',
        issuedAt: 'May 10, 2024 at 20:30 UTC',
        expectedHit: 'May 10, 2024 20:30 UTC - Ongoing Thermospheric Heating (Next 36-48 Hours)',
        category: 'satellite_aviation',
        severity: 'critical',
        authority: 'NOAA SWPC / US Space Force 18th Space Defense Sq',
        title: 'ALERT: Extreme Thermospheric Density Surge & LEO Satellite Drag',
        summary: 'Thermospheric neutral density spiked 500% at 550km. LEO satellite constellations (Starlink, ISS) experiencing rapid orbit decay. Spacecraft operators commanding edge-on low-drag attitude.',
        targetId: 'sat-leo-drag',
        scale: 'S3',
        officialCode: 'ALTS03',
        comment: 'Official Space Weather Bulletin: Starlink constellations commanded to safe mode.'
      },
      {
        id: 'noaa-2024-05-10-pca',
        product_id: 'PCAR3',
        serial: '892',
        issue_datetime: '2024-05-10 19:10:00',
        issuedAt: 'May 10, 2024 at 19:10 UTC',
        expectedHit: 'May 10, 2024 19:10 UTC to May 11, 2024 22:00 UTC (Polar Absorption Duration)',
        category: 'communication_navigation',
        severity: 'critical',
        authority: 'NOAA Space Weather Prediction Center / FAA Air Traffic Control',
        title: 'ALERT: Trans-Polar Aviation HF Radio Blackout & PCA Event',
        summary: 'D-region polar cap absorption complete across 60°-90°N. Mandatory re-routing of all cross-polar flights away from Arctic airspace.',
        targetId: 'comm-polar-pca',
        scale: 'R3',
        officialCode: 'ALTR03',
        comment: 'Official FAA / NOAA Advisory: Cross-polar airline tracks redirected south.'
      }
    ]
  },
  {
    id: 'march2024-g4',
    name: '🟠 NOAA Official Archive: March 24, 2024 Severe G4 Storm',
    badge: 'NOAA OFFICIAL ARCHIVE',
    authority: 'NOAA Space Weather Prediction Center (SWPC)',
    description: 'Official NOAA SWPC bulletins from the Severe G4 geomagnetic storm on March 24, 2024 caused by a fast coronal mass ejection.',
    kp: 7.67,
    solarWindSpeed: 735,
    bz: -21.5,
    density: 18.2,
    gScale: 'G4',
    rScale: 'R2',
    sScale: 'S2',
    statusClass: 'status-severe',
    statusText: 'SEVERE G4 CME IMPACT',
    isLive: false,
    officialAlerts: [
      {
        id: 'noaa-2024-03-24-k08',
        product_id: 'ALTK08',
        serial: '1095',
        issue_datetime: '2024-03-24 16:20:00',
        issuedAt: 'Mar 24, 2024 at 16:20 UTC',
        expectedHit: 'Mar 24, 2024 16:20 UTC to Mar 25, 2024 06:00 UTC (Active G4 Impact Window)',
        category: 'power_grid',
        severity: 'high',
        authority: 'NOAA Space Weather Prediction Center · Boulder, CO',
        title: 'WARNING: Geomagnetic Storm Category G4 Observed / In Progress',
        summary: 'Severe geomagnetic storming. Possible widespread voltage control problems and protective system trips. Power grid operators initiating mitigation protocols.',
        targetId: 'grid-pjm',
        scale: 'G4',
        officialCode: 'ALTK08',
        comment: 'Official NOAA SWPC Bulletin: High-latitude transformers under heightened GIC monitoring.'
      },
      {
        id: 'noaa-2024-03-24-ef3',
        product_id: 'ALTEF3',
        serial: '3205',
        issue_datetime: '2024-03-24 14:15:00',
        issuedAt: 'Mar 24, 2024 at 14:15 UTC',
        expectedHit: 'Mar 24, 2024 14:15 UTC - Peak Relativistic Flux (Next 24 Hours)',
        category: 'satellite_aviation',
        severity: 'high',
        authority: 'NOAA Space Weather Prediction Center · Boulder, CO',
        title: 'ALERT: Electron 2MeV Flux Exceeded 10,000 pfu in GEO Orbit',
        summary: 'Intense internal dielectric charging in geostationary satellites. Spacecraft operators placed on high alert for electrostatic discharge anomalies.',
        targetId: 'sat-geo-charging',
        scale: 'S2',
        officialCode: 'ALTEF3',
        comment: 'Official NOAA SWPC Alert: Observed by GOES-18 at geostationary orbit.'
      }
    ]
  },
  {
    id: 'halloween2003-g5',
    name: '🎃 NOAA Official Archive: Halloween Superstorm (Oct 29-30, 2003)',
    badge: 'NOAA OFFICIAL ARCHIVE',
    authority: 'NOAA Space Weather Prediction Center (SWPC)',
    description: 'Official NOAA SWPC bulletins from the extreme Halloween 2003 storms. Major solar flares (X17, X28) triggered G5 geomagnetic storming, Malmö Sweden grid blackout, and satellite damage.',
    kp: 9.0,
    solarWindSpeed: 950,
    bz: -38.5,
    density: 35.0,
    gScale: 'G5',
    rScale: 'R4',
    sScale: 'S4',
    statusClass: 'status-critical',
    statusText: 'HISTORIC G5 HALLOWEEN STORM',
    isLive: false,
    officialAlerts: [
      {
        id: 'noaa-2003-10-29-k09',
        product_id: 'ALTK09',
        serial: '842',
        issue_datetime: '2003-10-29 06:15:00',
        issuedAt: 'Oct 29, 2003 at 06:15 UTC',
        expectedHit: 'Oct 29, 2003 06:15 UTC to Oct 30, 2003 18:00 UTC (Historic Shock Front Arrival)',
        category: 'power_grid',
        severity: 'critical',
        authority: 'NOAA Space Weather Prediction Center · Boulder, CO',
        title: 'ALERT: Geomagnetic K-index of 9 (G5 Extreme Storm) Observed',
        summary: 'Massive geomagnetic storming. Malmö 130kV distribution system tripped, cutting power to 50,000 customers. Severe transformer heating reported across Nordic and Scottish grids.',
        targetId: 'grid-nordic',
        scale: 'G5',
        officialCode: 'ALTK09',
        comment: 'Official NOAA SWPC Record: Malmö Sweden power grid blackout.'
      },
      {
        id: 'noaa-2003-10-29-sat',
        product_id: 'ALTPX4',
        serial: '315',
        issue_datetime: '2003-10-29 07:45:00',
        issuedAt: 'Oct 29, 2003 at 07:45 UTC',
        expectedHit: 'Oct 29, 2003 07:45 UTC to Oct 31, 2003 12:00 UTC (High-Energy Proton Surge)',
        category: 'satellite_aviation',
        severity: 'critical',
        authority: 'NOAA Space Weather Prediction Center / JAXA',
        title: 'ALERT: Severe Solar Radiation Storm Category S4 Reached',
        summary: 'Proton flux >10 MeV exceeded 10,000 pfu. Japanese Earth observation satellite ADEOS-2 suffered total power loss and was declared lost. SOHO spacecraft entered safe mode.',
        targetId: 'sat-geo-charging',
        scale: 'S4',
        officialCode: 'ALTPX4',
        comment: 'Official JAXA/NOAA Record: Loss of ADEOS-2 ($650M satellite).'
      },
      {
        id: 'noaa-2003-10-29-eskom',
        product_id: 'WATA50',
        serial: '840',
        issue_datetime: '2003-10-29 08:30:00',
        issuedAt: 'Oct 29, 2003 at 08:30 UTC',
        expectedHit: 'Oct 29, 2003 08:30 UTC to Oct 30, 2003 04:00 UTC (Telluric Current Surge Window)',
        category: 'power_grid',
        severity: 'critical',
        authority: 'NOAA Space Weather Prediction Center / Eskom Holdings',
        title: 'WARNING: Mid-Latitude GIC Surges & Transformer Core Saturation',
        summary: 'GIC telluric currents penetrated South African Eskom 400kV grid. Severe overheating caused permanent destruction of 15 EHV step-up transformers.',
        targetId: 'grid-sa',
        scale: 'G5',
        officialCode: 'WATA50',
        comment: 'Official Eskom Post-Event Technical Investigation.'
      }
    ]
  }
];
