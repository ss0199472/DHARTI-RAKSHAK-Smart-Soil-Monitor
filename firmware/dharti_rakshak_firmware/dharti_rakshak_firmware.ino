/**
 * ============================================================================
 * DHARTI RAKSHAK (धर्ती रक्षक) - Smart Soil Monitoring System
 * "Technology for Protecting the Earth"
 * ============================================================================
 * Team: Royal Challenger Kanpur
 * Members: Namit Kumar, Sanidhya Krishna Yadav, Yugant Dwivedi, Rudransh Uttam
 * 
 * Hardware Architecture:
 * - Microcontroller: ESP32 Dev Module
 * - Sensor: Industrial 7-in-1 / 5-in-1 Modbus RS-485 Soil Sensor (Slave ID: 1)
 * - Transceiver: MAX485 Module (RO->GPIO 16, DI->GPIO 17, DE/RE->GPIO 4)
 * - Display: 16x2 I2C Character LCD (Address 0x27)
 * - Cloud Backend: Firebase Realtime Database (REST API over HTTPS)
 * - Dashboard: Cloudflare Pages Web App
 * ============================================================================
 */

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <ModbusMaster.h>
#include <time.h>
#include "config.h"

// ============================================================================
// OBJECT INSTANTIATIONS
// ============================================================================
LiquidCrystal_I2C lcd(LCD_I2C_ADDR, LCD_COLS, LCD_ROWS);
ModbusMaster node;

// ============================================================================
// GLOBAL SENSOR TELEMETRY (Preserved Data Types & Ranges)
// ============================================================================
float    moisture    = 0.0; // Percentage (%)
float    temperature = 0.0; // Celsius (°C)
float    ph          = 0.0; // pH Scale (0 - 14)
uint16_t nitrogen    = 0;   // mg/kg
uint16_t phosphorus  = 0;   // mg/kg
uint16_t potassium   = 0;   // mg/kg

// System & Sensor Health State
bool sensorOnline       = false;
bool lastFirebaseSuccess = false;
uint32_t totalModbusReads = 0;
uint32_t failedModbusReads = 0;

// Non-blocking Timers
unsigned long lastSensorReadTime  = 0;
unsigned long lastLatestSyncTime  = 0;
unsigned long lastHistorySyncTime = 0;
unsigned long lastStatusSyncTime  = 0;
unsigned long lastLcdCycleTime    = 0;
unsigned long lastWifiCheckTime   = 0;

uint8_t lcdPage = 0; // Rotates: 0 = Overview, 1 = Temp/Moisture/pH, 2 = NPK Breakdown

// ============================================================================
// RS-485 FLOW DIRECTION CALLBACKS (PRESERVED)
// ============================================================================
void preTransmission() {
  digitalWrite(RE_DE_PIN, HIGH); // Driver Enable (Transmit)
  delayMicroseconds(100);
}

void postTransmission() {
  delayMicroseconds(100);
  digitalWrite(RE_DE_PIN, LOW);  // Receiver Enable (Listen)
}

// ============================================================================
// CORE LOGIC & CALCULATION FUNCTIONS (STRICTLY PRESERVED)
// ============================================================================
uint32_t getTotalNPK() {
  return (uint32_t)nitrogen + (uint32_t)phosphorus + (uint32_t)potassium;
}

String getFertility() {
  uint32_t totalNPK = getTotalNPK();
  if (totalNPK > 250) return "HIGH";
  if (totalNPK > 120) return "MEDIUM";
  return "LOW";
}

String getSoilType() {
  if (ph < 1.0) return "Connecting..."; 
  if (ph < 6.0) return "Acidic";
  if (ph > 7.5) return "Alkaline";
  return "Neutral";
}

bool isSuitable(const String& crop) {
  if (crop == "Wheat") return (ph >= 6.0 && ph <= 7.5 && moisture < 35.0);
  if (crop == "Rice")  return (moisture > 40.0 && ph >= 5.5);
  if (crop == "Maize") return (nitrogen > 20 && ph >= 5.8);
  return false;
}

// ============================================================================
// MODBUS SENSOR ACQUISITION ROUTINE (PRESERVED REGISTERS)
// ============================================================================
bool readSoilSensor() {
  totalModbusReads++;
  bool successAny = false;
  uint8_t result;

  // 1. Read Moisture & Temperature (Register 0x0012, 2 words)
  result = node.readHoldingRegisters(0x0012, 2);
  if (result == node.ku8MBSuccess) {
    moisture    = node.getResponseBuffer(0) / 10.0f;
    temperature = ((int16_t)node.getResponseBuffer(1)) / 10.0f;
    successAny = true;
  } else {
    Serial.printf("[MODBUS ERROR] Moisture/Temp read failed. Code: 0x%02X\n", result);
  }
  delay(20);

  // 2. Read Soil pH (Register 0x0006, 1 word)
  result = node.readHoldingRegisters(0x0006, 1);
  if (result == node.ku8MBSuccess) {
    ph = ((float)node.getResponseBuffer(0)) / 100.0f;
    successAny = true;
  } else {
    Serial.printf("[MODBUS ERROR] pH read failed. Code: 0x%02X\n", result);
  }
  delay(20);

  // 3. Read N-P-K (Register 0x001E, 3 words)
  result = node.readHoldingRegisters(0x001E, 3);
  if (result == node.ku8MBSuccess) {
    nitrogen   = node.getResponseBuffer(0);
    phosphorus = node.getResponseBuffer(1);
    potassium  = node.getResponseBuffer(2);
    successAny = true;
  } else {
    Serial.printf("[MODBUS ERROR] NPK read failed. Code: 0x%02X\n", result);
  }

  if (successAny) {
    sensorOnline = true;
  } else {
    failedModbusReads++;
    sensorOnline = false;
  }

  return successAny;
}

// ============================================================================
// FIREBASE REST API HELPER (LIGHTWEIGHT & SECURE OVER HTTPS)
// ============================================================================
bool sendFirebaseRequest(const String& path, const String& httpMethod, const String& jsonPayload) {
  if (WiFi.status() != WL_CONNECTED) {
    return false;
  }

  // Check if Firebase URL has been configured by user
  if (String(FIREBASE_HOST).indexOf("YOUR_FIREBASE_PROJECT_ID") != -1) {
    // Unconfigured template URL, print debug notice once
    static bool warned = false;
    if (!warned) {
      Serial.println("[FIREBASE NOTICE] Set your actual FIREBASE_HOST in config.h to enable cloud sync.");
      warned = true;
    }
    return false;
  }

  WiFiClientSecure client;
  client.setInsecure(); // Skip SSL certificate thumbprint validation for embedded simplicity

  HTTPClient https;
  String fullUrl = String(FIREBASE_HOST) + path + ".json";
  if (strlen(FIREBASE_AUTH) > 0) {
    fullUrl += "?auth=" + String(FIREBASE_AUTH);
  }

  if (!https.begin(client, fullUrl)) {
    Serial.println("[FIREBASE ERROR] Unable to begin HTTPS connection.");
    return false;
  }

  https.addHeader("Content-Type", "application/json");
  int httpResponseCode = -1;

  if (httpMethod == "PUT") {
    httpResponseCode = https.PUT(jsonPayload);
  } else if (httpMethod == "PATCH") {
    httpResponseCode = https.PATCH(jsonPayload);
  } else if (httpMethod == "POST") {
    httpResponseCode = https.POST(jsonPayload);
  }

  bool isSuccess = (httpResponseCode >= 200 && httpResponseCode < 300);
  if (isSuccess) {
    lastFirebaseSuccess = true;
  } else {
    Serial.printf("[FIREBASE ERROR] %s to %s failed with HTTP Code: %d\n", httpMethod.c_str(), path.c_str(), httpResponseCode);
    lastFirebaseSuccess = false;
  }

  https.end();
  return isSuccess;
}

// ============================================================================
// CLOUD SYNC ROUTINES
// ============================================================================
void uploadLatestToFirebase() {
  String json = "{";
  json += "\"moisture\":" + String(moisture, 1) + ",";
  json += "\"temperature\":" + String(temperature, 1) + ",";
  json += "\"ph\":" + String(ph, 2) + ",";
  json += "\"nitrogen\":" + String(nitrogen) + ",";
  json += "\"phosphorus\":" + String(phosphorus) + ",";
  json += "\"potassium\":" + String(potassium) + ",";
  json += "\"totalNPK\":" + String(getTotalNPK()) + ",";
  json += "\"fertility\":\"" + getFertility() + "\",";
  json += "\"soilType\":\"" + getSoilType() + "\",";
  json += "\"cropSuitability\":{";
  json += "\"wheat\":" + String(isSuitable("Wheat") ? "true" : "false") + ",";
  json += "\"rice\":" + String(isSuitable("Rice") ? "true" : "false") + ",";
  json += "\"maize\":" + String(isSuitable("Maize") ? "true" : "false");
  json += "},";
  json += "\"sensorStatus\":\"" + String(sensorOnline ? "OK" : "ERROR") + "\",";
  json += "\"timestamp\":{\".sv\":\"timestamp\"}";
  json += "}";

  String path = "/devices/" + String(DEVICE_ID) + "/latest";
  sendFirebaseRequest(path, "PUT", json);
}

void uploadHistorySnapshot() {
  String json = "{";
  json += "\"timestamp\":{\".sv\":\"timestamp\"},";
  json += "\"moisture\":" + String(moisture, 1) + ",";
  json += "\"temperature\":" + String(temperature, 1) + ",";
  json += "\"ph\":" + String(ph, 2) + ",";
  json += "\"nitrogen\":" + String(nitrogen) + ",";
  json += "\"phosphorus\":" + String(phosphorus) + ",";
  json += "\"potassium\":" + String(potassium) + ",";
  json += "\"totalNPK\":" + String(getTotalNPK());
  json += "}";

  String path = "/devices/" + String(DEVICE_ID) + "/readings";
  sendFirebaseRequest(path, "POST", json);
}

void uploadDeviceStatus() {
  String json = "{";
  json += "\"online\":true,";
  json += "\"lastSeen\":{\".sv\":\"timestamp\"},";
  json += "\"ip\":\"" + WiFi.localIP().toString() + "\",";
  json += "\"rssi\":" + String(WiFi.RSSI()) + ",";
  json += "\"wifiSSID\":\"" + String(WIFI_SSID) + "\",";
  json += "\"sensorStatus\":\"" + String(sensorOnline ? "HEALTHY" : "COMM_ERROR") + "\",";
  json += "\"firmwareVersion\":\"" + String(FIRMWARE_VERSION) + "\"";
  json += "}";

  String path = "/devices/" + String(DEVICE_ID) + "/status";
  sendFirebaseRequest(path, "PUT", json);
}

// ============================================================================
// LOCAL 16x2 LCD ROTATING TELEMETRY DISPLAY
// ============================================================================
void updateLcdDisplay() {
  lcd.clear();

  if (WiFi.status() != WL_CONNECTED) {
    lcd.setCursor(0, 0);
    lcd.print("DHARTI RAKSHAK");
    lcd.setCursor(0, 1);
    lcd.print("WiFi Reconnect..");
    return;
  }

  switch (lcdPage) {
    case 0: // System Overview Page
      lcd.setCursor(0, 0);
      lcd.print("DHARTI RAKSHAK");
      lcd.setCursor(0, 1);
      lcd.print("W:OK S:");
      lcd.print(sensorOnline ? "OK" : "ERR");
      lcd.print(" C:");
      lcd.print(lastFirebaseSuccess ? "OK" : "--");
      break;

    case 1: // Physical Properties Page
      lcd.setCursor(0, 0);
      lcd.print("M:");
      lcd.print(moisture, 1);
      lcd.print("% T:");
      lcd.print(temperature, 1);
      lcd.print("C");

      lcd.setCursor(0, 1);
      lcd.print("pH:");
      lcd.print(ph, 2);
      lcd.print(" ");
      lcd.print(getFertility());
      break;

    case 2: // NPK Nutrient Breakdown Page
      lcd.setCursor(0, 0);
      lcd.print("N:");
      lcd.print(nitrogen);
      lcd.print(" P:");
      lcd.print(phosphorus);
      lcd.print(" K:");
      lcd.print(potassium);

      lcd.setCursor(0, 1);
      lcd.print("NPK: ");
      lcd.print(getTotalNPK());
      lcd.print(" mg/kg");
      break;
  }

  lcdPage = (lcdPage + 1) % 3;
}

// ============================================================================
// SETUP
// ============================================================================
void setup() {
  // 1. Diagnostics Serial
  Serial.begin(115200);
  delay(200);
  Serial.println("\n==================================================");
  Serial.println("   DHARTI RAKSHAK - SMART SOIL MONITOR SYSTEM    ");
  Serial.println("   Technology for Protecting the Earth (v2.1)     ");
  Serial.println("   Team: Royal Challenger Kanpur                 ");
  Serial.println("==================================================");

  // 2. RS-485 Flow Control Pin Init (PRESERVED: GPIO 4)
  pinMode(RE_DE_PIN, OUTPUT);
  digitalWrite(RE_DE_PIN, LOW); // Start in listening/receive mode

  // 3. I2C LCD Init (PRESERVED: 0x27)
  Wire.begin();
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("DHARTI RAKSHAK");
  lcd.setCursor(0, 1);
  lcd.print("Booting System...");

  // 4. Modbus RTU Setup over Serial2 (PRESERVED: RX=16, TX=17, Baud=9600)
  Serial2.begin(MODBUS_BAUD_RATE, SERIAL_8N1, RX_PIN, TX_PIN);
  node.begin(SENSOR_SLAVE_ID, Serial2);
  node.preTransmission(preTransmission);
  node.postTransmission(postTransmission);

  // 5. Connect to Wi-Fi
  Serial.print("Connecting to Wi-Fi: ");
  Serial.println(WIFI_SSID);
  lcd.setCursor(0, 1);
  lcd.print("Connecting WiFi.");

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long startAttemptTime = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startAttemptTime < 12000) {
    delay(400);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WIFI] Connected Successfully!");
    Serial.print("[WIFI] IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("[WIFI] RSSI: ");
    Serial.println(WiFi.RSSI());

    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi Connected!");
    lcd.setCursor(0, 1);
    lcd.print(WiFi.localIP().toString());
  } else {
    Serial.println("\n[WIFI] Connection timeout. Sensor loop will continue offline.");
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi Offline");
    lcd.setCursor(0, 1);
    lcd.print("Sensor Active");
  }

  delay(1500);

  // 6. Initial Sensor Read & Cloud Sync
  readSoilSensor();
  if (WiFi.status() == WL_CONNECTED) {
    uploadLatestToFirebase();
    uploadDeviceStatus();
  }
}

// ============================================================================
// MAIN NON-BLOCKING LOOP
// ============================================================================
void loop() {
  unsigned long currentMillis = millis();

  // 1. Wi-Fi Auto-Reconnect Manager (Non-blocking check every 10s)
  if (currentMillis - lastWifiCheckTime >= 10000) {
    lastWifiCheckTime = currentMillis;
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("[WIFI] Disconnected! Reconnecting in background...");
      WiFi.reconnect();
    }
  }

  // 2. Poll Modbus Soil Sensor (every SENSOR_READ_INTERVAL_MS = 2000ms)
  if (currentMillis - lastSensorReadTime >= SENSOR_READ_INTERVAL_MS) {
    lastSensorReadTime = currentMillis;
    readSoilSensor();

    // Print Live Telemetry to Debug Serial
    Serial.printf("[SENSOR] M: %.1f%% | T: %.1f°C | pH: %.2f | N: %u | P: %u | K: %u | Total: %u | Fert: %s | Soil: %s\n",
                  moisture, temperature, ph, nitrogen, phosphorus, potassium,
                  getTotalNPK(), getFertility().c_str(), getSoilType().c_str());
  }

  // 3. Upload Latest Sensor Data to Firebase (every CLOUD_LATEST_SYNC_MS = 5000ms)
  if (currentMillis - lastLatestSyncTime >= CLOUD_LATEST_SYNC_MS) {
    lastLatestSyncTime = currentMillis;
    if (WiFi.status() == WL_CONNECTED) {
      uploadLatestToFirebase();
    }
  }

  // 4. Upload Historical Snapshot Log (every CLOUD_HISTORY_LOG_MS = 15 mins)
  if (currentMillis - lastHistorySyncTime >= CLOUD_HISTORY_LOG_MS) {
    lastHistorySyncTime = currentMillis;
    if (WiFi.status() == WL_CONNECTED && sensorOnline) {
      uploadHistorySnapshot();
      Serial.println("[FIREBASE] Historical snapshot logged.");
    }
  }

  // 5. Update Device Heartbeat & Health Status (every STATUS_HEARTBEAT_MS = 30s)
  if (currentMillis - lastStatusSyncTime >= STATUS_HEARTBEAT_MS) {
    lastStatusSyncTime = currentMillis;
    if (WiFi.status() == WL_CONNECTED) {
      uploadDeviceStatus();
    }
  }

  // 6. Rotate 16x2 LCD Telemetry Display (every LCD_CYCLE_INTERVAL_MS = 3000ms)
  if (currentMillis - lastLcdCycleTime >= LCD_CYCLE_INTERVAL_MS) {
    lastLcdCycleTime = currentMillis;
    updateLcdDisplay();
  }
}
