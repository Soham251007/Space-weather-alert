/**
 * Main Application Orchestrator
 * Coordinates NOAA live telemetry, 3D Globe interactions, bottom slide-out console,
 * alert streams, scenario simulation, procedural audio, mobile phone push notifications,
 * and inspector pane.
 */

import { SpaceWeatherAPI } from './api.js?v=3.2';
import { SpaceWeatherGlobe } from './globe.js?v=3.2';
import { audioManager } from './audio.js?v=3.2';
import { SCENARIO_PRESETS } from './data.js?v=3.2';
import { SpaceWeatherNotificationManager } from './notifications.js?v=3.2';
import { FALLBACK_RAW_ALERTS } from './fallback_alerts.js?v=3.2';

class HelioguardApp {
  constructor() {
    this.api = new SpaceWeatherAPI();
    this.notifications = new SpaceWeatherNotificationManager();
    this.globe = null;
    this.currentCategoryFilter = 'all';
    this.searchQuery = '';
    this.selectedAlertId = null;
    this.activeInspectedItem = null;
    this.activeInspectedAlert = null;

    this.isDrawerOpen = true;
    this.activeTabId = 'pane-impacts';

    this.refreshTimer = null;
    this.init();
  }

  async init() {
    this.initGlobe();
    this.bindDOM();
    this.initNotificationManager();

    // Immediately update dock badge and telemetry counts synchronously on startup
    const initialCount = this.api.parsedAlerts ? this.api.parsedAlerts.length : 21;
    const dockBadge = document.getElementById('dock-alert-badge');
    if (dockBadge) dockBadge.textContent = `${initialCount}`;
    const valAlertCount = document.getElementById('val-alert-count');
    if (valAlertCount) valAlertCount.textContent = `${initialCount} Active`;

    // 1. Immediately render official alerts synchronously on startup (0ms delay)
    this.renderAlertStream();
    if (this.globe && this.api.parsedAlerts.length > 0) {
      this.globe.updateAlertMarkers(this.api.parsedAlerts);
    }
    // 2. Fetch latest live telemetry from NOAA SWPC in background
    await this.loadData();
    this.startAutoRefresh();
  }

  initGlobe() {
    const container = document.getElementById('globe-canvas-container');
    const tooltipEl = document.getElementById('globe-tooltip');
    const tooltipIcon = document.getElementById('tooltip-icon');
    const tooltipTitle = document.getElementById('tooltip-title');
    const tooltipSub = document.getElementById('tooltip-sub');

    this.globe = new SpaceWeatherGlobe(
      container,
      (item) => {
        const associatedAlert = item?.associatedAlert || null;
        this.showAlertDetails(associatedAlert, item);
        audioManager.playFocus();
      },
      (item, clientX, clientY) => {
        if (!tooltipEl) return;
        if (item && clientX !== undefined && clientY !== undefined) {
          const icon = item.type === 'power_grid' ? '⚡' : (item.type === 'communication_navigation' ? '📡' : '🛰️');
          const typeLabel = item.type === 'power_grid' ? 'Power Grid' : (item.type === 'communication_navigation' ? 'Comms & GNSS' : 'Sat & Aero');
          const hitText = item.associatedAlert?.expectedHit ? ` · Hit: ${item.associatedAlert.expectedHit}` : '';
          if (tooltipIcon) tooltipIcon.textContent = icon;
          if (tooltipTitle) tooltipTitle.textContent = item.name;
          if (tooltipSub) tooltipSub.textContent = `${typeLabel} · ${item.riskVulnerability}${hitText} · Click to inspect`;
          tooltipEl.style.left = `${clientX}px`;
          tooltipEl.style.top = `${clientY}px`;
          tooltipEl.classList.add('visible');
        } else {
          tooltipEl.classList.remove('visible');
        }
      }
    );
  }

  bindDOM() {
    // 0. Top Bar Telemetry Mouse Scroller
    this.bindTelemetryScroller();

    // 1. Scenario Selector
    const scenarioSelect = document.getElementById('scenario-select');
    if (scenarioSelect) {
      SCENARIO_PRESETS.forEach(preset => {
        const opt = document.createElement('option');
        opt.value = preset.id;
        opt.textContent = `${preset.name}`;
        scenarioSelect.appendChild(opt);
      });
      scenarioSelect.addEventListener('change', async (e) => {
        audioManager.playClick();
        await this.applyScenario(e.target.value);
      });
    }

    // 2. Audio Mute Toggle
    const soundBtn = document.getElementById('btn-sound-toggle');
    if (soundBtn) {
      soundBtn.addEventListener('click', () => {
        const isMuted = audioManager.toggleMute();
        soundBtn.classList.toggle('active', !isMuted);
        soundBtn.setAttribute('title', isMuted ? 'Sound Muted' : 'Sound Active');
        soundBtn.innerHTML = isMuted
          ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`
          : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`;
      });
    }

    // 3. Auto-Rotate Toggle
    const rotateBtn = document.getElementById('btn-rotate-toggle');
    if (rotateBtn) {
      rotateBtn.addEventListener('click', () => {
        audioManager.playClick();
        const active = this.globe.toggleAutoRotate();
        rotateBtn.classList.toggle('active', active);
      });
    }

    // 4. Bottom Dock Tabs & Drawer System
    const dockTabs = document.querySelectorAll('.dock-tab');
    dockTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        audioManager.playClick();
        const targetPaneId = tab.dataset.tab;

        // If clicking already active tab when drawer is open, toggle collapse
        if (this.isDrawerOpen && this.activeTabId === targetPaneId) {
          this.toggleDrawer(false);
          return;
        }

        // Otherwise open drawer and switch tab
        this.switchTab(targetPaneId);
        if (!this.isDrawerOpen) {
          this.toggleDrawer(true);
        }
      });
    });

    // 5. Drawer Toggle / Close Buttons
    const drawerToggleBtn = document.getElementById('btn-toggle-drawer');
    if (drawerToggleBtn) {
      drawerToggleBtn.addEventListener('click', () => {
        audioManager.playClick();
        this.toggleDrawer(!this.isDrawerOpen);
      });
    }

    const drawerCloseBtn = document.getElementById('btn-drawer-close');
    if (drawerCloseBtn) {
      drawerCloseBtn.addEventListener('click', () => {
        audioManager.playClick();
        this.toggleDrawer(false);
      });
    }

    // 6. Category Filter Buttons (Inside Sector Impacts)
    const filterButtons = document.querySelectorAll('.filter-pill');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        audioManager.playClick();
        this.currentCategoryFilter = btn.dataset.category;
        this.globe.filterCategory(this.currentCategoryFilter);
        this.renderAlertStream();
      });
    });

    // 6b. Category Filter Pills (Inside Live Alerts Feed)
    const alertCatButtons = document.querySelectorAll('.alert-cat-pill');
    alertCatButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        audioManager.playClick();
        this.currentCategoryFilter = btn.dataset.category;
        this.globe.filterCategory(this.currentCategoryFilter);
        this.renderAlertStream();
      });
    });

    // 7. Region Jump Pills
    const regionButtons = document.querySelectorAll('.region-pill');
    regionButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        audioManager.playClick();
        regionButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.handleRegionJump(btn.dataset.region);
      });
    });

    // 8. Alert Search Input
    const searchInput = document.getElementById('alert-search-input');
    if (searchInput) {
      if (searchInput.value) {
        this.searchQuery = searchInput.value.toLowerCase().trim();
      }
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.renderAlertStream();
      });
    }

    // 9. Mobile Notification Modal Triggers
    const notifyBtn = document.getElementById('btn-notifications-toggle');
    if (notifyBtn) {
      notifyBtn.addEventListener('click', () => {
        audioManager.playClick();
        this.openNotificationModal();
      });
    }

    const quickAlertsPhoneBtn = document.getElementById('btn-quick-phone-alerts');
    if (quickAlertsPhoneBtn) {
      quickAlertsPhoneBtn.addEventListener('click', () => {
        audioManager.playClick();
        this.openNotificationModal();
      });
    }

    // Modal Close Triggers
    const closeBtn = document.getElementById('btn-close-ntfy-modal');
    if (closeBtn) closeBtn.addEventListener('click', () => this.closeNotificationModal());

    const doneBtn = document.getElementById('btn-done-ntfy-modal');
    if (doneBtn) doneBtn.addEventListener('click', () => this.closeNotificationModal());

    const modalBackdrop = document.getElementById('modal-ntfy');
    if (modalBackdrop) {
      modalBackdrop.addEventListener('click', (e) => {
        if (e.target === modalBackdrop) {
          this.closeNotificationModal();
        }
      });
    }

    // 9b. Alert Details Modal Close & Action Triggers
    const closeAlertModalBtn = document.getElementById('btn-close-alert-modal');
    if (closeAlertModalBtn) closeAlertModalBtn.addEventListener('click', () => this.closeAlertModal());

    const doneAlertModalBtn = document.getElementById('btn-modal-done-close');
    if (doneAlertModalBtn) doneAlertModalBtn.addEventListener('click', () => this.closeAlertModal());

    const modalAlertBackdrop = document.getElementById('modal-alert-details');
    if (modalAlertBackdrop) {
      modalAlertBackdrop.addEventListener('click', (e) => {
        if (e.target === modalAlertBackdrop) {
          this.closeAlertModal();
        }
      });
    }

    const modalPushBtn = document.getElementById('btn-modal-push-phone');
    if (modalPushBtn) {
      modalPushBtn.addEventListener('click', async () => {
        if (!this.activeModalAlert) return;
        modalPushBtn.disabled = true;
        modalPushBtn.innerHTML = `<span>Pushing...</span>`;
        const res = await this.notifications.sendAlertItem(this.activeModalAlert);
        if (res.success) {
          modalPushBtn.innerHTML = `<span>Sent to Phone ✓</span>`;
          audioManager.playAlert('moderate');
          setTimeout(() => {
            modalPushBtn.disabled = false;
            modalPushBtn.innerHTML = `<span>📱 Push Alert to Phone</span>`;
          }, 3000);
        } else {
          modalPushBtn.disabled = false;
          modalPushBtn.innerHTML = `<span>Push Failed · Retry</span>`;
        }
      });
    }

    const modalViewInspectorBtn = document.getElementById('btn-modal-view-inspector');
    if (modalViewInspectorBtn) {
      modalViewInspectorBtn.addEventListener('click', () => {
        this.closeAlertModal();
        this.switchTab('pane-inspector');
        if (!this.isDrawerOpen) this.toggleDrawer(true);
      });
    }

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeAlertModal();
        this.closeNotificationModal();
      }
    });

    // 10. Mitigation Protocol Dispatch Button
    const dispatchMitigationBtn = document.getElementById('btn-dispatch-mitigation');
    if (dispatchMitigationBtn) {
      dispatchMitigationBtn.addEventListener('click', async () => {
        if (!this.activeInspectedItem) {
          this.showToast({
            success: false,
            record: {
              title: 'No Infrastructure Selected',
              message: 'Click an infrastructure node on the 3D globe first to dispatch its protocol.'
            }
          });
          return;
        }

        dispatchMitigationBtn.disabled = true;
        dispatchMitigationBtn.innerHTML = `<span>Pushing...</span>`;

        const res = await this.notifications.sendInfrastructureMitigation(
          this.activeInspectedItem,
          this.activeInspectedAlert
        );

        if (res.success) {
          dispatchMitigationBtn.innerHTML = `<span>Pushed to Phone ✓</span>`;
          audioManager.playAlert('moderate');
          setTimeout(() => {
            dispatchMitigationBtn.disabled = false;
            dispatchMitigationBtn.innerHTML = `
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              <span>Push to Phone</span>
            `;
          }, 3500);
        } else {
          dispatchMitigationBtn.disabled = false;
          dispatchMitigationBtn.innerHTML = `<span>Failed - Retry</span>`;
        }
      });
    }
  }

  /**
   * Top Bar Telemetry Mouse Scroller:
   * Handles left/right arrow clicks, mouse wheel horizontal translation,
   * mouse drag-to-scroll, and clicking the active alerts pill.
   */
  bindTelemetryScroller() {
    const strip = document.getElementById('telemetry-strip');
    const btnLeft = document.getElementById('btn-scroll-telemetry-left');
    const btnRight = document.getElementById('btn-scroll-telemetry-right');
    const mouseIcon = document.getElementById('telemetry-mouse-scroller-icon');
    const alertsPill = document.getElementById('pill-active-alerts');

    if (!strip) return;

    const updateScrollButtons = () => {
      const maxScroll = Math.max(0, strip.scrollWidth - strip.clientWidth);
      if (btnLeft) {
        const canScrollLeft = strip.scrollLeft > 4;
        btnLeft.classList.toggle('disabled', !canScrollLeft);
      }
      if (btnRight) {
        const canScrollRight = strip.scrollLeft < maxScroll - 4;
        btnRight.classList.toggle('disabled', !canScrollRight);
      }
    };

    if (btnLeft) {
      btnLeft.addEventListener('click', (e) => {
        e.preventDefault();
        audioManager.playClick();
        strip.scrollBy({ left: -180, behavior: 'smooth' });
        setTimeout(updateScrollButtons, 300);
      });
    }

    if (btnRight) {
      btnRight.addEventListener('click', (e) => {
        e.preventDefault();
        audioManager.playClick();
        strip.scrollBy({ left: 180, behavior: 'smooth' });
        setTimeout(updateScrollButtons, 300);
      });
    }

    // Clicking the mouse scroller icon advances or loops telemetry strip
    if (mouseIcon) {
      mouseIcon.addEventListener('click', (e) => {
        e.preventDefault();
        audioManager.playClick();
        const maxScroll = strip.scrollWidth - strip.clientWidth;
        if (strip.scrollLeft >= maxScroll - 10) {
          strip.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          strip.scrollBy({ left: 180, behavior: 'smooth' });
        }
        setTimeout(updateScrollButtons, 300);
      });
    }

    // Mouse wheel support: convert vertical wheel deltaY to horizontal scroll
    strip.addEventListener('wheel', (e) => {
      if (e.deltaY !== 0 || e.deltaX !== 0) {
        e.preventDefault();
        const delta = e.deltaY !== 0 ? e.deltaY : e.deltaX;
        strip.scrollLeft += delta * 0.9;
        updateScrollButtons();
      }
    }, { passive: false });

    // Mouse drag support (grab & scroll with mouse)
    let isMouseDown = false;
    let startPageX = 0;
    let scrollStartLeft = 0;

    strip.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return; // Only main left click
      isMouseDown = true;
      startPageX = e.pageX;
      scrollStartLeft = strip.scrollLeft;
    });

    window.addEventListener('mouseup', () => {
      isMouseDown = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (!isMouseDown) return;
      e.preventDefault();
      const walk = (e.pageX - startPageX) * 1.3;
      strip.scrollLeft = scrollStartLeft - walk;
      updateScrollButtons();
    });

    strip.addEventListener('scroll', updateScrollButtons);
    window.addEventListener('resize', updateScrollButtons);
    setTimeout(updateScrollButtons, 150);

    // Clicking "Active Alerts" pill switches to Live Alerts tab
    if (alertsPill) {
      alertsPill.addEventListener('click', () => {
        audioManager.playClick();
        this.switchTab('pane-alerts');
        if (!this.isDrawerOpen) {
          this.toggleDrawer(true);
        }
      });
    }
  }

  /**
   * Mobile Notification Manager Setup & Event Listeners
   */
  initNotificationManager() {
    this.updateNotificationModalUI();

    // Setup Topic Input Live Change
    const topicInput = document.getElementById('ntfy-topic-input');
    if (topicInput) {
      topicInput.addEventListener('input', (e) => {
        this.notifications.setTopic(e.target.value);
        this.updateNotificationModalUI(false);
      });
    }

    // Copy Topic Button
    const copyTopicBtn = document.getElementById('btn-copy-topic');
    if (copyTopicBtn) {
      copyTopicBtn.addEventListener('click', async () => {
        audioManager.playClick();
        try {
          await navigator.clipboard.writeText(this.notifications.getTopic());
          copyTopicBtn.textContent = 'Copied! ✓';
          setTimeout(() => { copyTopicBtn.textContent = 'Copy'; }, 2000);
        } catch (err) {
          copyTopicBtn.textContent = 'Copied';
        }
      });
    }

    // Regenerate Random Topic Button
    const regenBtn = document.getElementById('btn-regen-topic');
    if (regenBtn) {
      regenBtn.addEventListener('click', () => {
        audioManager.playClick();
        this.notifications.generateNewTopic();
        this.updateNotificationModalUI(true);
      });
    }

    // Copy Link Button
    const copyUrlBtn = document.getElementById('btn-copy-url');
    if (copyUrlBtn) {
      copyUrlBtn.addEventListener('click', async () => {
        audioManager.playClick();
        try {
          await navigator.clipboard.writeText(this.notifications.getSubscriptionUrl());
          copyUrlBtn.textContent = 'Link Copied! ✓';
          setTimeout(() => { copyUrlBtn.textContent = '📋 Copy Link'; }, 2000);
        } catch (err) {
          copyUrlBtn.textContent = 'Copied';
        }
      });
    }

    // Send Test Alert Button
    const testBtn = document.getElementById('btn-send-test-push');
    const feedbackEl = document.getElementById('ntfy-test-status');
    if (testBtn) {
      testBtn.addEventListener('click', async () => {
        audioManager.playClick();
        testBtn.disabled = true;
        if (feedbackEl) {
          feedbackEl.className = 'ntfy-test-feedback-box sending';
          feedbackEl.innerHTML = `
            <span class="feedback-icon">⏳</span>
            <span class="feedback-text">Contacting ntfy.sh and dispatching test payload to channel <strong>${this.notifications.getTopic()}</strong>...</span>
          `;
        }

        const res = await this.notifications.sendTestNotification();
        testBtn.disabled = false;

        if (res.success && feedbackEl) {
          feedbackEl.className = 'ntfy-test-feedback-box success';
          feedbackEl.innerHTML = `
            <span class="feedback-icon">✅</span>
            <span class="feedback-text"><strong>Delivered in ${res.record.latencyMs}ms!</strong> Notification pushed to your phone. Check your phone lock screen or browser.</span>
          `;
          audioManager.playAlert('moderate');
        } else if (feedbackEl) {
          feedbackEl.className = 'ntfy-test-feedback-box error';
          feedbackEl.innerHTML = `
            <span class="feedback-icon">⚠️</span>
            <span class="feedback-text">Push failed: ${res.error}. Verify network connection to ntfy.sh.</span>
          `;
        }

        this.renderNotificationHistory();
      });
    }

    // Automated Push Toggle
    const autoToggle = document.getElementById('ntfy-auto-toggle');
    if (autoToggle) {
      autoToggle.checked = this.notifications.config.autoPush;
      autoToggle.addEventListener('change', (e) => {
        this.notifications.config.autoPush = e.target.checked;
        this.notifications.saveConfig();
      });
    }

    // Minimum Severity Trigger Dropdown
    const sevSelect = document.getElementById('ntfy-severity-select');
    if (sevSelect) {
      sevSelect.value = this.notifications.config.minSeverity;
      sevSelect.addEventListener('change', (e) => {
        this.notifications.config.minSeverity = e.target.value;
        this.notifications.saveConfig();
      });
    }

    // Listen to all push events for toast notification and audit log
    this.notifications.onNotificationSent = (event) => {
      this.showToast(event);
      this.renderNotificationHistory();
    };

    this.renderNotificationHistory();
  }

  updateNotificationModalUI(updateInputField = true) {
    const topic = this.notifications.getTopic();
    const url = this.notifications.getSubscriptionUrl();
    const qrUrl = this.notifications.getQrCodeUrl();

    if (updateInputField) {
      const topicInput = document.getElementById('ntfy-topic-input');
      if (topicInput) topicInput.value = topic;
    }

    const openWebLink = document.getElementById('link-open-ntfy-web');
    if (openWebLink) openWebLink.href = url;

    const qrImg = document.getElementById('ntfy-qr-image');
    if (qrImg) qrImg.src = qrUrl;

    const qrDisplay = document.getElementById('ntfy-qr-topic-display');
    if (qrDisplay) qrDisplay.textContent = `ntfy.sh/${topic}`;

    const headerStatus = document.getElementById('ntfy-header-status');
    if (headerStatus) headerStatus.textContent = topic.length > 15 ? `${topic.substring(0, 12)}...` : topic;
  }

  openNotificationModal() {
    this.updateNotificationModalUI();
    this.renderNotificationHistory();
    const modal = document.getElementById('modal-ntfy');
    if (modal) {
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
    }
  }

  closeNotificationModal() {
    audioManager.playClick();
    const modal = document.getElementById('modal-ntfy');
    if (modal) {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
    }
  }

  renderNotificationHistory() {
    const listEl = document.getElementById('ntfy-history-list');
    if (!listEl) return;

    const items = this.notifications.history;
    if (!items || items.length === 0) {
      listEl.innerHTML = '<div class="ntfy-history-empty">No alerts dispatched yet this session. Click "Send Test Alert" above to begin.</div>';
      return;
    }

    listEl.innerHTML = items.map(item => `
      <div class="ntfy-history-item">
        <div class="ntfy-hist-left">
          <span class="ntfy-hist-time">${item.time}</span>
          <span class="ntfy-hist-title">${item.title}</span>
        </div>
        <span class="ntfy-hist-badge">${item.status === 'Delivered' ? `${item.latencyMs}ms ✓` : 'Error'}</span>
      </div>
    `).join('');
  }

  showToast({ success, record, topic }) {
    const container = document.getElementById('notification-toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    const isCrit = record && record.priority >= 5;
    toast.className = `notification-toast ${isCrit ? 'toast-critical' : 'toast-success'}`;

    const icon = success ? '📡' : '⚠️';
    const statusText = success ? `Phone Alert Dispatched · ntfy.sh/${topic || this.notifications.getTopic()}` : 'Push Failed';

    toast.innerHTML = `
      <div class="toast-top-row">
        <span>${icon} ${statusText}</span>
        <span class="toast-time">${record?.time || new Date().toLocaleTimeString()}</span>
      </div>
      <div class="toast-title">${record?.title || 'Notification'}</div>
      <div class="toast-desc">${(record?.message || '').substring(0, 120)}</div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('closing');
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  }

  /**
   * Switch active tab in bottom drawer
   */
  switchTab(targetPaneId) {
    this.activeTabId = targetPaneId;

    // Update Dock Tabs
    document.querySelectorAll('.dock-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === targetPaneId);
    });

    // Update Panes
    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.toggle('active', pane.id === targetPaneId);
    });

    // Update Drawer Header Title
    const titleIcon = document.getElementById('drawer-title-icon');
    const titleText = document.getElementById('drawer-title-text');
    const subtitle = document.getElementById('drawer-subtitle');

    switch (targetPaneId) {
      case 'pane-impacts':
        if (titleIcon) titleIcon.textContent = '⚡';
        if (titleText) titleText.textContent = 'Sector Impact Matrix';
        if (subtitle) subtitle.textContent = 'Real-time planetary infrastructure vulnerability';
        break;
      case 'pane-alerts':
        if (titleIcon) titleIcon.textContent = '🚨';
        if (titleText) titleText.textContent = 'Planetary Alert Feed';
        if (!this.api.parsedAlerts || this.api.parsedAlerts.length === 0) {
          this.api.rawAlerts = FALLBACK_RAW_ALERTS;
          this.api.parsedAlerts = this.api.parseNoaaAlerts(FALLBACK_RAW_ALERTS);
        }
        if (subtitle) subtitle.textContent = `${this.api.parsedAlerts.length} live space weather messages from NOAA SWPC`;
        this.renderAlertStream();
        break;
      case 'pane-regions':
        if (titleIcon) titleIcon.textContent = '🌐';
        if (titleText) titleText.textContent = 'Geographic Focus & Legend';
        if (subtitle) subtitle.textContent = 'Navigate critical planetary corridors and color keys';
        break;
      case 'pane-inspector':
        if (titleIcon) titleIcon.textContent = '📋';
        if (titleText) titleText.textContent = 'System Diagnostics & Mitigation';
        if (subtitle) subtitle.textContent = 'Infrastructure vulnerability details and operating guidelines';
        break;
    }
  }

  /**
   * Open or collapse the bottom slide-up drawer
   */
  toggleDrawer(shouldOpen) {
    this.isDrawerOpen = shouldOpen;
    const drawer = document.getElementById('bottom-drawer');
    const toggleIcon = document.getElementById('toggle-drawer-icon');

    if (drawer) {
      drawer.classList.toggle('collapsed', !this.isDrawerOpen);
    }

    if (toggleIcon) {
      toggleIcon.innerHTML = this.isDrawerOpen
        ? `<polyline points="6 9 12 15 18 9"/>` // Point down when open
        : `<polyline points="18 15 12 9 6 15"/>`; // Point up when closed
    }
  }

  /**
   * Fetch and display telemetry & alerts
   */
  async loadData() {
    const data = await this.api.loadLiveTelemetry();
    this.updateUI(data);
  }

  async applyScenario(presetId) {
    const data = await this.api.setScenario(presetId);
    this.updateUI(data);

    // Audio cue
    if (this.api.telemetry.overallStatus === 'status-critical' || this.api.telemetry.overallStatus === 'status-severe') {
      audioManager.playWarningChord();
    } else {
      audioManager.playAlert('moderate');
    }
  }

  updateUI(data) {
    const { telemetry, alerts } = data;

    // 1. Top Bar Telemetry Strip
    const kpEl = document.getElementById('val-kp');
    if (kpEl) kpEl.textContent = telemetry.kp.toFixed(1);

    const gScaleEl = document.getElementById('badge-g-scale');
    if (gScaleEl) {
      const gVal = telemetry.scales.G;
      gScaleEl.textContent = `G${gVal}`;
      gScaleEl.className = `telemetry-sub ${this.getSeverityClassForScale(gVal)}`;
    }

    const speedEl = document.getElementById('val-wind-speed');
    if (speedEl) speedEl.textContent = `${telemetry.solarWindSpeed} km/s`;

    const bzEl = document.getElementById('val-bz');
    if (bzEl) {
      const sign = telemetry.bz > 0 ? '+' : '';
      bzEl.textContent = `${sign}${telemetry.bz.toFixed(1)} nT`;
      bzEl.style.color = telemetry.bz < -10 ? '#DC2626' : (telemetry.bz < 0 ? '#D97706' : '#0F172A');
    }

    const threatBadge = document.getElementById('threat-status-badge');
    const threatText = document.getElementById('threat-status-text');
    if (threatText) {
      threatText.textContent = telemetry.statusLabel;
    } else if (threatBadge) {
      threatBadge.innerHTML = `<span class="pulse-dot"></span><span id="threat-status-text">${telemetry.statusLabel}</span>`;
    }
    if (threatBadge) {
      threatBadge.className = `live-pulse-badge ${telemetry.overallStatus}`;
    }

    const alertCountEl = document.getElementById('val-alert-count');
    if (alertCountEl) alertCountEl.textContent = `${alerts.length} Active`;

    // 1b. Additional Live Space Weather Indicators (R-scale, S-scale, Aurora)
    const rVal = telemetry.scales?.R ?? 0;
    const rEl = document.getElementById('val-r-scale');
    const rBadge = document.getElementById('badge-r-scale');
    if (rEl) rEl.textContent = `R${rVal}`;
    if (rBadge) {
      rBadge.textContent = rVal >= 3 ? 'Blackout' : (rVal >= 1 ? 'Minor' : 'Quiet');
      rBadge.className = `telemetry-sub ${rVal >= 3 ? 'status-critical' : (rVal >= 1 ? 'status-moderate' : 'status-nominal')}`;
    }

    const sVal = telemetry.scales?.S ?? 0;
    const sEl = document.getElementById('val-s-scale');
    const sBadge = document.getElementById('badge-s-scale');
    if (sEl) sEl.textContent = `S${sVal}`;
    if (sBadge) {
      sBadge.textContent = sVal >= 3 ? 'Storm' : (sVal >= 1 ? 'Elevated' : 'Normal');
      sBadge.className = `telemetry-sub ${sVal >= 3 ? 'status-critical' : (sVal >= 1 ? 'status-moderate' : 'status-nominal')}`;
    }

    const reachedLat = Math.max(42, Math.round(68.0 - (telemetry.kp / 9.0) * 26.0));
    const auroraTopEl = document.getElementById('val-aurora-top');
    if (auroraTopEl) auroraTopEl.textContent = `${reachedLat}° N`;

    const dockAlertBadge = document.getElementById('dock-alert-badge');
    if (dockAlertBadge) dockAlertBadge.textContent = `${alerts.length}`;

    // 2. Update Globe Auroral Oval Intensity & Map ONLY Live Alerts
    if (this.globe) {
      this.globe.updateAuroraIntensity(telemetry.kp);
      this.globe.updateAlertMarkers(alerts);
    }

    // 3. Update Sector Impact Meters
    this.updateImpactMeters(telemetry);

    // 4. Render Alert Stream
    this.renderAlertStream();

    // 4b. Sync drawer subtitle if alerts pane is active
    if (this.activeTabId === 'pane-alerts') {
      const subtitle = document.getElementById('drawer-subtitle');
      if (subtitle) subtitle.textContent = `${this.api.parsedAlerts.length} live space weather messages from NOAA SWPC`;
    }

    // 5. Check Automated Mobile Phone Dispatch Rules
    this.notifications.checkAndAutoDispatch(telemetry, alerts);
  }

  updateImpactMeters(telemetry) {
    const kp = telemetry.kp;
    const g = telemetry.scales.G;
    const r = telemetry.scales.R;
    const s = telemetry.scales.S;

    // Power Grid Meter
    const powerPct = Math.min(100, Math.max(10, Math.round((kp / 9.0) * 100)));
    const powerFill = document.getElementById('meter-power-fill');
    const powerVal = document.getElementById('meter-power-val');
    const powerBadge = document.getElementById('badge-power-status');
    if (powerFill) powerFill.style.width = `${powerPct}%`;
    if (powerVal) powerVal.textContent = `${(kp * 14.5).toFixed(0)} A (DC est)`;
    if (powerBadge) {
      powerBadge.textContent = kp >= 7 ? 'Critical GIC' : (kp >= 4 ? 'Elevated' : 'Nominal');
      powerBadge.className = `impact-badge ${kp >= 7 ? 'status-critical' : (kp >= 4 ? 'status-moderate' : 'status-nominal')}`;
    }

    // Comms & Navigation Meter
    const commsPct = Math.min(100, Math.max(12, Math.round((Math.max(r, kp * 0.7) / 5.0) * 100)));
    const commsFill = document.getElementById('meter-comms-fill');
    const commsVal = document.getElementById('meter-comms-val');
    const commsBadge = document.getElementById('badge-comms-status');
    if (commsFill) commsFill.style.width = `${commsPct}%`;
    if (commsVal) commsVal.textContent = `S4 ${(0.15 + (commsPct / 100) * 0.75).toFixed(2)}`;
    if (commsBadge) {
      commsBadge.textContent = r >= 3 || kp >= 7 ? 'High Scintillation' : (r >= 1 ? 'Degraded' : 'Nominal');
      commsBadge.className = `impact-badge ${r >= 3 || kp >= 7 ? 'status-severe' : (r >= 1 ? 'status-moderate' : 'status-nominal')}`;
    }

    // Satellite & Aviation Meter
    const satPct = Math.min(100, Math.max(10, Math.round((Math.max(s, (telemetry.solarWindSpeed - 300) / 600 * 5) / 5.0) * 100)));
    const satFill = document.getElementById('meter-sat-fill');
    const satVal = document.getElementById('meter-sat-val');
    const satBadge = document.getElementById('badge-sat-status');
    if (satFill) satFill.style.width = `${satPct}%`;
    if (satVal) satVal.textContent = `${(1.2 + (satPct / 100) * 15.0).toFixed(1)} µSv/hr`;
    if (satBadge) {
      satBadge.textContent = s >= 3 || satPct > 70 ? 'High Drag/SEU' : (satPct > 35 ? 'Advisory' : 'Nominal');
      satBadge.className = `impact-badge ${s >= 3 || satPct > 70 ? 'status-critical' : (satPct > 35 ? 'status-moderate' : 'status-nominal')}`;
    }

    // Auroral Oval Southern Extent
    const reachedLat = Math.max(42, Math.round(68.0 - (kp / 9.0) * 26.0));
    const auroraLatEl = document.getElementById('aurora-extent-lat');
    if (auroraLatEl) auroraLatEl.textContent = `${reachedLat}° N Latitude`;

    const auroraFill = document.getElementById('meter-aurora-fill');
    const auroraVal = document.getElementById('meter-aurora-val');
    const auroraBadge = document.getElementById('badge-aurora-status');
    if (auroraFill) auroraFill.style.width = `${Math.min(100, Math.round((kp / 9.0) * 100))}%`;
    if (auroraVal) auroraVal.textContent = `Kp ${kp.toFixed(1)}`;
    if (auroraBadge) {
      auroraBadge.textContent = kp >= 7 ? 'Mid-Latitude Reach' : (kp >= 4 ? 'Expanding' : 'Polar Bound');
      auroraBadge.className = `impact-badge ${kp >= 7 ? 'status-critical' : (kp >= 4 ? 'status-moderate' : 'status-nominal')}`;
    }
  }

  /**
   * Render alert stream in Live Alerts pane
   */
  renderAlertStream() {
    const listContainer = document.getElementById('alert-stream-list');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    // Safety guard: ensure alerts array is never empty
    if (!this.api.parsedAlerts || this.api.parsedAlerts.length === 0) {
      if (this.api.rawAlerts && this.api.rawAlerts.length > 0) {
        this.api.parsedAlerts = this.api.parseNoaaAlerts(this.api.rawAlerts);
      } else {
        this.api.rawAlerts = FALLBACK_RAW_ALERTS;
        this.api.parsedAlerts = this.api.parseNoaaAlerts(FALLBACK_RAW_ALERTS);
      }
    }

    // Update category pill counts and active state
    const countAll = this.api.parsedAlerts.length;
    const countPower = this.api.parsedAlerts.filter(a => a.category === 'power_grid').length;
    const countComms = this.api.parsedAlerts.filter(a => a.category === 'communication_navigation').length;
    const countSat = this.api.parsedAlerts.filter(a => a.category === 'satellite_aviation').length;

    const elAll = document.getElementById('count-pill-all');
    if (elAll) elAll.textContent = countAll;
    const elPower = document.getElementById('count-pill-power');
    if (elPower) elPower.textContent = countPower;
    const elComms = document.getElementById('count-pill-comms');
    if (elComms) elComms.textContent = countComms;
    const elSat = document.getElementById('count-pill-sat');
    if (elSat) elSat.textContent = countSat;

    // Synchronize bottom dock Live Alerts badge and top bar counter
    const dockBadge = document.getElementById('dock-alert-badge');
    if (dockBadge) dockBadge.textContent = `${countAll}`;
    const valAlertCount = document.getElementById('val-alert-count');
    if (valAlertCount) valAlertCount.textContent = `${countAll} Active`;

    // Sync active category pill styling across panes
    document.querySelectorAll('.alert-cat-pill').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.category === this.currentCategoryFilter);
    });
    document.querySelectorAll('.filter-pill').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.category === this.currentCategoryFilter);
    });

    let filtered = this.api.parsedAlerts;

    // Apply Category Filter
    if (this.currentCategoryFilter !== 'all') {
      filtered = filtered.filter(a => a.category === this.currentCategoryFilter);
    }

    // Apply Search Query
    if (this.searchQuery) {
      const q = this.searchQuery;
      filtered = filtered.filter(a =>
        (a.title && a.title.toLowerCase().includes(q)) ||
        (a.plainTitle && a.plainTitle.toLowerCase().includes(q)) ||
        (a.summary && a.summary.toLowerCase().includes(q)) ||
        (a.whatIsHappening && a.whatIsHappening.toLowerCase().includes(q)) ||
        (a.officialCode && a.officialCode.toLowerCase().includes(q)) ||
        (a.serialNumber && a.serialNumber.toLowerCase().includes(q)) ||
        (a.category && a.category.toLowerCase().includes(q)) ||
        (a.target && a.target.name && a.target.name.toLowerCase().includes(q)) ||
        (a.affectedAreas && a.affectedAreas.toLowerCase().includes(q))
      );
    }

    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 28px; text-align: center; color: var(--text-muted); font-size: 13px;">
          <p style="margin-bottom: 10px; font-weight: 500;">No active alerts matching current filters (${this.currentCategoryFilter}).</p>
          <button id="btn-reset-alert-filters" style="padding: 7px 16px; background: #0284C7; color: white; border: none; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
            <span>🔄 Show All ${this.api.parsedAlerts.length} Alerts</span>
          </button>
        </div>
      `;
      const resetBtn = document.getElementById('btn-reset-alert-filters');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          this.currentCategoryFilter = 'all';
          this.searchQuery = '';
          const sInput = document.getElementById('alert-search-input');
          if (sInput) sInput.value = '';
          this.renderAlertStream();
        });
      }
      return;
    }

    filtered.forEach(alert => {
      const card = document.createElement('div');
      card.className = `alert-item-card ${this.selectedAlertId === alert.id ? 'selected' : ''}`;
      card.dataset.alertId = alert.id;

      const categoryLabel = this.formatCategoryName(alert.category);
      const categoryColor = this.getCategoryColorClass(alert.category);
      const sevClass = `status-${alert.severity}`;

      const authorityLabel = alert.authority || 'NOAA Space Weather Prediction Center (SWPC)';
      const serialLabel = alert.serialNumber ? ` · ${alert.serialNumber}` : '';
      const codeLabel = alert.officialCode || alert.rawProductId || 'NOAA SWPC';

      const expectedHitText = alert.expectedHit || 'Immediate / Impact in progress';
      const issuedText = alert.issuedAt || alert.issue_datetime || 'NOAA SWPC';
      const displayTitle = (alert.plainTitle || alert.title).replace(/[\[\]]/g, '');
      const displaySummary = (alert.whatIsHappening || alert.summary).replace(/[\[\]]/g, '');

      card.innerHTML = `
        <div class="alert-card-top-content">
          <div class="alert-item-header">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span class="alert-category-tag ${categoryColor}">
                ${categoryLabel}
              </span>
              <span class="alert-code-pill">${codeLabel}${serialLabel}</span>
            </div>
            <span class="alert-time">${this.formatAlertTime(alert.issue_datetime)}</span>
          </div>
          <div class="alert-authority-row">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span>${authorityLabel}</span>
          </div>
          <div class="alert-title">${displayTitle}</div>

          <!-- Official NOAA Exact Timing & Hit Banner -->
          <div class="alert-timing-banner ${sevClass}">
            <div class="timing-badge-item">
              <span class="timing-label">⏰ Expected Hit:</span>
              <span class="timing-val">${expectedHitText}</span>
            </div>
            <div class="timing-badge-item sub">
              <span class="timing-label">📡 Issued:</span>
              <span class="timing-val-sub">${issuedText}</span>
            </div>
          </div>

          <div class="alert-summary-snippet">${displaySummary}</div>
        </div>

        <div class="alert-footer">
          <span class="impact-badge ${sevClass}">${alert.scale || 'OFFICIAL ALERT'}</span>
          <div style="display: flex; align-items: center; gap: 6px;">
            <button class="btn-card-push-phone" title="Push this alert to your phone via ntfy.sh">📱 Push</button>
            <button class="btn-card-inspect" title="Inspect full diagnostics and system protocol">Inspect Details →</button>
          </div>
        </div>
      `;

      const pushBtn = card.querySelector('.btn-card-push-phone');
      if (pushBtn) {
        pushBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          pushBtn.textContent = 'Pushing...';
          pushBtn.disabled = true;
          const res = await this.notifications.sendAlertItem(alert);
          if (res.success) {
            pushBtn.textContent = 'Sent ✓';
            pushBtn.classList.add('sent');
            audioManager.playAlert('moderate');
            setTimeout(() => {
              pushBtn.textContent = '📱 Push';
              pushBtn.classList.remove('sent');
              pushBtn.disabled = false;
            }, 3000);
          } else {
            pushBtn.textContent = 'Failed';
            setTimeout(() => {
              pushBtn.textContent = '📱 Push';
              pushBtn.disabled = false;
            }, 2000);
          }
        });
      }

      const inspectBtn = card.querySelector('.btn-card-inspect');
      if (inspectBtn) {
        inspectBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.handleInspectAlertClick(alert, card);
        });
      }

      card.addEventListener('click', (e) => {
        // If clicking button inside card, don't trigger card fly
        if (e.target.closest('.btn-card-push-phone') || e.target.closest('.btn-card-inspect')) return;
        this.handleAlertCardClick(alert, card);
      });

      listContainer.appendChild(card);
    });
  }

  /**
   * Handle clicking directly on an alert card:
   * Smoothly flies the 3D globe to the alert marker, highlights the marker,
   * updates the inspector in background, WITHOUT opening the full-screen modal!
   */
  handleAlertCardClick(alert, cardEl = null) {
    this.selectedAlertId = alert.id;
    document.querySelectorAll('.alert-item-card').forEach(c => c.classList.remove('selected'));
    if (cardEl) {
      cardEl.classList.add('selected');
    } else {
      const targetCard = document.querySelector(`.alert-item-card[data-alert-id="${alert.id}"]`);
      if (targetCard) targetCard.classList.add('selected');
    }

    audioManager.playAlert(alert.severity);

    // Fly globe directly to this alert's coordinates
    let markerItem = null;
    if (this.globe) {
      const marker = this.globe.focusAlertById(alert.id);
      if (marker) {
        markerItem = marker.userData?.item;
      } else if (alert.target) {
        this.globe.flyTo(alert.target.lat, alert.target.lon, 260, 850);
        markerItem = alert.target;
      }
    }

    // Populate System Inspector data in background without modal and without changing tabs
    this.showInspector(markerItem || alert.target, alert, false);
  }

  /**
   * Handle clicking "Inspect Details →":
   * Switches to System Inspector tab, opens the console drawer, populates diagnostics,
   * and opens the dedicated details modal for deep review.
   */
  handleInspectAlertClick(alert, cardEl = null) {
    this.selectedAlertId = alert.id;
    document.querySelectorAll('.alert-item-card').forEach(c => c.classList.remove('selected'));
    if (cardEl) {
      cardEl.classList.add('selected');
    } else {
      const targetCard = document.querySelector(`.alert-item-card[data-alert-id="${alert.id}"]`);
      if (targetCard) targetCard.classList.add('selected');
    }

    audioManager.playAlert(alert.severity);

    let markerItem = null;
    if (this.globe) {
      const marker = this.globe.focusAlertById(alert.id);
      if (marker) {
        markerItem = marker.userData?.item;
      } else if (alert.target) {
        this.globe.flyTo(alert.target.lat, alert.target.lon, 260, 850);
        markerItem = alert.target;
      }
    }

    // Switch to System Inspector tab and open drawer
    this.showInspector(markerItem || alert.target, alert, true);

    // Also open the full details modal dialog
    this.openAlertModal(alert, markerItem || alert.target);
  }

  triggerAlertSelection(alert, cardEl = null) {
    this.handleAlertCardClick(alert, cardEl);
  }

  showInspector(infrastructureItem, associatedAlert = null, shouldSwitchTab = true) {
    // If infrastructureItem is missing, construct from associatedAlert
    if (!infrastructureItem && associatedAlert) {
      infrastructureItem = {
        name: associatedAlert.plainTitle || associatedAlert.title || 'Monitored Space Weather Node',
        region: associatedAlert.affectedAreas || 'Global Planetary Grid',
        lat: associatedAlert.target?.lat ?? 58.0,
        lon: associatedAlert.target?.lon ?? -70.0,
        type: associatedAlert.category || 'power_grid',
        riskVulnerability: associatedAlert.scale || associatedAlert.severity || 'Elevated',
        description: associatedAlert.whatIsHappening || associatedAlert.summary || 'Active space weather event.',
        failureRisks: [associatedAlert.whatToExpect || 'Monitored operational fluctuations.'],
        mitigations: [associatedAlert.impactDetails?.mitigation || 'Monitor real-time NOAA SWPC telemetry.'],
        associatedAlert: associatedAlert
      };
    } else if (infrastructureItem && !associatedAlert && infrastructureItem.associatedAlert) {
      associatedAlert = infrastructureItem.associatedAlert;
    }

    if (!infrastructureItem) return;

    this.activeInspectedItem = infrastructureItem;
    this.activeInspectedAlert = associatedAlert;

    const dispatchBtn = document.getElementById('btn-dispatch-mitigation');
    if (dispatchBtn) {
      dispatchBtn.disabled = false;
      dispatchBtn.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        <span>Push to Phone</span>
      `;
    }

    // Coordinates safe formatting
    const latStr = (typeof infrastructureItem.lat === 'number') ? `${infrastructureItem.lat.toFixed(1)}°` : '--';
    const lonStr = (typeof infrastructureItem.lon === 'number') ? `${infrastructureItem.lon.toFixed(1)}°` : '--';

    const titleEl = document.getElementById('inspector-title');
    if (titleEl) titleEl.textContent = infrastructureItem.name || 'Monitored Node';

    const regionEl = document.getElementById('inspector-region');
    if (regionEl) {
      const alertMeta = associatedAlert ? ` · ${associatedAlert.officialCode || 'NOAA'} ${associatedAlert.serialNumber || ''}`.replace(/[\[\]]/g, '') : '';
      regionEl.textContent = `${infrastructureItem.region || 'Monitored Sector'} · [${latStr}, ${lonStr}]${alertMeta}`;
    }

    const typeBadge = document.getElementById('inspector-type-badge');
    if (typeBadge) {
      const typeKey = infrastructureItem.type || associatedAlert?.category || 'power_grid';
      typeBadge.textContent = this.formatCategoryName(typeKey);
      typeBadge.className = `alert-category-tag ${this.getCategoryColorClass(typeKey)}`;
    }

    const vulnBadge = document.getElementById('inspector-vuln-badge');
    if (vulnBadge) {
      const vulnText = infrastructureItem.riskVulnerability || associatedAlert?.scale || associatedAlert?.severity || 'Active';
      vulnBadge.textContent = `${vulnText} Risk`;
      vulnBadge.className = `impact-badge ${vulnText === 'Critical' ? 'status-critical' : 'status-strong'}`;
    }

    const descEl = document.getElementById('inspector-desc');
    if (descEl) {
      if (associatedAlert) {
        const expectedHitText = associatedAlert.expectedHit || 'Immediate / Active Storm';
        const issuedText = associatedAlert.issuedAt || associatedAlert.issue_datetime || 'NOAA SWPC';
        const whatHappening = String(associatedAlert.whatIsHappening || associatedAlert.summary || infrastructureItem.description || '').replace(/[\[\]]/g, '');
        const whatExpect = String(associatedAlert.whatToExpect || infrastructureItem.description || whatHappening).replace(/[\[\]]/g, '');
        const infraDesc = String(infrastructureItem.description || whatHappening).replace(/[\[\]]/g, '');

        descEl.innerHTML = `
          <div class="alert-timing-banner ${associatedAlert.severity ? `status-${associatedAlert.severity}` : ''}" style="margin-bottom: 12px;">
            <div class="timing-badge-item">
              <span class="timing-label">⏰ Expected Hit Window:</span>
              <span class="timing-val">${expectedHitText}</span>
            </div>
            <div class="timing-badge-item sub">
              <span class="timing-label">📡 Official Bulletin Issued:</span>
              <span class="timing-val-sub">${issuedText}</span>
            </div>
          </div>
          <strong>What Is Happening:</strong><br>${whatHappening}<br><br>
          <strong>Impact on Node:</strong><br>${whatExpect}<br><br>
          <strong>Infrastructure Details:</strong><br>${infraDesc}
        `;
      } else {
        descEl.textContent = infrastructureItem.description || 'Active space weather monitoring.';
      }
    }

    // Failure Risks list
    const risksList = document.getElementById('inspector-risks');
    if (risksList) {
      const risks = Array.isArray(infrastructureItem.failureRisks) && infrastructureItem.failureRisks.length > 0
        ? infrastructureItem.failureRisks
        : (associatedAlert?.whatToExpect ? [associatedAlert.whatToExpect] : ['Active space weather event monitored by NOAA.']);
      risksList.innerHTML = risks.map(r => `<li>${String(r).replace(/[\[\]]/g, '')}</li>`).join('');
    }

    // Mitigations list
    const mitigationsList = document.getElementById('inspector-mitigations');
    if (mitigationsList) {
      const mitigations = Array.isArray(infrastructureItem.mitigations) && infrastructureItem.mitigations.length > 0
        ? infrastructureItem.mitigations
        : (associatedAlert?.impactDetails?.mitigation ? [associatedAlert.impactDetails.mitigation] : ['Monitor NOAA SWPC real-time telemetry.']);
      mitigationsList.innerHTML = mitigations.map(m => `<li>${String(m).replace(/[\[\]]/g, '')}</li>`).join('');
    }

    // Update Dock Subtitle
    const dockInspectSub = document.getElementById('dock-inspector-sub');
    if (dockInspectSub) {
      const firstWord = String(infrastructureItem.name || 'System').split(' ')[0];
      dockInspectSub.textContent = firstWord;
    }

    // Optionally switch to Inspector tab and open drawer
    if (shouldSwitchTab) {
      this.switchTab('pane-inspector');
      if (!this.isDrawerOpen) {
        this.toggleDrawer(true);
      }
    }
  }

  /**
   * Primary alert inspection orchestrator:
   * Keeps the bottom dock inspector in sync AND opens the dedicated Alert Details Modal.
   */
  showAlertDetails(alert, item = null) {
    if (!alert && !item) return;

    if (!item && alert?.target) item = alert.target;
    if (!alert && item?.associatedAlert) alert = item.associatedAlert;

    // 1. Synchronize bottom dock System Inspector data without disrupting active tab
    this.showInspector(item, alert, false);

    // 2. Open dedicated Alert Details Modal for immediate on-screen inspection
    this.openAlertModal(alert, item);
  }

  /**
   * Populate and display the Alert Details Modal
   */
  openAlertModal(alert, item = null) {
    this.activeModalAlert = alert;
    this.activeModalItem = item;

    const modal = document.getElementById('modal-alert-details');
    if (!modal) return;

    audioManager.playFocus();

    const iconEl = document.getElementById('modal-alert-icon');
    const catTag = document.getElementById('modal-alert-category-tag');
    const scaleBadge = document.getElementById('modal-alert-scale-badge');
    const codePill = document.getElementById('modal-alert-code-pill');
    const titleEl = document.getElementById('modal-alert-title');
    const authEl = document.getElementById('modal-alert-authority');
    const timingBanner = document.getElementById('modal-alert-timing-banner');
    const hitTimeEl = document.getElementById('modal-alert-hit-time');
    const issuedTimeEl = document.getElementById('modal-alert-issued-time');
    const regionEl = document.getElementById('modal-alert-region');
    const whatHappeningEl = document.getElementById('modal-alert-what-happening');
    const whatExpectEl = document.getElementById('modal-alert-what-expect');
    const mitigationEl = document.getElementById('modal-alert-mitigation');
    const rawMsgEl = document.getElementById('modal-alert-raw-msg');

    const category = alert?.category || item?.type || 'power_grid';
    const scale = alert?.scale || alert?.severity || 'G1';
    const icon = category === 'power_grid' ? '⚡' : (category === 'communication_navigation' ? '📡' : '🛰️');

    if (iconEl) iconEl.textContent = icon;

    if (catTag) {
      catTag.textContent = this.formatCategoryName(category);
      catTag.className = `alert-category-tag ${this.getCategoryColorClass(category)}`;
    }

    if (scaleBadge) {
      scaleBadge.textContent = `${scale} Risk`;
      const isCritical = scale.includes('3') || scale.includes('4') || scale.includes('5') || alert?.severity === 'critical';
      scaleBadge.className = `impact-badge ${isCritical ? 'status-critical' : 'status-severe'}`;
    }

    if (codePill) {
      const code = alert?.officialCode || 'NOAA SWPC';
      const serial = alert?.serialNumber ? ` · ${alert.serialNumber}` : '';
      codePill.textContent = `${code}${serial}`.replace(/[\[\]]/g, '');
    }

    if (titleEl) {
      titleEl.textContent = String(alert?.plainTitle || alert?.title || item?.name || 'Space Weather Disturbance Alert').replace(/[\[\]]/g, '');
    }

    if (authEl) {
      authEl.textContent = alert?.authority || 'NOAA Space Weather Prediction Center (SWPC) · Boulder, CO';
    }

    if (timingBanner) {
      timingBanner.className = `alert-timing-banner status-${alert?.severity || 'severe'}`;
    }

    if (hitTimeEl) {
      hitTimeEl.textContent = alert?.expectedHit || 'Immediate / Active Storm Condition';
    }

    if (issuedTimeEl) {
      issuedTimeEl.textContent = alert?.issuedAt || alert?.issue_datetime || 'NOAA SWPC Official Bulletin';
    }

    if (regionEl) {
      const latStr = (typeof item?.lat === 'number') ? `${item.lat.toFixed(1)}°` : (alert?.target?.lat ? `${alert.target.lat.toFixed(1)}°` : '--');
      const lonStr = (typeof item?.lon === 'number') ? `${item.lon.toFixed(1)}°` : (alert?.target?.lon ? `${alert.target.lon.toFixed(1)}°` : '--');
      const regionName = item?.region || alert?.affectedAreas || 'Global Planetary Grid';
      regionEl.textContent = `${regionName} · [${latStr}, ${lonStr}]`.replace(/[\[\]]/g, '');
    }

    if (whatHappeningEl) {
      const cleanHappening = String(alert?.whatIsHappening || alert?.summary || item?.description || 'Active space weather event detected by NOAA SWPC sensors.').replace(/[\[\]]/g, '');
      whatHappeningEl.textContent = cleanHappening;
    }

    if (whatExpectEl) {
      const cleanExpect = String(alert?.whatToExpect || item?.failureRisks?.[0] || 'Monitored operational fluctuations across planetary systems.').replace(/[\[\]]/g, '');
      whatExpectEl.textContent = cleanExpect;
    }

    if (mitigationEl) {
      const cleanMitigation = String(alert?.impactDetails?.mitigation || item?.mitigations?.[0] || 'Monitor NOAA SWPC real-time telemetry.').replace(/[\[\]]/g, '');
      mitigationEl.textContent = cleanMitigation;
    }

    if (rawMsgEl) {
      rawMsgEl.textContent = alert?.rawMessage || alert?.summary || 'No raw bulletin attached.';
    }

    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  }

  /**
   * Close the Alert Details Modal
   */
  closeAlertModal() {
    audioManager.playClick();
    const modal = document.getElementById('modal-alert-details');
    if (modal) {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
    }
  }

  handleRegionJump(regionKey) {
    switch (regionKey) {
      case 'global':
        this.globe.flyTo(20, 0, 330, 1100);
        break;
      case 'north-america':
        this.globe.flyTo(48, -85, 260, 1000);
        break;
      case 'scandinavia':
        this.globe.flyTo(64, 18, 260, 1000);
        break;
      case 'polar':
        this.globe.flyTo(82, -30, 280, 1000);
        break;
      case 'equatorial':
        this.globe.flyTo(4, 100, 270, 1000);
        break;
      case 'saa':
        this.globe.flyTo(-28, -50, 270, 1000);
        break;
    }
  }

  formatCategoryName(type) {
    switch (type) {
      case 'power_grid': return '⚡ Power Grid';
      case 'communication_navigation': return '📡 Comms & GPS';
      case 'satellite_aviation': return '🛰️ Sat & Aero';
      default: return '☀️ Space Weather';
    }
  }

  getCategoryColorClass(type) {
    switch (type) {
      case 'power_grid': return 'status-moderate';
      case 'communication_navigation': return 'status-strong';
      case 'satellite_aviation': return 'status-severe';
      default: return 'status-nominal';
    }
  }

  getSeverityClassForScale(gScale) {
    if (gScale >= 4) return 'status-critical';
    if (gScale >= 3) return 'status-severe';
    if (gScale >= 2) return 'status-strong';
    if (gScale >= 1) return 'status-moderate';
    return 'status-nominal';
  }

  formatAlertTime(datetimeStr) {
    try {
      const d = new Date(datetimeStr.replace(' ', 'T') + 'Z');
      if (isNaN(d.getTime())) return datetimeStr.substring(0, 16);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
    } catch (e) {
      return datetimeStr.substring(0, 16);
    }
  }

  startAutoRefresh() {
    this.refreshTimer = setInterval(async () => {
      if (this.api.currentScenario.isLive) {
        console.log('[Helioguard] Auto-refreshing NOAA space weather data...');
        await this.loadData();
      }
    }, 60000);
  }
}

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
  window.app = new HelioguardApp();
});
