/**
 * ============================================================================
 * DHARTI-RAKSHAK: Multi-Tab Single Page Application Controller
 * Fully binds all 8 dashboard tabs to Firebase Realtime Database
 * ============================================================================
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
  getDatabase, 
  ref, 
  onValue, 
  query, 
  limitToLast 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// Firebase Endpoint
const firebaseConfig = {
  databaseURL: "https://dharti-rakshak-iot-e52e1-default-rtdb.asia-southeast1.firebasedatabase.app"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// DOM Elements - Value Displays
const elMoisture = document.getElementById('valMoisture');
const elTemp = document.getElementById('valTemp');
const elEc = document.getElementById('valEc');
const elPh = document.getElementById('valPh');
const elNitrogen = document.getElementById('valNitrogen');
const elPhosphorus = document.getElementById('valPhosphorus');
const elPotassium = document.getElementById('valPotassium');

// Hint / Status text
const hintMoisture = document.getElementById('hintMoisture');
const hintTemp = document.getElementById('hintTemp');
const hintEc = document.getElementById('hintEc');
const hintPh = document.getElementById('hintPh');
const hintN = document.getElementById('hintN');
const hintP = document.getElementById('hintP');
const hintK = document.getElementById('hintK');
const phNatureLabel = document.getElementById('phNatureLabel');

// Circular SVG Glow Rings (Circumference = 314px for r=50)
const CIRCUMFERENCE = 314;
const circleMoisture = document.getElementById('circleMoisture');
const circleTemp = document.getElementById('circleTemp');
const circleEc = document.getElementById('circleEc');
const circlePh = document.getElementById('circlePh');
const circleN = document.getElementById('circleN');
const circleP = document.getElementById('circleP');
const circleK = document.getElementById('circleK');

// System status & meta DOM
const esp32Badge = document.getElementById('esp32Badge');
const esp32StatusText = document.getElementById('esp32StatusText');
const esp32SubText = document.getElementById('esp32SubText');
const radarBox = document.getElementById('radarBox');
const sidebarDot = document.getElementById('sidebarDot');
const sidebarStatusText = document.getElementById('sidebarStatusText');
const sidebarUptime = document.getElementById('sidebarUptime');
const sidebarDataPoints = document.getElementById('sidebarDataPoints');
const sidebarSyncStatus = document.getElementById('sidebarSyncStatus');
const lastUpdatedVal = document.getElementById('lastUpdatedVal');
const liveClockTime = document.getElementById('liveClockTime');
const liveClockDate = document.getElementById('liveClockDate');
const footerDeviceId = document.getElementById('footerDeviceId');
const footerFirmware = document.getElementById('footerFirmware');
const footerWifi = document.getElementById('footerWifi');
const footerWifiIcon = document.getElementById('footerWifiIcon');
const footerUptime = document.getElementById('footerUptime');
const healthScore = document.getElementById('healthScore');
const healthScoreSub = document.getElementById('healthScoreSub');
const healthStatusText = document.getElementById('healthStatusText');
const healthCircle = document.getElementById('healthCircle');
const healthTipText = document.getElementById('healthTipText');
const alertsContainer = document.getElementById('alertsContainer');
const alertsCountBadge = document.getElementById('alertsCountBadge');
const trendEmptyState = document.getElementById('trendEmptyState');

// Realtime Packet Feed & Modbus Table Elements
const livePacketTerminal = document.getElementById('livePacketTerminal');
const rawMoist = document.getElementById('rawMoist');
const decMoist = document.getElementById('decMoist');
const rawTemp = document.getElementById('rawTemp');
const decTemp = document.getElementById('decTemp');
const rawEc = document.getElementById('rawEc');
const decEc = document.getElementById('decEc');
const rawPh = document.getElementById('rawPh');
const decPh = document.getElementById('decPh');
const rawN = document.getElementById('rawN');
const decN = document.getElementById('decN');
const rawP = document.getElementById('rawP');
const decP = document.getElementById('decP');
const rawK = document.getElementById('rawK');
const decK = document.getElementById('decK');

// Device Diagnostics Elements
const diagUptime = document.getElementById('diagUptime');
const diagRssi = document.getElementById('diagRssi');
const diagFw = document.getElementById('diagFw');

// Logs Table
const logsTableBody = document.getElementById('logsTableBody');
const logSearch = document.getElementById('logSearch');

// Chart instances
let trendChartInstance = null;
let npkChartInstance = null;
let analyticsStudioChartInstance = null;

// Track historical raw data for CSV / JSON export
let cachedLogsArray = [];
let lastSeenTimestamp = 0;

/**
 * ============================================================================
 * 1. SPA TAB NAVIGATION ROUTER
 * ============================================================================
 */
function initTabRouter() {
  const navItems = document.querySelectorAll('#sidebarNav .nav-item');
  const tabViews = document.querySelectorAll('.tab-view');
  const headingElem = document.getElementById('currentTabHeading');
  const subHeadingElem = document.getElementById('currentTabSub');

  const tabTitles = {
    dashboard: { title: 'Dashboard', sub: 'DHARTI-RAKSHAK Smart Telemetry 🌱' },
    realtime: { title: 'Realtime Data Stream', sub: 'RS485 Modbus Telemetry Frames & Packet Inspector' },
    sensors: { title: '7-in-1 Soil Sensors', sub: 'Hardware Probes & Scientific Safety Ranges' },
    analytics: { title: 'Charts & Analytics', sub: 'Time-Series Historical Telemetry Visualizer' },
    alerts: { title: 'Alerts & Incidents', sub: 'Soil Quality Threshold Alarms & Notifications' },
    device: { title: 'Device Status', sub: 'ESP32 Controller Hardware & Comm Bus Diagnostics' },
    logs: { title: 'Data Logs', sub: 'Searchable Firebase Time-Series Database Records' },
    settings: { title: 'Settings', sub: 'Precision Agriculture Target Profiles & Cloud Endpoints' }
  };

  function switchTab(targetTabId) {
    if (!targetTabId) targetTabId = 'dashboard';

    // Update active nav button
    navItems.forEach(item => {
      if (item.getAttribute('data-tab') === targetTabId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Update active view
    tabViews.forEach(view => {
      if (view.id === `tab-${targetTabId}`) {
        view.classList.add('active');
      } else {
        view.classList.remove('active');
      }
    });

    // Update Header Text
    if (tabTitles[targetTabId]) {
      headingElem.textContent = tabTitles[targetTabId].title;
      subHeadingElem.textContent = tabTitles[targetTabId].sub;
    }

    // Refresh charts if entering chart views
    if (targetTabId === 'analytics') {
      setTimeout(() => {
        if (analyticsStudioChartInstance) analyticsStudioChartInstance.resize();
      }, 100);
    } else if (targetTabId === 'dashboard') {
      setTimeout(() => {
        if (trendChartInstance) trendChartInstance.resize();
        if (npkChartInstance) npkChartInstance.resize();
      }, 100);
    }

    // Auto-close mobile sidebar if open
    if (window.innerWidth <= 1024) {
      const sidebar = document.getElementById('sidebar');
      if (sidebar) sidebar.style.display = 'none';
    }
  }

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const tabId = item.getAttribute('data-tab');
      window.location.hash = tabId;
      switchTab(tabId);
    });
  });

  // Handle URL hash on load
  const initialHash = window.location.hash.replace('#', '') || 'dashboard';
  switchTab(initialHash);
}

/**
 * ============================================================================
 * 2. REALTIME CLOCK & HEARTBEAT
 * ============================================================================
 */
function startClock() {
  function update() {
    const now = new Date();
    liveClockTime.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    liveClockDate.textContent = now.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    verifyHeartbeat();
  }
  update();
  setInterval(update, 1000);
}

function setRadialOffset(circleElem, percentage) {
  if (!circleElem) return;
  const clamped = Math.max(0, Math.min(percentage, 100));
  const offset = CIRCUMFERENCE - (clamped / 100) * CIRCUMFERENCE;
  circleElem.style.strokeDashoffset = offset;
}

function setDeviceOnline(isOnline, lastTime) {
  if (isOnline) {
    esp32Badge.className = 'header-badge online-badge';
    esp32StatusText.textContent = 'ESP32 Online';
    esp32SubText.textContent = 'Live Transmission';
    radarBox.classList.remove('offline');
    sidebarDot.className = 'pulse-dot-green';
    sidebarStatusText.textContent = 'ESP32 Connected';
    sidebarSyncStatus.textContent = 'Streaming';
    sidebarSyncStatus.className = 'text-green';
  } else {
    esp32Badge.className = 'header-badge offline-badge';
    esp32StatusText.textContent = 'ESP32 Offline';
    esp32SubText.textContent = lastTime ? `Last seen: ${getRelativeTime(lastTime)}` : 'Awaiting Heartbeat';
    radarBox.classList.add('offline');
    sidebarDot.className = 'pulse-dot-red';
    sidebarStatusText.textContent = 'ESP32 Disconnected';
    sidebarSyncStatus.textContent = 'Idle (No Stream)';
    sidebarSyncStatus.className = 'text-muted';
  }
}

function verifyHeartbeat() {
  if (!lastSeenTimestamp) {
    setDeviceOnline(false, null);
    return;
  }
  const diffMinutes = (Date.now() - lastSeenTimestamp) / 1000 / 60;
  if (diffMinutes <= 3.5) {
    setDeviceOnline(true, lastSeenTimestamp);
  } else {
    setDeviceOnline(false, lastSeenTimestamp);
  }
}

function getRelativeTime(timestamp) {
  if (!timestamp) return 'Never';
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 20) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatUptime(seconds) {
  if (!seconds) return '--';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m ${secs}s`;
}

/**
 * ============================================================================
 * 3. CHART INITIALIZATION
 * ============================================================================
 */
function initCharts() {
  // Chart 1: Dashboard Moisture & Temp Trend
  const ctxTrend = document.getElementById('trendChart').getContext('2d');
  const moistureGrad = ctxTrend.createLinearGradient(0, 0, 0, 200);
  moistureGrad.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
  moistureGrad.addColorStop(1, 'rgba(56, 189, 248, 0.0)');

  const tempGrad = ctxTrend.createLinearGradient(0, 0, 0, 200);
  tempGrad.addColorStop(0, 'rgba(251, 146, 60, 0.35)');
  tempGrad.addColorStop(1, 'rgba(251, 146, 60, 0.0)');

  trendChartInstance = new Chart(ctxTrend, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Soil Moisture (%)',
          data: [],
          borderColor: '#38bdf8',
          backgroundColor: moistureGrad,
          fill: true,
          tension: 0.4,
          borderWidth: 2.5,
          pointRadius: 4,
          pointBackgroundColor: '#38bdf8',
          pointBorderColor: '#070d14',
          yAxisID: 'y'
        },
        {
          label: 'Soil Temperature (°C)',
          data: [],
          borderColor: '#fb923c',
          backgroundColor: tempGrad,
          fill: true,
          tension: 0.4,
          borderWidth: 2.5,
          pointRadius: 4,
          pointBackgroundColor: '#fb923c',
          pointBorderColor: '#070d14',
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: { backgroundColor: '#0d1621', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }
      },
      scales: {
        x: { grid: { color: 'rgba(255, 255, 255, 0.04)' }, ticks: { color: '#64748b' } },
        y: { type: 'linear', position: 'left', min: 0, max: 100, ticks: { color: '#38bdf8' } },
        y1: { type: 'linear', position: 'right', min: 0, max: 60, grid: { drawOnChartArea: false }, ticks: { color: '#fb923c' } }
      }
    }
  });

  // Chart 2: NPK Bar Chart
  const ctxNpk = document.getElementById('npkChart').getContext('2d');
  npkChartInstance = new Chart(ctxNpk, {
    type: 'bar',
    data: {
      labels: ['Nitrogen (N)', 'Phosphorus (P)', 'Potassium (K)'],
      datasets: [{
        data: [0, 0, 0],
        backgroundColor: ['rgba(34, 197, 94, 0.85)', 'rgba(6, 182, 212, 0.85)', 'rgba(236, 72, 153, 0.85)'],
        borderColor: ['#4ade80', '#22d3ee', '#f472b6'],
        borderWidth: 1.5,
        borderRadius: 8,
        barPercentage: 0.55
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { weight: '600' } } },
        y: { grid: { color: 'rgba(255, 255, 255, 0.04)' }, ticks: { color: '#64748b' }, min: 0, suggestedMax: 200 }
      }
    }
  });

  // Chart 3: Analytics Studio Multi-Axis Chart
  const ctxStudio = document.getElementById('analyticsStudioChart').getContext('2d');
  analyticsStudioChartInstance = new Chart(ctxStudio, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        { label: 'Moisture (%)', data: [], borderColor: '#38bdf8', borderWidth: 2, tension: 0.35 },
        { label: 'Temp (°C)', data: [], borderColor: '#fb923c', borderWidth: 2, tension: 0.35 },
        { label: 'EC (µS/cm / 10)', data: [], borderColor: '#34d399', borderWidth: 2, tension: 0.35 },
        { label: 'pH (x10)', data: [], borderColor: '#a78bfa', borderWidth: 2, tension: 0.35 },
        { label: 'N (mg/kg)', data: [], borderColor: '#2dd4bf', borderWidth: 2, hidden: true, tension: 0.35 },
        { label: 'P (mg/kg)', data: [], borderColor: '#c084fc', borderWidth: 2, hidden: true, tension: 0.35 },
        { label: 'K (mg/kg)', data: [], borderColor: '#facc15', borderWidth: 2, hidden: true, tension: 0.35 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#94a3b8' } }
      },
      scales: {
        x: { grid: { color: 'rgba(255, 255, 255, 0.04)' }, ticks: { color: '#64748b' } },
        y: { grid: { color: 'rgba(255, 255, 255, 0.04)' }, ticks: { color: '#64748b' } }
      }
    }
  });

  // Checkbox filters in Analytics Studio
  const checkboxes = {
    chkMoist: 0, chkTemp: 1, chkEc: 2, chkPh: 3, chkN: 4, chkP: 5, chkK: 6
  };
  Object.keys(checkboxes).forEach(id => {
    document.getElementById(id)?.addEventListener('change', (e) => {
      const idx = checkboxes[id];
      if (analyticsStudioChartInstance) {
        analyticsStudioChartInstance.data.datasets[idx].hidden = !e.target.checked;
        analyticsStudioChartInstance.update();
      }
    });
  });
}

/**
 * ============================================================================
 * 4. FIREBASE REALTIME TELEMETRY LISTENERS
 * ============================================================================
 */
function setupFirebaseListeners() {
  
  // 1. LIVE SENSOR READINGS LISTENER
  const liveRef = ref(db, 'dharti_rakshak/live_readings');
  onValue(liveRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) {
      lastUpdatedVal.textContent = 'Awaiting ESP32';
      return;
    }

    if (data.timestamp) {
      lastSeenTimestamp = data.timestamp;
      verifyHeartbeat();
      const d = new Date(data.timestamp);
      lastUpdatedVal.textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    // Moisture
    if (data.moisture !== undefined) {
      const moist = Number(data.moisture);
      elMoisture.textContent = moist.toFixed(1);
      setRadialOffset(circleMoisture, moist);
      hintMoisture.textContent = moist < 20 ? 'Very Dry (Irrigate)' : moist > 70 ? 'Waterlogged' : 'Optimal Moisture';
      rawMoist.textContent = `0x${Math.round(moist * 10).toString(16).toUpperCase().padStart(4, '0')}`;
      decMoist.textContent = `${moist.toFixed(1)} %`;
    }

    // Temperature
    if (data.temperature !== undefined) {
      const temp = Number(data.temperature);
      elTemp.textContent = temp.toFixed(1);
      const tempPct = Math.min(Math.max((temp / 50) * 100, 0), 100);
      setRadialOffset(circleTemp, tempPct);
      hintTemp.textContent = temp < 15 ? 'Cool Soil' : temp > 35 ? 'High Heat' : 'Healthy Range';
      rawTemp.textContent = `0x${Math.round(temp * 10).toString(16).toUpperCase().padStart(4, '0')}`;
      decTemp.textContent = `${temp.toFixed(1)} °C`;
    }

    // EC Salinity
    if (data.ec !== undefined) {
      const ec = Number(data.ec);
      elEc.textContent = ec;
      const ecPct = Math.min((ec / 3000) * 100, 100);
      setRadialOffset(circleEc, ecPct);
      hintEc.textContent = ec < 500 ? 'Low Salinity' : ec > 2000 ? 'High Salinity' : 'Balanced Salinity';
      rawEc.textContent = `0x${Math.round(ec).toString(16).toUpperCase().padStart(4, '0')}`;
      decEc.textContent = `${ec} µS/cm`;
    }

    // pH
    if (data.ph !== undefined) {
      const ph = Number(data.ph);
      elPh.textContent = ph.toFixed(2);
      const phPct = (ph / 14) * 100;
      setRadialOffset(circlePh, phPct);
      const nature = ph < 6.0 ? 'Acidic' : ph > 7.5 ? 'Alkaline' : 'Neutral';
      phNatureLabel.textContent = nature;
      hintPh.textContent = `${nature} pH`;
      rawPh.textContent = `0x${Math.round(ph * 100).toString(16).toUpperCase().padStart(4, '0')}`;
      decPh.textContent = `${ph.toFixed(2)} pH`;
    }

    // Nitrogen
    if (data.nitrogen !== undefined) {
      const n = Number(data.nitrogen);
      elNitrogen.textContent = n;
      setRadialOffset(circleN, Math.min((n / 150) * 100, 100));
      hintN.textContent = n < 20 ? 'Low Nitrogen' : 'Adequate';
      rawN.textContent = `0x${Math.round(n).toString(16).toUpperCase().padStart(4, '0')}`;
      decN.textContent = `${n} mg/kg`;
    }

    // Phosphorus
    if (data.phosphorus !== undefined) {
      const p = Number(data.phosphorus);
      elPhosphorus.textContent = p;
      setRadialOffset(circleP, Math.min((p / 100) * 100, 100));
      hintP.textContent = p < 15 ? 'Low Phosphorus' : 'Adequate';
      rawP.textContent = `0x${Math.round(p).toString(16).toUpperCase().padStart(4, '0')}`;
      decP.textContent = `${p} mg/kg`;
    }

    // Potassium
    if (data.potassium !== undefined) {
      const k = Number(data.potassium);
      elPotassium.textContent = k;
      setRadialOffset(circleK, Math.min((k / 300) * 100, 100));
      hintK.textContent = k < 100 ? 'Low Potassium' : 'Adequate';
      rawK.textContent = `0x${Math.round(k).toString(16).toUpperCase().padStart(4, '0')}`;
      decK.textContent = `${k} mg/kg`;
    }

    // Update NPK Bar Chart
    if (npkChartInstance && data.nitrogen !== undefined) {
      npkChartInstance.data.datasets[0].data = [
        Number(data.nitrogen ?? 0),
        Number(data.phosphorus ?? 0),
        Number(data.potassium ?? 0)
      ];
      npkChartInstance.update();
    }

    // Calculate Real Soil Health Score
    if (data.ph !== undefined && data.moisture !== undefined) {
      const ph = Number(data.ph);
      const moist = Number(data.moisture);
      const n = Number(data.nitrogen ?? 0);
      const p = Number(data.phosphorus ?? 0);
      const k = Number(data.potassium ?? 0);

      let score = 70;
      if (ph >= 6.0 && ph <= 7.5) score += 10; else score -= 10;
      if (moist >= 30 && moist <= 65) score += 10; else score -= 10;
      if (n > 20 && p > 15 && k > 80) score += 10;
      score = Math.min(Math.max(score, 10), 99);

      healthScore.textContent = score;
      healthScoreSub.textContent = score >= 75 ? 'Good' : score >= 50 ? 'Moderate' : 'Poor';
      healthStatusText.textContent = score >= 75 ? 'Good Health' : score >= 50 ? 'Moderate Health' : 'Needs Correction';
      healthStatusText.className = score >= 75 ? 'text-green' : score >= 50 ? 'text-amber' : 'text-rose';
      
      const healthOffset = 264 - (score / 100) * 264;
      healthCircle.style.strokeDashoffset = healthOffset;
      healthTipText.textContent = score >= 75 
        ? 'Soil parameters are well-balanced for precision farming.' 
        : 'Adjust irrigation or fertilizer levels to optimize plant growth.';
    }

    // Add Live Packet Line to Terminal
    if (livePacketTerminal && data.timestamp) {
      const line = document.createElement('div');
      line.className = 'term-line text-green';
      line.textContent = `[${new Date(data.timestamp).toLocaleTimeString()}] RX: M=${data.moisture}% T=${data.temperature}°C EC=${data.ec} pH=${data.ph} NPK=${data.nitrogen}/${data.phosphorus}/${data.potassium}`;
      livePacketTerminal.appendChild(line);
      livePacketTerminal.scrollTop = livePacketTerminal.scrollHeight;
    }
  });

  // 2. DEVICE INFO LISTENER
  const deviceRef = ref(db, 'dharti_rakshak/device_info');
  onValue(deviceRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) return;

    if (data.device_id) {
      footerDeviceId.textContent = data.device_id;
      const diagMcu = document.getElementById('diagMcu');
      if (diagMcu) diagMcu.textContent = `${data.device_id} (ESP32 DevKit)`;
    }

    if (data.firmware_version) {
      footerFirmware.textContent = `v${data.firmware_version}`;
      if (diagFw) diagFw.textContent = `v${data.firmware_version} (Modbus + RTDB REST)`;
    }
    
    if (data.wifi_rssi !== undefined) {
      footerWifi.textContent = `${data.wifi_rssi} dBm`;
      if (diagRssi) diagRssi.textContent = `${data.wifi_rssi} dBm (RSSI)`;
      footerWifiIcon.className = 'fa-solid fa-wifi hw-icon text-green';
    }
    
    if (data.uptime_seconds !== undefined) {
      const up = formatUptime(data.uptime_seconds);
      sidebarUptime.textContent = up;
      footerUptime.textContent = up;
      if (diagUptime) diagUptime.textContent = up;
    }

    if (data.last_seen) {
      lastSeenTimestamp = data.last_seen;
      verifyHeartbeat();
    }
  });

  // 3. HISTORICAL TIME-SERIES QUERY (For Charts & Data Logs Table)
  const histRef = query(ref(db, 'dharti_rakshak/historical_logs'), limitToLast(30));
  onValue(histRef, (snapshot) => {
    const data = snapshot.val();
    if (!data || Object.keys(data).length === 0) {
      trendEmptyState.style.display = 'flex';
      sidebarDataPoints.textContent = '0';
      return;
    }

    trendEmptyState.style.display = 'none';
    sidebarDataPoints.textContent = Object.keys(data).length.toLocaleString();

    cachedLogsArray = Object.values(data).filter(Boolean);

    const labels = [];
    const moistures = [];
    const temps = [];
    const ecs = [];
    const phs = [];
    const ns = [];
    const ps = [];
    const ks = [];

    // Populate table rows
    if (logsTableBody) {
      logsTableBody.innerHTML = '';
      cachedLogsArray.slice().reverse().forEach(pt => {
        const tr = document.createElement('tr');
        const timeStr = pt.timestamp ? new Date(pt.timestamp).toLocaleString() : 'N/A';
        tr.innerHTML = `
          <td>${timeStr}</td>
          <td>${Number(pt.moisture ?? 0).toFixed(1)}%</td>
          <td>${Number(pt.temperature ?? 0).toFixed(1)}°C</td>
          <td>${pt.ec ?? 0}</td>
          <td>${Number(pt.ph ?? 0).toFixed(2)}</td>
          <td>${pt.nitrogen ?? 0}</td>
          <td>${pt.phosphorus ?? 0}</td>
          <td>${pt.potassium ?? 0}</td>
          <td><span class="pill-badge">${pt.fertility || 'GOOD'}</span></td>
        `;
        logsTableBody.appendChild(tr);
      });
    }

    cachedLogsArray.forEach(pt => {
      const t = pt.timestamp ? new Date(pt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Log';
      labels.push(t);
      moistures.push(Number(pt.moisture ?? 0));
      temps.push(Number(pt.temperature ?? 0));
      ecs.push(Number(pt.ec ?? 0) / 10);
      phs.push(Number(pt.ph ?? 0) * 10);
      ns.push(Number(pt.nitrogen ?? 0));
      ps.push(Number(pt.phosphorus ?? 0));
      ks.push(Number(pt.potassium ?? 0));
    });

    // Update Dashboard Trend Chart
    if (trendChartInstance && labels.length > 0) {
      trendChartInstance.data.labels = labels;
      trendChartInstance.data.datasets[0].data = moistures;
      trendChartInstance.data.datasets[1].data = temps;
      trendChartInstance.update();
    }

    // Update Analytics Studio Chart
    if (analyticsStudioChartInstance && labels.length > 0) {
      analyticsStudioChartInstance.data.labels = labels;
      analyticsStudioChartInstance.data.datasets[0].data = moistures;
      analyticsStudioChartInstance.data.datasets[1].data = temps;
      analyticsStudioChartInstance.data.datasets[2].data = ecs;
      analyticsStudioChartInstance.data.datasets[3].data = phs;
      analyticsStudioChartInstance.data.datasets[4].data = ns;
      analyticsStudioChartInstance.data.datasets[5].data = ps;
      analyticsStudioChartInstance.data.datasets[6].data = ks;
      analyticsStudioChartInstance.update();
    }
  });
}

/**
 * ============================================================================
 * 5. EXPORT UTILITIES (CSV & JSON)
 * ============================================================================
 */
function initExportButtons() {
  // Export CSV
  document.getElementById('btnExportCsv')?.addEventListener('click', () => {
    if (!cachedLogsArray || cachedLogsArray.length === 0) {
      alert('No telemetry data available to export.');
      return;
    }
    const headers = ['Timestamp', 'Moisture(%)', 'Temperature(C)', 'EC(uS/cm)', 'pH', 'Nitrogen', 'Phosphorus', 'Potassium', 'Fertility'];
    const rows = cachedLogsArray.map(pt => [
      pt.timestamp ? new Date(pt.timestamp).toISOString() : '',
      pt.moisture ?? '',
      pt.temperature ?? '',
      pt.ec ?? '',
      pt.ph ?? '',
      pt.nitrogen ?? '',
      pt.phosphorus ?? '',
      pt.potassium ?? '',
      pt.fertility ?? ''
    ]);
    
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `dharti_rakshak_telemetry_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  // Download JSON
  document.getElementById('btnDownloadJson')?.addEventListener('click', () => {
    if (!cachedLogsArray || cachedLogsArray.length === 0) {
      alert('No telemetry logs available to download.');
      return;
    }
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(cachedLogsArray, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `dharti_rakshak_logs_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  // Search filter for logs table
  logSearch?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const rows = logsTableBody?.querySelectorAll('tr');
    rows?.forEach(r => {
      r.style.display = r.textContent.toLowerCase().includes(term) ? '' : 'none';
    });
  });
}

// Mobile sidebar toggle handler
document.getElementById('menuToggle')?.addEventListener('click', () => {
  const sidebar = document.getElementById('sidebar');
  if (sidebar.style.display === 'flex') {
    sidebar.style.display = 'none';
  } else {
    sidebar.style.display = 'flex';
    sidebar.style.position = 'fixed';
  }
});

// Boot application
document.addEventListener('DOMContentLoaded', () => {
  initTabRouter();
  startClock();
  initCharts();
  initExportButtons();
  setDeviceOnline(false, null);
  setupFirebaseListeners();
});
