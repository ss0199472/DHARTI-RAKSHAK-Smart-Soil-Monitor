# 🌿 Dharti Rakshak — AI Backend Service on Render

This is the dedicated Node.js/Express backend service for **DHARTI RAKSHAK** ("Technology for Protecting the Earth"). It bridges live Modbus RS-485 soil sensor telemetry from Firebase Realtime Database with **Groq Cloud AI (Llama 3.3)** to power:

1. **Structured Precision AI Recommendations** (Soil health index, nutrient status, organic amendments, safety warnings).
2. **Context-Aware Dharti AI Chatbot** (Answers live data queries and verified project information).
3. **Zero Hardware/Firmware Disruption** (The ESP32 firmware remains 100% untouched).

---

## 🚀 Quick Local Setup

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Add your free Groq API key from [https://console.groq.com/keys](https://console.groq.com/keys):
```env
GROQ_API_KEY=gsk_your_groq_api_key_here
```

### 3. Run the Server
```bash
npm start
```
Test health endpoint:
```bash
curl http://localhost:5000/health
```

---

## 🌐 Deploy to Render (Step-by-Step Guide)

Deploying to [Render.com](https://render.com) takes less than 2 minutes:

### Step 1: Push Repository to GitHub
Ensure this repository is pushed to your GitHub account (`https://github.com/namitkumarapsr1-bit/dharti-rakshak-code.git`).

### Step 2: Create a New Web Service on Render
1. Log in to [Render Dashboard](https://dashboard.render.com/).
2. Click **"New +"** and select **"Web Service"**.
3. Connect your GitHub repository `dharti-rakshak-code`.
4. Configure the service settings:
   - **Name**: `dharti-rakshak-backend`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free`

### Step 3: Add Environment Variables on Render
Under the **Environment Variables** tab, add:

| Key | Value | Description |
| :--- | :--- | :--- |
| `GROQ_API_KEY` | `gsk_...` | Your secret Groq API key |
| `FIREBASE_DATABASE_URL` | `https://dharti-rakshak-iot-59952-default-rtdb.asia-southeast1.firebasedatabase.app` | Firebase RTDB endpoint |
| `DEVICE_ID` | `dharti-node-01` | Active field node identifier |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` | High-precision Groq AI model |
| `CORS_ORIGIN` | `*` | Allowed CORS origins |

### Step 4: Deploy & Copy URL
Click **"Deploy Web Service"**.
Once deployed, copy your Render URL (e.g., `https://dharti-rakshak-backend.onrender.com`).

### Step 5: Link URL in Dharti Rakshak Dashboard
1. Open the website: `https://dharti-rakshak-31h.pages.dev`
2. Click **"Admin Panel"** ➔ **"Backend & AI Configuration"**.
3. Paste your Render backend URL and click **"Save & Connect"**.

---

## 📡 REST API Documentation

### `GET /health`
Verifies backend liveness and Groq configuration.

### `GET /api/soil/latest`
Fetches the latest real-time soil telemetry and device status.

### `GET /api/recommendation/latest`
Fetches the latest structured AI recommendation stored in Firebase.

### `POST /api/recommendation/generate`
Analyzes current soil telemetry with Groq AI, computes health index, structures JSON, and saves to `/aiRecommendations/{deviceId}/latest`.
```json
{
  "userContext": {
    "targetCrop": "Wheat",
    "fieldSize": "2 Acres"
  },
  "forceRefresh": true
}
```

### `POST /api/chat`
Sends a message to the AI Chatbot with real-time soil context and dynamic Admin Panel metadata (Project Name, Team Name, and Active Team Members).
```json
{
  "message": "What does my NPK reading mean for wheat?",
  "messages": [
    { "role": "user", "content": "What is my soil moisture?" }
  ],
  "clientConfig": {
    "project_name": "KrishiDrishti",
    "project_tagline": "Technology for Protecting the Earth • Field Telemetry",
    "team_name": "Royal Challenger Kanpur",
    "team_members": [
      { "name": "Hammad Uddin", "visible": true },
      { "name": "Yuvaraj Singh", "visible": true }
    ]
  }
}
```

### `GET /api/project-info`
Retrieves verified project metadata merged with live `/system_config` from Firebase Realtime Database.
