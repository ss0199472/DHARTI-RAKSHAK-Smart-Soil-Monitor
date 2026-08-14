/**
 * ============================================================================
 * DHARTI-RAKSHAK: Genuine Real-Time IoT Telemetry Engine
 * Directly connected to Firebase Realtime Database
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

// Official Realtime Database Endpoint
const firebaseConfig = {
  databaseURL: "https://dharti-rakshak-iot-e52e1-default-rtdb.asia-southeast1.firebasedatabase.app"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// DOM Value Elements
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

// Chart instances
let trendChartInstance = null;
let npkChartInstance = null;

// Track last known heartbeat timestamp
let lastSeenTimestamp = 0;

/**
 * 1. REALTIME CLOCK
 */
function startClock() {
  function update() {
    const now = new Date();
    liveClockTime.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    liveClockDate.textContent = now.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    
    // Heartbeat check every second
    verifyHeartbeat();
  }
  update();
  setInterval(update, 1000);
}

/**
 * 2. UPDATE CIRCULAR SVG GAUGES
 */
function setRadialOffset(circleElem, percentage) {
  if (!circleElem) return;
  const clamped = Math.max(0, Math.min(percentage, 100));
  const offset = CIRCUMFERENCE - (clamped / 100) * CIRCUMFERENCE;
  circleElem.style.strokeDashoffset = offset;
}

/**
 * 3. DEVICE ONLINE / OFFLINE VERIFIER
 */
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
  const now = Date.now();
  const diffMinutes = (now - lastSeenTimestamp) / 1000 / 60;
  // If ESP32 hasn't posted in > 3.5 minutes, mark as offline
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
 * 4. INITIALIZE CHARTS WITH CLEAN EMPTY STATE
 */
function initCharts() {
  // Chart 1: Dual-Axis Moisture & Temperature Trend (Initialized with 0 data)
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
          pointBorderWidth: 2,
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
          pointBorderWidth: 2,
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
        tooltip: {
          backgroundColor: '#0d1621',
          titleColor: '#f8fafc',
          bodyColor: '#cbd5e1',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.04)' },
          ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 10 } }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          grid: { color: 'rgba(255, 255, 255, 0.04)' },
          ticks: { color: '#38bdf8', font: { family: 'JetBrains Mono', size: 10 } },
          min: 0,
          max: 100
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          grid: { drawOnChartArea: false },
          ticks: { color: '#fb923c', font: { family: 'JetBrains Mono', size: 10 } },
          min: 0,
          max: 60
        }
      }
    }
  });

  // Chart 2: NPK Levels (mg/kg) (Initialized with [0, 0, 0])
  const ctxNpk = document.getElementById('npkChart').getContext('2d');
  
  npkChartInstance = new Chart(ctxNpk, {
    type: 'bar',
    data: {
      labels: ['Nitrogen (N)', 'Phosphorus (P)', 'Potassium (K)'],
      datasets: [{
        data: [0, 0, 0],
        backgroundColor: [
          'rgba(34, 197, 94, 0.85)',
          'rgba(6, 182, 212, 0.85)',
          'rgba(236, 72, 153, 0.85)'
        ],
        borderColor: [
          '#4ade80',
          '#22d3ee',
          '#f472b6'
        ],
        borderWidth: 1.5,
        borderRadius: 8,
        barPercentage: 0.55
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0d1621',
          padding: 10,
          cornerRadius: 8
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#94a3b8', font: { size: 11, weight: '600' } }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.04)' },
          ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 10 } },
          min: 0,
          suggestedMax: 200
        }
      }
    }
  });
}

/**
 * 5. FIREBASE REALTIME TELEMETRY LISTENERS
 */
function setupFirebaseListeners() {
  
  // 1. LIVE READINGS LISTENER
  const liveRef = ref(db, 'dharti_rakshak/live_readings');
  onValue(liveRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) {
      lastUpdatedVal.textContent = 'No data uploaded yet';
      return;
    }

    if (data.timestamp) {
      lastSeenTimestamp = data.timestamp;
      verifyHeartbeat();
      const d = new Date(data.timestamp);
      lastUpdatedVal.textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    // Moisture (0-100%)
    if (data.moisture !== undefined) {
      const moist = Number(data.moisture);
      elMoisture.textContent = moist.toFixed(1);
      setRadialOffset(circleMoisture, moist);
      hintMoisture.textContent = moist < 20 ? 'Very Dry (Irrigate)' : moist > 70 ? 'Waterlogged' : 'Optimal Moisture';
    }

    // Temperature (-40 to 85°C)
    if (data.temperature !== undefined) {
      const temp = Number(data.temperature);
      elTemp.textContent = temp.toFixed(1);
      const tempPct = Math.min(Math.max((temp / 50) * 100, 0), 100);
      setRadialOffset(circleTemp, tempPct);
      hintTemp.textContent = temp < 15 ? 'Cool Soil' : temp > 35 ? 'High Heat' : 'Healthy Range';
    }

    // EC Salinity (0-20000 uS/cm)
    if (data.ec !== undefined) {
      const ec = Number(data.ec);
      elEc.textContent = ec;
      const ecPct = Math.min((ec / 3000) * 100, 100);
      setRadialOffset(circleEc, ecPct);
      hintEc.textContent = ec < 500 ? 'Low Salinity' : ec > 2000 ? 'High Salinity' : 'Balanced Salinity';
    }

    // pH (0-14)
    if (data.ph !== undefined) {
      const ph = Number(data.ph);
      elPh.textContent = ph.toFixed(2);
      const phPct = (ph / 14) * 100;
      setRadialOffset(circlePh, phPct);
      const nature = ph < 6.0 ? 'Acidic' : ph > 7.5 ? 'Alkaline' : 'Neutral';
      phNatureLabel.textContent = nature;
      hintPh.textContent = `${nature} pH`;
    }

    // Nitrogen (mg/kg)
    if (data.nitrogen !== undefined) {
      const n = Number(data.nitrogen);
      elNitrogen.textContent = n;
      setRadialOffset(circleN, Math.min((n / 150) * 100, 100));
      hintN.textContent = n < 20 ? 'Low Nitrogen' : n > 120 ? 'High Nitrogen' : 'Adequate';
    }

    // Phosphorus (mg/kg)
    if (data.phosphorus !== undefined) {
      const p = Number(data.phosphorus);
      elPhosphorus.textContent = p;
      setRadialOffset(circleP, Math.min((p / 100) * 100, 100));
      hintP.textContent = p < 15 ? 'Low Phosphorus' : 'Adequate';
    }

    // Potassium (mg/kg)
    if (data.potassium !== undefined) {
      const k = Number(data.potassium);
      elPotassium.textContent = k;
      setRadialOffset(circleK, Math.min((k / 300) * 100, 100));
      hintK.textContent = k < 100 ? 'Low Potassium' : 'Adequate';
    }

    // Update NPK Bar Chart with Real Values
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
        ? 'Soil is well-balanced. Maintain current irrigation and nutrient cycle.' 
        : 'Adjust irrigation or fertilizer levels to optimize plant growth.';
    }

    // Add Live Alert
    if (alertsContainer && data.timestamp) {
      alertsCountBadge.textContent = '1';
      alertsContainer.innerHTML = `
        <div class="alert-item">
          <i class="fa-solid fa-circle-check text-green"></i>
          <div class="alert-body">
            <span>Live telemetry received from ESP32</span>
          </div>
          <span class="alert-time">${new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      `;
    }
  });

  // 2. DEVICE INFO LISTENER (Heartbeat, Firmware, RSSI, Uptime)
  const deviceRef = ref(db, 'dharti_rakshak/device_info');
  onValue(deviceRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) return;

    if (data.device_id) footerDeviceId.textContent = data.device_id;
    if (data.firmware_version) footerFirmware.textContent = `v${data.firmware_version}`;
    
    if (data.wifi_rssi !== undefined) {
      footerWifi.textContent = `${data.wifi_rssi} dBm`;
      footerWifiIcon.className = 'fa-solid fa-wifi hw-icon text-green';
    }
    
    if (data.uptime_seconds !== undefined) {
      const up = formatUptime(data.uptime_seconds);
      sidebarUptime.textContent = up;
      footerUptime.textContent = up;
    }

    if (data.last_seen) {
      lastSeenTimestamp = data.last_seen;
      verifyHeartbeat();
    }
  });

  // 3. HISTORICAL TIME-SERIES QUERY (For Line Trend Chart)
  const histRef = query(ref(db, 'dharti_rakshak/historical_logs'), limitToLast(25));
  onValue(histRef, (snapshot) => {
    const data = snapshot.val();
    if (!data || Object.keys(data).length === 0) {
      trendEmptyState.style.display = 'flex';
      sidebarDataPoints.textContent = '0';
      return;
    }

    trendEmptyState.style.display = 'none';
    sidebarDataPoints.textContent = Object.keys(data).length.toLocaleString();

    const labels = [];
    const moistures = [];
    const temps = [];

    Object.values(data).forEach((pt) => {
      if (!pt) return;
      const t = pt.timestamp ? new Date(pt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Log';
      labels.push(t);
      moistures.push(Number(pt.moisture ?? 0));
      temps.push(Number(pt.temperature ?? 0));
    });

    if (trendChartInstance) {
      trendChartInstance.data.labels = labels;
      trendChartInstance.data.datasets[0].data = moistures;
      trendChartInstance.data.datasets[1].data = temps;
      trendChartInstance.update();
    }
  });
}

// Mobile navigation toggle
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
  startClock();
  initCharts();
  setDeviceOnline(false, null);
  setupFirebaseListeners();
});
