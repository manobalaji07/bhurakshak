import sys
import os
import time

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.db.store import db_store
from app.ml.feature_extractor import FeatureExtractor
from app.ml.inference import ml_engine
from app.services.telemetry_service import telemetry_service
from app.services.node_health_service import node_health_service

def test_full_pipeline():
    print("=" * 70)
    print(" TESTING BHURAKSHAK BACKEND & ML PIPELINE")
    print("=" * 70)

    # 1. Test Node Initialization in Database
    nodes = db_store.get_all_nodes()
    print(f"\n[1] Database Initialized Nodes ({len(nodes)} total):")
    for n in nodes:
        print(f"    - {n['node_id']}: {n['name']} (Health: {n['health_status']})")
    assert len(nodes) == 3, "Expected 3 nodes (NODE_01, NODE_02, NODE_03)"

    # 2. Test 30-sample Telemetry Window Ingestion
    print("\n[2] Ingesting 30 telemetry samples for NODE_01...")
    result = None
    for i in range(30):
        sample = {
            "node_id": "NODE_01",
            "timestamp": f"2026-09-19T14:30:{i:02d}Z",
            "potential_difference_v": 0.01,
            "signal_strength_dbm": -60,
            "ultrasonic_distance_cm": 45.2,
            "accel_x_g": 0.02,
            "accel_y_g": 0.01,
            "accel_z_g": 0.98,
            "gyro_x_dps": 0.1,
            "gyro_y_dps": 0.1,
            "gyro_z_dps": 0.05,
            "roll_deg": 1.2,
            "pitch_deg": 0.8,
            "vibration": 0.25,
            "gas_detection": 0.0,
            "displacement_cm": 0.0,
            "mpu_movement": 0.01,
            "mpu_detection": 0,
            "communication_ok": True,
            "connection_status": "CONNECTED"
        }
        result = telemetry_service.process_telemetry(sample)

    print(f"\n[3] Ingestion Result:")
    print(f"    - Buffered samples: {result['buffered_samples']}")
    print(f"    - Window complete: {result['window_complete']}")

    ml_res = result["ml_results"]
    assert ml_res is not None, "ML evaluation should run on 30th sample"
    print(f"\n[4] ML Inference Result:")
    print(f"    - Subsidence Detection: {ml_res['subsidence_label']} (Prob: {ml_res['subsidence_probability']})")
    print(f"    - Isolation Forest Anomaly: {ml_res['anomaly_label']} (Score: {ml_res['anomaly_score']})")
    print(f"    - 20-Class Scenario Context: {ml_res['scenario_context']}")
    print(f"    - Features Computed: {len(ml_res['extracted_features'])} features")

    assert len(ml_res["extracted_features"]) == 136, f"Expected 136 feature columns, got {len(ml_res['extracted_features'])}"

    # 5. Check Database Telemetry History
    history = db_store.get_recent_telemetry(node_id="NODE_01", limit=50)
    print(f"\n[5] Database Saved Records:")
    print(f"    - NODE_01 Telemetry Records in DB: {len(history)}")
    assert len(history) >= 30, "Database should contain saved telemetry records"

    print("\n" + "=" * 70)
    print(" ALL BACKEND & ML TESTS PASSED PERFECTLY!")
    print("=" * 70)

if __name__ == "__main__":
    test_full_pipeline()
