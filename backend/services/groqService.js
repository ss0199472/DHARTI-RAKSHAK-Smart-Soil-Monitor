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

  async testApiKey(apiKey, model = config.groqModel) {
    if (!apiKey || apiKey.trim() === '') {
      throw new Error("No API key provided to test.");
    }
    const testClient = new Groq({ apiKey: apiKey.trim() });
    const completion = await testClient.chat.completions.create({
      messages: [{ role: 'user', content: 'Say "OK" in 1 word.' }],
      model: model || config.groqFastModel || 'llama-3.1-8b-instant',
      max_tokens: 5
    });
    return {
      valid: true,
      modelUsed: model,
      response: completion.choices[0]?.message?.content?.trim() || 'OK'
    };
  }

  async generateStructuredJson({ systemPrompt, userPrompt, model = config.groqModel, temperature = 0.2, apiKey = null }) {
    const client = this.getClient(apiKey);
    if (!client) {
      throw new Error('GROQ_API_KEY is not configured. Please set a Groq API Key in the Admin Panel or environment variables.');
    }

    try {
      const completion = await client.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        model: model || config.groqModel,
        temperature: temperature,
        response_format: { type: 'json_object' }
      });

      const responseText = completion.choices[0]?.message?.content || '{}';
      return JSON.parse(responseText);
    } catch (err) {
      console.error('[GroqService] JSON generation failed:', err.message);
      throw err;
    }
  }

  async generateChatResponse({ messages, model = config.groqModel, temperature = 0.5, maxTokens = 1024, apiKey = null }) {
    const client = this.getClient(apiKey);
    if (!client) {
      throw new Error('GROQ_API_KEY is not configured. Please set a Groq API Key in the Admin Panel or environment variables.');
    }

    try {
      const completion = await client.chat.completions.create({
        messages: messages,
        model: model || config.groqModel,
        temperature: temperature,
        max_tokens: maxTokens
      });

      return completion.choices[0]?.message?.content || '';
    } catch (err) {
      console.error('[GroqService] Chat completion failed:', err.message);
      throw err;
    }
  }
}

export const groqService = new GroqService();
