/**
 * ============================================================================
 * DHARTI RAKSHAK - AI CHATBOT ENGINE
 * ============================================================================
 * Context-aware AI Agronomist & Project Assistant powered by Groq AI.
 */

import { firebaseService } from './firebaseService.js';
import { groqService } from './groqService.js';
import { config } from '../config/config.js';

class ChatbotEngine {
  async buildSystemPrompt(deviceId = config.deviceId) {
    // 1. Fetch live telemetry, status, latest AI recommendation, and verified metadata
    const [latestData, statusData, latestRec, projectMeta] = await Promise.all([
      firebaseService.getLatestTelemetry(deviceId),
      firebaseService.getDeviceStatus(deviceId),
      firebaseService.getLatestAiRecommendation(deviceId),
      firebaseService.getProjectMetadata()
    ]);

    const isOnline = statusData ? statusData.online !== false : false;

    return `You are "Dharti AI", the intelligent agronomy assistant and project guide for DHARTI RAKSHAK (धर्ती रक्षक - Technology for Protecting the Earth).

====================================================================
1. VERIFIED PROJECT KNOWLEDGE BASE (STRICT FACTS - NEVER HALLUCINATE)
====================================================================
- Project Name: ${projectMeta.projectName || 'DHARTI RAKSHAK (धर्ती रक्षक)'}
- Tagline: ${projectMeta.tagline || 'Technology for Protecting the Earth'}
- Creator: ${projectMeta.creator || 'Namit Kumar'}
- Team Name: ${projectMeta.teamName || 'Royal Challenger Kanpur'}
- Team Members: ${Array.isArray(projectMeta.teamMembers) ? projectMeta.teamMembers.join(', ') : 'Namit Kumar, Sanidhya Krishna Yadav, Yugant Dwivedi, Rudransh Uttam'}
- Designed & Created By: ${projectMeta.designedBy || 'NK Innovation Hub (https://nk-innovation-hub.netlify.app/)'}
- Project Objective: ${projectMeta.objective || 'Real-time industrial IoT soil nutrient, moisture, pH, and environmental intelligence platform designed to maximize crop yield, prevent soil degradation, and empower farmers with precision agronomy and AI intelligence.'}
- Hardware Stack: ${projectMeta.hardwareStack || 'ESP32 Dev Module, Industrial RS-485 Modbus NPK+Moisture+Temp+pH Soil Sensor, MAX485 TTL-to-RS485 transceiver, 16x2 I2C LCD Display'}
- Pinout / Wiring: ${projectMeta.pinoutDetails || 'ESP32 GPIO 16 (RX2), GPIO 17 (TX2), GPIO 4 (RE/DE Direction Control), I2C 0x27 for 16x2 LCD'}
- Cloud & Web Architecture: ${projectMeta.cloudStack || 'Firebase Realtime Database, Cloudflare Pages (Frontend), Render Backend (Node.js/Express) with Groq Llama 3.3 AI'}
- Firmware Version: ${statusData?.firmwareVersion || '2.1.0-CLOUD'}

====================================================================
2. LIVE HARDWARE & SENSOR TELEMETRY (REAL-TIME CONTEXT)
====================================================================
- Field Node State: ${isOnline ? '🟢 ONLINE & STREAMING' : '🔴 OFFLINE / DISCONNECTED'}
- Wi-Fi RSSI: ${statusData?.rssi ? `${statusData.rssi} dBm` : 'N/A'}
- Node IP Address: ${statusData?.ip || 'N/A'}
${latestData && isOnline ? `
CURRENT SOIL READINGS:
- Nitrogen (N): ${latestData.nitrogen} mg/kg
- Phosphorus (P): ${latestData.phosphorus} mg/kg
- Potassium (K): ${latestData.potassium} mg/kg
- Total NPK: ${latestData.totalNPK || (latestData.nitrogen + latestData.phosphorus + latestData.potassium)} mg/kg
- Soil Moisture: ${latestData.moisture}%
- Soil Temperature: ${latestData.temperature}°C
- Soil pH: ${latestData.ph}
- Computed Fertility Level: ${latestData.fertility || 'N/A'}
- Soil Type: ${latestData.soilType || 'N/A'}
` : `
CURRENT SENSOR STATUS: The ESP32 soil sensor node is currently OFFLINE or waiting for data. If asked about current readings, inform the user that the node is currently disconnected and provide general agronomic guidance until live data arrives.
`}

====================================================================
3. LATEST AI AGRONOMIC RECOMMENDATION
====================================================================
${latestRec ? `
- Summary: ${latestRec.summary}
- Soil Health Index: ${latestRec.soilHealthScore}/100
- Recommended Actions: ${latestRec.recommendedActions ? latestRec.recommendedActions.map(a => `${a.title} (${a.description})`).join('; ') : 'None'}
` : 'No prior AI recommendation logged in Firebase.'}

====================================================================
4. BEHAVIORAL AND SAFETY GUIDELINES
====================================================================
1. Be helpful, concise, friendly, and scientifically grounded.
2. When answering about project creators or team details, ONLY state the verified names above.
3. When answering about soil metrics, reference the exact real-time readings shown above.
4. If asked for exact fertilizer quantities (e.g. kg of urea), explain that exact dosage depends on field area, crop stage, and local soil tests. Provide general application principles and caution.
5. NEVER disclose internal server secrets, Groq API keys, or private backend environment variables.
6. Support Hindi (हिन्दी) or English depending on how the user greets or asks you.`;
  }

  async processChat({ messages, userContext = {}, deviceId = config.deviceId }) {
    if (!groqService.isConfigured()) {
      return {
        success: false,
        error: "GROQ_API_KEY is not configured on the server. Please set GROQ_API_KEY in Render environment variables."
      };
    }

    try {
      const systemPrompt = await this.buildSystemPrompt(deviceId);

      // Sanitize and prepare conversation history (limit to last 8 turns)
      const sanitizedMessages = [
        { role: 'system', content: systemPrompt }
      ];

      if (Array.isArray(messages)) {
        const recentMessages = messages.slice(-8);
        for (const msg of recentMessages) {
          if (msg.role === 'user' || msg.role === 'assistant') {
            sanitizedMessages.push({
              role: msg.role,
              content: String(msg.content).slice(0, 1500)
            });
          }
        }
      }

      const reply = await groqService.generateChatResponse({
        messages: sanitizedMessages,
        model: config.groqModel,
        temperature: 0.5,
        maxTokens: 1024
      });

      return {
        success: true,
        reply: reply,
        model: config.groqModel,
        timestamp: Date.now()
      };
    } catch (err) {
      console.error('[ChatbotEngine] Error processing chat:', err.message);
      return {
        success: false,
        error: `Chatbot error: ${err.message}`
      };
    }
  }
}

export const chatbotEngine = new ChatbotEngine();
