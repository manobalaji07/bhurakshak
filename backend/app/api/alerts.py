from fastapi import APIRouter, HTTPException, Depends, status
from typing import List

from app.db.store import db_store
from app.schemas.alerts import AlertResponse, AlertAcknowledgeRequest
from app.auth.jwt import get_current_user

router = APIRouter(prefix="/api/v1/alerts", tags=["Alert System"])

@router.get("", response_model=List[AlertResponse])
async def list_alerts(limit: int = 50):
    """Returns list of active and historical alerts."""
    return db_store.get_alerts(limit=limit)

@router.get("/{alert_id}", response_model=AlertResponse)
async def get_alert_detail(alert_id: str):
    """Returns detail for a specific alert."""
    alerts = db_store.get_alerts(limit=200)
    for a in alerts:
        if a["alert_id"] == alert_id:
            return a
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found.")

@router.post("/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: str, body: AlertAcknowledgeRequest, current_user: dict = Depends(get_current_user)):
    """Admin / User alert acknowledgement."""
    user_id = current_user.get("username", body.user_id)
    success = db_store.acknowledge_alert(alert_id, user_id=user_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found or already acknowledged.")
    return {"success": True, "alert_id": alert_id, "acknowledged_by": user_id}
