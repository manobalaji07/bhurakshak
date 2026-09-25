#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <math.h>

// =====================================================
// BHURAKSHAK - 3 NODE MINE MONITOR GATEWAY
// INTEGRATED SPEAKER ALERT & KINEMATIC PROJECTION VERSION
// =====================================================
// FEATURES:
// 1. Accepts remote GET telemetry requests from Node 1, Node 2, Node 3
// 2. Forwards telemetry to FastAPI backend over Wi-Fi STA
// 3. Receives backend AI/ML subsidence evaluation in HTTP response
// 4. Returns hardware speaker alert signal ("DANGER" / "WARNING") to Node 1
//    so MAX98357A I2S speaker triggers high-priority sound alert immediately!
// =====================================================

// -------------------- Gateway AP for Sensor Nodes --------------------
const char* AP_SSID = "MINE_MONITOR";
const char* AP_PASSWORD = "12345678";

// -------------------- Gateway STA / Laptop Wi-Fi --------------------
const char* WIFI_SSID = "EDC2";
const char* WIFI_PASSWORD = "psnacet123";

// -------------------- BhuRakshak Backend URL --------------------
// Replace with your laptop's current IPv4 address from 'ipconfig'
const char* BACKEND_URL = "http://192.168.44.8:8000/api/v1/telemetry";

// -------------------- Node timeout ----------------------
const unsigned long NODE_TIMEOUT_MS = 5000UL;
const unsigned long WIFI_RECONNECT_MS = 10000UL;
const unsigned long STATUS_PRINT_INTERVAL_MS = 5000UL;

// -------------------- Derived thresholds ----------------
const float TILT_THRESHOLD_DEG = 5.0f;
const float VIBRATION_THRESHOLD = 1.5f;

WebServer server(80);

// =====================================================
// Node Data Structure
// =====================================================
struct NodeData {
  String node_id = "--";

  // Values received from the working node firmware
  String voltage = "--";
  String rssi = "--";

  String ax = "--";
  String ay = "--";
  String az = "--";

  String gx = "--";
  String gy = "--";
  String gz = "--";

  String movement = "--";
  String mpu = "--";

  String vibration = "--";

  String distance = "--";
  String displacement = "--";

  String gas = "--";
  String count = "--";
  String status = "NO DATA";

  // Hardware Speaker Alert State
  bool speakerAlert = false;
  String alertMode = "NONE";

  unsigned long lastUpdate = 0;
  bool hasData = false;
};

NodeData node1;
NodeData node2;
NodeData node3;

unsigned long lastWifiCheck = 0;
unsigned long lastStatusPrint = 0;

// =====================================================
// Helpers
// =====================================================
bool hasArgNonEmpty(const char* name) {
  return server.hasArg(name) && server.arg(name).length() > 0;
}

bool isFresh(const NodeData& node) {
  return node.hasData &&
         node.lastUpdate > 0 &&
         (millis() - node.lastUpdate <= NODE_TIMEOUT_MS);
}

const char* localNodeId(int index) {
  switch (index) {
    case 0: return "NODE-001";
    case 1: return "NODE-002";
    default: return "NODE-003";
  }
}

const char* backendNodeId(int index) {
  switch (index) {
    case 0: return "NODE_01";
    case 1: return "NODE_02";
    default: return "NODE_03";
  }
}

NodeData& nodeRef(int index) {
  if (index == 0) return node1;
  if (index == 1) return node2;
  return node3;
}

String connectionText(const NodeData& node) {
  if (!node.hasData) return "WAITING";
  return isFresh(node) ? "CONNECTED" : "DISCONNECTED";
}

float toFloat(const String& s, bool& ok) {
  if (s == "--" || s.length() == 0) {
    ok = false;
    return 0.0f;
  }
  ok = true;
  return s.toFloat();
}

int toInt(const String& s, bool& ok) {
  if (s == "--" || s.length() == 0) {
    ok = false;
    return 0;
  }
  ok = true;
  return s.toInt();
}

void addCorsHeaders() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
}

void sendJson(int code, const String& body) {
  addCorsHeaders();
  server.send(code, "application/json", body);
}

void sendOptions() {
  addCorsHeaders();
  server.send(204, "text/plain", "");
}

// =====================================================
// Update from GET query parameters
// =====================================================
void updateNode(NodeData& node, const char* expectedId) {
  if (hasArgNonEmpty("node_id")) {
    node.node_id = server.arg("node_id");
  } else if (!node.hasData) {
    node.node_id = expectedId;
  }

  if (hasArgNonEmpty("voltage")) node.voltage = server.arg("voltage");
  if (hasArgNonEmpty("rssi")) node.rssi = server.arg("rssi");

  if (hasArgNonEmpty("ax")) node.ax = server.arg("ax");
  if (hasArgNonEmpty("ay")) node.ay = server.arg("ay");
  if (hasArgNonEmpty("az")) node.az = server.arg("az");

  if (hasArgNonEmpty("gx")) node.gx = server.arg("gx");
  if (hasArgNonEmpty("gy")) node.gy = server.arg("gy");
  if (hasArgNonEmpty("gz")) node.gz = server.arg("gz");

  if (hasArgNonEmpty("movement")) node.movement = server.arg("movement");
  if (hasArgNonEmpty("mpu")) node.mpu = server.arg("mpu");

  if (hasArgNonEmpty("vibration")) node.vibration = server.arg("vibration");

  if (hasArgNonEmpty("distance")) node.distance = server.arg("distance");
  if (hasArgNonEmpty("displacement")) node.displacement = server.arg("displacement");

  if (hasArgNonEmpty("gas")) node.gas = server.arg("gas");
  if (hasArgNonEmpty("count")) node.count = server.arg("count");

  if (hasArgNonEmpty("status")) {
    node.status = server.arg("status");
    node.status.trim();
    node.status.toUpperCase();
  }

  node.hasData = true;
  node.lastUpdate = millis();
}

// =====================================================
// Calculate derived MPU pitch / roll values
// =====================================================
void calculateDerivedMpu(const NodeData& node,
                         float& rollDeg,
                         float& pitchDeg,
                         int& tiltSensor,
                         float& mpuMovement) {
  rollDeg = 0.0f;
  pitchDeg = 0.0f;
  tiltSensor = 0;
  mpuMovement = 0.0f;

  bool okAx, okAy, okAz;
  float ax = toFloat(node.ax, okAx);
  float ay = toFloat(node.ay, okAy);
  float az = toFloat(node.az, okAz);

  if (!okAx || !okAy || !okAz) {
    bool okMovement;
    mpuMovement = toFloat(node.movement, okMovement);
    if (!okMovement) mpuMovement = 0.0f;
    return;
  }

  const float DEG_PER_RAD = 57.2957795f;

  rollDeg = atan2f(ay, az) * DEG_PER_RAD;
  pitchDeg = atan2f(-ax, sqrtf(ay * ay + az * az)) * DEG_PER_RAD;

  float totalAccel = sqrtf(ax * ax + ay * ay + az * az);
  mpuMovement = fabsf(totalAccel - 1.0f);

  tiltSensor = (fabsf(rollDeg) >= TILT_THRESHOLD_DEG || fabsf(pitchDeg) >= TILT_THRESHOLD_DEG) ? 1 : 0;
}

int derivedVibrationSensor(const NodeData& node) {
  bool ok;
  float v = toFloat(node.vibration, ok);
  if (!ok) return 0;

  if (v == 0.0f || v == 1.0f) return (int)v;
  return v >= VIBRATION_THRESHOLD ? 1 : 0;
}

String derivedStatus(const NodeData& node) {
  float rollDeg, pitchDeg, movement;
  int tiltSensor;

  calculateDerivedMpu(node, rollDeg, pitchDeg, tiltSensor, movement);
  int vibrationSensor = derivedVibrationSensor(node);

  if (node.status == "DANGER" || node.status == "CRITICAL" || (tiltSensor == 1 && vibrationSensor == 1)) {
    return "CRITICAL";
  }
  if (node.status == "WARNING" || tiltSensor == 1 || vibrationSensor == 1) {
    return "WARNING";
  }
  return "SAFE";
}

// =====================================================
// Forward telemetry to FastAPI backend & Parse Speaker Alert
// =====================================================
void forwardToBackend(int index) {
  NodeData& node = nodeRef(index);

  if (!isFresh(node)) {
    Serial.print("Backend POST skipped for ");
    Serial.print(localNodeId(index));
    Serial.println(" -> node is not connected.");
    return;
  }

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Backend POST skipped -> gateway Wi-Fi disconnected.");
    return;
  }

  JsonDocument doc;
  doc["node_id"] = backendNodeId(index);
  doc["node_id_local"] = node.node_id;
  doc["voltage"] = node.voltage;
  doc["rssi"] = node.rssi;
  doc["ax"] = node.ax;
  doc["ay"] = node.ay;
  doc["az"] = node.az;
  doc["gx"] = node.gx;
  doc["gy"] = node.gy;
  doc["gz"] = node.gz;
  doc["movement"] = node.movement;
  doc["mpu"] = node.mpu;
  doc["vibration_raw"] = node.vibration;
  doc["distance"] = node.distance;
  doc["displacement"] = node.displacement;
  doc["gas"] = node.gas;
  doc["count"] = node.count;
  doc["status"] = node.status;

  bool ok;
  if (node.voltage != "--") doc["potential_difference_v"] = toFloat(node.voltage, ok);
  if (node.rssi != "--") doc["signal_strength_dbm"] = toInt(node.rssi, ok);
  if (node.distance != "--") doc["ultrasonic_distance_cm"] = toFloat(node.distance, ok);
  if (node.displacement != "--") doc["displacement_cm"] = toFloat(node.displacement, ok);

  if (node.ax != "--") doc["accel_x_g"] = toFloat(node.ax, ok);
  if (node.ay != "--") doc["accel_y_g"] = toFloat(node.ay, ok);
  if (node.az != "--") doc["accel_z_g"] = toFloat(node.az, ok);

  if (node.gx != "--") doc["gyro_x_dps"] = toFloat(node.gx, ok);
  if (node.gy != "--") doc["gyro_y_dps"] = toFloat(node.gy, ok);
  if (node.gz != "--") doc["gyro_z_dps"] = toFloat(node.gz, ok);

  if (node.vibration != "--") doc["vibration"] = toFloat(node.vibration, ok);
  if (node.gas != "--") doc["gas_detection"] = toFloat(node.gas, ok);
  if (node.mpu != "--") doc["mpu_detection"] = toInt(node.mpu, ok);

  float rollDeg, pitchDeg, mpuMovement;
  int tiltSensor;
  calculateDerivedMpu(node, rollDeg, pitchDeg, tiltSensor, mpuMovement);

  doc["roll_deg"] = rollDeg;
  doc["pitch_deg"] = pitchDeg;
  doc["mpu_movement"] = mpuMovement;
  doc["tilt_sensor"] = tiltSensor;
  doc["tilt"] = tiltSensor;
  doc["vibration_sensor"] = derivedVibrationSensor(node);
  doc["communication_ok"] = true;
  doc["connection_status"] = "CONNECTED";

  String payload;
  serializeJson(doc, payload);

  Serial.println();
  Serial.println("---------------- BACKEND POST ----------------");
  Serial.print("Backend ID: ");
  Serial.println(backendNodeId(index));
  Serial.print("Payload: ");
  Serial.println(payload);
  Serial.println("------------------------------------------------");

  HTTPClient http;
  http.setTimeout(5000);
  http.begin(BACKEND_URL);
  http.addHeader("Content-Type", "application/json");

  int code = http.POST(payload);
  Serial.print("Backend HTTP Code: ");
  Serial.println(code);

  if (code > 0) {
    String response = http.getString();
    Serial.print("Backend Response: ");
    Serial.println(response);

    if (code >= 200 && code < 300) {
      Serial.println("✅ Actual telemetry accepted by backend.");
      
      // Parse backend response to check for AI ML Subsidence & Speaker Alert trigger
      JsonDocument respDoc;
      DeserializationError err = deserializeJson(respDoc, response);
      if (!err) {
        bool backendSpeakerAlert = respDoc["speaker_alert"] | false;
        const char* riskLevel = respDoc["risk_level"] | "NORMAL";
        node.speakerAlert = backendSpeakerAlert;

        if (backendSpeakerAlert || String(riskLevel) == "CRITICAL" || derivedStatus(node) == "CRITICAL") {
          node.alertMode = "DANGER";
        } else if (String(riskLevel) == "WARNING" || derivedStatus(node) == "WARNING") {
          node.alertMode = "WARNING";
        } else {
          node.alertMode = "NONE";
        }

        Serial.print("🔊 Speaker Alert Feedback -> Mode: ");
        Serial.println(node.alertMode);
      }
    } else {
      Serial.println("❌ Backend rejected telemetry.");
    }
  } else {
    Serial.print("❌ HTTP transport error: ");
    Serial.println(http.errorToString(code));
  }

  http.end();
}

// =====================================================
// Node GET request handler with Speaker Alert Feedback
// =====================================================
void handleNode(int index) {
  NodeData& node = nodeRef(index);

  if (server.method() != HTTP_GET) {
    sendJson(405, "{\"error\":\"Use GET query parameters\"}");
    return;
  }

  updateNode(node, localNodeId(index));
  forwardToBackend(index);

  String curStatus = derivedStatus(node);
  bool activeAlert = (curStatus != "SAFE") || node.speakerAlert;
  String activeMode = (curStatus == "CRITICAL" || node.speakerAlert) ? "DANGER" : (curStatus == "WARNING" ? "WARNING" : "NONE");

  JsonDocument response;
  response["success"] = true;
  response["node_id"] = node.node_id;
  response["connection"] = "CONNECTED";
  response["message"] = "ACTUAL NODE DATA RECEIVED";
  response["backend_forwarded"] = true;
  
  // Return Speaker Alert parameters to Node firmware
  response["speaker_alert"] = activeAlert;
  response["alert_mode"] = activeMode;
  response["trigger_beep"] = activeAlert;

  String output;
  serializeJson(response, output);
  sendJson(200, output);
}

void handleNode1() { handleNode(0); }
void handleNode2() { handleNode(1); }
void handleNode3() { handleNode(2); }

// =====================================================
// JSON API Endpoint (/api/data)
// =====================================================
void addNodeToJson(JsonObject obj, const NodeData& node, int index) {
  bool connected = isFresh(node);

  obj["node_id"] = node.node_id;
  obj["backend_id"] = backendNodeId(index);
  obj["connection"] = connectionText(node);
  obj["online"] = connected;
  obj["status"] = node.status;
  obj["last_update_ms"] = node.lastUpdate;

  if (!node.hasData) return;

  obj["voltage"] = node.voltage;
  obj["rssi"] = node.rssi;
  obj["ax"] = node.ax;
  obj["ay"] = node.ay;
  obj["az"] = node.az;
  obj["gx"] = node.gx;
  obj["gy"] = node.gy;
  obj["gz"] = node.gz;
  obj["movement"] = node.movement;
  obj["mpu"] = node.mpu;
  obj["vibration"] = node.vibration;
  obj["distance"] = node.distance;
  obj["displacement"] = node.displacement;
  obj["gas"] = node.gas;
  obj["count"] = node.count;

  float rollDeg, pitchDeg, mpuMovement;
  int tiltSensor;
  calculateDerivedMpu(node, rollDeg, pitchDeg, tiltSensor, mpuMovement);

  obj["roll_deg"] = rollDeg;
  obj["pitch_deg"] = pitchDeg;
  obj["tilt_sensor"] = tiltSensor;
  obj["mpu_movement"] = mpuMovement;
  obj["vibration_sensor"] = derivedVibrationSensor(node);

  // Speaker Alert Status
  obj["speaker_alert"] = node.speakerAlert || (derivedStatus(node) != "SAFE");
  obj["alert_mode"] = node.alertMode;
}

void handleAPI() {
  JsonDocument doc;
  JsonObject n1 = doc["node1"].to<JsonObject>();
  addNodeToJson(n1, node1, 0);

  JsonObject n2 = doc["node2"].to<JsonObject>();
  addNodeToJson(n2, node2, 1);

  JsonObject n3 = doc["node3"].to<JsonObject>();
  addNodeToJson(n3, node3, 2);

  String json;
  serializeJson(doc, json);
  sendJson(200, json);
}

// =====================================================
// Local Dashboard HTML Rendering
// =====================================================
String nodeCard(int number, const NodeData& node) {
  String html;
  bool connected = isFresh(node);

  html += "<div class='node'>";
  html += "<h2>NODE " + String(number) + "</h2>";
  html += "<h3>" + String(connected ? node.status : "OFFLINE") + "</h3>";
  html += "<p><b>Connection:</b> " + connectionText(node) + "</p>";

  if (!node.hasData) {
    html += "<p><b>No telemetry received.</b></p></div>";
    return html;
  }

  html += "<p><b>Node ID:</b> " + node.node_id + "</p>";
  html += "<p><b>Voltage:</b> " + node.voltage + " V</p>";
  html += "<p><b>RSSI:</b> " + node.rssi + " dBm</p><hr>";

  html += "<h4>MPU6050</h4>";
  html += "<p>AX: " + node.ax + " g | AY: " + node.ay + " g | AZ: " + node.az + " g</p>";
  html += "<p>GX: " + node.gx + " deg/s | GY: " + node.gy + " deg/s | GZ: " + node.gz + " deg/s</p>";
  html += "<p><b>Movement:</b> " + node.movement + " deg</p>";
  html += "<p><b>MPU:</b> " + node.mpu + " | <b>Vibration:</b> " + node.vibration + "</p><hr>";

  html += "<p><b>Distance:</b> " + node.distance + " cm</p>";
  html += "<p><b>Displacement:</b> " + node.displacement + " cm</p>";
  html += "<p><b>Gas Raw:</b> " + node.gas + "</p>";
  html += "<p><b>Speaker Alert:</b> " + String(node.speakerAlert || derivedStatus(node) != "SAFE" ? "🔊 ACTIVE (" + node.alertMode + ")" : "OFF") + "</p>";

  html += "</div>";
  return html;
}

void handleRoot() {
  String page = R"rawliteral(
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="refresh" content="2">
<title>BHURAKSHAK GATEWAY</title>
<style>
body { font-family:Arial; background:#0d1720; color:#fff; padding:20px; }
h1 { text-align:center; }
.info { text-align:center; margin-bottom:25px; color:#38bdf8; }
.container { display:grid; grid-template-columns:repeat(auto-fit,minmax(300px,1fr)); gap:20px; }
.node { background:#182632; padding:20px; border-radius:15px; border:1px solid #334155; }
.node h2,.node h3 { text-align:center; }
.node h3 { background:#243747; padding:10px; border-radius:8px; color:#f59e0b; }
hr { border:0; border-top:1px solid #405261; }
</style>
</head>
<body>
<h1>BHURAKSHAK GATEWAY</h1>
<div class="info">3-Node Mine Monitoring Gateway & Speaker Alert Bridge</div>
<div class="container">
)rawliteral";

  page += nodeCard(1, node1);
  page += nodeCard(2, node2);
  page += nodeCard(3, node3);

  page += R"rawliteral(
</div>
</body>
</html>
)rawliteral";

  server.send(200, "text/html", page);
}

// =====================================================
// Setup & WiFi Initialization
// =====================================================
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n================================================");
  Serial.println("       BHURAKSHAK 3-NODE MINE GATEWAY");
  Serial.println("================================================");
  Serial.println("Protocol: GET /node1 /node2 /node3");
  Serial.println("Speaker Alert Bridge: ENABLED");

  WiFi.mode(WIFI_AP_STA);
  WiFi.softAP(AP_SSID, AP_PASSWORD);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  server.on("/node1", HTTP_GET, handleNode1);
  server.on("/node2", HTTP_GET, handleNode2);
  server.on("/node3", HTTP_GET, handleNode3);
  server.on("/", HTTP_GET, handleRoot);
  server.on("/api/data", HTTP_GET, handleAPI);

  server.on("/node1", HTTP_OPTIONS, sendOptions);
  server.on("/node2", HTTP_OPTIONS, sendOptions);
  server.on("/node3", HTTP_OPTIONS, sendOptions);
  server.on("/api/data", HTTP_OPTIONS, sendOptions);

  server.begin();
  Serial.println("✅ HTTP GATEWAY SERVER STARTED");
}

void loop() {
  server.handleClient();
  unsigned long now = millis();

  if (now - lastWifiCheck >= WIFI_RECONNECT_MS) {
    lastWifiCheck = now;
    if (WiFi.status() != WL_CONNECTED) {
      WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    }
  }
}
