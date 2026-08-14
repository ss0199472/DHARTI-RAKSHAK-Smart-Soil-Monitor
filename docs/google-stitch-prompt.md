# 📋 COPY EVERYTHING BELOW THIS LINE INTO GOOGLE STITCH

Create a modern, premium, responsive Smart Soil Monitoring Dashboard web application called **"DHARTI-RAKSHAK"**.

This is an IoT dashboard that displays real-time soil sensor data from a 7-in-1 agricultural soil sensor. The data is stored in Firebase Realtime Database and the website must read from it in real-time.

## Tech Stack
- Vanilla HTML, CSS, and JavaScript only (no React, Vue, Angular, or any framework)
- Chart.js via CDN for charts
- Firebase JS SDK v9 (modular) via CDN
- Google Fonts: "Inter" for body text, "Space Grotesk" for headings

## Firebase Configuration

Use this exact Firebase config and database URL:

```javascript
const firebaseConfig = {
  databaseURL: "https://dharti-rakshak-iot-e52e1-default-rtdb.asia-southeast1.firebasedatabase.app"
};
```

The database has these paths:
- `dharti_rakshak/live_readings` — latest sensor values (updated every 15 seconds)
- `dharti_rakshak/historical_logs` — time-series log of all readings (auto-generated keys)
- `dharti_rakshak/device_info` — device metadata (device_id, firmware_version, wifi_rssi, uptime_seconds, ip_address, last_seen)

## Data Fields in `live_readings`
| Field | Type | Unit | Range |
|-------|------|------|-------|
| moisture | float | % | 0-100 |
| temperature | float | °C | -40 to 85 |
| ec | integer | µS/cm | 0-20000 |
| ph | float | pH | 0-14 |
| nitrogen | integer | mg/kg | 0-2000 |
| phosphorus | integer | mg/kg | 0-2000 |
| potassium | integer | mg/kg | 0-2000 |
| fertility | string | — | "LOW", "MEDIUM", "HIGH" |
| soil_type | string | — | "Acidic", "Neutral", "Alkaline" |
| timestamp | number | Unix ms | Server timestamp |

## Design Theme
- **Dark theme** background (#0f1117 or similar deep dark)
- **Earthy accent colors**: muted greens (#4ade80, #22c55e), warm browns (#a3845b), soil amber (#d4a574)
- Cards with subtle glass-morphism effect (slight transparency, soft blur, thin border)
- Rounded corners (12-16px border radius)
- Subtle shadows and depth
- Smooth transitions and micro-animations when values update
- Clean spacing with generous padding

## Dashboard Layout

### 1. Top Header Bar
- Left: Project name "DHARTI-RAKSHAK" with a small leaf/soil icon (use emoji 🌱 or SVG)
- Center: "Smart Soil Monitoring System" subtitle
- Right: Device status badge — show "● Online" (green) if `device_info/last_seen` is within last 5 minutes, otherwise "● Offline" (red). Show "Last updated: X minutes ago" below it that updates live.

### 2. Live Sensor Cards (7 cards in a responsive CSS Grid)
Each card shows one sensor parameter with:
- Parameter name at top
- Large animated number value in the center (numbers should smoothly count/transition when they change)
- Unit label below the number
- A visual indicator unique to each parameter:

| Parameter | Card Color Accent | Visual Indicator |
|-----------|------------------|------------------|
| Soil Moisture (%) | Blue (#3b82f6) | Circular progress ring/gauge |
| Temperature (°C) | Orange (#f97316) | Thermometer-style vertical bar |
| EC (µS/cm) | Emerald (#10b981) | Horizontal progress bar |
| pH | Dynamic (red to green to blue based on value) | pH color scale strip with pointer |
| Nitrogen (mg/kg) | Teal (#14b8a6) | Simple card with "N" icon |
| Phosphorus (mg/kg) | Violet (#8b5cf6) | Simple card with "P" icon |
| Potassium (mg/kg) | Amber (#f59e0b) | Simple card with "K" icon |

The grid should be:
- Desktop: 4 columns on first row, 3 columns on second row
- Tablet: 2 columns
- Mobile: 1 column (stacked)

### 3. Soil Status Bar (below the cards)
A horizontal bar/strip with two indicators:
- **Fertility Level**: Shows "LOW" (red), "MEDIUM" (yellow), or "HIGH" (green) — read from `live_readings/fertility`
- **Soil Type**: Shows "Acidic" (red-orange), "Neutral" (green), or "Alkaline" (blue) — read from `live_readings/soil_type`

### 4. Historical Chart Section
- A large line chart (Chart.js) showing sensor data over time
- **Toggle buttons** above the chart to show/hide each of the 7 parameters (like checkboxes or pills that light up when active)
- **Time range selector**: Button group with options: 1h, 6h, 24h, 7d, 30d
- Query `dharti_rakshak/historical_logs` ordered by `timestamp`, limit to last 100 entries initially
- Use different colors for each line matching the card accent colors above
- Dark chart background with subtle grid lines
- Smooth curved lines (tension: 0.4)

### 5. Device Info Panel (bottom section)
A smaller card/panel showing:
- Device ID (from `device_info/device_id`)
- Firmware Version (from `device_info/firmware_version`)
- WiFi Signal: Show RSSI value with a signal strength icon (weak/medium/strong based on dBm)
- Uptime: Convert `uptime_seconds` to human-readable format (e.g., "2h 15m")
- IP Address (from `device_info/ip_address`)

### 6. Footer
- Simple footer: "DHARTI-RAKSHAK © 2026 | Smart Soil Monitoring System"

## Firebase Integration Code Requirements
- Initialize Firebase using the v9 modular SDK CDN imports
- Use `onValue()` real-time listener on `dharti_rakshak/live_readings` to update all cards instantly
- Use `onValue()` real-time listener on `dharti_rakshak/device_info` to update device panel and online/offline status
- Use `query()` with `orderByChild('timestamp')` and `limitToLast()` on `dharti_rakshak/historical_logs` for chart data
- Handle the case where the database is empty (show "Waiting for data..." placeholder)
- Handle connection errors gracefully

## File Structure
Create these separate files:
- `index.html` — HTML structure with Firebase SDK CDN imports
- `style.css` — All styling
- `script.js` — Firebase initialization, real-time listeners, chart logic, UI updates

## Important
- The dashboard must work by simply opening index.html in a browser (no build step required)
- All sensor values must update in real-time without page refresh
- The chart must update when new historical data arrives
- The UI must be responsive and look great on both mobile phones and desktop monitors
- Include loading states and empty data handling
