from pydantic import BaseModel
from typing import Optional, Dict, Any, List

class NodeResponse(BaseModel):
    node_id: str
    name: str
    spatial_x: float
    spatial_y: float
    spatial_z: float
    health_status: str
    connection_status: str
    communication_ok: bool
    last_seen: Optional[str] = None
    signal_strength_dbm: int = -65
    current_risk_level: str = "NORMAL"
    latest_reading: Dict[str, Any] = {}
    latest_ml_result: Optional[Dict[str, Any]] = None
    buffered_samples: int = 0
