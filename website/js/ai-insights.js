/**
 * ============================================================================
 * DHARTI RAKSHAK - DHARTI AI EARTH INTELLIGENCE & GROQ ENGINE
 * ============================================================================
 * Coordinates real-time soil health scoring and rich Groq AI recommendations.
 */

import { firebaseConfig } from './firebase-config.js';

export class DhartiAiEngine {
  constructor() {
    this.container = document.getElementById('ai-recommendations-container');
    this.scoreElement = document.getElementById('ai-health-score-val');
    this.scoreBadge = document.getElementById('ai-health-badge');
    this.analyzeBtn = document.getElementById('btn-analyze-ai');
    this.lastAnalysisTimeElem = document.getElementById('ai-last-analysis-time');
    this.confidenceBadgeElem = document.getElementById('ai-confidence-badge');

    this.backendUrl = localStorage.getItem('dharti_backend_url') || 'http://localhost:5000';
    this.isAnalyzing = false;
    this.latestTelemetry = null;
    this.currentRecommendation = null;
  }

  setBackendUrl(url) {
    this.backendUrl = (url || '').replace(/\/$/, '');
    localStorage.setItem('dharti_backend_url', this.backendUrl);
  }

  setGroqConfig(apiKey, model) {
    this.groqApiKey = (apiKey !== undefined ? apiKey : (localStorage.getItem('dharti_groq_api_key') || '')).trim();
    this.groqModel = (model !== undefined ? model : (localStorage.getItem('dharti_groq_model') || 'llama-3.3-70b-versatile')).trim();
  }

  init() {
    if (this.analyzeBtn) {
      this.analyzeBtn.addEventListener('click', () => this.triggerGroqAnalysis(true));
    }
    this.listenToCloudRecommendations();
  }

  async listenToCloudRecommendations() {
    // Initial fetch from Firebase Realtime Database
    try {
      const res = await fetch(`${firebaseConfig.databaseURL}/aiRecommendations/dharti-node-01/latest.json`);
      if (res.ok) {
        const cloudRec = await res.json();
        if (cloudRec && cloudRec.summary) {
          this.currentRecommendation = cloudRec;
          this.renderStructuredRecommendation(cloudRec);
        }
      }
    } catch (e) {
      console.warn("[DhartiAI] Initial cloud recommendation fetch:", e);
    }
  }

  evaluateTelemetry(data) {
    if (!data) return;
    this.latestTelemetry = data;

    const { moisture, ph, nitrogen, phosphorus, potassium, totalNPK } = data;

    // 1. Calculate Multi-Factor Soil Health Index (0 - 100)
    let score = 100;

    // NPK Deductions
    if (nitrogen < 20) score -= 12;
    if (phosphorus < 15) score -= 10;
    if (potassium < 80) score -= 10;

    // Moisture Deductions (Target 25 - 45%)
    if (moisture < 20) score -= 15;
    else if (moisture > 60) score -= 10;

    // pH Deductions (Target 6.0 - 7.5)
    if (ph < 5.5 || ph > 8.0) score -= 18;
    else if (ph < 6.0 || ph > 7.5) score -= 8;

    score = Math.max(10, Math.min(100, Math.round(score)));

    // Update UI Score Elements
    if (this.scoreElement) {
      this.scoreElement.innerText = `${score} / 100`;
      this.scoreElement.style.color = score >= 75 ? '#34d399' : score >= 50 ? '#fbbf24' : '#f87171';
    }
    if (this.scoreBadge) {
      this.scoreBadge.innerText = `${score} / 100`;
      this.scoreBadge.style.color = score >= 75 ? '#34d399' : score >= 50 ? '#fbbf24' : '#f87171';
    }

    // If no cloud recommendation is currently loaded, display fast heuristic insights
    if (!this.currentRecommendation) {
      this.renderLocalHeuristics(data);
    }
  }

  async triggerGroqAnalysis(force = true) {
    if (this.isAnalyzing) return;
    this.isAnalyzing = true;

    if (this.analyzeBtn) {
      this.analyzeBtn.disabled = true;
      this.analyzeBtn.innerHTML = `
        <span class="spinner-inline"></span> Analyzing Soil Telemetry...
      `;
    }

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (this.groqApiKey) headers['x-groq-api-key'] = this.groqApiKey;
      if (this.groqModel) headers['x-groq-model'] = this.groqModel;

      const response = await fetch(`${this.backendUrl}/api/recommendation/generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          deviceId: 'dharti-node-01',
          forceRefresh: force,
          groqApiKey: this.groqApiKey || undefined,
          groqModel: this.groqModel || undefined
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${response.status}`);
      }

      const resJson = await response.json();
      if (resJson.success && resJson.recommendation) {
        this.currentRecommendation = resJson.recommendation;
        this.renderStructuredRecommendation(resJson.recommendation);
      } else {
        throw new Error(resJson.error || "Failed to generate recommendation");
      }
    } catch (err) {
      console.warn("[DhartiAI] Backend analysis notice:", err);
      // Fallback to local heuristic analysis
      if (this.latestTelemetry) {
        this.renderLocalHeuristics(this.latestTelemetry, `⚠️ Offline Mode (Backend unavailable: ${err.message})`);
      }
    } finally {
      this.isAnalyzing = false;
      if (this.analyzeBtn) {
        this.analyzeBtn.disabled = false;
        this.analyzeBtn.innerHTML = `
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
          </svg>
          Analyze with Groq AI ⚡
        `;
      }
    }
  }

  renderStructuredRecommendation(rec) {
    if (!this.container) return;

    if (this.lastAnalysisTimeElem && rec.generatedAt) {
      const d = new Date(rec.generatedAt);
      this.lastAnalysisTimeElem.innerText = `Last AI Analysis: ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
    }

    if (this.confidenceBadgeElem && rec.confidence) {
      this.confidenceBadgeElem.innerText = rec.confidence;
    }

    const nLevel = rec.nutrientStatus?.nitrogen?.level || 'Adequate';
    const pLevel = rec.nutrientStatus?.phosphorus?.level || 'Adequate';
    const kLevel = rec.nutrientStatus?.potassium?.level || 'Adequate';

    const getPillColor = (lvl) => {
      const lower = String(lvl).toLowerCase();
      if (lower.includes('low') || lower.includes('deficient')) return '#f87171';
      if (lower.includes('high') || lower.includes('excess')) return '#fbbf24';
      return '#34d399';
    };

    let actionsHtml = '';
    if (Array.isArray(rec.recommendedActions) && rec.recommendedActions.length > 0) {
      actionsHtml = rec.recommendedActions.map(action => `
        <div class="ai-action-item">
          <div class="ai-action-header">
            <span class="ai-action-tag tag-${(action.priority || 'Medium').toLowerCase()}">${action.priority || 'Medium'} Priority</span>
            <strong style="color: var(--primary-mint); font-size: 0.88rem;">${action.title}</strong>
          </div>
          <p style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 4px; line-height: 1.5;">${action.description}</p>
        </div>
      `).join('');
    }

    let warningsHtml = '';
    if (Array.isArray(rec.warnings) && rec.warnings.length > 0) {
      warningsHtml = `
        <div class="ai-warning-box">
          <div style="font-weight: 700; font-size: 0.82rem; color: #fbbf24; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
            <span>⚠️</span> Important Agricultural Cautions:
          </div>
          <ul style="margin: 0 0 0 18px; padding: 0; font-size: 0.78rem; color: #fde68a;">
            ${rec.warnings.map(w => `<li>${w}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    this.container.innerHTML = `
      <!-- Executive Summary -->
      <div class="ai-summary-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <span style="font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--primary-mint); font-weight: 700;">
            🌿 AI Soil Diagnosis
          </span>
          <span class="ai-model-tag">${rec.model || 'Groq Llama 3.3'}</span>
        </div>
        <p style="font-size: 0.88rem; color: var(--text-primary); line-height: 1.55; margin: 0;">
          ${rec.summary}
        </p>
      </div>

      <!-- Live Nutrient Status Breakdown -->
      <div class="ai-nutrient-breakdown">
        <div class="nutrient-pill">
          <span class="nutrient-lbl">Nitrogen (N)</span>
          <span class="nutrient-status" style="color: ${getPillColor(nLevel)};">${nLevel}</span>
        </div>
        <div class="nutrient-pill">
          <span class="nutrient-lbl">Phosphorus (P)</span>
          <span class="nutrient-status" style="color: ${getPillColor(pLevel)};">${pLevel}</span>
        </div>
        <div class="nutrient-pill">
          <span class="nutrient-lbl">Potassium (K)</span>
          <span class="nutrient-status" style="color: ${getPillColor(kLevel)};">${kLevel}</span>
        </div>
      </div>

      <!-- Actionable Guidance -->
      ${actionsHtml}

      <!-- Cautionary Warnings -->
      ${warningsHtml}
    `;
  }

  renderLocalHeuristics(data, notice = null) {
    if (!this.container) return;

    const { moisture, ph, nitrogen } = data;
    const insights = [];

    if (ph < 6.0) {
      insights.push({
        title: `Soil Acidity Detected (pH ${ph.toFixed(2)})`,
        advice: "Apply Agricultural Dolomite Lime or Calcium Carbonate to neutralize acidity and enhance phosphate availability.",
        type: "warning"
      });
    } else if (ph > 7.5) {
      insights.push({
        title: `Alkaline Soil Tendency (pH ${ph.toFixed(2)})`,
        advice: "Incorporate organic compost, bio-humus, or elemental sulfur to gently lower pH and unlock micronutrient uptake.",
        type: "warning"
      });
    } else {
      insights.push({
        title: "Optimal Soil pH Balance",
        advice: "pH is in the prime agronomic range (6.0 – 7.5). Nutrient assimilation capacity is maximized.",
        type: "optimal"
      });
    }

    if (nitrogen < 30) {
      insights.push({
        title: `Nitrogen Deficit Alert (N: ${nitrogen} mg/kg)`,
        advice: "Boost leafy vegetative growth using organic vermicompost, cow manure, or legume green manuring.",
        type: "action"
      });
    }

    if (moisture < 25.0) {
      insights.push({
        title: `Low Soil Moisture (${moisture.toFixed(1)}%)`,
        advice: "Irrigation recommended within the next 6-12 hours to prevent plant root moisture stress.",
        type: "action"
      });
    }

    this.container.innerHTML = `
      ${notice ? `<div style="font-size: 0.76rem; color: #fbbf24; padding: 6px 10px; background: rgba(245, 158, 11, 0.1); border-radius: var(--radius-sm); margin-bottom: 8px;">${notice}</div>` : ''}
      ${insights.map(item => `
        <div class="ai-recommendation-box">
          <h4>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
            ${item.title}
          </h4>
          <p>${item.advice}</p>
        </div>
      `).join('')}
    `;
  }
}

export const aiEngine = new DhartiAiEngine();
