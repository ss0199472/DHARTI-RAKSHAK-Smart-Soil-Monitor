/**
 * ============================================================================
 * DHARTI RAKSHAK - FIREBASE REALTIME STREAM MANAGER (100% REAL DATA)
 * ============================================================================
 * Directly queries your live Firebase Realtime Database endpoint.
 * Zero mock data: If the physical ESP32 is offline or disconnected,
 * it immediately detects offline status within 10-12 seconds and clears all readings.
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

    // Start fast real-time polling (every 1.0 second for instant response)
    this.pollFirebase();
    setInterval(() => this.pollFirebase(), 1000);
  }

  onLatest(callback) {
    this.listeners.latest.push(callback);
    callback(this.lastKnownData);
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
    const now = Date.now();
    // Fast offline threshold: 12 seconds without heartbeat = OFFLINE
    const OFFLINE_TIMEOUT_MS = 12000;

    let isDeviceOnline = false;
    let latestTelemetry = null;
    let currentStatus = {
      online: false,
      ip: "--",
      rssi: "--",
      sensorStatus: "OFFLINE",
      firmwareVersion: "--"
    };

    // 1. Fetch Device Status
    try {
      const resStatus = await fetch(`${firebaseConfig.databaseURL}/devices/${ACTIVE_DEVICE_ID}/status.json`);
      if (resStatus.ok) {
        const statusData = await resStatus.json();
        if (statusData && typeof statusData === 'object' && statusData.lastSeen) {
          const lastSeen = statusData.lastSeen;
          if ((now - lastSeen) < OFFLINE_TIMEOUT_MS) {
            isDeviceOnline = true;
            currentStatus = {
              online: true,
              ip: statusData.ip || "--",
              rssi: statusData.rssi !== undefined ? statusData.rssi : "--",
              sensorStatus: statusData.sensorStatus || "HEALTHY",
              firmwareVersion: statusData.firmwareVersion || "2.1.0-CLOUD"
            };
          }
        }
      }
    } catch (e) {
      console.warn("[Firebase] Status poll notice:", e);
    }

    // 2. Fetch Latest Telemetry
    try {
      const resLatest = await fetch(`${firebaseConfig.databaseURL}/devices/${ACTIVE_DEVICE_ID}/latest.json`);
      if (resLatest.ok) {
        const data = await resLatest.json();
        if (data && typeof data === 'object' && data.moisture !== undefined && data.timestamp) {
          const timestamp = data.timestamp;
          const isFresh = (now - timestamp) < OFFLINE_TIMEOUT_MS;

          // If latest telemetry is fresh within 12 seconds, device is online
          if (isFresh) {
            isDeviceOnline = true;
            currentStatus.online = true;
            if (currentStatus.sensorStatus === "OFFLINE") {
              currentStatus.sensorStatus = data.sensorStatus || "OK";
            }

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

            latestTelemetry = {
              hasData: true,
              isFresh: true,
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
          }
        }
      }
    } catch (e) {
      console.warn("[Firebase] Latest poll notice:", e);
    }

    // Broadcast Status
    this.emitStatus(currentStatus);

    // Broadcast Latest Data (strictly null if offline)
    if (isDeviceOnline && latestTelemetry) {
      this.lastKnownData = latestTelemetry;
      this.listeners.latest.forEach(cb => cb(latestTelemetry));
    } else {
      this.lastKnownData = null;
      this.listeners.latest.forEach(cb => cb(null));
    }

    // 3. Fetch Historical Readings Snapshot
    try {
      const resHistory = await fetch(`${firebaseConfig.databaseURL}/devices/${ACTIVE_DEVICE_ID}/readings.json?orderBy="$key"&limitToLast=20`);
      if (resHistory.ok) {
        const rawHistoryObj = await resHistory.json();
        if (rawHistoryObj && typeof rawHistoryObj === 'object') {
          const list = Object.keys(rawHistoryObj).map(k => ({
            id: k,
            ...rawHistoryObj[k]
          }));
          this.listeners.history.forEach(cb => cb(list));
        }
      }
    } catch (e) {
      console.warn("[Firebase] History poll notice:", e);
    }
  }
}

export const dataStream = new DataStreamService();
