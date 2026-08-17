/**
 * ============================================================================
 * DHARTI RAKSHAK - DHARTI AI EARTH INTELLIGENCE & AGRONOMY ENGINE
 * ============================================================================
 * Evaluates real-time multi-parameter sensor telemetry to generate:
 * 1. Comprehensive Soil Health Score (0 - 100)
 * 2. Nutrient Deficiency Diagnosis & Organic Amendment Recommendations
 * 3. Precision Irrigation & Soil Moisture Guidance
 * 4. Interactive Agronomy Knowledge Engine
 */

export class DhartiAiEngine {
  constructor() {
    this.container = document.getElementById('ai-recommendations-container');
    this.scoreElement = document.getElementById('ai-health-score-val');
  }

  evaluateTelemetry(data) {
    if (!data) return;

    const { moisture, temperature, ph, nitrogen, phosphorus, potassium, totalNPK } = data;

    // 1. Calculate Multi-Factor Soil Health Index (0 - 100)
    let score = 100;

    // pH Factor (Ideal: 6.0 - 7.5)
    if (ph < 6.0) score -= Math.min(25, (6.0 - ph) * 15);
    else if (ph > 7.5) score -= Math.min(25, (ph - 7.5) * 15);

    // Moisture Factor (Ideal: 25% - 45%)
    if (moisture < 25.0) score -= Math.min(25, (25.0 - moisture) * 1.2);
    else if (moisture > 50.0) score -= Math.min(25, (moisture - 50.0) * 1.2);

    // NPK Factor (Ideal Total > 120, balanced distribution)
    if (totalNPK < 100) score -= 25;
    else if (totalNPK < 150) score -= 10;

    if (nitrogen < 25) score -= 8;
    if (phosphorus < 20) score -= 8;
    if (potassium < 80) score -= 8;

    score = Math.max(15, Math.min(99, Math.round(score)));

    if (this.scoreElement) {
      this.scoreElement.innerText = `${score}/100`;
      this.scoreElement.style.color = score > 75 ? '#34d399' : (score > 50 ? '#fbbf24' : '#f87171');
    }

    // 2. Formulate Precision Agronomy Recommendations
    const insights = [];

    // pH Diagnosis
    if (ph < 6.0) {
      insights.push({
        title: "Soil Acidity Detected (pH " + ph.toFixed(2) + ")",
        advice: "Apply Agricultural Dolomite Lime or Calcium Carbonate to neutralize acidity and enhance phosphate availability.",
        type: "warning"
      });
    } else if (ph > 7.5) {
      insights.push({
        title: "Alkaline Soil Tendency (pH " + ph.toFixed(2) + ")",
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

    // Nitrogen & Fertility Assessment
    if (nitrogen < 30) {
      insights.push({
        title: "Nitrogen Deficit Alert (N: " + nitrogen + " mg/kg)",
        advice: "Boost leafy vegetative growth using organic vermicompost, cow manure, or legume green manuring.",
        type: "action"
      });
    }

    // Moisture & Irrigation Advisory
    if (moisture < 25.0) {
      insights.push({
        title: "Low Soil Moisture (Moisture: " + moisture.toFixed(1) + "%)",
        advice: "Irrigation recommended within the next 6-12 hours to prevent plant root moisture stress.",
        type: "action"
      });
    } else if (moisture > 65.0) {
      insights.push({
        title: "Waterlogged Condition (Moisture: " + moisture.toFixed(1) + "%)",
        advice: "High saturation detected. Ensure field drainage channels are clear to prevent root hypoxia.",
        type: "warning"
      });
    }

    this.renderInsights(insights);
  }

  renderInsights(insights) {
    if (!this.container) return;

    this.container.innerHTML = insights.map(item => `
      <div class="ai-recommendation-box">
        <h4>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
          </svg>
          ${item.title}
        </h4>
        <p>${item.advice}</p>
      </div>
    `).join('');
  }
}

export const aiEngine = new DhartiAiEngine();
