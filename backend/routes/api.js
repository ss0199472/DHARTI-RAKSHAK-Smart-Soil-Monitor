/**
 * ============================================================================
 * DHARTI RAKSHAK - REST API ROUTES
 * ============================================================================
 */

import express from 'express';
import { firebaseService } from '../services/firebaseService.js';
import { groqService } from '../services/groqService.js';
import { recommendationEngine } from '../services/recommendationEngine.js';
import { chatbotEngine } from '../services/chatbotEngine.js';
import { config } from '../config/config.js';

const router = express.Router();

// 1. Health Check
router.get('/health', async (req, res) => {
  const isGroqConfigured = groqService.isConfigured();
  res.json({
    status: 'ok',
    service: 'Dharti Rakshak AI Backend',
    version: config.defaultProjectMetadata.version,
    groqConfigured: isGroqConfigured,
    model: config.groqModel,
    deviceId: config.deviceId,
    timestamp: new Date().toISOString()
  });
});

// 2. Get Latest Soil Telemetry
router.get('/api/soil/latest', async (req, res) => {
  try {
    const deviceId = req.query.deviceId || config.deviceId;
    const [latest, status] = await Promise.all([
      firebaseService.getLatestTelemetry(deviceId),
      firebaseService.getDeviceStatus(deviceId)
    ]);

    res.json({
      success: true,
      deviceId,
      online: status ? status.online !== false : false,
      data: latest,
      status: status
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Get Latest AI Recommendation
router.get('/api/recommendation/latest', async (req, res) => {
  try {
    const deviceId = req.query.deviceId || config.deviceId;
    const recommendation = await recommendationEngine.getLatestRecommendation(deviceId);
    if (!recommendation) {
      return res.json({
        success: true,
        recommendation: null,
        message: "No AI recommendation has been generated yet. Use POST /api/recommendation/generate to analyze."
      });
    }
    res.json({ success: true, recommendation });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Generate AI Recommendation (Trigger Groq AI)
router.post('/api/recommendation/generate', async (req, res) => {
  try {
    const { userContext = {}, forceRefresh = true, deviceId = config.deviceId } = req.body || {};
    const result = await recommendationEngine.generateRecommendation({
      userContext,
      forceRefresh: !!forceRefresh,
      deviceId
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. AI Chatbot Message
router.post('/api/chat', async (req, res) => {
  try {
    const { messages, message, userContext = {}, deviceId = config.deviceId } = req.body || {};

    let chatMessages = messages;
    if (!chatMessages && message) {
      chatMessages = [{ role: 'user', content: message }];
    }

    if (!chatMessages || !Array.isArray(chatMessages) || chatMessages.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid request. Provide 'messages' array with role and content."
      });
    }

    const result = await chatbotEngine.processChat({
      messages: chatMessages,
      userContext,
      deviceId
    });

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Get Project Information / Metadata
router.get('/api/project-info', async (req, res) => {
  try {
    const meta = await firebaseService.getProjectMetadata();
    res.json({ success: true, project: meta });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Update Project Information / Metadata (Admin)
router.put('/api/project-info', async (req, res) => {
  try {
    const metadata = req.body;
    if (!metadata || typeof metadata !== 'object') {
      return res.status(400).json({ success: false, error: "Invalid metadata payload." });
    }
    const saved = await firebaseService.saveProjectMetadata(metadata);
    res.json({ success: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
