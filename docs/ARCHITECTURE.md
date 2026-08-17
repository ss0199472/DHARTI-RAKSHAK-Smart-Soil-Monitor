# DHARTI RAKSHAK (धर्ती रक्षक) — System Architecture & Technical Manual

### "Technology for Protecting the Earth"
**Team**: Royal Challenger Kanpur (*Namit Kumar, Sanidhya Krishna Yadav, Yugant Dwivedi, Rudransh Uttam*)

---

## 1. Complete End-to-End System Pipeline

```
+-------------------------------------------------------------+
|               INDUSTRIAL SOIL SENSOR (7-in-1 / 5-in-1)      |
|  Moisture (%) | Temperature (°C) | pH | NPK (mg/kg)        |
+-------------------------------------------------------------+
                              |
                              | RS-485 Differential Pair (A / B)
                              v
+-------------------------------------------------------------+
|             MAX485 / RS-485 to TTL TRANSCEIVER              |
|  RO -> GPIO 16 (RX)                                         |
|  DI -> GPIO 17 (TX)                                         |
|  RE/DE -> GPIO 4 (Direction Control)                       |
+-------------------------------------------------------------+
                              |
                              | Hardware Serial2 (9600 Baud, 8N1)
                              v
+-------------------------------------------------------------+
|                      ESP32 DEV MODULE                       |
|  - Reads Modbus Holding Registers (0x0012, 0x0006, 0x001E)  |
|  - Non-blocking 2s Modbus Poller                            |
|  - Validates CRC & Telemetry Ranges                         |
|  - Rotates 16x2 I2C Character LCD (0x27)                    |
|  - HTTPS Client with SSL / JSON REST Serializer             |
+-------------------------------------------------------------+
                              |
                              | Wi-Fi 2.4GHz (WPA2) / HTTPS REST
                              v
+-------------------------------------------------------------+
|             FIREBASE REALTIME DATABASE (RTDB)               |
|  - /devices/dharti-node-01/latest   (Sync every 5s)         |
|  - /devices/dharti-node-01/readings (Log snapshot every 15m)|
|  - /devices/dharti-node-01/status   (Heartbeat & RSSI)      |
+-------------------------------------------------------------+
                              |
                              | Realtime v10 SSE / WebSocket Stream
                              v
+-------------------------------------------------------------+
|            CLOUDFLARE-HOSTED NATURE-TECH DASHBOARD          |
|  - Real-Time 6-Sensor Telemetry Gauges                      |
|  - Soil Fertility & Soil Type Classifiers                   |
|  - Live Crop Suitability Matrix (Wheat, Rice, Maize, etc.)  |
|  - Interactive Chart.js Multi-Axis Analytics Studio         |
|  - Dharti AI Smart Agronomy Health Index & Recommendations  |
|  - Historical Searchable Table & 1-Click CSV/JSON Exporter  |
|  - Live 16x2 LCD Telemetry Mirror                           |
+-------------------------------------------------------------+
```

---

## 2. Hardware Wiring & GPIO Pin Assignments (Strictly Preserved)

| ESP32 Pin | Connected Component | Signal Name | Description |
| :--- | :--- | :--- | :--- |
| **GPIO 16** | MAX485 Module | `RO` (Receiver Output) | Serial2 Hardware RX (Receive Modbus frames) |
| **GPIO 17** | MAX485 Module | `DI` (Driver Input) | Serial2 Hardware TX (Transmit Modbus queries) |
| **GPIO 4** | MAX485 Module | `DE` & `RE` (Tied) | Direction: `HIGH` = Transmit, `LOW` = Receive |
| **GPIO 21** | 16x2 I2C LCD | `SDA` | I2C Data Line (Address `0x27`) |
| **GPIO 22** | 16x2 I2C LCD | `SCL` | I2C Clock Line (Address `0x27`) |
| **5V / VCC** | MAX485, LCD & Sensor | `VCC` | Common 5V DC Supply |
| **GND** | MAX485, LCD, Sensor, ESP32 | `GND` | Common Ground Reference |

---

## 3. Modbus Protocol & Register Mapping

### Communication Parameters:
- **Baud Rate**: `9600 bps`
- **Data Bits**: `8`
- **Parity**: `None`
- **Stop Bits**: `1` (`SERIAL_8N1`)
- **Modbus Slave Address**: `0x01` (`SENSOR_ID = 1`)

### Holding Register Addresses:
1. **Moisture & Temperature (`0x0012`, Length: 2 Words / 4 Bytes)**
   - Word 0: Moisture Value ($\text{raw} / 10.0$ in $\%$)
   - Word 1: Temperature Value ($(\text{int16\_t})\text{raw} / 10.0$ in $^\circ\text{C}$)
2. **Soil pH Level (`0x0006`, Length: 1 Word / 2 Bytes)**
   - Word 0: pH Value ($(\text{float})\text{raw} / 100.0$)
3. **NPK Macronutrients (`0x001E`, Length: 3 Words / 6 Bytes)**
   - Word 0: Nitrogen ($\text{N}$) in $\text{mg/kg}$
   - Word 1: Phosphorus ($\text{P}$) in $\text{mg/kg}$
   - Word 2: Potassium ($\text{K}$) in $\text{mg/kg}$

---

## 4. Decision Logic & Agricultural Rules

### Total NPK:
$$\text{Total NPK} = N + P + K$$

### Soil Fertility Level:
- $\text{Total NPK} > 250 \implies \mathbf{HIGH}$
- $\text{Total NPK} > 120 \implies \mathbf{MEDIUM}$
- $\text{Total NPK} \le 120 \implies \mathbf{LOW}$

### Soil Classification:
- $\text{pH} < 1.0 \implies \mathbf{Connecting... / Sensor\ Initializing}$
- $\text{pH} < 6.0 \implies \mathbf{Acidic}$
- $\text{pH} > 7.5 \implies \mathbf{Alkaline}$
- $6.0 \le \text{pH} \le 7.5 \implies \mathbf{Neutral}$

### Crop Suitability Equations:
- **Wheat (गेहूँ)**: $(\text{pH} \ge 6.0 \land \text{pH} \le 7.5) \land \text{Moisture} < 35\%$
- **Rice (धान)**: $\text{Moisture} > 40\% \land \text{pH} \ge 5.5$
- **Maize (मक्का)**: $\text{Nitrogen} > 20\text{ mg/kg} \land \text{pH} \ge 5.8$
