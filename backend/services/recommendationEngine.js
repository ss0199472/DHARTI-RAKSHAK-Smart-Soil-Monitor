/**
 * ============================================================================
 * DHARTI RAKSHAK - AI RECOMMENDATION ENGINE
 * ============================================================================
 * Evaluates real-time Modbus RS-485 soil telemetry and generates structured
 * agronomic guidance via Groq AI (Llama 3.3).
 */

import { firebaseService } from './firebaseService.js';
import { groqService } from './groqService.js';
import { config } from '../config/config.js';

class RecommendationEngine {
  constructor() {
    this.lastGeneratedRecommendation = null;
    this.lastGenerationTime = 0;
    this.DEBOUNCE_INTERVAL_MS = 6000; // 6-second rate-limit debounce
  }

  validateTelemetry(data, status) {
    const isOnline = status ? status.online !== false : true;
    const errors = [];
    const warnings = [];

    if (!data) {
      errors.push("No soil telemetry data available in Firebase.");
      return { valid: false, errors, warnings, isFresh: false };
    }

    // Check device online state
    if (!isOnline) {
      warnings.push("ESP32 field node is currently OFFLINE. Recommendations are based on last recorded snapshot.");
    }

    // Check individual parameter existence
    const requiredFields = ['nitrogen', 'phosphorus', 'potassium', 'moisture', 'temperature', 'ph'];
    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null || isNaN(Number(data[field]))) {
        errors.push(`Missing or invalid soil parameter: ${field}`);
      }
    }

    // Check for abnormal or uncalibrated readings
    if (data.ph < 1.0 || data.ph > 14.0) {
      warnings.push(`pH reading (${data.ph}) is outside expected biological range (1.0 - 14.0).`);
    }
    if (data.nitrogen === 0 && data.phosphorus === 0 && data.potassium === 0) {
      warnings.push("All N-P-K nutrient values are 0 mg/kg. Sensor probe may not be inserted into soil or requires bus warmup.");
    }

    // Freshness check
    const timestamp = data.timestamp || (status ? status.lastSeen : 0);
    const ageSeconds = timestamp ? Math.round((Date.now() - timestamp) / 1000) : 999;
    const isFresh = ageSeconds <= 20;

    if (!isFresh && isOnline) {
      warnings.push(`Telemetry was received ${ageSeconds}s ago (streaming may be delayed).`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      isFresh,
      ageSeconds
    };
  }

  generateRuleBasedEvaluation(data) {
    if (!data) return null;
    const n = Number(data.nitrogen) || 0;
    const p = Number(data.phosphorus) || 0;
    const k = Number(data.potassium) || 0;
    const moist = Number(data.moisture) || 0;
    const temp = Number(data.temperature) || 0;
    const ph = Number(data.ph) || 7.0;

    let healthScore = 70;
    const actions = [];
    const warnings = [];

    // NPK Analysis
    if (n < 20) {
      healthScore -= 10;
      actions.push({
        priority: "High",
        title: "Nitrogen Replenishment",
        description: "Soil nitrogen is low. Consider incorporating composted manure, vermicompost, or nitrogen-fixing cover crops (legumes).",
        type: "organic"
      });
    }
    if (p < 15) {
      healthScore -= 8;
      actions.push({
        priority: "Medium",
        title: "Phosphorus Enrichment",
        description: "Soil phosphorus is low. Add bone meal or rock phosphate to promote strong root structure.",
        type: "organic"
      });
    }
    if (k < 80) {
      healthScore -= 8;
      actions.push({
        priority: "Medium",
        title: "Potassium Enhancement",
        description: "Soil potassium is low. Apply wood ash or potassium humate to enhance plant resilience and water regulation.",
        type: "organic"
      });
    }

    // Moisture Analysis
    if (moist < 20) {
      healthScore -= 10;
      actions.push({
        priority: "High",
        title: "Irrigation Scheduling",
        description: "Soil moisture is low (<20%). Schedule drip or surface irrigation to restore field capacity.",
        type: "irrigation"
      });
    } else if (moist > 50) {
      actions.push({
        priority: "Low",
        title: "Drainage Monitoring",
        description: "Soil moisture is high (>50%). Ensure adequate field drainage to prevent anaerobic root zone conditions.",
        type: "irrigation"
      });
    }

    // pH Analysis
    if (ph < 6.0) {
      healthScore -= 10;
      actions.push({
        priority: "Medium",
        title: "Soil Acidity Neutralization",
        description: `Soil is acidic (pH ${ph}). Consider agricultural lime or dolomite application based on soil test titration.`,
        type: "amendment"
      });
    } else if (ph > 7.8) {
      healthScore -= 10;
      actions.push({
        priority: "Medium",
        title: "Soil Alkalinity Management",
        description: `Soil is alkaline (pH ${ph}). Incorporate gypsum and organic matter to lower pH and improve nutrient uptake.`,
        type: "amendment"
      });
    }

    healthScore = Math.max(15, Math.min(98, healthScore));

    return {
      summary: `Soil telemetry analyzed: NPK at ${n}-${p}-${k} mg/kg, moisture at ${moist}%, pH at ${ph}.`,
      soilHealthScore: healthScore,
      soilStatus: healthScore > 75 ? "Good Fertility" : healthScore > 50 ? "Moderate Fertility" : "Requires Soil Conditioning",
      nutrientStatus: {
        overall: (n >= 20 && p >= 15 && k >= 80) ? "Adequate" : "Deficient",
        nitrogen: { level: n < 20 ? "Low" : n > 80 ? "High" : "Adequate", assessment: `Nitrogen level is ${n} mg/kg.` },
        phosphorus: { level: p < 15 ? "Low" : p > 50 ? "High" : "Adequate", assessment: `Phosphorus level is ${p} mg/kg.` },
        potassium: { level: k < 80 ? "Low" : k > 200 ? "High" : "Adequate", assessment: `Potassium level is ${k} mg/kg.` }
      },
      phMoistureAssessment: {
        phAnalysis: `pH is ${ph} (${ph < 6.0 ? 'Acidic' : ph > 7.5 ? 'Alkaline' : 'Near Neutral'}).`,
        moistureAnalysis: `Moisture is ${moist}% (${moist < 25 ? 'Low' : moist > 45 ? 'High' : 'Optimal'}).`
      },
      recommendedActions: actions,
      suggestedNextSteps: [
        "Monitor live telemetry trends on the dashboard.",
        "Calibrate nutrient amendments with field size and target crop requirements.",
        "Perform periodic sensor cleaning and check RS-485 Modbus connectivity."
      ],
      warnings,
      confidence: "High (Agronomic Heuristics Engine)",
      source: "local_heuristics"
    };
  }

  buildSystemPrompt() {
    return `You are the core AI Agronomy Engine for "DHARTI RAKSHAK" (Technology for Protecting the Earth).
Your task is to analyze real-time Modbus RS-485 soil sensor telemetry and generate a rigorous, structured agronomic recommendation.

STRICT SCIENTIFIC AND ETHICAL RULES:
1. ONLY use the actual parameters provided: Nitrogen (N), Phosphorus (P), Potassium (K), Soil Moisture (%), Soil Temperature (°C), and Soil pH.
2. DO NOT assume parameters that are not provided (e.g. Electrical Conductivity EC, Organic Carbon, Cation Exchange Capacity).
3. DO NOT output exact chemical fertilizer amounts in kilograms (e.g. "apply 45 kg Urea/acre") unless the user explicitly provides crop, acreage, and growth stage. Explicitly communicate that exact quantities require field size, crop stage, and local soil test calibration.
4. Distinguish between measured data and AI interpretations.
5. If data has warnings, anomalies, or zero values, highlight them in the "warnings" array and adjust your confidence accordingly.
6. Return a valid JSON object matching the exact JSON schema requested.`;
  }

  buildUserPrompt(data, status, validation, userContext = {}) {
    return `Analyze the following live soil telemetry from Dharti Rakshak node "${config.deviceId}":

SENSORY DATA MEASURED:
- Nitrogen (N): ${data.nitrogen} mg/kg
- Phosphorus (P): ${data.phosphorus} mg/kg
- Potassium (K): ${data.potassium} mg/kg
- Total NPK: ${data.totalNPK || (data.nitrogen + data.phosphorus + data.potassium)} mg/kg
- Soil Moisture: ${data.moisture}%
- Soil Temperature: ${data.temperature}°C
- Soil pH: ${data.ph}
- Hardware Sensor Status: ${data.sensorStatus || 'OK'}
- Node Online Status: ${status?.online ? 'ONLINE' : 'OFFLINE'}
- Data Freshness: ${validation.isFresh ? 'Live Stream' : `Stale (${validation.ageSeconds}s old)`}
${userContext.targetCrop ? `- Target Crop: ${userContext.targetCrop}` : '- Target Crop: Not specified (General agronomic analysis)'}
${userContext.fieldSize ? `- Field Area: ${userContext.fieldSize}` : '- Field Area: Not specified'}

EXISTING WARNINGS DETECTED BY VALIDATOR:
${validation.warnings.length > 0 ? validation.warnings.map(w => `- ${w}`).join('\n') : '- None'}

Respond strictly with a JSON object adhering to this schema:
{
  "summary": "1-2 sentence executive overview of current soil condition",
  "soilHealthScore": <integer between 0 and 100>,
  "soilStatus": "Brief label (e.g. Optimal / Nutrient Deficient / Acidic Saturation / Low Moisture)",
  "nutrientStatus": {
    "overall": "High / Medium / Low / Imbalanced",
    "nitrogen": {
      "level": "Low / Adequate / High",
      "assessment": "Explanation of N status for vegetative growth"
    },
    "phosphorus": {
      "level": "Low / Adequate / High",
      "assessment": "Explanation of P status for root and energy transfer"
    },
    "potassium": {
      "level": "Low / Adequate / High",
      "assessment": "Explanation of K status for disease resistance and moisture regulation"
    }
  },
  "phMoistureAssessment": {
    "phAnalysis": "Analysis of pH and nutrient availability",
    "moistureAnalysis": "Analysis of soil water saturation and irrigation needs"
  },
  "recommendedActions": [
    {
      "priority": "High / Medium / Low",
      "title": "Action title (e.g., Organic Compost Enrichment / Moisture Conservation)",
      "description": "Practical, safe guidance for soil improvement",
      "type": "organic / irrigation / amendment / monitoring"
    }
  ],
  "suggestedNextSteps": [
    "Step 1...",
    "Step 2..."
  ],
  "warnings": [
    "Any data limitations, missing crop context, or sensor warnings"
  ],
  "confidence": "High / Medium / Low (with brief rationale based on telemetry validity)"
}`;
  }

  async generateRecommendation({ userContext = {}, forceRefresh = false, deviceId = config.deviceId, apiKey = null, model = null } = {}) {
    const now = Date.now();

    // Check Debounce Cache if not forced
    if (!forceRefresh && this.lastGeneratedRecommendation && (now - this.lastGenerationTime < this.DEBOUNCE_INTERVAL_MS)) {
      return {
        success: true,
        source: 'cache',
        recommendation: this.lastGeneratedRecommendation
      };
    }

    // 1. Fetch live telemetry, status, and system_config from Firebase
    const [latestData, deviceStatus, systemConfig] = await Promise.all([
      firebaseService.getLatestTelemetry(deviceId),
      firebaseService.getDeviceStatus(deviceId),
      firebaseService.getSystemConfig()
    ]);

    const activeApiKey = apiKey || systemConfig?.groq_api_key || config.groqApiKey;
    const activeModel = model || systemConfig?.groq_model || config.groqModel || 'llama-3.3-70b-versatile';

    // 2. Validate Telemetry
    const validation = this.validateTelemetry(latestData, deviceStatus);

    if (!validation.valid) {
      return {
        success: false,
        error: "Insufficient soil data to generate AI recommendation.",
        details: validation.errors
      };
    }

    // 3. Check Groq Configuration (Fallback to local rule-based engine if missing)
    if (!groqService.isConfigured(activeApiKey)) {
      console.warn('[RecommendationEngine] Groq API Key missing. Using local rule-based agronomy evaluation.');
      const localEval = this.generateRuleBasedEvaluation(latestData);
      const fallbackRecommendation = {
        timestamp: Date.now(),
        deviceId: deviceId,
        ...localEval,
        dataUsed: {
          nitrogen: latestData.nitrogen,
          phosphorus: latestData.phosphorus,
          potassium: latestData.potassium,
          totalNPK: latestData.totalNPK || (latestData.nitrogen + latestData.phosphorus + latestData.potassium),
          moisture: latestData.moisture,
          temperature: latestData.temperature,
          ph: latestData.ph,
          sensorTimestamp: latestData.timestamp || null
        },
        model: "Dharti Heuristic Rule Engine (Offline Fallback)",
        generatedAt: new Date().toISOString()
      };
      await firebaseService.saveAiRecommendation(fallbackRecommendation, deviceId);
      this.lastGeneratedRecommendation = fallbackRecommendation;
      this.lastGenerationTime = now;
      return {
        success: true,
        source: 'local_heuristics',
        recommendation: fallbackRecommendation
      };
    }

    // 4. Generate structured recommendation via Groq AI
    try {
      const systemPrompt = this.buildSystemPrompt();
      const userPrompt = this.buildUserPrompt(latestData, deviceStatus, validation, userContext);

      const aiResult = await groqService.generateStructuredJson({
        systemPrompt,
        userPrompt,
        model: activeModel,
        temperature: 0.2,
        apiKey: activeApiKey
      });

      // 5. Structure finalized payload
      const finalRecommendation = {
        timestamp: Date.now(),
        deviceId: deviceId,
        summary: aiResult.summary || "Soil telemetry analyzed.",
        soilHealthScore: typeof aiResult.soilHealthScore === 'number' ? aiResult.soilHealthScore : 75,
        soilStatus: aiResult.soilStatus || "Analyzed",
        nutrientStatus: aiResult.nutrientStatus || {},
        phMoistureAssessment: aiResult.phMoistureAssessment || {},
        recommendedActions: Array.isArray(aiResult.recommendedActions) ? aiResult.recommendedActions : [],
        suggestedNextSteps: Array.isArray(aiResult.suggestedNextSteps) ? aiResult.suggestedNextSteps : [],
        confidence: aiResult.confidence || (validation.isFresh ? "High (Verified Live Telemetry)" : "Medium (Telemetry Snapshot)"),
        warnings: [
          ...validation.warnings,
          ...(Array.isArray(aiResult.warnings) ? aiResult.warnings : [])
        ],
        dataUsed: {
          nitrogen: latestData.nitrogen,
          phosphorus: latestData.phosphorus,
          potassium: latestData.potassium,
          totalNPK: latestData.totalNPK || (latestData.nitrogen + latestData.phosphorus + latestData.potassium),
          moisture: latestData.moisture,
          temperature: latestData.temperature,
          ph: latestData.ph,
          sensorTimestamp: latestData.timestamp || null
        },
        model: `${config.groqModel} via Groq`,
        generatedAt: new Date().toISOString()
      };

      // 6. Persist to Firebase Realtime Database
      await firebaseService.saveAiRecommendation(finalRecommendation, deviceId);

      // Cache locally
      this.lastGeneratedRecommendation = finalRecommendation;
      this.lastGenerationTime = now;

      return {
        success: true,
        source: 'groq',
        recommendation: finalRecommendation
      };
    } catch (err) {
      console.error('[RecommendationEngine] Generation failed:', err.message);
      return {
        success: false,
        error: `AI Recommendation generation failed: ${err.message}`
      };
    }
  }

  async getLatestRecommendation(deviceId = config.deviceId) {
    const cloudRec = await firebaseService.getLatestAiRecommendation(deviceId);
    if (cloudRec) {
      this.lastGeneratedRecommendation = cloudRec;
      return cloudRec;
    }
    return this.lastGeneratedRecommendation;
  }
}

export const recommendationEngine = new RecommendationEngine();
