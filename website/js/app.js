/**
 * ============================================================================
 * DHARTI RAKSHAK - MAIN APPLICATION CONTROLLER
 * ============================================================================
 * Coordinates Realtime Telemetry, Sensor UI Components, Crop Matrices,
 * Live LCD Screen Emulation, Historical Logs, and CSV Exporting.
 */

import { dataStream } from './firebase-config.js';
import { analyticsManager } from './charts.js';
import { aiEngine } from './ai-insights.js';

class DhartiApp {
  constructor() {
    this.rawHistory = [];
    this.lcdCycleCount = 0;
  }

  init() {
    console.log("[Dharti Rakshak] Initializing Application...");
    
    // 1. Initialize Analytics Charts
    analyticsManager.initialize();

    // 2. Attach Event Handlers
    this.attachEventListeners();

    // 3. Connect Realtime Data Stream
    dataStream.initialize();

    dataStream.onLatest((latest) => {
      this.updateSensorCards(latest);
      this.updateHeroDiagnostics(latest);
      this.updateCropSuitability(latest);
      this.updateLcdEmulator(latest);
      analyticsManager.updateLiveNpk(latest.nitrogen, latest.phosphorus, latest.potassium);
      aiEngine.evaluateTelemetry(latest);
    });

    dataStream.onHistory((history) => {
      this.rawHistory = history;
      this.renderHistoryTable(history);
      analyticsManager.updateFromHistory(history);
    });

    dataStream.onStatus((status) => {
      this.updateDeviceStatus(status);
    });

    // 4. Start LCD Display Emulator Cycle (every 3 seconds)
    setInterval(() => {
      this.lcdCycleCount++;
      if (this.currentLatest) {
        this.updateLcdEmulator(this.currentLatest);
      }
    }, 3000);
  }

  attachEventListeners() {
    // Search / Filter Historical Table
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

    // Export to CSV Button
    const exportBtn = document.getElementById('btn-export-csv');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportCsv());
    }

    // Firebase Config Modal Trigger
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
    this.currentLatest = data;

    // Fertility
    const fertVal = document.getElementById('diag-fertility-val');
    const fertSub = document.getElementById('diag-fertility-sub');
    if (fertVal) {
      fertVal.innerHTML = `${data.fertility} <span class="badge-tag badge-${data.fertility.toLowerCase() === 'high' ? 'high' : (data.fertility.toLowerCase() === 'medium' ? 'med' : 'low')}">${data.totalNPK} mg/kg</span>`;
    }
    if (fertSub) {
      fertSub.innerText = data.totalNPK > 250 ? 'Rich in macronutrients' : (data.totalNPK > 120 ? 'Moderate fertility balance' : 'Nutrient supplementation required');
    }

    // Soil Type & Reaction
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
    // 1. Nitrogen
    this.setCardValue('val-n', data.nitrogen, 'fill-n', (data.nitrogen / 120) * 100);
    // 2. Phosphorus
    this.setCardValue('val-p', data.phosphorus, 'fill-p', (data.phosphorus / 100) * 100);
    // 3. Potassium
    this.setCardValue('val-k', data.potassium, 'fill-k', (data.potassium / 200) * 100);
    // 4. Moisture
    this.setCardValue('val-moist', data.moisture.toFixed(1), 'fill-moist', data.moisture);
    // 5. Temperature
    this.setCardValue('val-temp', data.temperature.toFixed(1), 'fill-temp', (data.temperature / 50) * 100);
    // 6. pH
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

    // Wheat: ph >= 6.0 && ph <= 7.5 && moisture < 35
    const wheatOk = (ph >= 6.0 && ph <= 7.5 && moisture < 35.0);
    this.setCropBadge('badge-wheat', wheatOk, wheatOk ? 'Suitable ✅' : (moisture >= 35 ? 'High Moisture ❌' : 'pH Out of Range ❌'));

    // Rice: moisture > 40 && ph >= 5.5
    const riceOk = (moisture > 40.0 && ph >= 5.5);
    this.setCropBadge('badge-rice', riceOk, riceOk ? 'Suitable ✅' : (moisture <= 40 ? 'Needs >40% Moisture ❌' : 'pH < 5.5 ❌'));

    // Maize: nitrogen > 20 && ph >= 5.8
    const maizeOk = (nitrogen > 20 && ph >= 5.8);
    this.setCropBadge('badge-maize', maizeOk, maizeOk ? 'Suitable ✅' : (nitrogen <= 20 ? 'Low Nitrogen (≤20) ❌' : 'pH < 5.8 ❌'));

    // Extended Agronomy Crops
    // Mustard: ph 6.0 - 7.5, moisture 25 - 35
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
    if (ipElem) ipElem.innerText = status.ip || '192.168.1.105';
    if (rssiElem) rssiElem.innerText = `${status.rssi || -58} dBm (Good)`;
  }

  renderHistoryTable(dataList) {
    const tbody = document.getElementById('history-tbody');
    if (!tbody) return;

    if (!dataList || dataList.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 20px;">No telemetry logs recorded yet.</td></tr>`;
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
      alert("No data to export.");
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
