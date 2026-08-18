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
    const modelsToTry = [
      model,
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'llama3-8b-8192',
      'llama3-70b-8192',
      'mixtral-8x7b-32768',
      'gemma2-9b-it'
    ].filter(Boolean);

    let lastError = null;
    for (const m of modelsToTry) {
      try {
        const completion = await testClient.chat.completions.create({
          messages: [{ role: 'user', content: 'Say "OK" in 1 word.' }],
          model: m,
          max_tokens: 5
        });
        return {
          valid: true,
          modelUsed: m,
          response: completion.choices[0]?.message?.content?.trim() || 'OK'
        };
      } catch (err) {
        lastError = err;
        if (err.status === 401 || String(err.message).includes('invalid_api_key')) {
          throw err; // Invalid key should immediately fail
        }
      }
    }
    throw lastError || new Error("Failed to connect with available Groq models.");
  }

  async generateStructuredJson({ systemPrompt, userPrompt, model = config.groqModel, temperature = 0.2, apiKey = null }) {
    const client = this.getClient(apiKey);
    if (!client) {
      throw new Error('GROQ_API_KEY is not configured. Please set a Groq API Key in the Admin Panel or environment variables.');
    }

    const modelsToTry = [
      model,
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'llama3-70b-8192',
      'llama3-8b-8192',
      'mixtral-8x7b-32768',
      'gemma2-9b-it'
    ].filter(Boolean);

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
        if (err.status === 404 || String(err.message).includes('model_not_found')) {
          console.warn(`[GroqService] Model ${m} not found on this account. Trying next model...`);
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

    const modelsToTry = [
      model,
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'llama3-8b-8192',
      'llama3-70b-8192',
      'mixtral-8x7b-32768',
      'gemma2-9b-it'
    ].filter(Boolean);

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
        if (err.status === 404 || String(err.message).includes('model_not_found')) {
          console.warn(`[GroqService] Model ${m} not found on this account. Trying next model...`);
          continue;
        }
        throw err;
      }
    }
    throw lastError || new Error("All Groq candidate models failed.");
  }
}

export const groqService = new GroqService();
