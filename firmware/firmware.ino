/**
 * ============================================================================
 * DHARTI-RAKSHAK: Industrial Soil Telemetry System
 * Microcontroller: ESP32 DevKit V1
 * Protocols: Modbus RTU (RS485) + Firebase Realtime Database REST Engine
 * ============================================================================
 */

#include <Arduino.h>
#include <ModbusMaster.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <Wire.h> 
#include <LiquidCrystal_I2C.h>
#include "config.h"

// ================= 1. NETWORK & FIREBASE ENDPOINTS =================
String FB_LIVE_URL;
String FB_HIST_URL;
String FB_DEVICE_URL;

// ================= 2. HARDWARE PIN DEFINITIONS =================
LiquidCrystal_I2C lcd(0x27, 16, 2);
ModbusMaster node;

// ================= 3. DATA STRUCTURES & TIMERS =================
struct SoilTelemetry {
  float moisture;      // % (0.0 - 100.0)
  float temperature;   // °C (-40.0 to 85.0)
  float ph;            // pH (0.00 - 14.00)
  uint16_t nitrogen;   // mg/kg
  uint16_t phosphorus; // mg/kg
  uint16_t potassium;  // mg/kg
  uint16_t ec;         // Electrical Conductivity (uS/cm)
  bool isValid;
};

SoilTelemetry currentSoil = { 0.0f, 0.0f, 0.0f, 0, 0, 0, 0, false };

// Cooperative Multitasking State Timers
unsigned long lastSensorReadTime = 0;
unsigned long lastFirebaseSyncTime = 0;
unsigned long lastLcdRefreshTime  = 0;
unsigned long lastWifiCheckTime = 0;
unsigned long lastDevicePushTime = 0;

int consecutiveModbusFailures = 0;
int lcdDisplayState = 0; // for rotating LCD

// ================= 4. RS485 HARDWARE FLOW CONTROL =================
void IRAM_ATTR preTransmission() {
  digitalWrite(PIN_RS485_RE_DE, HIGH);
  delayMicroseconds(60); // Driver rise time stabilization
}

void IRAM_ATTR postTransmission() {
  delayMicroseconds(60);
  digitalWrite(PIN_RS485_RE_DE, LOW);
}

// ================= 5. SENSOR MODBUS READ WITH SANITY CHECKS =================
bool readSoilSensor(SoilTelemetry &outData) {
  uint8_t result;
  bool readSuccess = true;
  bool overallSuccess = true;

  // 1. Read Moisture & Temperature (Register 0x0012, 2 words)
  result = node.readHoldingRegisters(0x0012, 2);
  if (result == node.ku8MBSuccess) {
    float rawMoist = static_cast<float>(node.getResponseBuffer(0)) / 10.0f;
    int16_t rawSignedTemp = static_cast<int16_t>(node.getResponseBuffer(1));
    float rawTemp = static_cast<float>(rawSignedTemp) / 10.0f;

    if (rawMoist >= 0.0f && rawMoist <= 100.0f) outData.moisture = rawMoist;
    if (rawTemp >= -40.0f && rawTemp <= 85.0f)  outData.temperature = rawTemp;
  } else {
    Serial.printf("[Modbus Error] Reg 0x0012 (Moisture/Temp) failed: 0x%02X\n", result);
    overallSuccess = false;
  }

  // 2. Read Soil pH (Register 0x0006, 1 word)
  result = node.readHoldingRegisters(0x0006, 1);
  if (result == node.ku8MBSuccess) {
    float rawPh = static_cast<float>(node.getResponseBuffer(0)) / 100.0f;
    if (rawPh >= 0.0f && rawPh <= 14.0f) outData.ph = rawPh;
  } else {
    Serial.printf("[Modbus Error] Reg 0x0006 (pH) failed: 0x%02X\n", result);
    overallSuccess = false;
  }

  // 3. Read N-P-K Nutrients (Register 0x001E, 3 words)
  result = node.readHoldingRegisters(0x001E, 3);
  if (result == node.ku8MBSuccess) {
    uint16_t n = node.getResponseBuffer(0);
    uint16_t p = node.getResponseBuffer(1);
    uint16_t k = node.getResponseBuffer(2);

    if (n < 2000) outData.nitrogen = n;
    if (p < 2000) outData.phosphorus = p;
    if (k < 2000) outData.potassium = k;
  } else {
    Serial.printf("[Modbus Error] Reg 0x001E (NPK) failed: 0x%02X\n", result);
    overallSuccess = false;
  }

  // 4. Read EC (Register 0x0015, 1 word)
  result = node.readHoldingRegisters(0x0015, 1);
  if (result == node.ku8MBSuccess) {
    uint16_t ec = node.getResponseBuffer(0);
    if (ec <= 20000) outData.ec = ec;
  } else {
    Serial.printf("[Modbus Error] Reg 0x0015 (EC) failed: 0x%02X\n", result);
    overallSuccess = false;
  }

  if (!overallSuccess) {
    consecutiveModbusFailures++;
    if (consecutiveModbusFailures >= 10) {
      Serial.println("[CRITICAL WARNING] 10 consecutive Modbus read failures!");
      consecutiveModbusFailures = 0; // Reset counter
    }
  } else {
    consecutiveModbusFailures = 0;
  }

  outData.isValid = overallSuccess;
  return overallSuccess;
}

// Debug function to scan registers
void scanRegisters() {
  Serial.println("--- Scanning Registers 0x0000 to 0x0025 ---");
  for (uint16_t i = 0x0000; i <= 0x0025; i++) {
    uint8_t result = node.readHoldingRegisters(i, 1);
    if (result == node.ku8MBSuccess) {
      uint16_t val = node.getResponseBuffer(0);
      Serial.printf("Register 0x%04X: %u (0x%04X)\n", i, val, val);
    } else {
      Serial.printf("Register 0x%04X: Error 0x%02X\n", i, result);
    }
    delay(50); // slight delay to not overwhelm bus
  }
  Serial.println("--- Scan Complete ---");
}

void printReadings() {
  Serial.println("--- Immediate Sensor Read ---");
  Serial.printf("Moisture: %.1f %%\n", currentSoil.moisture);
  Serial.printf("Temperature: %.1f C\n", currentSoil.temperature);
  Serial.printf("pH: %.2f\n", currentSoil.ph);
  Serial.printf("Nitrogen: %u mg/kg\n", currentSoil.nitrogen);
  Serial.printf("Phosphorus: %u mg/kg\n", currentSoil.phosphorus);
  Serial.printf("Potassium: %u mg/kg\n", currentSoil.potassium);
  Serial.printf("EC: %u uS/cm\n", currentSoil.ec);
  Serial.println("-----------------------------");
}

// ================= 6. FIREBASE REALTIME REST CLIENT =================
void pushDeviceInfo() {
  if (WiFi.status() != WL_CONNECTED) return;
  
  WiFiClientSecure client;
  client.setInsecure(); // Non-blocking TLS

  HTTPClient http;
  http.setTimeout(3500);

  char jsonBuffer[384];
  snprintf(jsonBuffer, sizeof(jsonBuffer),
    "{\"device_id\":\"ESP32_DHARTI_01\",\"firmware_version\":\"2.0.0\",\"wifi_rssi\":%d,\"uptime_seconds\":%lu,\"ip_address\":\"%s\",\"last_seen\":{\".sv\":\"timestamp\"}}",
    WiFi.RSSI(), millis() / 1000, WiFi.localIP().toString().c_str()
  );

  String url = FB_DEVICE_URL;
  if (strlen(FIREBASE_API_KEY) > 0) url += "?auth=" + String(FIREBASE_API_KEY);

  if (http.begin(client, url)) {
    http.addHeader("Content-Type", "application/json");
    int httpCode = http.PUT(reinterpret_cast<uint8_t*>(jsonBuffer), strlen(jsonBuffer));
    if (httpCode == HTTP_CODE_OK || httpCode == HTTP_CODE_CREATED) {
      Serial.println("[Firebase] Device Info Sync OK");
    } else {
      Serial.printf("[Firebase] Device Info Sync Failed: %s (Code: %d)\n", http.errorToString(httpCode).c_str(), httpCode);
    }
    http.end();
  }
}

void pushToFirebase(const SoilTelemetry &data) {
  if (WiFi.status() != WL_CONNECTED || !data.isValid) {
    return;
  }

  WiFiClientSecure client;
  client.setInsecure(); // Non-blocking TLS

  HTTPClient http;
  http.setTimeout(3500);

  // Compute Fertility & Soil Classification
  uint32_t totalNpk = data.nitrogen + data.phosphorus + data.potassium;
  const char* fertility = totalNpk > 250 ? "HIGH" : totalNpk > 120 ? "MEDIUM" : "LOW";
  const char* soilType  = data.ph < 6.0f ? "Acidic" : data.ph > 7.5f ? "Alkaline" : "Neutral";

  // Build JSON Payload
  char jsonBuffer[384];
  snprintf(jsonBuffer, sizeof(jsonBuffer),
    "{\"nitrogen\":%u,\"phosphorus\":%u,\"potassium\":%u,\"moisture\":%.1f,\"temperature\":%.1f,\"ph\":%.2f,\"ec\":%u,\"fertility\":\"%s\",\"soil_type\":\"%s\",\"timestamp\":{\".sv\":\"timestamp\"}}",
    data.nitrogen, data.phosphorus, data.potassium, data.moisture, data.temperature, data.ph, data.ec, fertility, soilType
  );

  String liveUrl = FB_LIVE_URL;
  String histUrl = FB_HIST_URL;
  if (strlen(FIREBASE_API_KEY) > 0) {
    liveUrl += "?auth=" + String(FIREBASE_API_KEY);
    histUrl += "?auth=" + String(FIREBASE_API_KEY);
  }

  // 1. Atomic Update of Live Node (HTTP PUT)
  if (http.begin(client, liveUrl)) {
    http.addHeader("Content-Type", "application/json");
    int httpCode = http.PUT(reinterpret_cast<uint8_t*>(jsonBuffer), strlen(jsonBuffer));
    if (httpCode == HTTP_CODE_OK || httpCode == HTTP_CODE_CREATED) {
      Serial.printf("[Firebase RTDB] Live Sync OK (Code: %d)\n", httpCode);
    } else {
      Serial.printf("[Firebase RTDB] Live Sync Failed: %s (Code: %d)\n",
                    http.errorToString(httpCode).c_str(), httpCode);
    }
    http.end();
  }

  // 2. Append to Historical Time-Series Logs (HTTP POST)
  if (http.begin(client, histUrl)) {
    http.addHeader("Content-Type", "application/json");
    int httpCode = http.POST(reinterpret_cast<uint8_t*>(jsonBuffer), strlen(jsonBuffer));
    if (httpCode == HTTP_CODE_OK || httpCode == HTTP_CODE_CREATED) {
        Serial.printf("[Firebase RTDB] Hist Sync OK\n");
    } else {
        Serial.printf("[Firebase RTDB] Hist Sync Failed: %s (Code: %d)\n", http.errorToString(httpCode).c_str(), httpCode);
    }
    http.end();
  }
}

// ================= 7. FLICKER-FREE LCD DISPLAY =================
void updateLcd(const SoilTelemetry &data) {
  char line0[17];
  char line1[17];
  
  char wifiStatus = (WiFi.status() == WL_CONNECTED) ? 'W' : 'X';

  if (lcdDisplayState == 0) {
    snprintf(line0, sizeof(line0), "M:%.1f%% T:%.1fC ", data.moisture, data.temperature);
    snprintf(line1, sizeof(line1), "pH:%.1f EC:%-5u ", data.ph, data.ec);
  } else {
    snprintf(line0, sizeof(line0), "N:%-4u P:%-4u   ", data.nitrogen, data.phosphorus);
    snprintf(line1, sizeof(line1), "K:%-4u          ", data.potassium);
  }
  
  // ensure last char on top row is wifi status
  line0[15] = wifiStatus;
  line0[16] = '\0';
  line1[16] = '\0';

  lcd.setCursor(0, 0);
  lcd.print(line0);
  lcd.setCursor(0, 1);
  lcd.print(line1);
}

// ================= 8. SETUP =================
void setup() {
  Serial.begin(115200);
  pinMode(PIN_RS485_RE_DE, OUTPUT);
  digitalWrite(PIN_RS485_RE_DE, LOW);

  String fbBase = String(FIREBASE_PROJECT_URL);
  if (fbBase.endsWith("/")) fbBase = fbBase.substring(0, fbBase.length() - 1);
  
  FB_LIVE_URL = fbBase + "/dharti_rakshak/live_readings.json";
  FB_HIST_URL = fbBase + "/dharti_rakshak/historical_logs.json";
  FB_DEVICE_URL = fbBase + "/dharti_rakshak/device_info.json";

  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("DHARTI-RAKSHAK");
  lcd.setCursor(0, 1);
  lcd.print("Connecting WiFi.");

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  unsigned long startAttempt = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startAttempt < 10000) {
    delay(400);
    Serial.print(F("."));
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(F("\n[WiFi] Connected!"));
    Serial.print(F("[WiFi] IP Address: "));
    Serial.println(WiFi.localIP());

    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("DHARTI-RAKSHAK");
    lcd.setCursor(0, 1);
    lcd.print("Ready!        W");
    
    pushDeviceInfo();
  } else {
    Serial.println(F("\n[WiFi] Failed to connect initially. Will retry in background."));
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("DHARTI-RAKSHAK");
    lcd.setCursor(0, 1);
    lcd.print("Ready!        X");
  }

  // Initialize Modbus RS485 UART
  Serial2.begin(UART_BAUD_RATE, UART_CONFIG, PIN_RS485_RX, PIN_RS485_TX);
  node.begin(SENSOR_SLAVE_ID, Serial2);
  node.preTransmission(preTransmission);
  node.postTransmission(postTransmission);
}

// ================= 9. NON-BLOCKING MAIN LOOP =================
void loop() {
  unsigned long currentMillis = millis();

  // Task 1: Check Serial Commands
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    if (cmd == "SCAN") {
      scanRegisters();
    } else if (cmd == "READ") {
      readSoilSensor(currentSoil);
      printReadings();
    }
  }

  // Task 2: Non-blocking WiFi reconnect every 30s
  if (WiFi.status() != WL_CONNECTED && (currentMillis - lastWifiCheckTime >= 30000)) {
    lastWifiCheckTime = currentMillis;
    Serial.println("[WiFi] Reconnecting...");
    WiFi.disconnect();
    WiFi.reconnect();
  }

  // Task 3: Sample Sensor
  if (currentMillis - lastSensorReadTime >= INTERVAL_SENSOR_READ) {
    lastSensorReadTime = currentMillis;
    readSoilSensor(currentSoil);
  }

  // Task 4: Push to Firebase
  if (currentMillis - lastFirebaseSyncTime >= INTERVAL_FIREBASE_SYNC) {
    lastFirebaseSyncTime = currentMillis;
    pushToFirebase(currentSoil);
  }
  
  // Task 5: Periodic Device Info Push (Every 5 minutes)
  if (currentMillis - lastDevicePushTime >= 300000) {
      lastDevicePushTime = currentMillis;
      pushDeviceInfo();
  }

  // Task 6: Refresh LCD
  if (currentMillis - lastLcdRefreshTime >= INTERVAL_LCD_REFRESH) {
    lastLcdRefreshTime = currentMillis;
    // Rotate LCD data every 4 seconds
    static int tickCount = 0;
    tickCount++;
    if (tickCount >= 4) {
        lcdDisplayState = (lcdDisplayState + 1) % 2;
        tickCount = 0;
    }
    updateLcd(currentSoil);
  }

  yield();
}
