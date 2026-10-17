/**
 * 3D Interactive Space Weather Globe
 * Features:
 * - Color-coded country borders and polygons on deep sapphire oceans
 * - Deep space dark background with 2,800 twinkling stars
 * - Natural, comfortable magnification (globe fits beautifully on screen)
 * - Dynamic auroral oval reacting to real-time Kp index
 * - Pulsing 3D infrastructure nodes, flight arcs, and orbiting satellites
 */

import { INFRASTRUCTURE_REGISTRY } from './data.js';

// 14 Curated stylish, aesthetic geopolitical pastel tints
const COUNTRY_PALETTE = [
  '#E0E7FF', // Soft Indigo
  '#FEF3C7', // Warm Amber / Ochre
  '#DCFCE7', // Soft Sage Green
  '#FCE7F3', // Soft Rose / Blush
  '#E0F2FE', // Soft Sky Blue
  '#F3E8FF', // Soft Lavender / Orchid
  '#FFEDD5', // Soft Peach
  '#CCFBF1', // Soft Mint / Aqua
  '#F1F5F9', // Crisp Slate White
  '#FEF9C3', // Pale Gold
  '#EDE9FE', // Soft Periwinkle
  '#CFFAFE', // Ice Cyan
  '#E2E8F0', // Light Slate
  '#FEE2E2'  // Soft Coral
];

export class SpaceWeatherGlobe {
  constructor(containerElement, onMarkerSelect, onMarkerHover = null) {
    this.container = containerElement;
    this.onMarkerSelect = onMarkerSelect;
    this.onMarkerHover = onMarkerHover;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.earthGroup = null;
    this.markerGroup = null;
    this.arcGroup = null;
    this.satelliteGroup = null;
    this.auroraGroup = null;
    this.starfield = null;

    this.earthRadius = 100;
    this.markers = [];
    this.arcs = [];
    this.satellites = [];
    this.pulsingRings = [];

    this.auroraNorth = null;
    this.auroraSouth = null;
    this.auroraBaseKp = 2.0;

    this.sunLight = null;
    this.currentFilter = 'all';
    this.selectedMarker = null;

    this.isAutoRotating = true;
    this.isFlying = false;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2(-1000, -1000);
    this.hoveredMarker = null;

    this.init();
  }

  async init() {
    this.initThree();
    this.createStarfield();
    await this.createEarth();
    this.createAtmosphere();
    this.createSunLight();
    this.createAuroralOvals();
    // Only live active alerts will be mapped dynamically via updateAlertMarkers()
    this.setupEventListeners();
    this.animate();
  }

  initThree() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.scene = new THREE.Scene();
    // Deep cosmic space dark background
    this.scene.background = new THREE.Color(0x040714);

    // Natural, well-proportioned magnification (comfortable camera distance)
    this.camera = new THREE.PerspectiveCamera(40, width / height, 1, 4000);
    this.camera.position.set(0, 28, 330);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = false;
    this.container.appendChild(this.renderer.domElement);

    // OrbitControls
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 10, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.rotateSpeed = 0.55;
    this.controls.zoomSpeed = 0.8;
    this.controls.minDistance = 160;
    this.controls.maxDistance = 680;
    this.controls.autoRotate = this.isAutoRotating;
    this.controls.autoRotateSpeed = 0.4;

    // Groups
    this.earthGroup = new THREE.Group();
    this.markerGroup = new THREE.Group();
    this.arcGroup = new THREE.Group();
    this.satelliteGroup = new THREE.Group();
    this.auroraGroup = new THREE.Group();

    this.earthGroup.add(this.markerGroup);
    this.earthGroup.add(this.arcGroup);
    this.earthGroup.add(this.satelliteGroup);
    this.earthGroup.add(this.auroraGroup);
    this.scene.add(this.earthGroup);

    // Balanced ambient and directional lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    this.scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x1e293b, 0.3);
    this.scene.add(hemiLight);
  }

  /**
   * 3D Starfield with 2,800 twinkling stars in deep space
   */
  createStarfield() {
    const starCount = 2800;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    const palette = [
      new THREE.Color(0xffffff), // White
      new THREE.Color(0xdbeafe), // Light sky blue
      new THREE.Color(0xfef08a), // Golden dwarf
      new THREE.Color(0xc7d2fe), // Soft violet
      new THREE.Color(0x93c5fd)  // Cyan
    ];

    for (let i = 0; i < starCount; i++) {
      const radius = 600 + Math.random() * 1600;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      const col = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 2.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.85
    });

    this.starfield = new THREE.Points(geometry, material);
    this.scene.add(this.starfield);
  }

  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }

  /**
   * Generates high-resolution vector texture with color-coded country borders
   * on rich space-navy oceans.
   */
  async createEarth() {
    const canvas = document.createElement('canvas');
    canvas.width = 4096;
    canvas.height = 2048;
    const ctx = canvas.getContext('2d');

    // 1. Ocean: Deep rich space-navy blue gradient
    const oceanGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    oceanGrad.addColorStop(0, '#0D1D35');   // North polar ocean
    oceanGrad.addColorStop(0.25, '#142C4F'); // Northern temperate
    oceanGrad.addColorStop(0.5, '#1B3B68');  // Equatorial ocean
    oceanGrad.addColorStop(0.75, '#142C4F'); // Southern temperate
    oceanGrad.addColorStop(1, '#0D1D35');   // South polar ocean
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Graticules (Latitude & Longitude grid lines)
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.28)';

    // Longitude lines every 30 degrees
    for (let lon = -180; lon <= 180; lon += 30) {
      const x = ((lon + 180) / 360) * canvas.width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    // Latitude lines every 15 degrees
    for (let lat = -90; lat <= 90; lat += 15) {
      const y = ((90 - lat) / 180) * canvas.height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Equator - Royal Blue dashed line
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.65)';
    ctx.lineWidth = 3.5;
    ctx.setLineDash([18, 10]);
    const equatorY = (90 / 180) * canvas.height;
    ctx.beginPath();
    ctx.moveTo(0, equatorY); ctx.lineTo(canvas.width, equatorY);
    ctx.stroke();

    // Prime Meridian - Indigo dashed line
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.5)';
    ctx.lineWidth = 3.0;
    ctx.setLineDash([14, 8]);
    const primeX = (180 / 360) * canvas.width;
    ctx.beginPath();
    ctx.moveTo(primeX, 0); ctx.lineTo(primeX, canvas.height);
    ctx.stroke();

    // Highlight Arctic / Antarctic Circles (66.5° N & S) - Auroral Thresholds
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.85)'; // Emerald dashed line
    ctx.lineWidth = 3.5;
    ctx.setLineDash([16, 8]);

    const arcticY = ((90 - 66.5) / 180) * canvas.height;
    ctx.beginPath();
    ctx.moveTo(0, arcticY); ctx.lineTo(canvas.width, arcticY);
    ctx.stroke();

    const antarcticY = ((90 - -66.5) / 180) * canvas.height;
    ctx.beginPath();
    ctx.moveTo(0, antarcticY); ctx.lineTo(canvas.width, antarcticY);
    ctx.stroke();

    ctx.setLineDash([]); // Reset dash for country borders

    // 3. Draw Color-Coded Countries from GeoJSON
    try {
      const res = await fetch('vendor/world_countries.json');
      const geojson = await res.json();

      // Pass 1: Draw and Fill each Country with its distinct aesthetic color
      for (const feature of geojson.features) {
        const geom = feature.geometry;
        if (!geom) continue;

        const props = feature.properties || {};
        const countryName = props.NAME || props.ADMIN || props.name || 'Country';
        const colorIdx = Math.abs(this.hashString(countryName)) % COUNTRY_PALETTE.length;
        ctx.fillStyle = COUNTRY_PALETTE[colorIdx];

        if (geom.type === 'Polygon') {
          this.drawPolygonOnCanvas(ctx, geom.coordinates, canvas.width, canvas.height, true, false);
        } else if (geom.type === 'MultiPolygon') {
          for (const poly of geom.coordinates) {
            this.drawPolygonOnCanvas(ctx, poly, canvas.width, canvas.height, true, false);
          }
        }
      }

      // Pass 2: Draw Crisp Country Borders & Coastlines (Aesthetic Slate, 2.8px)
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2.8;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      for (const feature of geojson.features) {
        const geom = feature.geometry;
        if (!geom) continue;

        if (geom.type === 'Polygon') {
          this.drawPolygonOnCanvas(ctx, geom.coordinates, canvas.width, canvas.height, false, true);
        } else if (geom.type === 'MultiPolygon') {
          for (const poly of geom.coordinates) {
            this.drawPolygonOnCanvas(ctx, poly, canvas.width, canvas.height, false, true);
          }
        }
      }

    } catch (e) {
      console.warn('Could not load world_countries.json, using fallback', e);
      ctx.fillStyle = '#E0E7FF';
      ctx.fillRect(400, 300, 1000, 700);
      ctx.fillRect(2000, 400, 800, 600);
    }

    // Create Three.js Texture with Linear Mipmapping
    const texture = new THREE.CanvasTexture(canvas);
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.needsUpdate = true;

    const geometry = new THREE.SphereGeometry(this.earthRadius, 72, 72);
    const material = new THREE.MeshLambertMaterial({
      map: texture
    });

    this.earthMesh = new THREE.Mesh(geometry, material);
    this.earthGroup.add(this.earthMesh);
  }

  drawPolygonOnCanvas(ctx, rings, width, height, doFill = true, doStroke = true) {
    ctx.beginPath();
    for (const ring of rings) {
      for (let i = 0; i < ring.length; i++) {
        const [lon, lat] = ring[i];
        const x = ((lon + 180) / 360) * width;
        const y = ((90 - lat) / 180) * height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    }
    if (doFill) ctx.fill('evenodd');
    if (doStroke) ctx.stroke();
  }

  /**
   * Atmospheric Fresnel Rim Glow against the dark space background
   */
  createAtmosphere() {
    const atmosphereGeom = new THREE.SphereGeometry(this.earthRadius * 1.026, 64, 64);
    const atmosphereMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.68 - dot(vNormal, vec3(0, 0, 1.0)), 2.0);
          gl_FragColor = vec4(0.38, 0.78, 1.0, intensity * 0.72);
        }
      `,
      blending: THREE.NormalBlending,
      side: THREE.BackSide,
      transparent: true
    });

    const atmosphere = new THREE.Mesh(atmosphereGeom, atmosphereMat);
    this.scene.add(atmosphere);
  }

  /**
   * Sunlight tracking the current UTC subsolar point
   */
  createSunLight() {
    this.sunLight = new THREE.DirectionalLight(0xfff8e7, 0.65);
    const now = new Date();
    const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60;
    const sunLon = (12 - utcHours) * 15;
    const sunPos = this.latLonToVector3(5, sunLon, 350);
    this.sunLight.position.copy(sunPos);
    this.scene.add(this.sunLight);
  }

  /**
   * Dynamic Auroral Ovals around Northern & Southern Geomagnetic Poles
   */
  createAuroralOvals() {
    this.auroraNorth = this.buildAuroraMesh(80.5, -72.5, true);
    this.auroraSouth = this.buildAuroraMesh(-80.5, 107.5, false);

    this.auroraGroup.add(this.auroraNorth);
    this.auroraGroup.add(this.auroraSouth);

    this.updateAuroraIntensity(this.auroraBaseKp);
  }

  buildAuroraMesh(poleLat, poleLon, isNorth) {
    const segments = 96;
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(segments * 2 * 3);
    const colors = new Float32Array(segments * 2 * 3);
    const indices = [];

    for (let i = 0; i < segments; i++) {
      const idx = i * 2;
      indices.push(idx, idx + 1, (idx + 2) % (segments * 2));
      indices.push(idx + 1, (idx + 3) % (segments * 2), (idx + 2) % (segments * 2));
    }

    geom.setIndex(indices);
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const mesh = new THREE.Mesh(geom, mat);
    mesh.userData = { poleLat, poleLon, isNorth };
    return mesh;
  }

  updateAuroraIntensity(kp) {
    this.auroraBaseKp = kp;
    [this.auroraNorth, this.auroraSouth].forEach(aurora => {
      if (!aurora) return;
      const { poleLat, poleLon } = aurora.userData;
      const posAttr = aurora.geometry.attributes.position;
      const colAttr = aurora.geometry.attributes.color;
      const segments = 96;

      const baseRadiusDeg = 16.0 + Math.pow(kp / 9.0, 1.1) * 25.0;
      const ringWidthDeg = 3.5 + (kp / 9.0) * 4.0;
      const altitude = this.earthRadius * 1.025;

      for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const wave = Math.sin(angle * 6 + Date.now() * 0.002) * (0.8 + kp * 0.3);

        const rInnerDeg = baseRadiusDeg - ringWidthDeg * 0.5 + wave;
        const rOuterDeg = baseRadiusDeg + ringWidthDeg * 0.5 + wave;

        const pInner = this.getPointAtAngularOffset(poleLat, poleLon, rInnerDeg, angle, altitude);
        const pOuter = this.getPointAtAngularOffset(poleLat, poleLon, rOuterDeg, angle, altitude * 1.012);

        const idx = i * 2;
        posAttr.setXYZ(idx, pInner.x, pInner.y, pInner.z);
        posAttr.setXYZ(idx + 1, pOuter.x, pOuter.y, pOuter.z);

        // Emerald Green transitioning to Violet during high Kp
        let r = 0.06, g = 0.75, b = 0.52;
        if (kp >= 6) {
          r = 0.68; g = 0.35; b = 0.98;
        } else if (kp >= 4) {
          r = 0.15; g = 0.88; b = 0.78;
        }

        colAttr.setXYZ(idx, r * 0.6, g * 0.6, b * 0.6);
        colAttr.setXYZ(idx + 1, r, g, b);
      }

      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;
      aurora.material.opacity = Math.min(0.88, 0.45 + (kp / 9.0) * 0.42);
    });
  }

  getPointAtAngularOffset(centerLat, centerLon, radiusDeg, azimuthRad, radius) {
    const latRad = THREE.MathUtils.degToRad(centerLat);
    const lonRad = THREE.MathUtils.degToRad(centerLon);
    const distRad = THREE.MathUtils.degToRad(radiusDeg);

    const sinLat = Math.sin(latRad);
    const cosLat = Math.cos(latRad);
    const sinDist = Math.sin(distRad);
    const cosDist = Math.cos(distRad);

    const outLatRad = Math.asin(sinLat * cosDist + cosLat * sinDist * Math.cos(azimuthRad));
    const outLonRad = lonRad + Math.atan2(
      Math.sin(azimuthRad) * sinDist * cosLat,
      cosDist - sinLat * Math.sin(outLatRad)
    );

    return this.latLonToVector3(
      THREE.MathUtils.radToDeg(outLatRad),
      THREE.MathUtils.radToDeg(outLonRad),
      radius
    );
  }

  getColorForSeverity(severity) {
    switch (severity) {
      case 'critical': return 0xef4444; // Vivid Red
      case 'severe':
      case 'high': return 0xf97316;     // Vivid Orange
      case 'moderate': return 0xf59e0b; // Amber
      default: return 0x0284c7;         // Sky Blue
    }
  }

  /**
   * Dynamically renders markers ONLY for real active space weather alerts!
   * Cleans all demo infrastructure and maps live NOAA alerts directly onto Earth.
   */
  updateAlertMarkers(alerts = []) {
    // 1. Remove previous markers
    while (this.markerGroup.children.length > 0) {
      const child = this.markerGroup.children[0];
      this.markerGroup.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
        else child.material.dispose();
      }
    }
    this.markers = [];
    this.pulsingRings = [];
    this.selectedMarker = null;
    this.hoveredMarker = null;

    if (!alerts || alerts.length === 0) return;

    // Track used coordinates to avoid exact marker overlaps
    const usedCoords = [];

    alerts.forEach((alert, index) => {
      let lat = alert.target?.lat;
      let lon = alert.target?.lon;

      if (lat === undefined || lon === undefined) {
        lat = 58.0;
        lon = -70.0 + (index * 28);
      }

      // If overlapping existing alert coordinate, add visual displacement
      const isTaken = usedCoords.some(c => Math.abs(c.lat - lat) < 4.0 && Math.abs(c.lon - lon) < 4.0);
      if (isTaken) {
        lat += (index % 2 === 0 ? 3.5 : -3.5);
        lon += (index % 3 === 0 ? 4.8 : -4.8);
      }
      usedCoords.push({ lat, lon });

      const color = this.getColorForSeverity(alert.severity);
      const pos = this.latLonToVector3(lat, lon, this.earthRadius * 1.018);

      // Core Marker Sphere
      const sphereGeom = new THREE.SphereGeometry(1.6, 16, 16);
      const sphereMat = new THREE.MeshBasicMaterial({ color: color });
      const sphereMesh = new THREE.Mesh(sphereGeom, sphereMat);
      sphereMesh.position.copy(pos);

      // Concentric Pulsing Shockwave Ring
      const ringGeom = new THREE.RingGeometry(1.8, 2.9, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85
      });
      const ringMesh = new THREE.Mesh(ringGeom, ringMat);
      ringMesh.position.copy(pos);
      ringMesh.lookAt(new THREE.Vector3(0, 0, 0));

      this.pulsingRings.push({
        mesh: ringMesh,
        initialScale: 1.0,
        maxScale: 3.2,
        speed: 0.022 + (index % 4) * 0.005,
        scale: 1.0 + (index % 3) * 0.7
      });

      // Beacon Pin line pointing outwards
      const pinGeom = new THREE.BufferGeometry().setFromPoints([
        this.latLonToVector3(lat, lon, this.earthRadius * 0.995),
        this.latLonToVector3(lat, lon, this.earthRadius * 1.055)
      ]);
      const pinMat = new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 0.9 });
      const pinMesh = new THREE.Line(pinGeom, pinMat);

      // Generous invisible hit detection sphere (opacity 0.001, depthWrite: false so raycasting detects it effortlessly)
      const hitGeom = new THREE.SphereGeometry(12.5, 12, 12);
      const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.001, depthWrite: false });
      const hitMesh = new THREE.Mesh(hitGeom, hitMat);
      hitMesh.position.copy(pos);

      const markerGroup = new THREE.Group();
      markerGroup.add(sphereMesh);
      markerGroup.add(ringMesh);
      markerGroup.add(pinMesh);
      markerGroup.add(hitMesh);

      hitMesh.userData = { parentMarker: markerGroup };
      sphereMesh.userData = { parentMarker: markerGroup };
      ringMesh.userData = { parentMarker: markerGroup };
      pinMesh.userData = { parentMarker: markerGroup };

      markerGroup.userData = {
        alert: alert,
        item: {
          id: alert.id,
          name: alert.plainTitle || alert.title,
          lat: lat,
          lon: lon,
          type: alert.category,
          region: alert.target?.region || 'Monitored Planetary Sector',
          riskVulnerability: alert.scale || alert.severity,
          description: alert.whatIsHappening || alert.summary,
          failureRisks: [alert.whatToExpect || 'Active space weather event'],
          mitigations: [alert.impactDetails?.mitigation || 'Monitor NOAA SWPC real-time telemetry.'],
          associatedAlert: alert
        },
        hitMesh: hitMesh,
        sphereMesh: sphereMesh,
        ringMesh: ringMesh,
        pinMesh: pinMesh,
        originalColor: color,
        type: alert.category
      };

      this.markerGroup.add(markerGroup);
      this.markers.push(markerGroup);
    });
  }

  focusAlertById(alertId) {
    if (!alertId) return null;
    const strId = String(alertId).toLowerCase();
    const marker = this.markers.find(m => {
      const aId = String(m.userData.alert?.id || '').toLowerCase();
      const iId = String(m.userData.item?.id || '').toLowerCase();
      return aId === strId || iId === strId;
    });
    if (marker) {
      const item = marker.userData.item;
      this.flyTo(item.lat, item.lon, 260, 850);
      this.highlightMarker(marker);
      return marker;
    }
    return null;
  }

  highlightMarker(marker) {
    if (this.selectedMarker && this.selectedMarker !== marker) {
      if (this.selectedMarker.userData?.sphereMesh) {
        this.selectedMarker.userData.sphereMesh.scale.set(1, 1, 1);
      }
    }
    this.selectedMarker = marker;
    if (marker && marker.userData?.sphereMesh) {
      marker.userData.sphereMesh.scale.set(2.2, 2.2, 2.2);
    }
  }

  getColorForCategory(category) {
    switch (category) {
      case 'power_grid': return 0xf59e0b; // Amber
      case 'communication_navigation': return 0x0284c7; // Electric Blue
      case 'satellite_aviation': return 0x8b5cf6; // Violet
      default: return 0xef4444; // Red
    }
  }

  latLonToVector3(lat, lon, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    return new THREE.Vector3(
      -(radius * Math.sin(phi) * Math.cos(theta)),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
  }

  vector3ToLatLon(vec) {
    const norm = vec.clone().normalize();
    const lat = 90 - (Math.acos(norm.y) * 180 / Math.PI);
    const lon = ((Math.atan2(norm.z, -norm.x) * 180 / Math.PI) - 180) % 360;
    return { lat, lon };
  }

  filterCategory(category) {
    this.currentFilter = category;
    this.markers.forEach(m => {
      const isVisible = (category === 'all' || m.userData.type === category);
      m.visible = isVisible;
    });

    this.arcs.forEach(arc => {
      const isVisible = (category === 'all' || arc.userData.type === category);
      arc.visible = isVisible;
    });
  }

  /**
   * Smooth camera fly-to with balanced, natural distance
   */
  flyTo(lat, lon, distance = 260, duration = 850) {
    this.isAutoRotating = false;
    this.controls.autoRotate = false;
    this.controls.enabled = false;
    this.isFlying = true;

    if (this.currentFlyAnimationId) {
      cancelAnimationFrame(this.currentFlyAnimationId);
      this.currentFlyAnimationId = null;
    }

    const targetPos = this.latLonToVector3(lat, lon, distance);
    const startPos = this.camera.position.clone();

    if (duration <= 0) {
      this.camera.position.copy(targetPos);
      this.camera.lookAt(0, 0, 0);
      this.controls.target.set(0, 0, 0);
      this.controls.enabled = true;
      this.controls.update();
      this.isFlying = false;
      return;
    }

    const startTime = performance.now();

    const animateFly = (time) => {
      const elapsed = time - startTime;
      const progress = Math.min(1.0, elapsed / duration);
      const ease = 1 - Math.pow(1 - progress, 3); // Cubic ease-out

      this.camera.position.lerpVectors(startPos, targetPos, ease);
      this.camera.lookAt(0, 0, 0);

      if (progress < 1.0) {
        this.currentFlyAnimationId = requestAnimationFrame(animateFly);
      } else {
        this.camera.position.copy(targetPos);
        this.camera.lookAt(0, 0, 0);
        this.controls.target.set(0, 0, 0);
        this.controls.enabled = true;
        this.controls.update();
        this.isFlying = false;
        this.currentFlyAnimationId = null;
      }
    };

    this.currentFlyAnimationId = requestAnimationFrame(animateFly);
  }

  focusMarkerById(id) {
    const marker = this.markers.find(m => m.userData.item.id === id);
    if (marker) {
      const item = marker.userData.item;
      this.flyTo(item.lat, item.lon, 260, 1000);
      this.selectMarker(marker);
      return item;
    }
    return null;
  }

  selectMarker(marker) {
    if (this.selectedMarker && this.selectedMarker !== marker) {
      if (this.selectedMarker.userData?.sphereMesh) {
        this.selectedMarker.userData.sphereMesh.scale.set(1, 1, 1);
      }
    }
    this.selectedMarker = marker;
    if (marker && marker.userData?.sphereMesh) {
      marker.userData.sphereMesh.scale.set(1.7, 1.7, 1.7);
      if (this.onMarkerSelect) {
        this.onMarkerSelect(marker.userData.item);
      }
    }
  }

  getRaycastMeshes() {
    const list = [];
    for (const m of this.markers) {
      if (!m.visible) continue;
      if (m.userData?.hitMesh) list.push(m.userData.hitMesh);
      if (m.userData?.sphereMesh) list.push(m.userData.sphereMesh);
      if (m.userData?.ringMesh) list.push(m.userData.ringMesh);
      if (m.userData?.pinMesh) list.push(m.userData.pinMesh);
    }
    return list;
  }

  getMarkerFromObject(obj) {
    if (!obj) return null;
    if (obj.userData?.parentMarker) return obj.userData.parentMarker;
    return this.markers.find(m =>
      m === obj ||
      m.children.includes(obj) ||
      m.userData?.hitMesh === obj ||
      m.userData?.sphereMesh === obj ||
      m.userData?.ringMesh === obj ||
      m.userData?.pinMesh === obj
    ) || null;
  }

  setupEventListeners() {
    const dom = this.renderer.domElement;
    let pointerDownPos = null;

    // Set raycaster line detection threshold for easy clicking on beacon pins
    if (this.raycaster?.params?.Line) {
      this.raycaster.params.Line.threshold = 4;
    }

    dom.addEventListener('pointermove', (e) => {
      const rect = dom.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.checkHover(e.clientX, e.clientY);
    });

    dom.addEventListener('pointerleave', () => {
      if (this.onMarkerHover) {
        this.onMarkerHover(null);
      }
    });

    dom.addEventListener('pointerdown', (e) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    });

    const triggerMarkerSelect = (e) => {
      const rect = dom.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );

      this.raycaster.setFromCamera(mouse, this.camera);
      const meshes = this.getRaycastMeshes();
      const intersects = this.raycaster.intersectObjects(meshes, false);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        const parentMarker = this.getMarkerFromObject(hit);
        if (parentMarker) {
          const item = parentMarker.userData.item;
          this.flyTo(item.lat, item.lon, 260, 1000);
          this.selectMarker(parentMarker);
          return true;
        }
      }
      return false;
    };

    dom.addEventListener('pointerup', (e) => {
      if (pointerDownPos) {
        const dx = e.clientX - pointerDownPos.x;
        const dy = e.clientY - pointerDownPos.y;
        pointerDownPos = null;
        if (Math.hypot(dx, dy) > 12) {
          return; // Drag/orbit rotation, ignore click
        }
      }
      triggerMarkerSelect(e);
    });

    dom.addEventListener('click', (e) => {
      triggerMarkerSelect(e);
    });

    this.controls.addEventListener('start', () => {
      this.isAutoRotating = false;
      this.controls.autoRotate = false;
    });

    window.addEventListener('resize', () => this.onResize());
  }

  checkHover(clientX, clientY) {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = this.getRaycastMeshes();
    const intersects = this.raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      this.renderer.domElement.style.cursor = 'pointer';
      const hit = intersects[0].object;
      const marker = this.getMarkerFromObject(hit);
      if (marker) {
        if (marker !== this.hoveredMarker) {
          if (this.hoveredMarker && this.hoveredMarker !== this.selectedMarker) {
            if (this.hoveredMarker.userData?.sphereMesh) {
              this.hoveredMarker.userData.sphereMesh.scale.set(1, 1, 1);
            }
          }
          this.hoveredMarker = marker;
          if (marker.userData?.sphereMesh) {
            marker.userData.sphereMesh.scale.set(1.4, 1.4, 1.4);
          }
        }
        if (this.onMarkerHover) {
          this.onMarkerHover(marker.userData.item, clientX, clientY);
        }
      }
    } else {
      this.renderer.domElement.style.cursor = 'default';
      if (this.hoveredMarker && this.hoveredMarker !== this.selectedMarker) {
        if (this.hoveredMarker.userData?.sphereMesh) {
          this.hoveredMarker.userData.sphereMesh.scale.set(1, 1, 1);
        }
        this.hoveredMarker = null;
      }
      if (this.onMarkerHover) {
        this.onMarkerHover(null);
      }
    }
  }

  toggleAutoRotate() {
    this.isAutoRotating = !this.isAutoRotating;
    this.controls.autoRotate = this.isAutoRotating;
    return this.isAutoRotating;
  }

  onResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    if (!this.isFlying && this.controls) {
      this.controls.update();
    }

    // 1. Pulsing Rings
    for (const p of this.pulsingRings) {
      p.scale += p.speed;
      if (p.scale > p.maxScale) p.scale = p.initialScale;
      p.mesh.scale.set(p.scale, p.scale, 1);
      const alpha = 1.0 - (p.scale - p.initialScale) / (p.maxScale - p.initialScale);
      p.mesh.material.opacity = alpha * 0.75;
    }

    // 2. Subtle Auroral Wave Shimmer
    const time = Date.now();
    if (this.auroraNorth && this.auroraSouth) {
      const shimmer = Math.sin(time * 0.003) * 0.08;
      this.auroraNorth.material.opacity = Math.min(0.88, 0.55 + shimmer);
      this.auroraSouth.material.opacity = Math.min(0.88, 0.55 + shimmer);
    }

    // 3. Subtle Auroral Wave Shimmer
    if (this.auroraNorth && this.auroraSouth) {
      const shimmer = Math.sin(time * 0.003) * 0.08;
      this.auroraNorth.material.opacity = Math.min(0.88, 0.55 + shimmer);
      this.auroraSouth.material.opacity = Math.min(0.88, 0.55 + shimmer);
    }

    // 4. Subtle Starfield Twinkle
    if (this.starfield) {
      this.starfield.rotation.y = time * 0.00002;
    }

    this.renderer.render(this.scene, this.camera);
  }
}
