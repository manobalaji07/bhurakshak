import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from app.services.telemetry_service import telemetry_service

def test_telemetry_speaker_response():
    print("====================================================")
    print(" TESTING TELEMETRY SPEAKER RESPONSE & KINEMATICS")
    print("====================================================")

    # 1. Post normal reading
    normal_payload = {
        "node_id": "NODE_01",
        "timestamp": "2026-09-23T10:00:00Z",
        "roll_deg": 0.2,
        "pitch_deg": 0.1,
        "vibration": 0.2,
        "displacement_cm": 0.5,
        "status": "NORMAL"
    }
    res1 = telemetry_service.process_telemetry(normal_payload)
    print("1. Normal Telemetry Response:")
    print("   Speaker Alert:", res1.get("speaker_alert"))
    print("   Alert Mode:   ", res1.get("alert_mode"))
    print("   Kinematic:    ", res1.get("kinematic_projection"))
    assert res1.get("speaker_alert") == False
    assert res1.get("alert_mode") == "NONE"

    # 2. Post DANGER status (Critical Subsidence)
    danger_payload = {
        "node_id": "NODE_01",
        "timestamp": "2026-09-23T10:00:05Z",
        "roll_deg": 8.5,
        "pitch_deg": 6.2,
        "vibration": 5.5,
        "displacement_cm": 16.5,
        "status": "DANGER"
    }
    res2 = telemetry_service.process_telemetry(danger_payload)
    print("\n2. Critical Danger Telemetry Response:")
    print("   Speaker Alert:", res2.get("speaker_alert"))
    print("   Alert Mode:   ", res2.get("alert_mode"))
    print("   Kinematic:    ", res2.get("kinematic_projection"))
    assert res2.get("speaker_alert") == True
    assert res2.get("alert_mode") == "DANGER"

    print("\n[SUCCESS] TELEMETRY SERVICE SPEAKER RESPONSE TEST PASSED!")

if __name__ == "__main__":
    test_telemetry_speaker_response()
