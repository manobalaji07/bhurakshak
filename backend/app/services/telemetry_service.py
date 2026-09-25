import logging
from typing import Dict, Any
from collections import defaultdict, deque

from app.db.store import db_store
from app.ml.inference import ml_engine
from app.services.node_health_service import node_health_service
from app.services.alert_service import alert_service
from app.services.kinematic_service import kinematic_service

logger = logging.getLogger("bhurakshak.telemetry")

WINDOW_SIZE = 30


class TelemetryService:
    def __init__(self):
        # 30-sample rolling buffer per node.
        self.node_buffers: Dict[str, deque] = defaultdict(
            lambda: deque(maxlen=WINDOW_SIZE)
        )

    def _normalize_payload(self, raw: Dict[str, Any]) -> Dict[str, Any]:
        """
        Normalize and remap gateway telemetry fields.

        Handles both naming conventions:
          - Original emulator: accel_x_g, gyro_x_dps, ultrasonic_distance_cm ...
          - New multi-node gateway: ax, ay, az, gx, gy, gz, distance, gas, rssi, voltage ...

        Also handles:
          - String values ("1.019", "-53") — Pydantic coerces before this, but we clean extras
          - '--' sentinel values for disconnected nodes → raises ValueError to reject the payload
          - negative displacement_cm (stored as-is; kinematic service uses abs value internally)
        """
        data = dict(raw)

        # ------------------------------------------------------------------
        # Guard: reject payloads from disconnected nodes (node_id == "--")
        # The gateway only calls forwardToBackend when isFresh() is true,
        # but add this safety net for edge cases.
        # ------------------------------------------------------------------
        raw_nid = str(data.get("node_id") or "").strip()
        if not raw_nid or raw_nid in ("--", "null", "None", ""):
            raise ValueError(f"Rejected telemetry: node_id is '{raw_nid}' (disconnected node)")

        # ------------------------------------------------------------------
        # Node ID normalization → NODE_01 / NODE_02 / NODE_03
        # ------------------------------------------------------------------
        raw_nid_upper = raw_nid.upper().replace("-", "_")

        if "NODE_001" in raw_nid_upper or "NODE1" in raw_nid_upper or "NODE_1" in raw_nid_upper:
            data["node_id"] = "NODE_01"
        elif "NODE_002" in raw_nid_upper or "NODE2" in raw_nid_upper or "NODE_2" in raw_nid_upper:
            data["node_id"] = "NODE_02"
        elif "NODE_003" in raw_nid_upper or "NODE3" in raw_nid_upper or "NODE_3" in raw_nid_upper:
            data["node_id"] = "NODE_03"
        else:
            data["node_id"] = raw_nid_upper

        # ------------------------------------------------------------------
        # Clean '--' sentinel strings from any remaining fields (extra fields
        # not caught by Pydantic validators, e.g., raw_json extras like movement)
        # ------------------------------------------------------------------
        SENTINEL = {"--", "null", "None", "NaN", "nan"}
        for k, v in list(data.items()):
            if isinstance(v, str) and v.strip() in SENTINEL:
                data[k] = None

        # ------------------------------------------------------------------
        # Field remapping — gateway short names → canonical backend names
        # Only remaps if the canonical name is not already present (or is None).
        # ------------------------------------------------------------------
        float_field_map = {
            "ax":           "accel_x_g",
            "ay":           "accel_y_g",
            "az":           "accel_z_g",
            "gx":           "gyro_x_dps",
            "gy":           "gyro_y_dps",
            "gz":           "gyro_z_dps",
            "distance":     "ultrasonic_distance_cm",
            "displacement": "displacement_cm",
            "gas":          "gas_detection",
            "rssi":         "signal_strength_dbm",
            "voltage":      "potential_difference_v",
        }
        for src, dst in float_field_map.items():
            if data.get(src) is not None and not data.get(dst):
                data[dst] = data[src]

        # movement → mpu_movement (if mpu_movement not present)
        if data.get("mpu_movement") is None and data.get("movement") is not None:
            data["mpu_movement"] = data["movement"]

        # mpu / tilt_sensor → mpu_detection
        if data.get("mpu_detection") is None:
            for src in ("tilt_sensor", "mpu"):
                val = data.get(src)
                if val is not None:
                    try:
                        data["mpu_detection"] = int(float(val))
                    except (ValueError, TypeError):
                        data["mpu_detection"] = 0
                    break

        # displacement_cm may be negative (node tracks delta from a baseline).
        # Store raw value; kinematic service uses abs() for rate calculations.

        return data


    def process_telemetry(self, raw_telemetry: Dict[str, Any]) -> Dict[str, Any]:
        # Preserve actual incoming telemetry.
        raw_telemetry = self._normalize_payload(raw_telemetry)
        node_id = raw_telemetry.get("node_id", "NODE_01")

        # Save the exact received payload to the database.
        db_store.save_telemetry(raw_telemetry)

        # Append exact telemetry to the rolling ML buffer.
        self.node_buffers[node_id].append(raw_telemetry)
        buffer_len = len(self.node_buffers[node_id])

        ml_result = None
        risk_level = "NORMAL"

        # ML sees actual incoming telemetry after 30 samples.
        if buffer_len >= WINDOW_SIZE:
            window_samples = list(self.node_buffers[node_id])
            ml_result = ml_engine.evaluate_window(window_samples)

            if ml_result.get("subsidence_detected"):
                risk_level = "CRITICAL"
            elif ml_result.get("anomaly_detected"):
                risk_level = "WARNING"

            db_store.save_feature_window({
                "node_id": node_id,
                "sample_count": WINDOW_SIZE,
                "subsidence_prediction": ml_result.get(
                    "subsidence_label", "NO_SUBSIDENCE"
                ),
                "subsidence_probability": ml_result.get(
                    "subsidence_probability", 0.0
                ),
                "anomaly_prediction": ml_result.get(
                    "anomaly_label", "NORMAL"
                ),
                "anomaly_score": ml_result.get("anomaly_score", 0.0),
                "scenario_context": ml_result.get(
                    "scenario_context", "NORMAL_MINE"
                ),
                "features": ml_result.get("extracted_features", {}),
            })

            alert_service.process_ml_evaluation(
                node_id,
                ml_result,
                raw_telemetry,
            )

        # Check raw status for immediate threshold breaches
        raw_status = str(raw_telemetry.get("status", "")).upper()
        if raw_status in ("DANGER", "CRITICAL"):
            risk_level = "CRITICAL"
        elif raw_status == "WARNING" and risk_level == "NORMAL":
            risk_level = "WARNING"

        # Compute Kinematic Projection
        recent_samples = list(self.node_buffers[node_id])
        kinematic_proj = kinematic_service.calculate_projection(recent_samples)

        # Check Speaker Alert state
        subsidence_detected = bool(ml_result.get("subsidence_detected")) if ml_result else (risk_level == "CRITICAL")
        speaker_alert = subsidence_detected or (risk_level == "CRITICAL")
        alert_mode = "DANGER" if speaker_alert else ("WARNING" if risk_level == "WARNING" else "NONE")

        updated_node = node_health_service.evaluate_node_health(
            node_id,
            raw_telemetry,
            risk_level=risk_level,
            ml_result=ml_result,
        )

        # Attach kinematic projection & speaker alert to node state object
        if isinstance(updated_node, dict):
            updated_node["latest_kinematic_projection"] = kinematic_proj
            updated_node["speaker_alert"] = speaker_alert
            updated_node["alert_mode"] = alert_mode

        return {
            "success": True,
            "node_id": node_id,
            "buffered_samples": buffer_len,
            "window_complete": buffer_len >= WINDOW_SIZE,
            "node_state": updated_node,
            "ml_results": ml_result,
            "subsidence_detected": subsidence_detected,
            "speaker_alert": speaker_alert,
            "risk_level": risk_level,
            "alert_mode": alert_mode,
            "kinematic_projection": kinematic_proj
        }


telemetry_service = TelemetryService()

