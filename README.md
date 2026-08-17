# DHARTI RAKSHAK (धर्ती रक्षक)

### *Technology for Protecting the Earth*

**Team**: Royal Challenger Kanpur  
**Members**: Namit Kumar, Sanidhya Krishna Yadav, Yugant Dwivedi, Rudransh Uttam

---

## 🌿 Project Overview

**Dharti Rakshak** is an industrial-grade Smart Soil Monitoring and Environmental Intelligence IoT System. It combines an industrial Modbus RS-485 multi-parameter soil sensor probe with an ESP32 edge microcontroller, Firebase Realtime Database cloud backend, and an ultra-premium Nature-Tech dashboard hosted on Cloudflare Pages.

### Upgraded Architecture Pipeline:
$$\boxed{\text{RS-485 Soil Sensor}} \xrightarrow{\text{Modbus RTU}} \boxed{\text{MAX485}} \xrightarrow[\text{GPIO 16,17,4}]{\text{Serial2}} \boxed{\text{ESP32}} \xrightarrow[\text{JSON}]{\text{HTTPS REST}} \boxed{\text{Firebase RTDB}} \xrightarrow{\text{v10 Realtime}} \boxed{\text{Cloudflare Pages (Dharti Rakshak Dashboard)}}$$

---

## 📁 Repository Structure

```
Upgrade/
├── firmware/
│   └── dharti_rakshak_firmware/
│       ├── dharti_rakshak_firmware.ino      # Upgraded lightweight ESP32 firmware (No WebServer)
│       └── config.h                         # Wi-Fi, Firebase, and GPIO configuration constants
├── website/
│   ├── index.html                           # Cloudflare frontend dashboard
│   ├── styles/
│   │   └── main.css                         # Nature-Tech Glassmorphism Design System
│   ├── js/
│   │   ├── firebase-config.js               # Firebase Realtime Database streamer + Sandbox mode
│   │   ├── app.js                           # Core UI controller, LCD mirror, CSV exporter
│   │   ├── charts.js                        # Interactive Chart.js analytics studio
│   │   └── ai-insights.js                   # Dharti AI Agronomy health index & recommendation engine
│   ├── wrangler.toml                        # Cloudflare Pages deployment configuration
│   └── README.md                            # Website deployment instructions
├── database/
│   ├── database.rules.json                  # Production Firebase RTDB security rules
│   └── initial_seed.json                    # Sample database seed matching schema
├── docs/
│   ├── AI_IMAGE_GENERATION_PROMPT.md        # Detailed prompt for ChatGPT / Midjourney / Gemini
│   └── ARCHITECTURE.md                      # Complete hardware wiring & Modbus register manual
└── Final_Code_of_DHARTI_RAKSHAK_Smart_Soil_Monitor_System/
    └── Final_Code_of_DHARTI_RAKSHAK_Smart_Soil_Monitor_System.ino # Original backup (untouched)
```

---

## ⚡ Quick Start Guide

### 1. ESP32 Firmware Flashing
1. Open Arduino IDE.
2. Ensure you have the following standard libraries installed (via Library Manager):
   - `ModbusMaster` by Doc Walker
   - `LiquidCrystal_I2C` by Frank de Brabander
   - `WiFi` & `HTTPClient` (built-in to ESP32 core)
3. Open `firmware/dharti_rakshak_firmware/dharti_rakshak_firmware.ino`.
4. Edit `config.h` to enter your Wi-Fi SSID, Password, and your Firebase RTDB URL.
5. Connect your ESP32 board via USB and click **Upload**.

### 2. Firebase Database Setup
1. Go to [Firebase Console](https://console.firebase.google.com/) and create a project.
2. Create a **Realtime Database**.
3. Under the **Rules** tab, paste the contents of `database/database.rules.json`.
4. *(Optional)* Import `database/initial_seed.json` to verify the schema with test values.

### 3. Web Dashboard (Cloudflare Pages)
1. Edit `website/js/firebase-config.js` with your Firebase project config.
2. Deploy to Cloudflare Pages:
   ```bash
   cd website
   npx wrangler pages deploy . --project-name=dharti-rakshak
   ```
   *Or simply drag and drop the `website/` folder in the Cloudflare Pages web dashboard!*

---

## 🔒 Preserved Hardware Pinout & Wiring

| ESP32 Pin | Connected Module | Function |
| :--- | :--- | :--- |
| **GPIO 16** | MAX485 RO | Hardware `Serial2` RX |
| **GPIO 17** | MAX485 DI | Hardware `Serial2` TX |
| **GPIO 4** | MAX485 RE & DE | Flow Direction Control (`HIGH` = TX, `LOW` = RX) |
| **GPIO 21** | 16x2 LCD SDA | I2C Data (`0x27`) |
| **GPIO 22** | 16x2 LCD SCL | I2C Clock (`0x27`) |
