import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from app.services.kinematic_service import kinematic_service

def test_kinematic_service():
    print("====================================================")
    print(" TESTING KINEMATIC PROJECTION MODEL SERVICE")
    print("====================================================")

    # Test Case 1: Empty history
    proj1 = kinematic_service.calculate_projection([])
    print("1. Empty history projection:")
    print("  ", proj1)
    assert proj1["status_code"] == "NO_DATA"

    # Test Case 2: Insufficient samples (< 3)
    history_short = [
        {"timestamp": "2026-09-23T10:00:00Z", "displacement_cm": 1.2, "roll_deg": 0.5, "pitch_deg": 0.2},
        {"timestamp": "2026-09-23T10:00:01Z", "displacement_cm": 1.3, "roll_deg": 0.6, "pitch_deg": 0.2}
    ]
    proj2 = kinematic_service.calculate_projection(history_short)
    print("\n2. Short history projection (< 3 samples):")
    print("  ", proj2)
    assert proj2["status_code"] == "INSUFFICIENT_DATA"

    # Test Case 3: Steady linear acceleration approaching threshold (Displacement)
    # Start at 5.0 mm, increasing by 1.0 mm every 10 seconds (360 mm / hour rate)
    # Target 15.0 mm limit -> remaining 10.0 mm -> ~0.028 hours (1.6 mins)
    base_ts = 1758620000
    from datetime import datetime, timezone
    history_linear = []
    for i in range(10):
        ts_str = datetime.fromtimestamp(base_ts + i * 10, timezone.utc).isoformat()
        history_linear.append({
            "timestamp": ts_str,
            "displacement_cm": 5.0 + i * 1.0,
            "roll_deg": 0.5,
            "pitch_deg": 0.5
        })
    proj3 = kinematic_service.calculate_projection(history_linear)
    print("\n3. Steady linear trend approaching threshold:")
    print("  ", proj3)
    assert proj3["threshold_driver"] == "Displacement"
    assert proj3["model_confidence_pct"] >= 95.0
    assert proj3["status_code"] in ("PROJECTED", "EXCEEDED")

    # Test Case 4: Exceeded threshold (Displacement = 18.0 mm > 15.0 mm)
    history_exceeded = [
        {"timestamp": "2026-09-23T10:00:00Z", "displacement_cm": 14.0, "roll_deg": 1.0, "pitch_deg": 1.0},
        {"timestamp": "2026-09-23T10:00:05Z", "displacement_cm": 16.0, "roll_deg": 1.0, "pitch_deg": 1.0},
        {"timestamp": "2026-09-23T10:00:10Z", "displacement_cm": 18.0, "roll_deg": 1.0, "pitch_deg": 1.0}
    ]
    proj4 = kinematic_service.calculate_projection(history_exceeded)
    print("\n4. Exceeded threshold projection:")
    print("  ", proj4)
    assert proj4["status_code"] == "EXCEEDED"
    assert proj4["time_to_threshold_hours"] == 0.0

    # Test Case 5: Stable / flat trend (No projected crossing)
    history_stable = [
        {"timestamp": f"2026-09-23T10:00:0{i}Z", "displacement_cm": 1.2, "roll_deg": 0.1, "pitch_deg": 0.1}
        for i in range(5)
    ]
    proj5 = kinematic_service.calculate_projection(history_stable)
    print("\n5. Stable flat trend projection:")
    print("  ", proj5)
    assert proj5["status_code"] == "NO_CROSSING"

    print("\n[SUCCESS] ALL KINEMATIC SERVICE UNIT TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_kinematic_service()
