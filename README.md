# 🌿 DHARTI RAKSHAK / KrishiDrishti — Smart Soil Monitoring & Agronomy AI

> **"Technology for Protecting the Earth • Field Telemetry"**  
> Developed by **Team Royal Challenger Kanpur**  
> Designed & Powered by **NK Innovation Hub**

---

## 🌟 Overview

**Dharti Rakshak (KrishiDrishti)** is an industrial-grade end-to-end IoT, Cloud, and AI-driven precision agriculture platform. It captures real-time soil chemistry via an industrial 7-in-1 Modbus RS-485 probe, streams live telemetry over HTTPS to Firebase Realtime Database, powers an intelligent Groq Cloud AI recommendation engine, and delivers insights across a high-performance **Progressive Web App (PWA)** that can be installed directly on Android, Windows, and macOS devices.

The platform includes a **Dynamic Admin Control Suite** allowing administrators to rebrand the project name (e.g. *DHARTI RAKSHAK* or *KrishiDrishti*), customize taglines, manage active team members, control public maintenance mode, and have all changes automatically propagate in real time across the web dashboard, the PWA interface, and the **AI Chatbot**.

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
[ Web Dashboard & Installable PWA App ]   [ Render AI Backend ] ◄──► [ Groq Cloud AI (Llama 3.3) ]
```

---

## 🚀 Key Features

### 1. 📡 Industrial Hardware & Firmware (`/firmware`)
- **Microcontroller**: ESP32 Dev Module running non-blocking FreeRTOS C++ loops.
- **Modbus RTU Sensor**: Measures **Moisture (%), Temperature (°C), Soil pH, Nitrogen (N), Phosphorus (P), and Potassium (K)**.
- **Hardware Safeguards**: MAX485 transceiver with direction pin flow control and automatic Wi-Fi auto-reconnect routines.
- **Dual Display Telemetry**: Live rotating mirrors on an on-site 16x2 I2C LCD screen and real-time cloud upload.

### 2. 📱 Progressive Web App (PWA Web App)
- **Installable Cross-Platform App**: Installable as a standalone app on **Android phones**, **Windows PC**, and **Mac** via Google Chrome / Microsoft Edge with a dedicated "Install App 📲" button and browser address bar prompt.
- **Auto-Sync & Live Telemetry**: Live telemetry auto-updates directly from the cloud without requiring page reloads.
- **Offline Shell & Fast Caching**: Powered by an advanced Service Worker (`sw.js`) and Web App Manifest (`manifest.json`).
- **Dynamic Project Rebranding & Admin Suite**:
  - Live Project Name & Tagline customization (e.g., *KrishiDrishti*, *DHARTI RAKSHAK*) directly from the Admin Panel.
  - Live Website Power Switch (Public Live vs. Scheduled Maintenance Mode).
  - Dynamic Team Recognition & Member Visibility Editor (add, remove, or toggle member visibility).
  - Custom Admin Passcode (PIN) stored securely in the cloud.
  - Backend URL & Groq Model Discovery Switcher.
- **Interactive 16x2 LCD Mirror**: Emulates the field LCD rotation in real time on the web dashboard.
- **Historical Analysis & Export**: 20-entry real-time historical log table with search filters and one-click CSV export.
- **Bilingual Interface**: Full English and Hindi support for Indian farmers.

### 3. 🤖 Agronomy AI Backend Service & Smart Chatbot (`/backend`)
- **Engine**: Node.js, Express, Helmet, Rate-Limiting, CORS.
- **Groq Cloud AI**: Leverages `llama-3.3-70b-versatile` for deep agronomy reasoning and real-time chat assistance.
- **Context-Aware Dynamic Chatbot**: 
  - Dynamically adopts the active project persona (e.g., introduces itself as *KrishiDrishti AI* or *Dharti AI*).
  - Strictly cites active team members and team name configured in the Admin Panel.
  - Evaluates live soil sensor telemetry (NPK, pH, Moisture, Temp) in real time to provide tailored agronomic and crop advice.
- **Deployment-Ready**: Ready for free 1-click deployment on [Render.com](https://render.com) via `render.yaml`.

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
- **Development Team**: Royal Challenger Kanpur (Sanidhya Krishna Yadav, Yugant Dwivedi, Rudransh Uttam)
- **Dynamic Field Recognition**: Hammad Uddin, Yuvaraj Singh (configurable live via Admin Panel)
- **Organization**: Team Royal Challenger Kanpur
- **Innovation Partner**: [NK Innovation Hub](https://nk-innovation-hub.netlify.app/)
