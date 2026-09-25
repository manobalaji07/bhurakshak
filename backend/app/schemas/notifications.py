from pydantic import BaseModel
from typing import Optional

class NotificationResponse(BaseModel):
    notification_id: str
    node_id: str
    recipient_role: str
    severity: str
    title: str
    message: str
    created_at: str
    read: bool
    related_alert_id: Optional[str] = None
