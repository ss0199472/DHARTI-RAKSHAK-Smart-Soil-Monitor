#include <ModbusMaster.h>
#include <WiFi.h>
#include <WebServer.h>
#include <Wire.h> 
#include <LiquidCrystal_I2C.h>

// ================= WIFI CONFIG =================
const char* ssid = "Vivo 1919";
const char* password = "Jmd405420@1";

// ================= HARDWARE CONFIG =================
// Set the LCD address to 0x27 for a 16 chars and 2 line display
LiquidCrystal_I2C lcd(0x27, 16, 2); 

#define RX_PIN 16
#define TX_PIN 17
#define RE_DE_PIN 4
#define SENSOR_ID 1

ModbusMaster node;
WebServer server(80);

// ================= GLOBAL DATA =================
float moisture = 0, temperature = 0, ph = 0.0;
uint16_t nitrogen = 0, phosphorus = 0, potassium = 0;

// ================= MODBUS HELPERS =================
void preTransmission() { digitalWrite(RE_DE_PIN, 1); }
void postTransmission() { digitalWrite(RE_DE_PIN, 0); }

// ================= LOGIC FUNCTIONS =================
String getFertility() {
  uint32_t totalNPK = nitrogen + phosphorus + potassium;
  if (totalNPK > 250) return "HIGH";
  if (totalNPK > 120) return "MEDIUM";
  return "LOW";
}

String getSoilType() {
  if (ph < 1.0) return "Connecting..."; 
  if (ph < 6.0) return "Acidic";
  if (ph > 7.5) return "Alkaline";
  return "Neutral";
}

bool isSuitable(String crop) {
  if (crop == "Wheat") return (ph >= 6.0 && ph <= 7.5 && moisture < 35);
  if (crop == "Rice")  return (moisture > 40 && ph >= 5.5);
  if (crop == "Maize") return (nitrogen > 20 && ph >= 5.8);
  return false;
}

// ================= WEB DASHBOARD (Identical to Image) =================
void handleRoot() {
  String html = "<!DOCTYPE html><html><head>";
  html += "<meta name='viewport' content='width=device-width, initial-scale=1'><meta http-equiv='refresh' content='5'>";
  html += "<style>";
  html += "body { font-family: 'Segoe UI', Arial; background-color: #f0f2f0; margin: 0; padding: 0; }";
  html += ".header { background: linear-gradient(to right, #2d5a27, #5c9e53); color: white; text-align: center; padding: 35px 10px; }";
  html += ".container { max-width: 1100px; margin: auto; padding: 20px; }";
  html += ".grid { display: flex; flex-wrap: wrap; gap: 15px; justify-content: center; margin-bottom: 25px; }";
  html += ".data-card { background: white; padding: 20px; border-radius: 12px; min-width: 160px; text-align: center; box-shadow: 0 4px 10px rgba(0,0,0,0.05); border-top: 5px solid #4caf50; }";
  html += ".label { font-size: 13px; color: #888; font-weight: bold; text-transform: uppercase; }";
  html += ".value { font-size: 22px; font-weight: bold; color: #333; margin-top: 8px; }";
  html += ".banner-row { display: flex; gap: 20px; margin-bottom: 25px; flex-wrap: wrap; }";
  html += ".banner { flex: 1; padding: 18px; border-radius: 10px; text-align: center; font-weight: bold; font-size: 19px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }";
  html += ".fert { background: #fffbe6; color: #856404; border: 1px solid #ffe58f; }";
  html += ".soil { background: #fff1f0; color: #a8071a; border: 1px solid #ffa39e; }";
  html += ".flex-row { display: flex; gap: 20px; flex-wrap: wrap; }";
  html += ".info-card { background: white; padding: 25px; border-radius: 12px; flex: 1; min-width: 320px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }";
  html += ".suit-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f0f0f0; }";
  html += ".ok { color: #52c41a; font-weight: bold; } .no { color: #f5222d; font-weight: bold; }";
  html += "h3 { color: #2d5a27; margin-top: 0; border-bottom: 2px solid #f0f2f0; padding-bottom: 10px; }";
  html += "</style></head><body>";
  html += "<div class='header'><h1>Dharti-Rakshak &#127793;</h1><p>Real-Time Soil Monitoring System</p></div>";
  html += "<div class='container'>";
  html += "<div class='grid'>";
  html += "<div class='data-card'><div class='label'>Nitrogen</div><div class='value'>" + String(nitrogen) + " mg/kg</div></div>";
  html += "<div class='data-card'><div class='label'>Phosphorus</div><div class='value'>" + String(phosphorus) + " mg/kg</div></div>";
  html += "<div class='data-card'><div class='label'>Potassium</div><div class='value'>" + String(potassium) + " mg/kg</div></div>";
  html += "<div class='data-card'><div class='label'>Moisture</div><div class='value'>" + String(moisture, 1) + " %</div></div>";
  html += "<div class='data-card'><div class='label'>Temperature</div><div class='value'>" + String(temperature, 1) + " &deg;C</div></div>";
  html += "<div class='data-card'><div class='label'>pH Level</div><div class='value'>" + String(ph, 2) + "</div></div>";
  html += "</div>";
  html += "<div class='banner-row'>";
  html += "<div class='banner fert'>Overall Fertility: " + getFertility() + "</div>";
  html += "<div class='banner soil'>Soil Type: " + getSoilType() + "</div>";
  html += "</div>";
  html += "<div class='flex-row'>";
  html += "<div class='info-card'><h3>&#127806; Crop Suitability</h3>";
  html += "<div class='suit-row'><span>Wheat</span><span class='" + String(isSuitable("Wheat") ? "ok'>Suitable &#9989;" : "no'>Not Suitable &#10060;") + "</span></div>";
  html += "<div class='suit-row'><span>Rice</span><span class='" + String(isSuitable("Rice") ? "ok'>Suitable &#9989;" : "no'>Not Suitable &#10060;") + "</span></div>";
  html += "<div class='suit-row'><span>Maize</span><span class='" + String(isSuitable("Maize") ? "ok'>Suitable &#9989;" : "no'>Not Suitable &#10060;") + "</span></div>";
  html += "</div>";
  html += "<div class='info-card'><h3>&#128101; Royal Challenger Kanpur</h3>";
  html += "<ul style='list-style: none; padding: 0; line-height: 2;'><li>Namit Kumar</li><li>Sanidhya Krishna Yadav</li><li>Yugant Dwivedi</li><li>Rudransh Uttam</li></ul></div>";
  html += "</div></div></body></html>";
  server.send(200, "text/html", html);
}

// ================= SETUP =================
void setup() {
  Serial.begin(115200);
  pinMode(RE_DE_PIN, OUTPUT);
  digitalWrite(RE_DE_PIN, 0);

  // Initialize LCD
  lcd.init();
  lcd.backlight();

  // LCD & SERIAL: SHOW CONNECTING STATUS
  Serial.println("\nConnecting to WiFi...");
  lcd.setCursor(0, 0);
  lcd.print("DHARTI-RAKSHAK");
  lcd.setCursor(0, 1);
  lcd.print("Connecting WiFi.");

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    // Optional: simple loading animation on LCD
  }

  // LCD & SERIAL: SHOW IP ADDRESS (Final Screen)
  Serial.println("\nWiFi Connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("WiFi Connected!");
  lcd.setCursor(0, 1);
  lcd.print(WiFi.localIP().toString());

  Serial2.begin(9600, SERIAL_8N1, RX_PIN, TX_PIN);
  node.begin(SENSOR_ID, Serial2);
  node.preTransmission(preTransmission);
  node.postTransmission(postTransmission);

  server.on("/", handleRoot);
  server.begin();
}

// ================= LOOP =================
void loop() {
  server.handleClient();
  
  uint8_t result;
  
  // Real-time sensor reading (for Website updates)
  result = node.readHoldingRegisters(0x0012, 2); 
  if (result == node.ku8MBSuccess) {
    moisture = node.getResponseBuffer(0) / 10.0;
    temperature = (int16_t)node.getResponseBuffer(1) / 10.0;
  }

  result = node.readHoldingRegisters(0x0006, 1); 
  if (result == node.ku8MBSuccess) {
    ph = (float)node.getResponseBuffer(0) / 100.0; // Corrected Scale
  }

  result = node.readHoldingRegisters(0x001E, 3); 
  if (result == node.ku8MBSuccess) {
    nitrogen = node.getResponseBuffer(0);
    phosphorus = node.getResponseBuffer(1);
    potassium = node.getResponseBuffer(2);
  }
  
  // LCD remains showing the IP address for the user
  delay(1000);
}