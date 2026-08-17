/**
 * ============================================================================
 * DHARTI RAKSHAK - FIREBASE CONFIGURATION & REALTIME STREAM MANAGER
 * ============================================================================
 * Supports both Live Firebase Realtime Database (via v10 modular SDK or REST)
 * and an Instant Interactive Sandbox Simulation Mode if Firebase is not yet configured.
 */

// User Configuration Object
// Actual Firebase Project Configuration
export const firebaseConfig = {
  apiKey: "AIzaSyA5iOt3TL2ZOK42c-2N-Gu9Kz1TA12-vNg",
  authDomain: "dharti-rakshak-iot-59952.firebaseapp.com",
  databaseURL: "https://dharti-rakshak-iot-59952-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "dharti-rakshak-iot-59952",
  storageBucket: "dharti-rakshak-iot-59952.firebasestorage.app",
  messagingSenderId: "142965414553",
  appId: "1:142965414553:web:5a0b6947662622cdd8f608"
};

export const ACTIVE_DEVICE_ID = "dharti-node-01";

class DataStreamService {
  constructor() {
    this.isLiveFirebase = false;
    this.listeners = {
      latest: [],
      history: [],
      status: []
    };
    this.simulatedState = {
      moisture: 32.4,
      temperature: 26.8,
      ph: 6.85,
      nitrogen: 48,
      phosphorus: 35,
      potassium: 115,
      online: true,
      lastSeen: Date.now()
    };
    this.historyBuffer = [];
    this.initHistoricalSeed();
  }

  initHistoricalSeed() {
    const now = Date.now();
    for (let i = 24; i >= 0; i--) {
      const timestamp = now - i * 3600 * 1000;
      const variation = Math.sin(i / 3) * 2;
      this.historyBuffer.push({
        id: `log-${timestamp}`,
        timestamp: timestamp,
        moisture: +(32.0 + variation * 0.6).toFixed(1),
        temperature: +(25.0 + variation * 0.9).toFixed(1),
        ph: +(6.80 + Math.cos(i) * 0.05).toFixed(2),
        nitrogen: Math.round(45 + variation),
        phosphorus: Math.round(34 + variation * 0.5),
        potassium: Math.round(112 + variation * 1.2),
        totalNPK: Math.round(45 + 34 + 112 + variation * 2.7)
      });
    }
  }

  async initialize() {
    // Check if real Firebase credentials are provided
    if (
      firebaseConfig.databaseURL &&
      !firebaseConfig.databaseURL.includes("YOUR_PROJECT_ID")
    ) {
      try {
        console.log("[Dharti Rakshak] Connecting to Live Firebase Database:", firebaseConfig.databaseURL);
        this.startFirebasePolling();
        this.isLiveFirebase = true;
        return;
      } catch (err) {
        console.warn("[Dharti Rakshak] Firebase connection error, falling back to Sandbox Simulator:", err);
      }
    }

    console.log("[Dharti Rakshak] Running in Interactive Nature-Tech Live Simulator Mode.");
    this.startSimulationStream();
  }

  onLatest(callback) {
    this.listeners.latest.push(callback);
    // Trigger immediately with current state
    callback(this.getLatestFormatted());
  }

  onHistory(callback) {
    this.listeners.history.push(callback);
    callback(this.historyBuffer);
  }

  onStatus(callback) {
    this.listeners.status.push(callback);
    callback({
      online: true,
      ip: "192.168.1.105",
      rssi: -58,
      sensorStatus: "HEALTHY",
      firmwareVersion: "2.1.0-CLOUD",
      isLiveFirebase: this.isLiveFirebase
    });
  }

  getLatestFormatted() {
    const totalNPK = this.simulatedState.nitrogen + this.simulatedState.phosphorus + this.simulatedState.potassium;
    let fertility = "LOW";
    if (totalNPK > 250) fertility = "HIGH";
    else if (totalNPK > 120) fertility = "MEDIUM";

    let soilType = "Neutral";
    if (this.simulatedState.ph < 1.0) soilType = "Connecting...";
    else if (this.simulatedState.ph < 6.0) soilType = "Acidic";
    else if (this.simulatedState.ph > 7.5) soilType = "Alkaline";

    return {
      moisture: this.simulatedState.moisture,
      temperature: this.simulatedState.temperature,
      ph: this.simulatedState.ph,
      nitrogen: this.simulatedState.nitrogen,
      phosphorus: this.simulatedState.phosphorus,
      potassium: this.simulatedState.potassium,
      totalNPK: totalNPK,
      fertility: fertility,
      soilType: soilType,
      cropSuitability: {
        wheat: this.simulatedState.ph >= 6.0 && this.simulatedState.ph <= 7.5 && this.simulatedState.moisture < 35.0,
        rice: this.simulatedState.moisture > 40.0 && this.simulatedState.ph >= 5.5,
        maize: this.simulatedState.nitrogen > 20 && this.simulatedState.ph >= 5.8
      },
      sensorStatus: "OK",
      timestamp: this.simulatedState.lastSeen
    };
  }

  startSimulationStream() {
    // Simulate real-world micro-fluctuations every 3 seconds
    setInterval(() => {
      const deltaMoist = (Math.random() - 0.5) * 0.4;
      const deltaTemp  = (Math.random() - 0.5) * 0.3;
      const deltaPh    = (Math.random() - 0.5) * 0.04;
      const deltaN     = Math.round((Math.random() - 0.5) * 2);

      this.simulatedState.moisture = +(Math.max(10, Math.min(80, this.simulatedState.moisture + deltaMoist))).toFixed(1);
      this.simulatedState.temperature = +(Math.max(15, Math.min(45, this.simulatedState.temperature + deltaTemp))).toFixed(1);
      this.simulatedState.ph = +(Math.max(4.0, Math.min(9.5, this.simulatedState.ph + deltaPh))).toFixed(2);
      this.simulatedState.nitrogen = Math.max(10, Math.min(100, this.simulatedState.nitrogen + deltaN));
      this.simulatedState.lastSeen = Date.now();

      const latestData = this.getLatestFormatted();
      this.listeners.latest.forEach(cb => cb(latestData));

      // Append to history periodically (every 10 cycles = 30s in demo)
      if (Math.random() > 0.7) {
        this.historyBuffer.push({
          id: `log-${Date.now()}`,
          timestamp: Date.now(),
          moisture: latestData.moisture,
          temperature: latestData.temperature,
          ph: latestData.ph,
          nitrogen: latestData.nitrogen,
          phosphorus: latestData.phosphorus,
          potassium: latestData.potassium,
          totalNPK: latestData.totalNPK
        });
        if (this.historyBuffer.length > 50) this.historyBuffer.shift();
        this.listeners.history.forEach(cb => cb(this.historyBuffer));
      }
    }, 3000);
  }

  async startFirebasePolling() {
    const fetchLatest = async () => {
      try {
        const res = await fetch(`${firebaseConfig.databaseURL}/devices/${ACTIVE_DEVICE_ID}/latest.json`);
        if (res.ok) {
          const data = await res.json();
          if (data) {
            this.listeners.latest.forEach(cb => cb(data));
          }
        }
      } catch (e) {
        console.error("Firebase latest polling error:", e);
      }
    };

    const fetchHistory = async () => {
      try {
        const res = await fetch(`${firebaseConfig.databaseURL}/devices/${ACTIVE_DEVICE_ID}/readings.json?limitToLast=40`);
        if (res.ok) {
          const data = await res.json();
          if (data) {
            const list = Object.keys(data).map(k => ({ id: k, ...data[k] }));
            this.listeners.history.forEach(cb => cb(list));
          }
        }
      } catch (e) {
        console.error("Firebase history polling error:", e);
      }
    };

    fetchLatest();
    fetchHistory();
    setInterval(fetchLatest, 3000);
    setInterval(fetchHistory, 30000);
  }
}

export const dataStream = new DataStreamService();
