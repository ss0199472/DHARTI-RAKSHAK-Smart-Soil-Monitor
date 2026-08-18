/**
 * ============================================================================
 * DHARTI RAKSHAK - MAIN APPLICATION & ADMIN CONTROLLER
 * ============================================================================
 * Coordinates Realtime Telemetry, Sensor UI Components, Crop Matrices,
 * Live LCD Screen Emulation, Historical Logs, CSV Exporting, and
 * Full Admin Panel (Power ON/OFF, Maintenance Mode, Team Member Editor).
 */

import { dataStream, firebaseConfig } from './firebase-config.js';
import { analyticsManager } from './charts.js';
import { aiEngine } from './ai-insights.js';
import { dhartiChatbot } from './chatbot.js';

class DhartiApp {
  constructor() {
    this.rawHistory = [];
    this.lcdCycleCount = 0;
    this.currentLatest = null;
    this.isDeviceOnline = false;
    this.isAdminLoggedIn = false;

    // Default System & Team Configuration
    this.systemConfig = {
      site_online: true,
      maintenance_msg: "The Dharti Rakshak system is currently undergoing scheduled sensor maintenance & telemetry upgrades. We will be back online shortly.",
      show_team: true,
      show_team_name: true,
      team_name: "Royal Challenger Kanpur",
      admin_pin: "1234",
      backend_url: localStorage.getItem('dharti_backend_url') || 'http://localhost:5000',
      team_members: [
        { id: "m1", name: "Namit Kumar", visible: true },
        { id: "m2", name: "Sanidhya Krishna Yadav", visible: true },
        { id: "m3", name: "Yugant Dwivedi", visible: true },
        { id: "m4", name: "Rudransh Uttam", visible: true }
      ]
    };
  }

  async init() {
    console.log("[Dharti Rakshak] Initializing Application with AI & Chatbot...");
    
    // 1. Load Admin & Team Configuration
    await this.loadSystemConfig();

    // 2. Initialize Analytics Charts, AI Engine, and Chatbot
    analyticsManager.initialize();
    aiEngine.setBackendUrl(this.systemConfig.backend_url);
    aiEngine.init();
    dhartiChatbot.setBackendUrl(this.systemConfig.backend_url);
    dhartiChatbot.init();

    // 3. Attach Event Handlers (Admin + UI)
    this.attachEventListeners();
    this.attachAdminEventListeners();

    // 4. Render Initial Team and System State
    this.renderTeamSection();
    this.applySitePowerState();

    // 5. Connect Realtime Data Stream
    dataStream.initialize();

    dataStream.onLatest((latest) => {
      if (latest && latest.hasData && this.isDeviceOnline) {
        this.currentLatest = latest;
        this.updateSensorCards(latest);
        this.updateHeroDiagnostics(latest);
        this.updateCropSuitability(latest);
        this.updateLcdEmulator(latest);
        analyticsManager.updateLiveNpk(latest.nitrogen, latest.phosphorus, latest.potassium);
        aiEngine.evaluateTelemetry(latest);
      } else {
        this.currentLatest = null;
        this.renderOfflineState();
        analyticsManager.updateLiveNpk(0, 0, 0);
      }
    });

    dataStream.onHistory((history) => {
      this.rawHistory = history || [];
      this.renderHistoryTable(this.rawHistory);
      analyticsManager.updateFromHistory(this.rawHistory);
    });

    dataStream.onStatus((status) => {
      this.isDeviceOnline = status.online;
      this.updateDeviceStatus(status);
      if (!status.online) {
        this.currentLatest = null;
        this.renderOfflineState();
        analyticsManager.updateLiveNpk(0, 0, 0);
      }
    });

    // 6. Start LCD Display Emulator Cycle (every 3 seconds)
    setInterval(() => {
      this.lcdCycleCount++;
      if (this.currentLatest && this.currentLatest.hasData) {
        this.updateLcdEmulator(this.currentLatest);
      } else {
        const line1 = document.getElementById('lcd-line-1');
        const line2 = document.getElementById('lcd-line-2');
        if (line1 && line2) {
          line1.innerText = "DHARTI RAKSHAK  ";
          line2.innerText = this.isDeviceOnline ? "W:OK S:CONNECT. " : "ESP32 OFFLINE   ";
        }
      }
    }, 3000);
  }

  // ==========================================================================
  // SYSTEM & ADMIN CONFIGURATION PERSISTENCE
  // ==========================================================================
  async loadSystemConfig() {
    // 1. Try Loading from LocalStorage first for instant render
    const cached = localStorage.getItem('dharti_system_config');
    if (cached) {
      try {
        this.systemConfig = JSON.parse(cached);
      } catch (e) {}
    }

    // 2. Fetch from Firebase Realtime Database
    try {
      const res = await fetch(`${firebaseConfig.databaseURL}/system_config.json`);
      if (res.ok) {
        const cloudConfig = await res.json();
        if (cloudConfig && typeof cloudConfig === 'object') {
          this.systemConfig = {
            ...this.systemConfig,
            ...cloudConfig
          };
          localStorage.setItem('dharti_system_config', JSON.stringify(this.systemConfig));
        }
      }
    } catch (err) {
      console.warn("[Admin] Cloud config fetch notice:", err);
    }
  }

  async saveSystemConfig() {
    // Cache locally
    localStorage.setItem('dharti_system_config', JSON.stringify(this.systemConfig));

    // Upload to Firebase Realtime Database
    try {
      await fetch(`${firebaseConfig.databaseURL}/system_config.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.systemConfig)
      });
      console.log("[Admin] Config successfully synced to Firebase Cloud.");
    } catch (e) {
      console.error("[Admin] Firebase config sync error:", e);
    }

    // Re-apply to UI
    this.renderTeamSection();
    this.applySitePowerState();
    alert("✅ Admin Settings Saved & Synced Successfully!");
  }

  applySitePowerState() {
    const overlay = document.getElementById('maintenance-overlay');
    const msgElem = document.getElementById('maintenance-display-msg');

    if (msgElem && this.systemConfig.maintenance_msg) {
      msgElem.innerText = this.systemConfig.maintenance_msg;
    }

    if (overlay) {
      if (this.systemConfig.site_online === false && !this.isAdminLoggedIn) {
        overlay.classList.add('active');
      } else {
        overlay.classList.remove('active');
      }
    }
  }

  renderTeamSection() {
    const container = document.getElementById('team-attribution-container');
    const heading = document.getElementById('team-title-heading');
    const teamNameElem = document.getElementById('team-name-text');
    const list = document.getElementById('team-member-list');

    if (!container || !list) return;

    // Master Switch: Show/Hide entire team section
    if (!this.systemConfig.show_team) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'block';

    // Show/Hide Team Name Heading
    if (heading) {
      if (this.systemConfig.show_team_name === false) {
        heading.style.display = 'none';
      } else {
        heading.style.display = 'block';
        if (teamNameElem) {
          teamNameElem.innerText = this.systemConfig.team_name || "Royal Challenger Kanpur";
        }
      }
    }

    const visibleMembers = (this.systemConfig.team_members || []).filter(m => m.visible !== false);
    
    list.innerHTML = visibleMembers.map(m => `
      <li class="team-member">${m.name}</li>
    `).join('');
  }

  // ==========================================================================
  // ADMIN PANEL CONTROLLER
  // ==========================================================================
  attachAdminEventListeners() {
    const adminBtn = document.getElementById('btn-admin-modal');
    const adminModal = document.getElementById('admin-modal');
    const loginClose = document.getElementById('admin-login-close');
    const dashClose = document.getElementById('admin-dash-close');
    const loginSubmit = document.getElementById('btn-admin-login-submit');
    const passInput = document.getElementById('admin-passcode-input');
    const logoutBtn = document.getElementById('btn-admin-logout');
    const saveAllBtn = document.getElementById('btn-admin-save-all');
    const addMemberBtn = document.getElementById('btn-admin-add-member');
    const changePinBtn = document.getElementById('btn-admin-change-pin');
    const maintLoginBtn = document.getElementById('btn-maint-login');
    const maintPinInput = document.getElementById('maint-pin-input');

    const openAdminModal = () => {
      if (adminModal) adminModal.classList.add('open');
      if (this.isAdminLoggedIn) {
        this.showAdminDashboard();
      } else {
        this.showAdminLogin();
      }
    };

    if (adminBtn) adminBtn.addEventListener('click', openAdminModal);

    if (loginClose && adminModal) loginClose.addEventListener('click', () => adminModal.classList.remove('open'));
    if (dashClose && adminModal) dashClose.addEventListener('click', () => adminModal.classList.remove('open'));

    // Handle Direct Maintenance Page Login
    const handleMaintLogin = () => {
      const pin = maintPinInput ? maintPinInput.value.trim() : "";
      const validPin = this.systemConfig.admin_pin || "1234";
      const errElem = document.getElementById('maint-pin-error');

      if (pin === validPin) {
        this.isAdminLoggedIn = true;
        if (errElem) errElem.style.display = 'none';
        if (maintPinInput) maintPinInput.value = '';
        this.applySitePowerState();
        openAdminModal();
      } else {
        if (errElem) errElem.style.display = 'block';
      }
    };

    if (maintLoginBtn) maintLoginBtn.addEventListener('click', handleMaintLogin);
    if (maintPinInput) {
      maintPinInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleMaintLogin();
      });
    }

    // Handle Modal Login Submit
    const handleLogin = () => {
      const pin = passInput ? passInput.value.trim() : "";
      const validPin = this.systemConfig.admin_pin || "1234";

      if (pin === validPin) {
        this.isAdminLoggedIn = true;
        const errElem = document.getElementById('admin-login-error');
        if (errElem) errElem.style.display = 'none';
        if (passInput) passInput.value = '';
        this.applySitePowerState();
        this.showAdminDashboard();
      } else {
        const errElem = document.getElementById('admin-login-error');
        if (errElem) errElem.style.display = 'block';
      }
    };

    if (loginSubmit) loginSubmit.addEventListener('click', handleLogin);
    if (passInput) {
      passInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
      });
    }

    // Logout
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        this.isAdminLoggedIn = false;
        this.applySitePowerState();
        this.showAdminLogin();
        if (adminModal) adminModal.classList.remove('open');
      });
    }

    // Add Member
    if (addMemberBtn) {
      addMemberBtn.addEventListener('click', () => {
        const input = document.getElementById('admin-new-member-input');
        const name = input ? input.value.trim() : "";
        if (name) {
          if (!this.systemConfig.team_members) this.systemConfig.team_members = [];
          this.systemConfig.team_members.push({
            id: `m_${Date.now()}`,
            name: name,
            visible: true
          });
          if (input) input.value = '';
          this.populateAdminTeamList();
        }
      });
    }

    // Change PIN with complete validation
    if (changePinBtn) {
      changePinBtn.addEventListener('click', async () => {
        const curInput = document.getElementById('admin-current-pin-input');
        const newInput = document.getElementById('admin-new-pin-input');
        const confirmInput = document.getElementById('admin-confirm-pin-input');
        const statusMsg = document.getElementById('admin-pin-status-msg');

        const currentVal = curInput ? curInput.value.trim() : "";
        const newVal = newInput ? newInput.value.trim() : "";
        const confirmVal = confirmInput ? confirmInput.value.trim() : "";

        const expectedPin = this.systemConfig.admin_pin || "1234";

        const showStatus = (msg, isSuccess) => {
          if (!statusMsg) return;
          statusMsg.style.display = "block";
          statusMsg.style.color = isSuccess ? "#34d399" : "#f87171";
          statusMsg.innerHTML = isSuccess ? `✅ ${msg}` : `⚠️ ${msg}`;
        };

        if (currentVal !== expectedPin) {
          showStatus("Current PIN is incorrect.", false);
          return;
        }

        if (newVal.length < 4) {
          showStatus("New PIN must be at least 4 characters/digits.", false);
          return;
        }

        if (newVal !== confirmVal) {
          showStatus("New PIN and Confirm PIN do not match.", false);
          return;
        }

        // Update PIN
        this.systemConfig.admin_pin = newVal;
        if (curInput) curInput.value = '';
        if (newInput) newInput.value = '';
        if (confirmInput) confirmInput.value = '';

        showStatus("Saving new PIN to Cloud...", true);
        await this.saveSystemConfig();
        showStatus(`PIN successfully updated to: <strong>${newVal}</strong>`, true);
      });
    }

    // Save All
    if (saveAllBtn) {
      saveAllBtn.addEventListener('click', () => {
        // Collect current switch states
        const siteOnlineToggle = document.getElementById('admin-toggle-site-online');
        const showTeamToggle = document.getElementById('admin-toggle-show-team');
        const showTeamNameToggle = document.getElementById('admin-toggle-show-team-name');
        const teamNameInput = document.getElementById('admin-team-name-input');
        const maintMsgInput = document.getElementById('admin-maintenance-msg-input');
        const backendUrlInput = document.getElementById('admin-backend-url-input');

        if (siteOnlineToggle) this.systemConfig.site_online = siteOnlineToggle.checked;
        if (showTeamToggle) this.systemConfig.show_team = showTeamToggle.checked;
        if (showTeamNameToggle) this.systemConfig.show_team_name = showTeamNameToggle.checked;
        if (teamNameInput) this.systemConfig.team_name = teamNameInput.value.trim() || "Royal Challenger Kanpur";
        if (maintMsgInput) this.systemConfig.maintenance_msg = maintMsgInput.value.trim();
        if (backendUrlInput) {
          const bUrl = backendUrlInput.value.trim().replace(/\/+$/, '') || 'http://localhost:5000';
          this.systemConfig.backend_url = bUrl;
          localStorage.setItem('dharti_backend_url', bUrl);
          aiEngine.setBackendUrl(bUrl);
          dhartiChatbot.setBackendUrl(bUrl);
        }

        this.saveSystemConfig();
      });
    }
  }

  showAdminLogin() {
    const loginScreen = document.getElementById('admin-login-screen');
    const dashScreen = document.getElementById('admin-dashboard-screen');
    if (loginScreen) loginScreen.style.display = 'block';
    if (dashScreen) dashScreen.style.display = 'none';
  }

  showAdminDashboard() {
    const loginScreen = document.getElementById('admin-login-screen');
    const dashScreen = document.getElementById('admin-dashboard-screen');
    if (loginScreen) loginScreen.style.display = 'none';
    if (dashScreen) dashScreen.style.display = 'block';

    // Populate current values
    const siteOnlineToggle = document.getElementById('admin-toggle-site-online');
    const showTeamToggle = document.getElementById('admin-toggle-show-team');
    const showTeamNameToggle = document.getElementById('admin-toggle-show-team-name');
    const teamNameInput = document.getElementById('admin-team-name-input');
    const maintMsgInput = document.getElementById('admin-maintenance-msg-input');
    const backendUrlInput = document.getElementById('admin-backend-url-input');

    if (siteOnlineToggle) siteOnlineToggle.checked = (this.systemConfig.site_online !== false);
    if (showTeamToggle) showTeamToggle.checked = (this.systemConfig.show_team !== false);
    if (showTeamNameToggle) showTeamNameToggle.checked = (this.systemConfig.show_team_name !== false);
    if (teamNameInput) teamNameInput.value = this.systemConfig.team_name || "Royal Challenger Kanpur";
    if (maintMsgInput) maintMsgInput.value = this.systemConfig.maintenance_msg || "";
    if (backendUrlInput) backendUrlInput.value = this.systemConfig.backend_url || localStorage.getItem('dharti_backend_url') || 'http://localhost:5000';

    this.populateAdminTeamList();
  }

  populateAdminTeamList() {
    const container = document.getElementById('admin-team-manage-list');
    if (!container) return;

    const members = this.systemConfig.team_members || [];
    if (members.length === 0) {
      container.innerHTML = `<div style="font-size: 0.8rem; color: var(--text-dim); padding: 8px;">No team members added yet.</div>`;
      return;
    }

    container.innerHTML = members.map((m, index) => `
      <div class="team-manage-item ${m.visible ? '' : 'hidden-member'}">
        <input type="text" class="admin-input-text" value="${m.name}" style="padding: 4px 8px; font-size: 0.82rem;" onchange="window.updateMemberName(${index}, this.value)">
        <div style="display: flex; align-items: center; gap: 8px;">
          <button class="btn-icon-action" onclick="window.toggleMemberVisibility(${index})" title="${m.visible ? 'Hide Member' : 'Show Member'}">
            ${m.visible ? '👁️' : '🙈'}
          </button>
          <button class="btn-icon-action btn-icon-danger" onclick="window.deleteMember(${index})" title="Delete Member">
            🗑️
          </button>
        </div>
      </div>
    `).join('');

    // Global helper bindings for onclick handlers
    window.updateMemberName = (idx, newName) => {
      if (this.systemConfig.team_members[idx]) {
        this.systemConfig.team_members[idx].name = newName;
      }
    };

    window.toggleMemberVisibility = (idx) => {
      if (this.systemConfig.team_members[idx]) {
        this.systemConfig.team_members[idx].visible = !this.systemConfig.team_members[idx].visible;
        this.populateAdminTeamList();
      }
    };

    window.deleteMember = (idx) => {
      if (confirm(`Remove ${this.systemConfig.team_members[idx].name}?`)) {
        this.systemConfig.team_members.splice(idx, 1);
        this.populateAdminTeamList();
      }
    };
  }

  // ==========================================================================
  // SENSOR TELEMETRY & UI COMPONENTS
  // ==========================================================================
  renderOfflineState() {
    ['n', 'p', 'k', 'moist', 'temp', 'ph'].forEach(id => {
      const valElem = document.getElementById(`val-${id}`);
      const fillElem = document.getElementById(`fill-${id}`);
      if (valElem) valElem.innerText = "--";
      if (fillElem) fillElem.style.width = "0%";
    });

    const fertVal = document.getElementById('diag-fertility-val');
    const fertSub = document.getElementById('diag-fertility-sub');
    if (fertVal) fertVal.innerHTML = `WAITING <span class="badge-tag badge-low">No Signal</span>`;
    if (fertSub) fertSub.innerText = "Waiting for ESP32 to connect and transmit sensor readings...";

    const soilVal = document.getElementById('diag-soil-type-val');
    const soilSub = document.getElementById('diag-soil-type-sub');
    if (soilVal) soilVal.innerHTML = `Waiting... <span class="badge-tag badge-low">pH --</span>`;
    if (soilSub) soilSub.innerText = "Probe disconnected or offline";

    const scoreElem = document.getElementById('ai-health-badge');
    const scoreValElem = document.getElementById('ai-health-score-val');
    if (scoreElem) scoreElem.innerText = "-- / 100";
    if (scoreValElem) {
      scoreValElem.innerText = "-- / 100";
      scoreValElem.style.color = "var(--text-dim)";
    }

    ['wheat', 'rice', 'maize', 'mustard'].forEach(crop => {
      const el = document.getElementById(`badge-${crop}`);
      if (el) {
        el.className = "crop-badge unsuitable";
        el.innerText = "Waiting for ESP32 ⏳";
      }
    });

    const aiContainer = document.getElementById('ai-recommendations-container');
    if (aiContainer) {
      aiContainer.innerHTML = `
        <div class="ai-recommendation-box">
          <h4>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            Hardware Waiting State
          </h4>
          <p>Flash your ESP32 with <code>dharti_rakshak_firmware.ino</code> and power it on. As soon as real sensor frames arrive, Dharti AI will analyze your soil.</p>
        </div>
      `;
    }
  }

  attachEventListeners() {
    const searchInput = document.getElementById('history-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = this.rawHistory.filter(item => {
          const dateStr = new Date(item.timestamp).toLocaleString().toLowerCase();
          return dateStr.includes(query) ||
                 String(item.moisture).includes(query) ||
                 String(item.temperature).includes(query) ||
                 String(item.ph).includes(query);
        });
        this.renderHistoryTable(filtered);
      });
    }

    const exportBtn = document.getElementById('btn-export-csv');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportCsv());
    }

    const configBtn = document.getElementById('btn-config-modal');
    const modalBackdrop = document.getElementById('config-modal');
    const modalClose = document.getElementById('modal-close-btn');

    if (configBtn && modalBackdrop) {
      configBtn.addEventListener('click', () => modalBackdrop.classList.add('open'));
    }
    if (modalClose && modalBackdrop) {
      modalClose.addEventListener('click', () => modalBackdrop.classList.remove('open'));
    }
  }

  updateHeroDiagnostics(data) {
    const fertVal = document.getElementById('diag-fertility-val');
    const fertSub = document.getElementById('diag-fertility-sub');
    if (fertVal) {
      const badgeClass = data.fertility.toLowerCase() === 'high' ? 'high' : (data.fertility.toLowerCase() === 'medium' ? 'med' : 'low');
      fertVal.innerHTML = `${data.fertility} <span class="badge-tag badge-${badgeClass}">${data.totalNPK} mg/kg</span>`;
    }
    if (fertSub) {
      fertSub.innerText = data.totalNPK > 250 ? 'Rich in macronutrients' : (data.totalNPK > 120 ? 'Moderate fertility balance' : 'Nutrient supplementation required');
    }

    const soilVal = document.getElementById('diag-soil-type-val');
    const soilSub = document.getElementById('diag-soil-type-sub');
    if (soilVal) {
      soilVal.innerHTML = `${data.soilType} <span class="badge-tag badge-high">pH ${data.ph.toFixed(2)}</span>`;
    }
    if (soilSub) {
      soilSub.innerText = data.ph >= 6.0 && data.ph <= 7.5 ? 'Prime biological assimilation range' : (data.ph < 6.0 ? 'Acidic reaction - consider lime' : 'Alkaline reaction');
    }
  }

  updateSensorCards(data) {
    this.setCardValue('val-n', data.nitrogen, 'fill-n', (data.nitrogen / 120) * 100);
    this.setCardValue('val-p', data.phosphorus, 'fill-p', (data.phosphorus / 100) * 100);
    this.setCardValue('val-k', data.potassium, 'fill-k', (data.potassium / 200) * 100);
    this.setCardValue('val-moist', data.moisture.toFixed(1), 'fill-moist', data.moisture);
    this.setCardValue('val-temp', data.temperature.toFixed(1), 'fill-temp', (data.temperature / 50) * 100);
    this.setCardValue('val-ph', data.ph.toFixed(2), 'fill-ph', (data.ph / 14) * 100);
  }

  setCardValue(valId, value, fillId, fillPercent) {
    const valElem = document.getElementById(valId);
    const fillElem = document.getElementById(fillId);
    if (valElem) valElem.innerText = value;
    if (fillElem) fillElem.style.width = `${Math.min(100, Math.max(0, fillPercent))}%`;
  }

  updateCropSuitability(data) {
    const { moisture, ph, nitrogen } = data;

    const wheatOk = (ph >= 6.0 && ph <= 7.5 && moisture < 35.0);
    this.setCropBadge('badge-wheat', wheatOk, wheatOk ? 'Suitable ✅' : (moisture >= 35 ? 'High Moisture (≥35%) ❌' : 'pH Out of 6.0-7.5 ❌'));

    const riceOk = (moisture > 40.0 && ph >= 5.5);
    this.setCropBadge('badge-rice', riceOk, riceOk ? 'Suitable ✅' : (moisture <= 40 ? 'Needs >40% Moisture ❌' : 'pH < 5.5 ❌'));

    const maizeOk = (nitrogen > 20 && ph >= 5.8);
    this.setCropBadge('badge-maize', maizeOk, maizeOk ? 'Suitable ✅' : (nitrogen <= 20 ? 'Low Nitrogen (≤20) ❌' : 'pH < 5.8 ❌'));

    const mustardOk = (ph >= 6.0 && ph <= 7.5 && moisture >= 20 && moisture <= 38);
    this.setCropBadge('badge-mustard', mustardOk, mustardOk ? 'Suitable ✅' : 'Moisture/pH Suboptimal ❌');
  }

  setCropBadge(elementId, isOk, text) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.className = `crop-badge ${isOk ? 'suitable' : 'unsuitable'}`;
    el.innerText = text;
  }

  updateLcdEmulator(data) {
    const line1 = document.getElementById('lcd-line-1');
    const line2 = document.getElementById('lcd-line-2');
    if (!line1 || !line2) return;

    const page = this.lcdCycleCount % 3;
    if (page === 0) {
      line1.innerText = "DHARTI RAKSHAK  ";
      line2.innerText = "W:OK S:OK C:OK  ";
    } else if (page === 1) {
      line1.innerText = `M:${data.moisture.toFixed(1)}% T:${data.temperature.toFixed(1)}C`;
      line2.innerText = `pH:${data.ph.toFixed(2)} Fert:${data.fertility}`;
    } else {
      line1.innerText = `N:${data.nitrogen} P:${data.phosphorus} K:${data.potassium}`;
      line2.innerText = `NPK: ${data.totalNPK} mg/kg`;
    }
  }

  updateDeviceStatus(status) {
    const statusPill = document.getElementById('system-status-pill');
    const statusText = document.getElementById('system-status-text');
    const ipElem     = document.getElementById('stat-ip-val');
    const rssiElem   = document.getElementById('stat-rssi-val');

    if (statusPill && statusText) {
      if (status.online) {
        statusPill.className = "status-pill";
        statusText.innerText = "Node Online";
      } else {
        statusPill.className = "status-pill offline";
        statusText.innerText = "Node Offline";
      }
    }
    if (ipElem) ipElem.innerText = status.ip;
    if (rssiElem) rssiElem.innerText = status.rssi !== "--" ? `${status.rssi} dBm` : "--";
  }

  renderHistoryTable(dataList) {
    const tbody = document.getElementById('history-tbody');
    if (!tbody) return;

    if (!dataList || dataList.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 24px; color: var(--text-dim);">No telemetry logs recorded in Firebase yet. Power on your ESP32 to begin streaming.</td></tr>`;
      return;
    }

    const rows = dataList.slice(-15).reverse().map(item => {
      const date = new Date(item.timestamp || Date.now());
      const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      return `
        <tr>
          <td><span style="font-family: var(--font-mono);">${dateStr}</span></td>
          <td><strong style="color: #60a5fa;">${item.nitrogen}</strong></td>
          <td><strong style="color: #fbbf24;">${item.phosphorus}</strong></td>
          <td><strong style="color: #c084fc;">${item.potassium}</strong></td>
          <td><span style="color: #22d3ee;">${Number(item.moisture).toFixed(1)}%</span></td>
          <td><span style="color: #f87171;">${Number(item.temperature).toFixed(1)}°C</span></td>
          <td><span style="color: #34d399;">${Number(item.ph).toFixed(2)}</span></td>
        </tr>
      `;
    }).join('');

    tbody.innerHTML = rows;
  }

  exportCsv() {
    if (!this.rawHistory || !this.rawHistory.length) {
      alert("No telemetry data to export.");
      return;
    }

    let csv = "Timestamp,Date,Time,Nitrogen_mg_kg,Phosphorus_mg_kg,Potassium_mg_kg,Total_NPK,Moisture_pct,Temperature_C,pH\n";
    this.rawHistory.forEach(row => {
      const d = new Date(row.timestamp || Date.now());
      const isoDate = d.toISOString().split('T')[0];
      const timeStr = d.toTimeString().split(' ')[0];
      csv += `${row.timestamp},${isoDate},${timeStr},${row.nitrogen},${row.phosphorus},${row.potassium},${row.totalNPK || (row.nitrogen+row.phosphorus+row.potassium)},${row.moisture},${row.temperature},${row.ph}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `dharti_rakshak_soil_telemetry_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new DhartiApp();
  app.init();
});
