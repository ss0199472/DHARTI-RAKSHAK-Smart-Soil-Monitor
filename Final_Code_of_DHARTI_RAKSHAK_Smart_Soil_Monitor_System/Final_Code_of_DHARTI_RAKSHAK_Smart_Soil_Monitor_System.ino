/**
 * ============================================================================
 * DHARTI-RAKSHAK: Industrial Soil Telemetry System
 * Microcontroller: ESP32 DevKit V1
 * Protocols: Modbus RTU (RS485) + Firebase Realtime Database REST Engine
 * Leads: Hammad Uddin & Yuvraj Singh
 * ============================================================================
 */

#include <Arduino.h>
#include <ModbusMaster.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <Wire.h> 
#include <LiquidCrystal_I2C.h>

// ================= 1. NETWORK & FIREBASE ENDPOINTS =================
const char* WIFI_SSID     = "Vivo 1919";
const char* WIFI_PASSWORD = "Jmd405420@1";

// Live Firebase Realtime Database REST Endpoints
const char* FB_LIVE_URL   = "https://dharti-rakshak-iot-default-rtdb.firebaseio.com/dharti_rakshak/live_readings.json";
const char* FB_HIST_URL   = "https://dharti-rakshak-iot-default-rtdb.firebaseio.com/dharti_rakshak/historical_logs.json";

// ================= 2. HARDWARE PIN DEFINITIONS =================
#define PIN_RS485_RX    16     // ESP32 RX2 -> MAX485 RO
#define PIN_RS485_TX    17     // ESP32 TX2 -> MAX485 DI
#define PIN_RS485_RE_DE 4      // ESP32 GPIO4 -> MAX485 DE & RE (Flow Control)
#define SENSOR_SLAVE_ID 1      // 7-in-1 Sensor Modbus Slave ID

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
  bool isValid;
};

SoilTelemetry currentSoil = { 0.0f, 0.0f, 0.0f, 0, 0, 0, false };

// Cooperative Multitasking State Timers
unsigned long lastSensorReadTime = 0;
const unsigned long INTERVAL_SENSOR_READ = 2000; // Read sensor every 2 seconds

unsigned long lastFirebaseSyncTime = 0;
const unsigned long INTERVAL_FIREBASE_SYNC = 5000; // Sync to cloud every 5 seconds

unsigned long lastLcdRefreshTime  = 0;
const unsigned long INTERVAL_LCD_REFRESH  = 1000; // Refresh LCD every 1 second

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

  // 1. Read Moisture & Temperature (Register 0x0012, 2 words)
  result = node.readHoldingRegisters(0x0012, 2);
  if (result == node.ku8MBSuccess) {
    float rawMoist = static_cast<float>(node.getResponseBuffer(0)) / 10.0f;
    int16_t rawSignedTemp = static_cast<int16_t>(node.getResponseBuffer(1));
    float rawTemp = static_cast<float>(rawSignedTemp) / 10.0f;

    if (rawMoist >= 0.0f && rawMoist <= 100.0f) outData.moisture = rawMoist;
    if (rawTemp >= -40.0f && rawTemp <= 85.0f)  outData.temperature = rawTemp;
  } else {
    readSuccess = false;
  }

  // 2. Read Soil pH (Register 0x0006, 1 word)
  result = node.readHoldingRegisters(0x0006, 1);
  if (result == node.ku8MBSuccess) {
    float rawPh = static_cast<float>(node.getResponseBuffer(0)) / 100.0f;
    if (rawPh >= 0.0f && rawPh <= 14.0f) outData.ph = rawPh;
  } else {
    readSuccess = false;
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
    readSuccess = false;
  }

  outData.isValid = readSuccess;
  return readSuccess;
}

// ================= 6. FIREBASE REALTIME REST CLIENT =================
void pushToFirebase(const SoilTelemetry &data) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println(F("[WiFi] Disconnected. Reconnecting..."));
    WiFi.reconnect();
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
  char jsonBuffer[256];
  snprintf(jsonBuffer, sizeof(jsonBuffer),
    "{\"nitrogen\":%u,\"phosphorus\":%u,\"potassium\":%u,\"moisture\":%.1f,\"temperature\":%.1f,\"ph\":%.2f,\"fertility\":\"%s\",\"soil_type\":\"%s\",\"timestamp\":{\".sv\":\"timestamp\"}}",
    data.nitrogen, data.phosphorus, data.potassium, data.moisture, data.temperature, data.ph, fertility, soilType
  );

  // 1. Atomic Update of Live Node (HTTP PUT)
  if (http.begin(client, FB_LIVE_URL)) {
    http.addHeader("Content-Type", "application/json");
    int httpCode = http.PUT(reinterpret_cast<uint8_t*>(jsonBuffer), strlen(jsonBuffer));
    if (httpCode == HTTP_CODE_OK || httpCode == HTTP_CODE_CREATED) {
      Serial.printf("[Firebase RTDB] Live Sync OK (Code: %d)\n", httpCode);
    } else {
      Serial.printf("[Firebase RTDB] Sync Failed: %s (Code: %d)\n",
                    http.errorToString(httpCode).c_str(), httpCode);
    }
    http.end();
  }

  // 2. Append to Historical Time-Series Logs (HTTP POST)
  if (http.begin(client, FB_HIST_URL)) {
    http.addHeader("Content-Type", "application/json");
    http.POST(reinterpret_cast<uint8_t*>(jsonBuffer), strlen(jsonBuffer));
    http.end();
  }
}

// ================= 7. FLICKER-FREE LCD DISPLAY =================
void updateLcd(const SoilTelemetry &data) {
  char line0[17];
  char line1[17];

  snprintf(line0, sizeof(line0), "M:%.1f%% T:%.1fC", data.moisture, data.temperature);
  snprintf(line1, sizeof(line1), "pH:%.1f NPK:%u", data.ph, (data.nitrogen + data.phosphorus + data.potassium));

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

  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("DHARTI-RAKSHAK");
  lcd.setCursor(0, 1);
  lcd.print("Connecting WiFi.");

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  unsigned long startAttempt = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startAttempt < 15000) {
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
    lcd.print("Firebase Live!");
  }

  // Initialize Modbus RS485 UART
  Serial2.begin(9600, SERIAL_8N1, PIN_RS485_RX, PIN_RS485_TX);
  node.begin(SENSOR_SLAVE_ID, Serial2);
  node.preTransmission(preTransmission);
  node.postTransmission(postTransmission);
}

// ================= 9. NON-BLOCKING MAIN LOOP =================
void loop() {
  unsigned long currentMillis = millis();

  // Task 1: Sample Sensor every 2 seconds
  if (currentMillis - lastSensorReadTime >= INTERVAL_SENSOR_READ) {
    lastSensorReadTime = currentMillis;
    readSoilSensor(currentSoil);
  }

  // Task 2: Push to Firebase every 5 seconds
  if (currentMillis - lastFirebaseSyncTime >= INTERVAL_FIREBASE_SYNC) {
    lastFirebaseSyncTime = currentMillis;
    pushToFirebase(currentSoil);
  }

  // Task 3: Refresh LCD every 1 second
  if (currentMillis - lastLcdRefreshTime >= INTERVAL_LCD_REFRESH) {
    lastLcdRefreshTime = currentMillis;
    updateLcd(currentSoil);
  }

  yield();
}