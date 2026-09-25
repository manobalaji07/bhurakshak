from fastapi import APIRouter, HTTPException, status
from typing import Dict, Any, List

from app.db.store import db_store

router = APIRouter(prefix="/api/v1/analytics", tags=["Analytics & Health"])

@router.get("/summary")
async def get_analytics_summary() -> Dict[str, Any]:
    """Returns top-level system metrics for Admin/User dashboards."""
    nodes = db_store.get_all_nodes()
    alerts = db_store.get_alerts(limit=100)
    notifs = db_store.get_notifications(limit=100)
    
    online_count = sum(1 for n in nodes if n["health_status"] == "ONLINE")
    warning_count = sum(1 for n in nodes if n["current_risk_level"] == "WARNING")
    critical_count = sum(1 for n in nodes if n["current_risk_level"] == "CRITICAL" or n["health_status"] == "OFFLINE")

    unread_notifs = sum(1 for n in notifs if not n["read"])
    unack_alerts = sum(1 for a in alerts if not a["acknowledged"])

    # Determine overall mine status
    if critical_count > 0:
        overall_status = "CRITICAL"
    elif warning_count > 0:
        overall_status = "ATTENTION"
    else:
        overall_status = "SAFE"

    # Ensure latest kinematic projections and speaker alert state are present for each node
    from app.services.kinematic_service import kinematic_service
    for n in nodes:
        node_id = n["node_id"]
        recent = db_store.get_recent_telemetry(node_id=node_id, limit=30)
        n["latest_kinematic_projection"] = kinematic_service.calculate_projection(recent)
        risk = n.get("current_risk_level", "NORMAL")
        ml_res = n.get("latest_ml_result") or {}
        n["speaker_alert"] = risk == "CRITICAL" or bool(ml_res.get("subsidence_detected"))
        n["alert_mode"] = "DANGER" if n["speaker_alert"] else ("WARNING" if risk == "WARNING" else "NONE")

    return {
        "overall_status": overall_status,
        "total_nodes": len(nodes),
        "online_nodes": online_count,
        "warning_nodes": warning_count,
        "critical_nodes": critical_count,
        "active_alerts_count": unack_alerts,
        "unread_notifications_count": unread_notifs,
        "nodes": nodes
    }

@router.get("/nodes/{node_id}")
async def get_node_trends(node_id: str, limit: int = 60) -> Dict[str, Any]:
    """Returns trend time-series data for a single node (tilt, vibration, distance, displacement, gas)."""
    raw_readings = db_store.get_recent_telemetry(node_id=node_id, limit=limit)
    raw_readings.reverse() # Chronological order

    timestamps = []
    roll = []
    pitch = []
    vibration = []
    distance = []
    displacement = []
    gas = []
    mpu_detection = []

    for r in raw_readings:
        ts = r.get("timestamp", "").split("T")[-1].replace("Z", "")[:8]
        timestamps.append(ts)
        roll.append(r.get("roll_deg", 0.0))
        pitch.append(r.get("pitch_deg", 0.0))
        vibration.append(r.get("vibration", 0.0))
        distance.append(r.get("ultrasonic_distance_cm", 0.0))
        displacement.append(r.get("displacement_cm", 0.0))
        gas.append(r.get("gas_detection", 0.0))
        mpu_detection.append(r.get("mpu_detection", 0))

    return {
        "node_id": node_id,
        "sample_count": len(raw_readings),
        "timestamps": timestamps,
        "series": {
            "roll_deg": roll,
            "pitch_deg": pitch,
            "vibration": vibration,
            "ultrasonic_distance_cm": distance,
            "displacement_cm": displacement,
            "gas_detection": gas,
            "mpu_detection": mpu_detection,
        }
    }
