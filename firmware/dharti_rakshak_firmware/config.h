/**
 * ============================================================================
 * DHARTI RAKSHAK - Smart Soil Monitoring System
 * Technology for Protecting the Earth
 * ----------------------------------------------------------------------------
 * Project Config & Hardware Definition File
 * ============================================================================
 */

#ifndef CONFIG_H
#define CONFIG_H

#include <Arduino.h>

// ============================================================================
// 1. WI-FI CREDENTIALS
// ============================================================================
// Set your primary Wi-Fi SSID and Password
const char* const WIFI_SSID     = "Vivo 1919";
const char* const WIFI_PASSWORD = "Jmd405420@1";

// ============================================================================
// 2. FIREBASE REALTIME DATABASE CONFIGURATION
// ============================================================================
// Replace with your Firebase Project RTDB URL and optional Database Secret/Auth Token.
// Example URL format: "https://dharti-rakshak-default-rtdb.firebaseio.com"
// (Do NOT include a trailing slash)
const char* const FIREBASE_HOST = "https://dharti-rakshak-iot-59952-default-rtdb.asia-southeast1.firebasedatabase.app";

// Optional: Firebase Database Secret or Auth Token (Leave empty "" if public read/write or using unauthenticated REST)
const char* const FIREBASE_AUTH = "";

// Unique identifier for this physical field device unit
const char* const DEVICE_ID     = "dharti-node-01";

// Firmware Version Tag
const char* const FIRMWARE_VERSION = "2.1.0-CLOUD";

// ============================================================================
// 3. HARDWARE & GPIO PIN ASSIGNMENTS (STRICTLY PRESERVED)
// ============================================================================
// RS-485 Modbus Communication Pins (connected to MAX485 Transceiver)
#define RX_PIN       16   // ESP32 GPIO 16 (Hardware Serial2 RX) -> MAX485 RO
#define TX_PIN       17   // ESP32 GPIO 17 (Hardware Serial2 TX) -> MAX485 DI
#define RE_DE_PIN    4    // ESP32 GPIO 4  (Direction Pin) -> MAX485 RE & DE tied together

// I2C 16x2 LCD Display Configuration
#define LCD_I2C_ADDR 0x27 // Standard PCF8574 I2C LCD backpack address
#define LCD_COLS     16
#define LCD_ROWS     2

// Industrial Modbus Soil Sensor Settings
#define SENSOR_SLAVE_ID  1        // Modbus RTU Slave ID (Default: 1)
#define MODBUS_BAUD_RATE 9600     // 9600 bps, 8 Data bits, No Parity, 1 Stop bit

// ============================================================================
// 4. TIMING & ACQUISITION INTERVALS (Ultra-Fast Real-Time Stream)
// ============================================================================
const unsigned long SENSOR_READ_INTERVAL_MS = 800;     // Poll sensor every 800ms (instant soil response)
const unsigned long CLOUD_LATEST_SYNC_MS    = 1500;    // Upload latest data to Firebase every 1.5 seconds
const unsigned long CLOUD_HISTORY_LOG_MS    = 300000;  // Push historical log snapshot every 5 minutes
const unsigned long LCD_CYCLE_INTERVAL_MS   = 2000;    // Rotate LCD page every 2 seconds
const unsigned long STATUS_HEARTBEAT_MS     = 10000;   // Update device status & RSSI heartbeat every 10 seconds

#endif // CONFIG_H
