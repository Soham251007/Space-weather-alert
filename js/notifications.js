/**
 * HELIOGUARD Space Weather Alert System - Mobile Push Notifications
 * Powered by ntfy.sh (Open source, zero-config HTTP push pub-sub service)
 * 
 * Allows instant delivery of space weather alerts, NOAA storm bulletins,
 * and infrastructure mitigations to any smartphone (iOS / Android) or browser.
 */

export class SpaceWeatherNotificationManager {
  constructor() {
    this.storageKey = 'helioguard_ntfy_config';
    this.historyKey = 'helioguard_ntfy_history';
    
    this.config = this.loadConfig();
    this.history = this.loadHistory();
    this.dispatchedKeys = new Set();
    this.onNotificationSent = null; // Callback for UI toasts
  }

  /**
   * Load configuration with sensible defaults
   */
  loadConfig() {
    const defaults = {
      topic: this.generateDefaultTopic(),
      server: 'https://ntfy.sh',
      autoPush: true,
      minSeverity: 'moderate', // 'all', 'moderate', 'severe', 'critical'
      notifyOnScenario: true,
      sound: 'default'
    };

    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        return { ...defaults, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('[NotificationManager] Failed reading localStorage config:', e);
    }

    return defaults;
  }

  saveConfig() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.config));
    } catch (e) {
      console.warn('[NotificationManager] Failed saving config to localStorage:', e);
    }
  }

  loadHistory() {
    try {
      const saved = localStorage.getItem(this.historyKey);
      if (saved) {
        return JSON.parse(saved).slice(0, 20);
      }
    } catch (e) {}
    return [];
  }

  saveHistory() {
    try {
      localStorage.setItem(this.historyKey, JSON.stringify(this.history.slice(0, 20)));
    } catch (e) {}
  }

  generateDefaultTopic() {
    const randomHex = Math.random().toString(16).substring(2, 6);
    return `helioguard-storm-${randomHex}`;
  }

  generateNewTopic() {
    this.config.topic = this.generateDefaultTopic();
    this.saveConfig();
    return this.config.topic;
  }

  setTopic(newTopic) {
    // Sanitize topic: lowercase, alphanumeric and hyphens only
    const sanitized = (newTopic || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_-]/g, '-');
    
    if (sanitized) {
      this.config.topic = sanitized;
      this.saveConfig();
      return sanitized;
    }
    return this.config.topic;
  }

  getTopic() {
    return this.config.topic;
  }

  getSubscriptionUrl() {
    const server = this.config.server.replace(/\/+$/, '');
    return `${server}/${this.config.topic}`;
  }

  getQrCodeUrl() {
    const targetUrl = this.getSubscriptionUrl();
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(targetUrl)}&margin=10`;
  }

  /**
   * Dispatches push notification to ntfy.sh as clean plain-text SMS-style message
   */
  async sendPush({
    title = 'HELIOGUARD Space Weather Alert',
    message = 'Space weather anomaly detected.',
    priority = 3,
    tags = ['satellite'],
    click = null,
    category = 'space_weather'
  }) {
    const endpoint = `${this.config.server.replace(/\/+$/, '')}/${this.config.topic}`;
    const targetClickUrl = click || window.location.href;

    // Clean ASCII title for HTTP headers
    const cleanTitle = (title || 'HELIOGUARD Alert')
      .replace(/[^\x20-\x7E]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const tagList = Array.isArray(tags) ? tags.join(',') : String(tags || 'satellite');

    const headers = {
      'Title': cleanTitle,
      'Priority': String(Math.min(5, Math.max(1, priority))),
      'Tags': tagList,
      'Click': targetClickUrl
    };

    const startTime = performance.now();
    try {
      // POST plain text body to ntfy topic endpoint (NOT JSON string!)
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: message
      });

      const elapsed = Math.round(performance.now() - startTime);

      if (!res.ok) {
        throw new Error(`ntfy.sh HTTP error ${res.status}: ${res.statusText}`);
      }

      const responseData = await res.json();
      
      const record = {
        id: responseData.id || `msg-${Date.now()}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        title: cleanTitle,
        message: message,
        priority: priority,
        status: 'Delivered',
        latencyMs: elapsed,
        category: category
      };

      this.history.unshift(record);
      if (this.history.length > 20) this.history.pop();
      this.saveHistory();

      if (typeof this.onNotificationSent === 'function') {
        this.onNotificationSent({
          success: true,
          record,
          topic: this.config.topic,
          url: this.getSubscriptionUrl()
        });
      }

      return {
        success: true,
        record,
        data: responseData
      };
    } catch (err) {
      console.error('[NotificationManager] Push dispatch failed:', err);

      const record = {
        id: `err-${Date.now()}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        title: cleanTitle,
        message: message,
        priority: priority,
        status: `Error: ${err.message}`,
        latencyMs: 0,
        category: category
      };

      this.history.unshift(record);
      this.saveHistory();

      if (typeof this.onNotificationSent === 'function') {
        this.onNotificationSent({
          success: false,
          error: err.message,
          record,
          topic: this.config.topic
        });
      }

      return {
        success: false,
        error: err.message
      };
    }
  }

  /**
   * Send a simple, friendly text-message test alert
   */
  async sendTestNotification() {
    return await this.sendPush({
      title: 'HELIOGUARD Connection Test',
      message: 'Test alert from HELIOGUARD: Your phone is connected! You will now receive alerts here when solar storms or space weather events are expected to hit Earth.',
      priority: 3,
      tags: ['white_check_mark', 'satellite'],
      category: 'system_test'
    });
  }

  /**
   * Format alerts into a simple, natural text message that is easy to read
   */
  formatTextMessage(alert) {
    let alertType = 'Space Weather Alert';
    const rawTitle = (alert.title || '').toUpperCase();
    if (rawTitle.includes('WARNING')) alertType = 'Solar Storm Warning';
    else if (rawTitle.includes('WATCH')) alertType = 'Solar Storm Watch';
    else if (rawTitle.includes('SUMMARY')) alertType = 'Solar Event Summary';
    else if (rawTitle.includes('RADIO') || rawTitle.includes('BLACKOUT')) alertType = 'Radio Blackout Alert';
    else if (rawTitle.includes('RADIATION') || rawTitle.includes('PROTON')) alertType = 'Radiation Storm Alert';

    let categoryScale = '';
    if (alert.scale) {
      categoryScale = ` - Category ${alert.scale.replace(/[^A-Za-z0-9]/g, '')}`;
    }

    const title = `${alertType}${categoryScale}`.replace(/[^\x20-\x7E]/g, '');

    const when = alert.expectedHit || 'Immediate / Impact in progress';
    const what = (alert.whatIsHappening || alert.summary || 'Active space weather event monitored by NOAA.')
      .replace(/[\[\]]/g, '')
      .replace(/\(.*?\)/g, '')
      .replace(/Message Code:.*$/im, '')
      .replace(/Serial Number:.*$/im, '')
      .replace(/\s+/g, ' ')
      .trim();

    const impact = (alert.whatToExpect || 'Monitored fluctuations across planetary power and communication systems.')
      .replace(/[\[\]]/g, '')
      .trim();

    const where = alert.affectedAreas
      ? alert.affectedAreas.replace(/[\[\]]/g, '').trim()
      : (alert.target ? `${alert.target.name}, ${alert.target.region || ''}`.replace(/[\[\]]/g, '').trim() : '');

    // Simple SMS text message layout
    let lines = [
      what,
      '',
      `When it hits: ${when}`,
      `Impact: ${impact}`
    ];
    if (where) {
      lines.push(`Affected: ${where}`);
    }

    const message = lines.join('\n');

    return { title, message };
  }

  /**
   * Dispatch a specific NOAA or scenario alert object to phone
   */
  async sendAlertItem(alert) {
    if (!alert) return;

    let priority = 3;
    let tags = ['warning', 'satellite'];

    switch (alert.severity) {
      case 'critical':
        priority = 5;
        tags = ['rotating_light', 'fire', 'zap'];
        break;
      case 'severe':
      case 'high':
        priority = 4;
        tags = ['warning', 'zap', 'shield'];
        break;
      case 'moderate':
        priority = 3;
        tags = ['bell', 'satellite'];
        break;
      default:
        priority = 2;
        tags = ['information_source'];
    }

    const { title, message } = this.formatTextMessage(alert);

    return await this.sendPush({
      title: title.substring(0, 80),
      message: message,
      priority: priority,
      tags: tags,
      category: alert.category || 'space_weather'
    });
  }

  /**
   * Dispatch infrastructure mitigation checklist to phone
   */
  async sendInfrastructureMitigation(item, alert = null) {
    if (!item) return;

    const cleanName = item.name.replace(/[\[\]]/g, '').trim();
    const cleanRegion = (item.region || '').replace(/[\[\]]/g, '').trim();
    const whenTime = alert?.expectedHit || 'Immediate (Active Storm Window)';
    const cleanRisks = (item.failureRisks || []).slice(0, 2).map(r => r.replace(/[\[\]]/g, '')).join('; ');
    const actions = (item.mitigations || []).slice(0, 3).map((m, idx) => `${idx + 1}. ${m.replace(/[\[\]]/g, '')}`).join('\n');

    const title = `Action Plan: ${cleanName}`.replace(/[^\x20-\x7E]/g, '').substring(0, 80);

    const message = [
      `Facility: ${cleanName} (${cleanRegion}) - ${item.riskVulnerability} Risk`,
      `Status: ${whenTime}`,
      '',
      `Risks: ${cleanRisks}`,
      '',
      `Protocol:\n${actions}`
    ].join('\n');

    return await this.sendPush({
      title: title,
      message: message,
      priority: item.riskVulnerability === 'Critical' ? 5 : 4,
      tags: ['shield', 'wrench', 'zap'],
      category: item.type || 'infrastructure'
    });
  }

  /**
   * Automatic alert dispatch based on telemetry & thresholds
   */
  checkAndAutoDispatch(telemetry, alerts) {
    if (!this.config.autoPush) return;

    const threshold = this.config.minSeverity;
    const kp = telemetry.kp;
    const gScale = telemetry.scales?.G || 0;

    let qualifies = false;
    if (threshold === 'all') {
      qualifies = true;
    } else if (threshold === 'moderate' && (kp >= 4.0 || gScale >= 1)) {
      qualifies = true;
    } else if (threshold === 'severe' && (kp >= 6.5 || gScale >= 3)) {
      qualifies = true;
    } else if (threshold === 'critical' && (kp >= 8.0 || gScale >= 4)) {
      qualifies = true;
    }

    if (!qualifies) return;

    // Pick top urgent alert to dispatch if not already sent
    const candidate = (alerts || []).find(a => {
      const key = `${a.id || a.title}-${telemetry.statusLabel}`;
      return !this.dispatchedKeys.has(key);
    });

    if (candidate) {
      const key = `${candidate.id || candidate.title}-${telemetry.statusLabel}`;
      this.dispatchedKeys.add(key);
      // Keep dispatched set bounded
      if (this.dispatchedKeys.size > 50) {
        const first = this.dispatchedKeys.values().next().value;
        this.dispatchedKeys.delete(first);
      }
      this.sendAlertItem(candidate);
    }
  }
}
