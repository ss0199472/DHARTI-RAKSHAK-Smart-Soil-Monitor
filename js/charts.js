/**
 * ============================================================================
 * DHARTI RAKSHAK - INTERACTIVE CHARTING & ANALYTICS MODULE
 * ============================================================================
 * Uses Chart.js to render telemetry curves:
 * 1. NPK Macronutrients Breakdown
 * 2. Moisture vs Temperature Dual-Axis Timeline
 * 3. Soil pH Dynamics & Stability Range
 */

class AnalyticsManager {
  constructor() {
    this.npkChart = null;
    this.tempMoistChart = null;
    this.phChart = null;
  }

  initialize() {
    this.initNpkChart();
    this.initTempMoistChart();
  }

  initNpkChart() {
    const ctx = document.getElementById('chart-npk');
    if (!ctx) return;

    this.npkChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Nitrogen (N)', 'Phosphorus (P)', 'Potassium (K)'],
        datasets: [{
          label: 'Current Concentration (mg/kg)',
          data: [48, 35, 115],
          backgroundColor: [
            'rgba(96, 165, 250, 0.7)',
            'rgba(251, 191, 36, 0.7)',
            'rgba(192, 132, 252, 0.7)'
          ],
          borderColor: [
            '#3b82f6',
            '#f59e0b',
            '#a855f7'
          ],
          borderWidth: 2,
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(12, 20, 15, 0.9)',
            titleColor: '#f0fdf4',
            bodyColor: '#a7f3d0',
            borderColor: 'rgba(52, 211, 153, 0.3)',
            borderWidth: 1,
            padding: 10
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            ticks: { color: '#6ee7b7', font: { family: 'Plus Jakarta Sans', weight: '600' } }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.06)' },
            ticks: { color: '#4b7a63' },
            beginAtZero: true,
            suggestedMax: 150
          }
        }
      }
    });
  }

  initTempMoistChart() {
    const ctx = document.getElementById('chart-temp-moist');
    if (!ctx) return;

    this.tempMoistChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Moisture (%)',
            data: [],
            borderColor: '#22d3ee',
            backgroundColor: 'rgba(6, 182, 212, 0.1)',
            fill: true,
            tension: 0.35,
            yAxisID: 'y',
            pointRadius: 2
          },
          {
            label: 'Temperature (°C)',
            data: [],
            borderColor: '#f87171',
            backgroundColor: 'transparent',
            borderDash: [4, 4],
            tension: 0.35,
            yAxisID: 'y1',
            pointRadius: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            labels: { color: '#a7f3d0', font: { family: 'Plus Jakarta Sans' } }
          },
          tooltip: {
            backgroundColor: 'rgba(12, 20, 15, 0.9)',
            borderColor: 'rgba(52, 211, 153, 0.3)',
            borderWidth: 1
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            ticks: { color: '#4b7a63', maxTicksLimit: 6 }
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            grid: { color: 'rgba(255, 255, 255, 0.06)' },
            ticks: { color: '#22d3ee' },
            title: { display: true, text: 'Moisture (%)', color: '#22d3ee' }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            grid: { drawOnChartArea: false },
            ticks: { color: '#f87171' },
            title: { display: true, text: 'Temp (°C)', color: '#f87171' }
          }
        }
      }
    });
  }

  updateFromHistory(historyData) {
    if (!historyData || !historyData.length) return;

    // Update Temp & Moisture Chart Timeline
    if (this.tempMoistChart) {
      const recent = historyData.slice(-20);
      const labels = recent.map(d => {
        const date = new Date(d.timestamp || Date.now());
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      });
      const moistData = recent.map(d => d.moisture);
      const tempData  = recent.map(d => d.temperature);

      this.tempMoistChart.data.labels = labels;
      this.tempMoistChart.data.datasets[0].data = moistData;
      this.tempMoistChart.data.datasets[1].data = tempData;
      this.tempMoistChart.update();
    }
  }

  updateLiveNpk(n, p, k) {
    if (this.npkChart) {
      this.npkChart.data.datasets[0].data = [n, p, k];
      this.npkChart.update();
    }
  }
}

export const analyticsManager = new AnalyticsManager();
