import time
import math
import random
import requests
from datetime import datetime, timezone

BACKEND_URL = "http://localhost:8000/api/v1/telemetry"

def generate_node_reading(node_id: str, step: int, mode: str = "NORMAL") -> dict:
    ts = datetime.now(timezone.utc).isoformat()
    
    # Base baseline values
    base_dist = {"NODE_01": 45.0, "NODE_02": 42.0, "NODE_03": 48.0}[node_id]
    
    roll = random.uniform(-0.5, 0.5)
    pitch = random.uniform(-0.5, 0.5)
    vibration = random.uniform(0.1, 0.4)
    dist = base_dist + random.uniform(-0.2, 0.2)
    displacement = 0.0
    gas = 0.0

    if mode == "VIBRATION_SPIKE" and node_id == "NODE_02":
        vibration = random.uniform(3.5, 8.0)
        roll = random.uniform(2.5, 6.0)
        pitch = random.uniform(2.0, 5.0)
        dist += random.uniform(1.5, 4.0)
        displacement = random.uniform(0.8, 2.5)

    elif mode == "SUBSIDENCE" and node_id in ("NODE_01", "NODE_02"):
        roll = random.uniform(5.0, 12.0)
        pitch = random.uniform(4.0, 10.0)
        vibration = random.uniform(4.5, 9.5)
        dist += random.uniform(5.0, 15.0)
        displacement = random.uniform(3.0, 12.0)
        gas = 0.8

    return {
        "node_id": node_id,
        "timestamp": ts,
        "potential_difference_v": round(random.uniform(0.0, 0.05), 4),
        "signal_strength_dbm": random.randint(-68, -55),
        "ultrasonic_distance_cm": round(dist, 2),
        "accel_x_g": round(roll * 0.05 + random.uniform(-0.02, 0.02), 4),
        "accel_y_g": round(pitch * 0.05 + random.uniform(-0.02, 0.02), 4),
        "accel_z_g": round(0.98 + random.uniform(-0.01, 0.01), 4),
        "gyro_x_dps": round(roll * 0.5 + random.uniform(-0.1, 0.1), 2),
        "gyro_y_dps": round(pitch * 0.5 + random.uniform(-0.1, 0.1), 2),
        "gyro_z_dps": round(random.uniform(-0.05, 0.05), 2),
        "roll_deg": round(roll, 2),
        "pitch_deg": round(pitch, 2),
        "vibration": round(vibration, 2),
        "gas_detection": round(gas, 2),
        "displacement_cm": round(displacement, 2),
        "mpu_movement": round(vibration * 0.01, 3),
        "mpu_detection": 1 if vibration > 1.5 else 0,
        "communication_ok": True,
        "connection_status": "CONNECTED"
    }

def run_emulator():
    print("=" * 70)
    print(" BHURAKSHAK ESP32 GATEWAY TELEMETRY EMULATOR (HTTP REST)")
    print(" Target API:", BACKEND_URL)
    print(" Nodes     : NODE_01, NODE_02, NODE_03")
    print("=" * 70)
    
    print("\nSelect Simulation Scenario Mode:")
    print(" 1. Normal Stable Mine Operations")
    print(" 2. Vibration & Tilt Anomaly (NODE_02)")
    print(" 3. Node Dropout (NODE_03 offline)")
    print(" 4. Critical Subsidence Event Pattern (NODE_01 & NODE_02)")
    
    try:
        choice = input("\nEnter choice [1-4] (default 1): ").strip()
    except Exception:
        choice = "1"

    mode_map = {
        "1": "NORMAL",
        "2": "VIBRATION_SPIKE",
        "3": "NODE_DROPOUT",
        "4": "SUBSIDENCE"
    }
    mode = mode_map.get(choice, "NORMAL")
    print(f"\nRunning emulator in mode: [{mode}] at 1 Hz transmission rate...\nPress Ctrl+C to stop.\n")

    step = 0
    active_nodes = ["NODE_01", "NODE_02", "NODE_03"]
    if mode == "NODE_DROPOUT":
        active_nodes = ["NODE_01", "NODE_02"]

    while True:
        step += 1
        for nid in active_nodes:
            payload = generate_node_reading(nid, step, mode=mode)
            try:
                resp = requests.post(BACKEND_URL, json=payload, timeout=2.0)
                if resp.status_code == 200:
                    print(f"[{datetime.now().strftime('%H:%M:%S')}] HTTP 200 POST -> {nid} (Roll: {payload['roll_deg']}°, Vib: {payload['vibration']}g)")
                else:
                    print(f"[{datetime.now().strftime('%H:%M:%S')}] HTTP {resp.status_code} Error: {resp.text}")
            except Exception as err:
                print(f"[{datetime.now().strftime('%H:%M:%S')}] Connection Error: Could not reach {BACKEND_URL}. Is FastAPI running?")
        
        time.sleep(1.0)

if __name__ == "__main__":
    run_emulator()
