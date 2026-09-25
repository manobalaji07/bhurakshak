from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, Any, List, Optional

from app.db.store import db_store
from app.services.sms_service import sms_service

router = APIRouter()

class SendSmsRequest(BaseModel):
    node_id: Optional[str] = "GLOBAL"
    message: str
    recipient_phone: Optional[str] = None
    recipient_name: Optional[str] = None

class SmsConfigUpdate(BaseModel):
    provider: str = "SIMULATED"
    api_key: Optional[str] = ""
    account_sid: Optional[str] = ""
    from_number: Optional[str] = "+18005550199"
    auto_send_subsidence: bool = True

@router.get("/logs")
def get_sms_logs(limit: int = 50):
    return db_store.get_all_sms_logs(limit=limit)

@router.post("/send")
def send_sms_alert(req: SendSmsRequest):
    if not req.message or len(req.message.strip()) == 0:
        raise HTTPException(status_code=400, detail="Message content cannot be empty.")

    if req.recipient_phone:
        rec_name = req.recipient_name or "Registered User"
        log_res = sms_service.dispatch_sms(
            recipient_phone=req.recipient_phone,
            recipient_name=rec_name,
            message=req.message,
            node_id=req.node_id or "GLOBAL"
        )
        return {"success": True, "count": 1, "logs": [log_res]}
    else:
        logs = sms_service.send_custom_broadcast(
            node_id=req.node_id or "GLOBAL",
            message=req.message
        )
        return {"success": True, "count": len(logs), "logs": logs}

@router.get("/config")
def get_sms_config():
    return db_store.get_sms_config()

@router.post("/config")
def update_sms_config(cfg: SmsConfigUpdate):
    db_store.update_sms_config(
        provider=cfg.provider,
        api_key=cfg.api_key or "",
        account_sid=cfg.account_sid or "",
        from_number=cfg.from_number or "+18005550199",
        auto_send_subsidence=cfg.auto_send_subsidence
    )
    return {"success": True, "config": db_store.get_sms_config()}
