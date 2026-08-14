# DHARTI-RAKSHAK Firebase Realtime Database Schema

This document outlines the schema used in the Firebase Realtime Database for the DHARTI-RAKSHAK Smart Soil Monitor IoT project.

## Database Structure

```json
dharti_rakshak/
├── live_readings/
│   ├── moisture: 45.2          (float, %)
│   ├── temperature: 28.5       (float, °C)
│   ├── ec: 1250                (int, µS/cm)
│   ├── ph: 6.80                (float)
│   ├── nitrogen: 45            (int, mg/kg)
│   ├── phosphorus: 30          (int, mg/kg)
│   ├── potassium: 55           (int, mg/kg)
│   ├── fertility: "MEDIUM"     (string)
│   ├── soil_type: "Neutral"    (string)
│   └── timestamp: 1234567890   (server timestamp)
│
├── historical_logs/
│   └── {auto-generated-key}/
│       ├── moisture: 45.2
│       ├── temperature: 28.5
│       ├── ec: 1250
│       ├── ph: 6.80
│       ├── nitrogen: 45
│       ├── phosphorus: 30
│       ├── potassium: 55
│       ├── fertility: "MEDIUM"
│       ├── soil_type: "Neutral"
│       └── timestamp: 1234567890
│
└── device_info/
    ├── device_id: "DHARTI-001"
    ├── firmware_version: "2.0.0"
    ├── wifi_rssi: -65
    ├── uptime_seconds: 3600
    ├── last_seen: 1234567890
    └── ip_address: "192.168.1.100"
```

## Node Explanations

### `live_readings/`
Contains the most recent sensor readings.
*   **Mechanism**: The ESP32 uses a `PUT` request to this node, which overwrites the existing data with the latest values. This allows the web dashboard to easily subscribe to just one location for real-time updates without needing to query a list.
*   **Fields**:
    *   `moisture`: Soil moisture percentage (float, 0-100%).
    *   `temperature`: Soil temperature (float, °C).
    *   `ec`: Electrical Conductivity (integer, µS/cm).
    *   `ph`: Soil pH level (float, 0-14).
    *   `nitrogen`: Nitrogen level (integer, mg/kg).
    *   `phosphorus`: Phosphorus level (integer, mg/kg).
    *   `potassium`: Potassium level (integer, mg/kg).
    *   `fertility`: Assessed fertility string ("LOW", "MEDIUM", "HIGH").
    *   `soil_type`: Assessed soil type string (e.g., "Acidic", "Neutral", "Alkaline").
    *   `timestamp`: Unix timestamp of the reading. Best set using Firebase's server timestamp feature if possible.

### `historical_logs/`
Stores a time-series log of all sensor readings for charting and analysis.
*   **Mechanism**: The ESP32 uses a `POST` request to this node. Firebase automatically generates a unique chronological key (like `-Nabcd1234...`) and appends the new reading under it.
*   **Fields**: Matches the structure of `live_readings`.

### `device_info/`
Maintains status and metadata about the IoT device itself.
*   **Mechanism**: The device sends a `PUT` request on startup and periodically (e.g., every 5-10 minutes) to update its status.
*   **Fields**:
    *   `device_id`: Unique identifier for the ESP32 (string).
    *   `firmware_version`: Current firmware version (string).
    *   `wifi_rssi`: Wi-Fi signal strength in dBm (integer).
    *   `uptime_seconds`: Time since last device reboot (integer).
    *   `last_seen`: Timestamp of the last update. Used to calculate if the device is "online" or "offline".
    *   `ip_address`: Local IP address of the device on the Wi-Fi network.

## Query Examples for Web Dashboard

**Get Latest Readings:**
Simply attach an `onValue` listener to `/dharti_rakshak/live_readings`.

**Get Historical Data for Charts (Last 50 readings):**
```javascript
const logsRef = firebase.database().ref('dharti_rakshak/historical_logs');
logsRef.orderByChild('timestamp').limitToLast(50).once('value', (snapshot) => {
    // Process data for charts
});
```

## Data Retention Notes
The `historical_logs` node will grow indefinitely as new readings are POSTed. For long-term operation, you should implement a periodic cleanup mechanism. This could be a scheduled Cloud Function or a script running elsewhere that deletes records older than a certain threshold (e.g., 30 days) to prevent exceeding Firebase storage limits and to keep queries fast.
