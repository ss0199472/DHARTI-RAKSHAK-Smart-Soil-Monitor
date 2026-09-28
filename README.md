# 🌿 DHARTI RAKSHAK (धर्ती रक्षक) — Smart Soil Monitoring & Agronomy AI

> **"Technology for Protecting the Earth"**  
> Developed by **Team Royal Challenger Kanpur** (Namit Kumar, Sanidhya Krishna Yadav, Yugant Dwivedi, Rudransh Uttam)  
> Designed & Powered by **NK Innovation Hub**

---

## 🌟 Overview

**Dharti Rakshak** is an industrial-grade end-to-end IoT, Cloud, and AI-driven precision agriculture platform. It captures real-time soil chemistry via an industrial 7-in-1 Modbus RS-485 probe, streams live telemetry over HTTPS to Firebase Realtime Database, powers an intelligent Groq Cloud AI recommendation engine, and delivers insights across both a **Progressive Web App (PWA)** and a dedicated **Flutter Android Application**.

```
[ Industrial 7-in-1 Sensor ]
            │ (RS-485 Modbus RTU / MAX485)
            ▼
   [ ESP32 Field Node ] ───(Local I2C)───► [ 16x2 LCD Display ]
            │ (Wi-Fi / HTTPS REST)
            ▼
[ Firebase Realtime Database ]
       │                │
       ▼                ▼
[ Web Dashboard & PWA ]   [ Render AI Backend ] ◄──► [ Groq Cloud AI (Llama 3.3) ]
       ▲
       │ (Direct Cloud Sync)
[ Flutter Android App ]
```

---

## 🚀 Key Features

### 1. 📡 Industrial Hardware & Firmware (`/firmware`)
- **Microcontroller**: ESP32 Dev Module running non-blocking FreeRTOS C++ loops.
- **Modbus RTU Sensor**: Measures **Moisture (%), Temperature (°C), Soil pH, Nitrogen (N), Phosphorus (P), and Potassium (K)**.
- **Hardware Safeguards**: MAX485 transceiver with direction pin flow control and automatic Wi-Fi auto-reconnect routines.
- **Dual Display Telemetry**: Live rotating mirrors on an on-site 16x2 I2C LCD screen and real-time cloud upload.

### 2. 📱 Progressive Web App (PWA Web App)
- **Installable Native App**: Installable directly on **Windows**, **Mac**, and **Android** Chrome/Edge with an "Install App 📲" button and browser address bar prompt.
- **Offline Shell & Fast Caching**: Powered by a Service Worker (`sw.js`) and Web App Manifest (`manifest.json`).
- **Dynamic Project Rebranding**: Change the Project Name (e.g. from *Dharti Rakshak* to any custom title) and Tagline live directly from the Admin Panel without modifying code.
- **Full Admin Control Suite**:
  - Live Website Power Switch (Public Live vs. Scheduled Maintenance Mode).
  - Dynamic Team Recognition & Member Visibility Editor.
  - Custom Admin Passcode (PIN) stored securely in the cloud.
  - Backend URL & Groq Model Discovery Switcher.
- **Interactive 16x2 LCD Mirror**: Emulates the field LCD rotation in real time on the web dashboard.
- **Historical Analysis & Export**: 20-entry real-time historical log table with search filters and one-click CSV export.

### 3. 🤖 Agronomy AI Backend Service (`/backend`)
- **Engine**: Node.js, Express, Helmet, Rate-Limiting, CORS.
- **Groq Cloud AI**: Leverages `llama-3.3-70b-versatile` for deep agronomy reasoning and real-time chat assistance.
- **Context-Aware Chatbot**: Answers queries by evaluating current sensor frames against regional crop suitability matrices (Wheat, Rice, Maize, Mustard).
- **Deployment-Ready**: Ready for free 1-click deployment on [Render.com](https://render.com) via `render.yaml`.

### 4. 📲 Flutter Android App (`KrishiDrishti-main (3).zip`)
- **Direct Cloud Integration**: Connects straight to the Firebase Realtime Database (`/devices/dharti-node-01/`).
- **Zero Mock / Zero Bluetooth**: Removed all simulated Bluetooth pairings and fake random number generators; displays real-time telemetry.
- **Auto Offline Detection**: Automatically detects probe disconnect or node shutdown if no heartbeat is received within 12 seconds.
- **Bilingual Interface**: Full English and Hindi support for Indian farmers.

---

## 💻 Quick Start & Deployment

### 1. Web Dashboard (Local & Cloudflare Pages)

#### Local Preview:
```bash
# Using Python
python -m http.server 8080

# Or using Node
npx serve website/
```
Open `http://localhost:8080` in your browser.

#### Deploying to Cloudflare Pages:
1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/) $\rightarrow$ **Workers & Pages** $\rightarrow$ **Create Application** $\rightarrow$ **Pages**.
2. **Method 1 (Git)**: Connect this GitHub repo, set Build output directory to `website/`, leave build command blank.
3. **Method 2 (Wrangler CLI)**:
   ```bash
   cd website
   npx wrangler pages deploy . --project-name=dharti-rakshak
   ```

---

### 2. AI Backend Service on Render

1. Open `backend/` and install dependencies:
   ```bash
   cd backend
   npm install
   ```
2. Copy `.env.example` to `.env` and configure:
   ```env
   GROQ_API_KEY=gsk_your_groq_api_key_here
   FIREBASE_DATABASE_URL=https://dharti-rakshak-iot-59952-default-rtdb.asia-southeast1.firebasedatabase.app
   DEVICE_ID=dharti-node-01
   GROQ_MODEL=llama-3.3-70b-versatile
   ```
3. Run locally:
   ```bash
   npm start
   ```
4. Deploy to [Render.com](https://render.com) as a Web Service linked to the `backend/` root directory.

---

### 3. ESP32 Hardware Firmware

1. Open `firmware/dharti_rakshak_firmware/dharti_rakshak_firmware.ino` in Arduino IDE.
2. Ensure you have installed `ModbusMaster` and `LiquidCrystal_I2C` libraries.
3. Set your Wi-Fi credentials in `config.h`:
   ```cpp
   #define WIFI_SSID     "Your_WiFi_SSID"
   #define WIFI_PASSWORD "Your_WiFi_Password"
   #define FIREBASE_HOST "https://dharti-rakshak-iot-59952-default-rtdb.asia-southeast1.firebasedatabase.app"
   ```
4. Select board **ESP32 Dev Module** and flash via USB.

---

## 🔒 Security & Admin Panel Access

- **Default Admin Passcode (PIN)**: `1234`
- You can change the passcode at any time from the **Admin Panel $\rightarrow$ Change Admin Passcode** section; it syncs securely with Firebase.

---

## 👥 Credits & Team

- **Project Lead & Developer**: Namit Kumar
- **Core Team Members**: Sanidhya Krishna Yadav, Yugant Dwivedi, Rudransh Uttam
- **Organization**: Team Royal Challenger Kanpur
- **Innovation Partner**: [NK Innovation Hub](https://nk-innovation-hub.netlify.app/)
