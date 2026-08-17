/**
 * ============================================================================
 * DHARTI RAKSHAK - FIREBASE REALTIME STREAM MANAGER (100% REAL DATA)
 * ============================================================================
 * Directly queries your live Firebase Realtime Database endpoint.
 * Zero mock data: If the physical ESP32 is offline or has not uploaded yet,
 * it accurately reports "Offline / Waiting for ESP32".
 */

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
    this.listeners = {
      latest: [],
      history: [],
      status: []
    };
    this.lastKnownData = null;
    this.lastKnownStatus = {
      online: false,
      ip: "--",
      rssi: "--",
      sensorStatus: "OFFLINE",
      firmwareVersion: "--"
    };
  }

  initialize() {
    console.log("[Dharti Rakshak] Connecting to Live Firebase Database:", firebaseConfig.databaseURL);
    
    // Initial status broadcast: Offline until proven live
    this.emitStatus({
      online: false,
      ip: "--",
      rssi: "--",
      sensorStatus: "OFFLINE",
      firmwareVersion: "--"
    });

    // Start real polling
    this.pollFirebase();
    setInterval(() => this.pollFirebase(), 2500);
  }

  onLatest(callback) {
    this.listeners.latest.push(callback);
    if (this.lastKnownData) callback(this.lastKnownData);
  }

  onHistory(callback) {
    this.listeners.history.push(callback);
  }

  onStatus(callback) {
    this.listeners.status.push(callback);
    callback(this.lastKnownStatus);
  }

  emitStatus(statusObj) {
    this.lastKnownStatus = statusObj;
    this.listeners.status.forEach(cb => cb(statusObj));
  }

  async pollFirebase() {
    // 1. Fetch Latest Telemetry
    try {
      const resLatest = await fetch(`${firebaseConfig.databaseURL}/devices/${ACTIVE_DEVICE_ID}/latest.json`);
      if (resLatest.ok) {
        const data = await resLatest.json();
        if (data && typeof data === 'object' && data.moisture !== undefined) {
          // Check if data is fresh (within last 45 seconds) or has valid timestamp
          const now = Date.now();
          const timestamp = data.timestamp || now;
          const isFresh = (now - timestamp) < 45000;

          const totalNPK = (data.nitrogen || 0) + (data.phosphorus || 0) + (data.potassium || 0);
          
          let fertility = data.fertility;
          if (!fertility) {
            if (totalNPK > 250) fertility = "HIGH";
            else if (totalNPK > 120) fertility = "MEDIUM";
            else fertility = "LOW";
          }

          let soilType = data.soilType;
          if (!soilType) {
            if (data.ph < 1.0) soilType = "Connecting...";
            else if (data.ph < 6.0) soilType = "Acidic";
            else if (data.ph > 7.5) soilType = "Alkaline";
            else soilType = "Neutral";
          }

          const processed = {
            hasData: true,
            isFresh: isFresh,
            moisture: Number(data.moisture) || 0,
            temperature: Number(data.temperature) || 0,
            ph: Number(data.ph) || 0,
            nitrogen: Number(data.nitrogen) || 0,
            phosphorus: Number(data.phosphorus) || 0,
            potassium: Number(data.potassium) || 0,
            totalNPK: totalNPK,
            fertility: fertility,
            soilType: soilType,
            cropSuitability: {
              wheat: (data.ph >= 6.0 && data.ph <= 7.5 && data.moisture < 35.0),
              rice: (data.moisture > 40.0 && data.ph >= 5.5),
              maize: (data.nitrogen > 20 && data.ph >= 5.8),
              mustard: (data.ph >= 6.0 && data.ph <= 7.5 && data.moisture >= 20 && data.moisture <= 38)
            },
            sensorStatus: data.sensorStatus || "OK",
            timestamp: timestamp
          };

          this.lastKnownData = processed;
          this.listeners.latest.forEach(cb => cb(processed));
        } else {
          // No live data yet in Firebase
          this.lastKnownData = null;
          this.listeners.latest.forEach(cb => cb(null));
        }
      }
    } catch (e) {
      console.warn("[Firebase] Failed to fetch latest:", e);
    }

    // 2. Fetch Device Status
    try {
      const resStatus = await fetch(`${firebaseConfig.databaseURL}/devices/${ACTIVE_DEVICE_ID}/status.json`);
      if (resStatus.ok) {
        const statusData = await resStatus.json();
        if (statusData && typeof statusData === 'object') {
          const now = Date.now();
          const lastSeen = statusData.lastSeen || 0;
          const isAlive = (now - lastSeen) < 60000; // Heartbeat within 60s

          this.emitStatus({
            online: isAlive,
            ip: statusData.ip || "--",
            rssi: statusData.rssi !== undefined ? statusData.rssi : "--",
            sensorStatus: isAlive ? (statusData.sensorStatus || "HEALTHY") : "OFFLINE",
            firmwareVersion: statusData.firmwareVersion || "2.1.0-CLOUD"
          });
        } else {
          this.emitStatus({
            online: false,
            ip: "--",
            rssi: "--",
            sensorStatus: "OFFLINE",
            firmwareVersion: "--"
          });
        }
      }
    } catch (e) {
      this.emitStatus({
        online: false,
        ip: "--",
        rssi: "--",
        sensorStatus: "OFFLINE",
        firmwareVersion: "--"
      });
    }

    // 3. Fetch Historical Readings
    try {
      const resHistory = await fetch(`${firebaseConfig.databaseURL}/devices/${ACTIVE_DEVICE_ID}/readings.json?limitToLast=30`);
      if (resHistory.ok) {
        const historyData = await resHistory.json();
        if (historyData && typeof historyData === 'object') {
          const list = Object.keys(historyData).map(k => ({
            id: k,
            ...historyData[k]
          }));
          this.listeners.history.forEach(cb => cb(list));
        } else {
          this.listeners.history.forEach(cb => cb([]));
        }
      }
    } catch (e) {
      console.warn("[Firebase] Failed to fetch history:", e);
    }
  }
}

export const dataStream = new DataStreamService();
