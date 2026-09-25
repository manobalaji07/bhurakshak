from fastapi import APIRouter, HTTPException, status
from typing import List, Dict, Any

from app.db.store import db_store
from app.schemas.nodes import NodeResponse

from app.services.kinematic_service import kinematic_service

router = APIRouter(prefix="/api/v1/nodes", tags=["Node State"])

@router.get("")
async def get_all_nodes():
    """Returns the current state of all three surface sensor nodes (NODE_01, NODE_02, NODE_03)."""
    nodes = db_store.get_all_nodes()
    for n in nodes:
        node_id = n["node_id"]
        recent = db_store.get_recent_telemetry(node_id=node_id, limit=30)
        n["latest_kinematic_projection"] = kinematic_service.calculate_projection(recent)
        risk = n.get("current_risk_level", "NORMAL")
        ml_res = n.get("latest_ml_result") or {}
        n["speaker_alert"] = risk == "CRITICAL" or bool(ml_res.get("subsidence_detected"))
        n["alert_mode"] = "DANGER" if n["speaker_alert"] else ("WARNING" if risk == "WARNING" else "NONE")
    return nodes

@router.get("/{node_id}")
async def get_node_details(node_id: str, limit: int = 50) -> Dict[str, Any]:
    """Returns current state and recent historical telemetry readings for a specific node."""
    node = db_store.get_node(node_id)
    if not node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Node {node_id} not found."
        )
    
    recent_history = db_store.get_recent_telemetry(node_id=node_id, limit=limit)
    kinematic_proj = kinematic_service.calculate_projection(recent_history[:30])
    risk = node.get("current_risk_level", "NORMAL")
    ml_res = node.get("latest_ml_result") or {}
    node["latest_kinematic_projection"] = kinematic_proj
    node["speaker_alert"] = risk == "CRITICAL" or bool(ml_res.get("subsidence_detected"))
    node["alert_mode"] = "DANGER" if node["speaker_alert"] else ("WARNING" if risk == "WARNING" else "NONE")

    return {
        "node": node,
        "recent_history": recent_history,
        "kinematic_projection": kinematic_proj
    }
