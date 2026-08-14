/**
 * ============================================================================
 * DHARTI-RAKSHAK: Ultra-Modern Glassmorphic Telemetry Controller
 * Firebase Realtime Database Engine + Chart.js Multi-Axis Visualizers
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

// DOM Value Elements
const elMoisture = document.getElementById('valMoisture');
const elTemp = document.getElementById('valTemp');
const elEc = document.getElementById('valEc');
const elPh = document.getElementById('valPh');
const elNitrogen = document.getElementById('valNitrogen');
const elPhosphorus = document.getElementById('valPhosphorus');
const elPotassium = document.getElementById('valPotassium');

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
const esp32StatusText = document.getElementById('esp32StatusText');
const lastUpdatedVal = document.getElementById('lastUpdatedVal');
const liveClockTime = document.getElementById('liveClockTime');
const liveClockDate = document.getElementById('liveClockDate');
const sidebarUptime = document.getElementById('sidebarUptime');
const sidebarDataPoints = document.getElementById('sidebarDataPoints');
const footerDeviceId = document.getElementById('footerDeviceId');
const footerFirmware = document.getElementById('footerFirmware');
const footerWifi = document.getElementById('footerWifi');
const healthScore = document.getElementById('healthScore');
const healthStatusText = document.getElementById('healthStatusText');
const healthCircle = document.getElementById('healthCircle');
const phNatureLabel = document.getElementById('phNatureLabel');

// Chart instances
let trendChartInstance = null;
let npkChartInstance = null;

/**
 * 1. REALTIME CLOCK
 */
function startClock() {
  function update() {
    const now = new Date();
    liveClockTime.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    liveClockDate.textContent = now.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
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
 * 3. INITIALIZE CHARTS (Dual-Axis Trend + NPK Vertical Bars)
 */
function initCharts() {
  // Chart 1: Dual-Axis Moisture & Temperature Trend
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
      labels: ['10:00 AM', '02:00 PM', '06:00 PM', '10:00 PM', '02:00 AM', '06:00 AM', '10:00 AM'],
      datasets: [
        {
          label: 'Soil Moisture (%)',
          data: [42, 45, 38, 35, 46, 52, 46],
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
          data: [26, 29, 32, 28, 24, 22, 28.6],
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
          max: 50
        }
      }
    }
  });

  // Chart 2: NPK Levels (mg/kg) Vibrant Vertical Bars
  const ctxNpk = document.getElementById('npkChart').getContext('2d');
  
  npkChartInstance = new Chart(ctxNpk, {
    type: 'bar',
    data: {
      labels: ['Nitrogen (N)', 'Phosphorus (P)', 'Potassium (K)'],
      datasets: [{
        data: [38, 24, 312],
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
          suggestedMax: 400
        }
      }
    }
  });
}

/**
 * 4. FIREBASE REALTIME LISTENERS
 */
function setupFirebaseListeners() {
  // Live Readings Listener
  const liveRef = ref(db, 'dharti_rakshak/live_readings');
  onValue(liveRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) return;

    // Moisture (0-100%)
    const moist = Number(data.moisture ?? 46.0);
    elMoisture.textContent = moist.toFixed(0);
    setRadialOffset(circleMoisture, moist);

    // Temperature (-40 to 85°C)
    const temp = Number(data.temperature ?? 28.6);
    elTemp.textContent = temp.toFixed(1);
    const tempPct = Math.min(Math.max((temp / 50) * 100, 0), 100);
    setRadialOffset(circleTemp, tempPct);

    // EC Salinity (0-20000 uS/cm)
    const ec = Number(data.ec ?? 1250);
    elEc.textContent = ec;
    const ecPct = Math.min((ec / 3000) * 100, 100);
    setRadialOffset(circleEc, ecPct);

    // pH (0-14)
    const ph = Number(data.ph ?? 6.58);
    elPh.textContent = ph.toFixed(2);
    const phPct = (ph / 14) * 100;
    setRadialOffset(circlePh, phPct);
    phNatureLabel.textContent = ph < 6.0 ? 'Acidic' : ph > 7.5 ? 'Alkaline' : 'Neutral';

    // Nitrogen (0-2000 mg/kg)
    const n = Number(data.nitrogen ?? 38);
    elNitrogen.textContent = n;
    setRadialOffset(circleN, (n / 200) * 100);

    // Phosphorus (0-2000 mg/kg)
    const p = Number(data.phosphorus ?? 24);
    elPhosphorus.textContent = p;
    setRadialOffset(circleP, (p / 150) * 100);

    // Potassium (0-2000 mg/kg)
    const k = Number(data.potassium ?? 312);
    elPotassium.textContent = k;
    setRadialOffset(circleK, (k / 400) * 100);

    // Update NPK Bar Chart
    if (npkChartInstance) {
      npkChartInstance.data.datasets[0].data = [n, p, k];
      npkChartInstance.update();
    }

    // Calculate Soil Health Score (0-100)
    let score = 80;
    if (ph >= 6.0 && ph <= 7.5) score += 8; else score -= 10;
    if (moist >= 35 && moist <= 65) score += 7; else score -= 8;
    if (n >= 20 && p >= 15 && k >= 100) score += 5;
    score = Math.min(Math.max(score, 20), 98);
    
    healthScore.textContent = score;
    healthStatusText.textContent = score > 75 ? 'Good Health' : score > 50 ? 'Moderate Health' : 'Action Needed';
    
    const healthOffset = 264 - (score / 100) * 264;
    healthCircle.style.strokeDashoffset = healthOffset;

    // Last Updated Timestamp
    if (data.timestamp) {
      const d = new Date(data.timestamp);
      lastUpdatedVal.textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
  });

  // Device Info Listener
  const deviceRef = ref(db, 'dharti_rakshak/device_info');
  onValue(deviceRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) return;

    if (data.device_id) footerDeviceId.textContent = data.device_id;
    if (data.firmware_version) footerFirmware.textContent = `v${data.firmware_version}`;
    if (data.wifi_rssi !== undefined) footerWifi.textContent = `${data.wifi_rssi} dBm`;
    
    if (data.uptime_seconds) {
      const hrs = Math.floor(data.uptime_seconds / 3600);
      const mins = Math.floor((data.uptime_seconds % 3600) / 60);
      sidebarUptime.textContent = `${hrs}h ${mins}m`;
    }

    if (data.last_seen) {
      const diffMins = (Date.now() - data.last_seen) / 60000;
      if (diffMins <= 5) {
        esp32StatusText.textContent = 'ESP32 Online';
      } else {
        esp32StatusText.textContent = 'ESP32 Offline';
      }
    }
  });

  // Historical Telemetry Query for Trends
  const histRef = query(ref(db, 'dharti_rakshak/historical_logs'), limitToLast(15));
  onValue(histRef, (snapshot) => {
    const data = snapshot.val();
    if (!data || !trendChartInstance) return;

    const labels = [];
    const moistures = [];
    const temps = [];
    let count = 0;

    Object.values(data).forEach((pt) => {
      if (!pt) return;
      count++;
      labels.push(pt.timestamp ? new Date(pt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Point');
      moistures.push(Number(pt.moisture ?? 40));
      temps.push(Number(pt.temperature ?? 25));
    });

    sidebarDataPoints.textContent = Object.keys(data).length.toLocaleString();

    if (labels.length > 3) {
      trendChartInstance.data.labels = labels;
      trendChartInstance.data.datasets[0].data = moistures;
      trendChartInstance.data.datasets[1].data = temps;
      trendChartInstance.update();
    }
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

// Boot app
document.addEventListener('DOMContentLoaded', () => {
  startClock();
  initCharts();
  setupFirebaseListeners();
});
