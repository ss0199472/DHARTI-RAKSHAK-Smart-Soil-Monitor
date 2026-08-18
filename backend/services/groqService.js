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

  initClient() {
    if (config.groqApiKey && config.groqApiKey.trim() !== '') {
      this.client = new Groq({ apiKey: config.groqApiKey });
    } else {
      this.client = null;
    }
  }

  isConfigured() {
    return !!this.client;
  }

  async generateStructuredJson({ systemPrompt, userPrompt, model = config.groqModel, temperature = 0.2 }) {
    if (!this.client) {
      this.initClient();
      if (!this.client) {
        throw new Error('GROQ_API_KEY is not configured on the server. Please set GROQ_API_KEY in environment variables.');
      }
    }

    try {
      const completion = await this.client.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        model: model,
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

  async generateChatResponse({ messages, model = config.groqModel, temperature = 0.5, maxTokens = 1024 }) {
    if (!this.client) {
      this.initClient();
      if (!this.client) {
        throw new Error('GROQ_API_KEY is not configured on the server. Please set GROQ_API_KEY in environment variables.');
      }
    }

    try {
      const completion = await this.client.chat.completions.create({
        messages: messages,
        model: model,
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
