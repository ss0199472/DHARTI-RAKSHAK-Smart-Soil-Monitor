/**
 * ============================================================================
 * DHARTI RAKSHAK - GROQ AI SERVICE
 * ============================================================================
 * Handles secure server-side AI inference via Groq Cloud API.
 */

import Groq from 'groq-sdk';
import { config } from '../config/config.js';

class GroqService {
  constructor() {
    this.client = null;
    this.initClient();
  }

  initClient(apiKey = null) {
    const key = apiKey || config.groqApiKey;
    if (key && key.trim() !== '') {
      this.client = new Groq({ apiKey: key.trim() });
    } else {
      this.client = null;
    }
  }

  getClient(apiKey = null) {
    if (apiKey && apiKey.trim() !== '') {
      return new Groq({ apiKey: apiKey.trim() });
    }
    if (!this.client) {
      this.initClient();
    }
    return this.client;
  }

  isConfigured(apiKey = null) {
    if (apiKey && apiKey.trim() !== '') return true;
    return !!this.client || (!!config.groqApiKey && config.groqApiKey.trim() !== '');
  }

  async testApiKey(apiKey, model = null) {
    if (!apiKey || apiKey.trim() === '') {
      throw new Error("No API key provided to test.");
    }
    const testClient = new Groq({ apiKey: apiKey.trim() });

    try {
      // 1. Validate credentials against Groq Models API
      const modelsList = await testClient.models.list();
      const availableModelIds = Array.isArray(modelsList?.data) ? modelsList.data.map(m => m.id) : [];

      // 2. Select working active model
      const preferredModel = (model && availableModelIds.includes(model))
        ? model
        : (availableModelIds.find(id => id.includes('llama-3.3') || id.includes('llama-3.1') || id.includes('llama-3.2') || id.includes('qwen') || id.includes('deepseek')) || availableModelIds[0] || 'llama-3.3-70b-versatile');

      return {
        valid: true,
        modelUsed: preferredModel,
        availableModelsCount: availableModelIds.length,
        response: 'Groq API Key Verified Successfully'
      };
    } catch (err) {
      if (err.status === 401 || String(err.message).includes('invalid_api_key')) {
        throw new Error("Invalid Groq API Key. Please verify your key at https://console.groq.com/keys");
      }
      throw err;
    }
  }

  async getCandidateModels(client, requestedModel = null) {
    try {
      const list = await client.models.list();
      const ids = (list?.data || [])
        .map(m => m.id)
        .filter(id => !id.includes('whisper') && !id.includes('guard') && !id.includes('embedding') && !id.includes('tts') && !id.includes('vision'));
      
      const candidates = [];
      if (requestedModel && ids.includes(requestedModel)) candidates.push(requestedModel);
      
      // Preferred active Groq models in priority order
      const priorityOrder = [
        'llama-3.3-70b-versatile',
        'llama-3.1-8b-instant',
        'llama-3.2-3b-preview',
        'llama-3.2-1b-preview',
        'deepseek-r1-distill-llama-70b',
        'qwen-2.5-32b'
      ];

      for (const p of priorityOrder) {
        if (ids.includes(p) && !candidates.includes(p)) {
          candidates.push(p);
        }
      }

      // Add remaining models
      for (const id of ids) {
        if (!candidates.includes(id)) candidates.push(id);
      }

      if (candidates.length > 0) return candidates;
    } catch (e) {
      console.warn('[GroqService] Dynamic model listing fallback:', e.message);
    }

    return [
      requestedModel,
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'llama-3.2-3b-preview',
      'llama-3.2-1b-preview',
      'deepseek-r1-distill-llama-70b',
      'qwen-2.5-32b'
    ].filter(Boolean);
  }

  async generateStructuredJson({ systemPrompt, userPrompt, model = config.groqModel, temperature = 0.2, apiKey = null }) {
    const client = this.getClient(apiKey);
    if (!client) {
      throw new Error('GROQ_API_KEY is not configured. Please set a Groq API Key in the Admin Panel or environment variables.');
    }

    const modelsToTry = await this.getCandidateModels(client, model);
    let lastError = null;

    for (const m of modelsToTry) {
      try {
        const completion = await client.chat.completions.create({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          model: m,
          temperature: temperature,
          response_format: { type: 'json_object' }
        });

        const responseText = completion.choices[0]?.message?.content || '{}';
        return JSON.parse(responseText);
      } catch (err) {
        lastError = err;
        if (err.status === 404 || err.status === 400 || String(err.message).includes('model_decommissioned') || String(err.message).includes('model_not_found')) {
          console.warn(`[GroqService] Model ${m} unavailable (${err.message}). Trying next model...`);
          continue;
        }
        throw err;
      }
    }
    throw lastError || new Error("All Groq candidate models failed.");
  }

  async generateChatResponse({ messages, model = config.groqModel, temperature = 0.5, maxTokens = 1024, apiKey = null }) {
    const client = this.getClient(apiKey);
    if (!client) {
      throw new Error('GROQ_API_KEY is not configured. Please set a Groq API Key in the Admin Panel or environment variables.');
    }

    const modelsToTry = await this.getCandidateModels(client, model);
    let lastError = null;

    for (const m of modelsToTry) {
      try {
        const completion = await client.chat.completions.create({
          messages: messages,
          model: m,
          temperature: temperature,
          max_tokens: maxTokens
        });

        return completion.choices[0]?.message?.content || '';
      } catch (err) {
        lastError = err;
        if (err.status === 404 || err.status === 400 || String(err.message).includes('model_decommissioned') || String(err.message).includes('model_not_found')) {
          console.warn(`[GroqService] Model ${m} unavailable (${err.message}). Trying next model...`);
          continue;
        }
        throw err;
      }
    }
    throw lastError || new Error("All Groq candidate models failed.");
  }
}

export const groqService = new GroqService();
