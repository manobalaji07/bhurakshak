from pydantic import BaseModel
from typing import Optional

class AlertResponse(BaseModel):
    alert_id: str
    node_id: str
    severity: str
    alert_type: str
    title: str
    message: str
    created_at: str
    acknowledged: bool
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[str] = None

class AlertAcknowledgeRequest(BaseModel):
    user_id: Optional[str] = "admin"
