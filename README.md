# DHARTI-RAKSHAK Smart Soil Monitor

DHARTI-RAKSHAK is an industrial-grade telemetry system designed to read agricultural data from a 7-in-1 NPK Soil Sensor (Modbus RTU over RS485) and stream it to the Firebase Realtime Database. 

## Features
- **7-in-1 Sensor Reads**: Moisture, Temperature, pH, Nitrogen, Phosphorus, Potassium, and Electrical Conductivity (EC).
- **Offline Reliability**: Sensor polling continues even if WiFi drops. Automatic non-blocking WiFi reconnection.
- **Diagnostics**: Built-in Serial commands (`SCAN` and `READ`) to troubleshoot the Modbus registers.
- **REST API Sync**: Pushes real-time updates and historical logs to Firebase.

## Architecture
```
[ 7-in-1 Soil Sensor ] <--> (RS485) <--> [ MAX485 Module ] <--> (UART) <--> [ ESP32 DevKit V1 ] <--> (WiFi) <--> [ Firebase RTDB ]
                                                                                   |
                                                                             [ I2C LCD ]
```

## Hardware Requirements
- ESP32 Development Board
- MAX485 TTL to RS485 Converter Module
- 7-in-1 NPK Soil Sensor (RS485 Modbus)
- 16x2 I2C LCD Display
- 12V Power Supply (for the sensor) with step-down to 5V for the ESP32

## Wiring Table

### ESP32 to MAX485
| ESP32 Pin | MAX485 Pin |
|-----------|------------|
| GPIO 16 (RX2)| RO         |
| GPIO 17 (TX2)| DI         |
| GPIO 4    | DE & RE    |
| 3.3V / 5V | VCC        |
| GND       | GND        |

### MAX485 to Sensor
| MAX485 Pin | Sensor |
|------------|--------|
| A          | A / D+ |
| B          | B / D- |

### ESP32 to I2C LCD
| ESP32 Pin | LCD Module |
|-----------|------------|
| GPIO 21   | SDA        |
| GPIO 22   | SCL        |
| 5V        | VCC        |
| GND       | GND        |

## Setup & Upload Instructions
1. Navigate to the `firmware/` directory.
2. Open `config.h` and fill in your WiFi credentials, Firebase URL, and Firebase API Key. **Do not upload until you complete this step.**
3. Install the required Arduino libraries:
   - `ModbusMaster`
   - `LiquidCrystal_I2C`
   - `WiFi` (Built-in)
   - `HTTPClient` (Built-in)
4. Upload `firmware.ino` to your ESP32.

## Serial Commands
Open the Serial Monitor at `115200` baud (ensure it sends "Newline"). You can send the following commands:
- `SCAN`: Iterates through Modbus registers `0x0000` to `0x0025` and prints the raw values to help you diagnose register mapping.
- `READ`: Forces an immediate Modbus read for all 7 parameters and prints them sequentially.

## Firebase Setup Reference
1. Go to your Firebase Console and create a project.
2. Create a Realtime Database and set it in "Test Mode" initially, or configure your rules to allow authenticated/authorized access.
3. Your `YOUR_FIREBASE_PROJECT_URL` looks like `https://your-project-id-default-rtdb.firebaseio.com`.
4. Your `YOUR_FIREBASE_API_KEY` is your Web API Key found in Project Settings.

## Project Structure
```
.
├── firmware
│   ├── firmware.ino
│   └── config.h
├── .gitignore
└── README.md
```
