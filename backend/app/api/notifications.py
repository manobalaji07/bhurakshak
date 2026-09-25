from fastapi import APIRouter, HTTPException, Depends, status
from typing import List

from app.db.store import db_store
from app.schemas.notifications import NotificationResponse
from app.auth.jwt import get_current_user

router = APIRouter(prefix="/api/v1/notifications", tags=["Notification Center"])

@router.get("", response_model=List[NotificationResponse])
async def get_notifications(limit: int = 50, current_user: dict = Depends(get_current_user)):
    """Returns user notifications based on user role."""
    role = current_user.get("role", "USER")
    return db_store.get_notifications(role=role, limit=limit)

@router.post("/{notification_id}/read")
async def mark_notification_read(notification_id: str):
    """Marks a notification as read."""
    success = db_store.mark_notification_read(notification_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found.")
    return {"success": True, "notification_id": notification_id}
