# Connecting Physical ESP32 Hardware Gateway to BhuRakshak

This guide explains how to connect a physical **ESP32 microcontroller** with **MPU6050** and **HC-SR04 ultrasonic sensors** to send real live telemetry to the BhuRakshak platform.

---

## 1. Hardware Pin & Wiring Connections

| Component | Component Pin | ESP32 Pin | Notes |
| :--- | :--- | :--- | :--- |
| **MPU6050 (IMU)** | VCC | 3.3V or 5V | Power supply |
| | GND | GND | Ground |
| | SCL | GPIO 22 | I2C Clock |
| | SDA | GPIO 21 | I2C Data |
| **HC-SR04 (Ultrasonic)** | VCC | 5V | Power supply |
| | GND | GND | Ground |
| | TRIG | GPIO 5 | Ultrasonic Trigger |
| | ECHO | GPIO 18 | Ultrasonic Echo |

---

## 2. Step-by-Step Setup Instructions

### Step 1: Find your Host Computer's Local IP Address
1. Open PowerShell or Command Prompt on the computer running BhuRakshak backend.
2. Run:
   ```powershell
   ipconfig
   ```
3. Look for **IPv4 Address** under your Wi-Fi or Ethernet adapter (e.g., `192.168.1.100`).

---

### Step 2: Open & Configure Arduino C++ Sketch
1. Open [`hardware/esp32_gateway/esp32_gateway.ino`](file:///d:/projects/bhurakshak_antigravity/hardware/esp32_gateway/esp32_gateway.ino) in Arduino IDE.
2. Update the configuration constants at the top of the file:
   ```cpp
   const char* WIFI_SSID     = "YOUR_WIFI_NAME";        // Your Wi-Fi network SSID
   const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";    // Your Wi-Fi network password
   
   // Replace with your PC's IPv4 address from Step 1
   const char* BACKEND_URL   = "http://192.168.1.100:8000/api/v1/telemetry";
   
   // Set to NODE_01, NODE_02, or NODE_03
   const char* NODE_ID       = "NODE_01";
   ```

---

### Step 3: Install Required Arduino Libraries
In Arduino IDE, open **Tools -> Manage Libraries** (`Ctrl+Shift+I`) and install:
- `ArduinoJson` (by Benoit Blanchon)
- `Adafruit MPU6050` (by Adafruit)
- `Adafruit Unified Sensor` (by Adafruit)

---

### Step 4: Flash ESP32 & Verify Serial Output
1. Connect ESP32 to computer via USB cable.
2. Select Board: **ESP32 Dev Module** (or your ESP32 model).
3. Select Port: (e.g., `COM3`, `COM4`).
4. Click **Upload** (`Ctrl+U`).
5. Open **Serial Monitor** at `115200` baud rate:
   ```text
   ==================================================
    BHURAKSHAK ESP32 SENSOR GATEWAY INITIALIZATION
   ==================================================
   ✅ MPU6050 Sensor initialized successfully.
   Connecting to Wi-Fi SSID: MyHomeWiFi...
   ✅ Wi-Fi Connected!
   ESP32 Local IP Address: 192.168.1.105
   Target Backend URL: http://192.168.1.100:8000/api/v1/telemetry

   ✅ HTTP 200 POST -> NODE_01 | Roll: 1.2° | Pitch: -0.5° | Dist: 45.1 cm | Vib: 0.18g
   ```

---

### Step 5: View Live Hardware Telemetry on Dashboard

1. Launch BhuRakshak (`run_all.bat`).
2. Open Dashboard at `http://localhost:5173`.
3. In the Dashboard:
   - **Heartbeat & Status**: The node state for `NODE_01` immediately switches from `OFFLINE` / `NO_DATA` to **`ONLINE`**!
   - **Real-Time Data**: Physical movement, tilting, or tapping on the MPU6050 sensor will update roll/pitch/vibration values live on the screen!
   - **AI/ML Inference**: After 30 seconds of live sensor streaming (~30 samples), the AI inference engine runs automatically on your actual hardware readings!
