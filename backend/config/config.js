/**
 * ============================================================================
 * DHARTI RAKSHAK AI BACKEND - CONFIGURATION
 * ============================================================================
 */

import dotenv from 'dotenv';
dotenv.config();

export const config = {
  // Server Port & Environment
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',

  // Firebase Realtime Database
  firebaseDatabaseUrl: (process.env.FIREBASE_DATABASE_URL || 'https://dharti-rakshak-iot-59952-default-rtdb.asia-southeast1.firebasedatabase.app').replace(/\/$/, ''),
  firebaseAuthToken: process.env.FIREBASE_AUTH_TOKEN || '',

  // Physical IoT Device Node ID
  deviceId: process.env.DEVICE_ID || 'dharti-node-01',

  // Groq Cloud AI Inference
  groqApiKey: process.env.GROQ_API_KEY || '',
  groqModel: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
  groqFastModel: process.env.GROQ_FAST_MODEL || 'llama-3.1-8b-instant',

  // Official Verified Project Metadata
  defaultProjectMetadata: {
    projectName: "DHARTI RAKSHAK (धर्ती रक्षक)",
    tagline: "Technology for Protecting the Earth",
    teamName: "Royal Challenger Kanpur",
    creator: "Namit Kumar",
    teamMembers: [
      "Namit Kumar",
      "Sanidhya Krishna Yadav",
      "Yugant Dwivedi",
      "Rudransh Uttam"
    ],
    designedBy: "NK Innovation Hub (https://nk-innovation-hub.netlify.app/)",
    version: "2.1.0-AI",
    objective: "Real-time industrial IoT soil nutrient, moisture, pH, and environmental intelligence platform designed to maximize crop yield, prevent soil degradation, and empower farmers with precision agronomy and AI intelligence.",
    hardwareStack: "ESP32 Dev Module, Industrial RS-485 Modbus NPK+Moisture+Temp+pH Soil Sensor, MAX485 TTL-to-RS485 transceiver, 16x2 I2C LCD Display",
    pinoutDetails: "ESP32 GPIO 16 (RX2), GPIO 17 (TX2), GPIO 4 (RE/DE Direction Control), I2C 0x27 for 16x2 LCD",
    cloudStack: "Firebase Realtime Database, Cloudflare Pages (Frontend), Render Backend (Node.js/Express) with Groq Llama 3.3 AI"
  }
};
