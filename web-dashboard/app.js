/**
 * ============================================================================
 * DHARTI-RAKSHAK: Web Telemetry Dashboard Logic
 * Powered by Firebase Realtime Database & Chart.js
 * ============================================================================
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
  getDatabase, 
  ref, 
  onValue, 
  query, 
  limitToLast, 
  orderByChild 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// Firebase Configuration with user's verified Realtime Database endpoint
const firebaseConfig = {
  databaseURL: "https://dharti-rakshak-iot-e52e1-default-rtdb.asia-southeast1.firebasedatabase.app"
};

// Initialize Firebase App & Database
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// DOM Elements - Metrics
const elMoisture = document.getElementById('valMoisture');
const elTemp = document.getElementById('valTemp');
const elEc = document.getElementById('valEc');
const elPh = document.getElementById('valPh');
const elNitrogen = document.getElementById('valNitrogen');
const elPhosphorus = document.getElementById('valPhosphorus');
const elPotassium = document.getElementById('valPotassium');

// DOM Elements - Bars & Markers
const barMoisture = document.getElementById('barMoisture');
const barTemp = document.getElementById('barTemp');
const barEc = document.getElementById('barEc');
const markerPh = document.getElementById('markerPh');
const barNitrogen = document.getElementById('barNitrogen');
const barPhosphorus = document.getElementById('barPhosphorus');
const barPotassium = document.getElementById('barPotassium');

// DOM Elements - Status & Hints
const hintMoisture = document.getElementById('hintMoisture');
const hintTemp = document.getElementById('hintTemp');
const hintEc = document.getElementById('hintEc');
const hintPh = document.getElementById('hintPh');
const fertilityTag = document.getElementById('fertilityTag');
const soilTypeTag = document.getElementById('soilTypeTag');
const npkTotalTag = document.getElementById('npkTotalTag');
const wifiRssiTag = document.getElementById('wifiRssiTag');

// DOM Elements - Device Meta
const deviceStatusBadge = document.getElementById('deviceStatusBadge');
const deviceStatusText = document.getElementById('deviceStatusText');
const lastUpdatedText = document.getElementById('lastUpdatedText');
const metaDeviceId = document.getElementById('metaDeviceId');
const metaFirmware = document.getElementById('metaFirmware');
const metaUptime = document.getElementById('metaUptime');
const metaIp = document.getElementById('metaIp');
const chartLoader = document.getElementById('chartLoader');

// Global Chart Instance & state
let telemetryChart = null;
const activeParams = {
  moisture: true,
  temp: true,
  ec: true,
  ph: true,
  npk: false
};

/**
 * Initialize Chart.js with dark mode themes & smoothing
 */
function initChart() {
  const ctx = document.getElementById('telemetryChart').getContext('2d');
  
  telemetryChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Moisture (%)',
          id: 'moisture',
          borderColor: '#38bdf8',
          backgroundColor: 'rgba(56, 189, 248, 0.1)',
          data: [],
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 2,
          hidden: !activeParams.moisture
        },
        {
          label: 'Temperature (°C)',
          id: 'temp',
          borderColor: '#fb923c',
          backgroundColor: 'rgba(251, 146, 60, 0.1)',
          data: [],
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 2,
          hidden: !activeParams.temp
        },
        {
          label: 'EC (µS/cm / 10)',
          id: 'ec',
          borderColor: '#34d399',
          backgroundColor: 'rgba(52, 211, 153, 0.1)',
          data: [],
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 2,
          hidden: !activeParams.ec
        },
        {
          label: 'pH Level (x10)',
          id: 'ph',
          borderColor: '#a78bfa',
          backgroundColor: 'rgba(167, 139, 250, 0.1)',
          data: [],
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 2,
          hidden: !activeParams.ph
        },
        {
          label: 'Nitrogen (mg/kg)',
          id: 'npk',
          borderColor: '#2dd4bf',
          data: [],
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 2,
          hidden: !activeParams.npk
        },
        {
          label: 'Phosphorus (mg/kg)',
          id: 'npk',
          borderColor: '#c084fc',
          data: [],
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 2,
          hidden: !activeParams.npk
        },
        {
          label: 'Potassium (mg/kg)',
          id: 'npk',
          borderColor: '#facc15',
          data: [],
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 2,
          hidden: !activeParams.npk
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          display: true,
          labels: {
            color: '#94a3b8',
            font: { family: 'Inter', size: 12 }
          }
        },
        tooltip: {
          backgroundColor: '#131b26',
          titleColor: '#f1f5f9',
          bodyColor: '#cbd5e1',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 10 }, maxTicksLimit: 8 }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 10 } }
        }
      }
    }
  });
}

/**
 * Format uptime seconds into human-readable string
 */
function formatUptime(seconds) {
  if (!seconds) return '--';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m ${secs}s`;
}

/**
 * Format relative time
 */
function getRelativeTime(timestamp) {
  if (!timestamp) return 'Never';
  const now = Date.now();
  const diffSec = Math.floor((now - timestamp) / 1000);
  if (diffSec < 15) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  return new Date(timestamp).toLocaleTimeString();
}

/**
 * Check if the ESP32 node is online based on heartbeat timestamp
 */
function checkOnlineStatus(lastSeen) {
  if (!lastSeen) {
    setDeviceStatus(false);
    return;
  }
  const now = Date.now();
  const diffMinutes = (now - lastSeen) / 1000 / 60;
  
  if (diffMinutes <= 3.5) {
    setDeviceStatus(true);
  } else {
    setDeviceStatus(false);
  }
}

function setDeviceStatus(isOnline) {
  if (isOnline) {
    deviceStatusBadge.classList.add('online');
    deviceStatusText.textContent = 'ESP32 Online';
  } else {
    deviceStatusBadge.classList.remove('online');
    deviceStatusText.textContent = 'ESP32 Offline';
  }
}

/**
 * 1. REALTIME LISTENER: Live Telemetry
 */
function setupLiveTelemetryListener() {
  const liveRef = ref(db, 'dharti_rakshak/live_readings');

  onValue(liveRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) {
      lastUpdatedText.textContent = 'Waiting for initial sensor sample...';
      return;
    }

    // Moisture
    const moist = Number(data.moisture ?? 0);
    elMoisture.textContent = moist.toFixed(1);
    barMoisture.style.width = `${Math.min(moist, 100)}%`;
    hintMoisture.textContent = moist < 25 ? 'Low - Irrigation Needed' : moist > 70 ? 'High - Waterlogged' : 'Optimal Moisture';

    // Temperature
    const temp = Number(data.temperature ?? 0);
    elTemp.textContent = temp.toFixed(1);
    const tempPercent = Math.min(Math.max((temp + 10) / 70 * 100, 0), 100);
    barTemp.style.width = `${tempPercent}%`;
    hintTemp.textContent = temp < 15 ? 'Cool' : temp > 35 ? 'High Temperature' : 'Normal Range';

    // EC
    const ec = Number(data.ec ?? 0);
    elEc.textContent = ec;
    const ecPercent = Math.min((ec / 3000) * 100, 100);
    barEc.style.width = `${ecPercent}%`;
    hintEc.textContent = ec < 500 ? 'Low Salinity' : ec > 2000 ? 'High Salinity' : 'Ideal Nutrient Buffer';

    // pH
    const ph = Number(data.ph ?? 7.0);
    elPh.textContent = ph.toFixed(2);
    const phPercent = Math.min(Math.max((ph / 14) * 100, 0), 100);
    markerPh.style.left = `${phPercent}%`;
    hintPh.textContent = ph < 6.0 ? 'Acidic Soil' : ph > 7.5 ? 'Alkaline Soil' : 'Neutral Balanced pH';

    // NPK
    const n = Number(data.nitrogen ?? 0);
    const p = Number(data.phosphorus ?? 0);
    const k = Number(data.potassium ?? 0);

    elNitrogen.textContent = n;
    elPhosphorus.textContent = p;
    elPotassium.textContent = k;

    barNitrogen.style.width = `${Math.min((n / 300) * 100, 100)}%`;
    barPhosphorus.style.width = `${Math.min((p / 150) * 100, 100)}%`;
    barPotassium.style.width = `${Math.min((k / 300) * 100, 100)}%`;

    // Overview tags
    const totalNpk = n + p + k;
    npkTotalTag.textContent = `${totalNpk} mg/kg`;
    fertilityTag.textContent = data.fertility || (totalNpk > 250 ? 'HIGH' : totalNpk > 120 ? 'MEDIUM' : 'LOW');
    soilTypeTag.textContent = data.soil_type || (ph < 6.0 ? 'Acidic' : ph > 7.5 ? 'Alkaline' : 'Neutral');

    // Last updated
    if (data.timestamp) {
      lastUpdatedText.textContent = `Sample: ${getRelativeTime(data.timestamp)}`;
      checkOnlineStatus(data.timestamp);
    }
  }, (error) => {
    console.error("Live telemetry read error:", error);
    lastUpdatedText.textContent = 'Connection error (check Firebase permissions)';
  });
}

/**
 * 2. REALTIME LISTENER: Device Information
 */
function setupDeviceInfoListener() {
  const deviceRef = ref(db, 'dharti_rakshak/device_info');

  onValue(deviceRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) return;

    if (data.device_id) metaDeviceId.textContent = data.device_id;
    if (data.firmware_version) metaFirmware.textContent = `v${data.firmware_version}`;
    if (data.uptime_seconds) metaUptime.textContent = formatUptime(data.uptime_seconds);
    if (data.ip_address) metaIp.textContent = data.ip_address;
    if (data.wifi_rssi !== undefined) wifiRssiTag.textContent = `${data.wifi_rssi} dBm`;

    if (data.last_seen) {
      checkOnlineStatus(data.last_seen);
    }
  });
}

/**
 * 3. REALTIME LISTENER: Historical Telemetry for Chart.js
 */
function setupHistoricalLogsListener(pointLimit = 50) {
  const histQuery = query(
    ref(db, 'dharti_rakshak/historical_logs'),
    limitToLast(pointLimit)
  );

  onValue(histQuery, (snapshot) => {
    const data = snapshot.val();
    if (!data) {
      chartLoader.innerHTML = '<i class="fa-solid fa-cloud"></i><span>No historical telemetry recorded yet. ESP32 will log points automatically.</span>';
      return;
    }

    chartLoader.style.display = 'none';

    const timestamps = [];
    const moistureArr = [];
    const tempArr = [];
    const ecArr = [];
    const phArr = [];
    const nArr = [];
    const pArr = [];
    const kArr = [];

    // Parse records
    Object.values(data).forEach((entry) => {
      if (!entry) return;
      const timeLabel = entry.timestamp 
        ? new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : 'Point';
      
      timestamps.push(timeLabel);
      moistureArr.push(Number(entry.moisture ?? 0));
      tempArr.push(Number(entry.temperature ?? 0));
      ecArr.push(Number(entry.ec ?? 0) / 10); // Scaled for chart readability
      phArr.push(Number(entry.ph ?? 0) * 10); // Scaled for chart readability
      nArr.push(Number(entry.nitrogen ?? 0));
      pArr.push(Number(entry.phosphorus ?? 0));
      kArr.push(Number(entry.potassium ?? 0));
    });

    if (telemetryChart) {
      telemetryChart.data.labels = timestamps;
      telemetryChart.data.datasets[0].data = moistureArr;
      telemetryChart.data.datasets[1].data = tempArr;
      telemetryChart.data.datasets[2].data = ecArr;
      telemetryChart.data.datasets[3].data = phArr;
      telemetryChart.data.datasets[4].data = nArr;
      telemetryChart.data.datasets[5].data = pArr;
      telemetryChart.data.datasets[6].data = kArr;
      telemetryChart.update();
    }
  });
}

/**
 * Filter Pill Listeners
 */
function setupChartControls() {
  const pills = document.querySelectorAll('.param-pill');
  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      const param = pill.getAttribute('data-param');
      pill.classList.toggle('active');
      const isActive = pill.classList.contains('active');
      activeParams[param] = isActive;

      if (telemetryChart) {
        telemetryChart.data.datasets.forEach(ds => {
          if (ds.id === param) {
            ds.hidden = !isActive;
          }
        });
        telemetryChart.update();
      }
    });
  });

  const limitSelect = document.getElementById('dataPointLimit');
  limitSelect.addEventListener('change', (e) => {
    const limit = parseInt(e.target.value, 10);
    setupHistoricalLogsListener(limit);
  });
}

// Boot up application
document.addEventListener('DOMContentLoaded', () => {
  initChart();
  setupChartControls();
  setupLiveTelemetryListener();
  setupDeviceInfoListener();
  setupHistoricalLogsListener(50);
});
