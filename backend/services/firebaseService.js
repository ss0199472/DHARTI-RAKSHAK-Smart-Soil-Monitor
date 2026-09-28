/**
 * ============================================================================
 * DHARTI RAKSHAK - FIREBASE SERVICE
 * ============================================================================
 * Handles REST communication with Firebase Realtime Database.
 */

import fetch from 'node-fetch';
import { config } from '../config/config.js';

class FirebaseService {
  constructor() {
    this.baseUrl = config.firebaseDatabaseUrl;
    this.authToken = config.firebaseAuthToken;
  }

  _buildUrl(path) {
    let url = `${this.baseUrl}${path}.json`;
    if (this.authToken) {
      url += `?auth=${this.authToken}`;
    }
    return url;
  }

  async getLatestTelemetry(deviceId = config.deviceId) {
    try {
      const res = await fetch(this._buildUrl(`/devices/${deviceId}/latest`));
      if (!res.ok) {
        console.warn(`[Firebase] Failed to fetch latest telemetry: HTTP ${res.status}`);
        return null;
      }
      const data = await res.json();
      return data;
    } catch (err) {
      console.error('[Firebase] Error fetching latest telemetry:', err.message);
      return null;
    }
  }

  async getDeviceStatus(deviceId = config.deviceId) {
    try {
      const res = await fetch(this._buildUrl(`/devices/${deviceId}/status`));
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.error('[Firebase] Error fetching device status:', err.message);
      return null;
    }
  }

  async getLatestAiRecommendation(deviceId = config.deviceId) {
    try {
      const res = await fetch(this._buildUrl(`/aiRecommendations/${deviceId}/latest`));
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.error('[Firebase] Error fetching AI recommendation:', err.message);
      return null;
    }
  }

  async saveAiRecommendation(recommendation, deviceId = config.deviceId) {
    try {
      const res = await fetch(this._buildUrl(`/aiRecommendations/${deviceId}/latest`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recommendation)
      });
      if (!res.ok) {
        throw new Error(`Firebase returned HTTP ${res.status}`);
      }
      return true;
    } catch (err) {
      console.error('[Firebase] Error saving AI recommendation:', err.message);
      return false;
    }
  }

  async getProjectMetadata() {
    try {
      const [metaRes, configRes] = await Promise.all([
        fetch(this._buildUrl(`/projectMetadata`)),
        fetch(this._buildUrl(`/system_config`))
      ]);

      const projectData = metaRes.ok ? await metaRes.json() : null;
      const sysConfig = configRes.ok ? await configRes.json() : null;

      const merged = {
        ...config.defaultProjectMetadata,
        ...(projectData || {})
      };

      if (sysConfig) {
        if (sysConfig.project_name) merged.projectName = sysConfig.project_name;
        if (sysConfig.project_tagline) merged.tagline = sysConfig.project_tagline;
        if (sysConfig.team_name) merged.teamName = sysConfig.team_name;
        if (Array.isArray(sysConfig.team_members)) {
          const visibleNames = sysConfig.team_members
            .filter(m => m && m.visible !== false)
            .map(m => typeof m === 'string' ? m : m.name)
            .filter(Boolean);
          if (visibleNames.length > 0) {
            merged.teamMembers = visibleNames;
          }
        }
      }

      return merged;
    } catch (err) {
      console.warn('[Firebase] Error resolving merged project metadata:', err.message);
      return config.defaultProjectMetadata;
    }
  }

  async saveProjectMetadata(metadata) {
    try {
      const res = await fetch(this._buildUrl(`/projectMetadata`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metadata)
      });
      return res.ok;
    } catch (err) {
      console.error('[Firebase] Error saving project metadata:', err.message);
      return false;
    }
  }

  async getSystemConfig() {
    try {
      const res = await fetch(this._buildUrl(`/system_config`));
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.error('[Firebase] Error fetching system_config:', err.message);
      return null;
    }
  }

  async saveSystemConfig(systemConfig) {
    try {
      const res = await fetch(this._buildUrl(`/system_config`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(systemConfig)
      });
      return res.ok;
    } catch (err) {
      console.error('[Firebase] Error saving system_config:', err.message);
      return false;
    }
  }
}

export const firebaseService = new FirebaseService();
