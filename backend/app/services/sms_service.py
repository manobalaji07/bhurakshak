import logging
import uuid
import requests
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

from app.db.store import db_store

logger = logging.getLogger("bhurakshak.sms")

DEFAULT_RECIPIENTS = [
    {"name": "Col. R. Vardhan (Chief Geotech Dir)", "phone": "+91 9876543210"},
    {"name": "Field Supervisor Shift A", "phone": "+91 9123456789"},
    {"name": "Mine Safety Dispatch Center", "phone": "+91 9444012345"}
]

class SmsService:
    def __init__(self):
        pass

    def dispatch_sms(
        self,
        recipient_phone: str,
        recipient_name: str,
        message: str,
        node_id: str = "GLOBAL"
    ) -> Dict[str, Any]:
        """
        Dispatches an SMS message using the active SMS Gateway configuration
        and records an audit log entry in the SQLite database.
        """
        config = db_store.get_sms_config()
        provider = config.get("provider", "SIMULATED").upper()
        status = "DELIVERED"
        sms_id = f"SMS-{str(uuid.uuid4())[:8].upper()}"

        try:
            if provider == "TWILIO":
                sid = config.get("account_sid")
                token = config.get("api_key")
                from_num = config.get("from_number", "+18005550199")
                if sid and token:
                    url = f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json"
                    r = requests.post(
                        url,
                        data={"From": from_num, "To": recipient_phone, "Body": message},
                        auth=(sid, token),
                        timeout=5.0
                    )
                    if r.status_code in [200, 201]:
                        status = "DELIVERED"
                    else:
                        status = f"FAILED ({r.status_code})"
                        logger.error(f"Twilio SMS Error: {r.text}")
                else:
                    status = "SIMULATED (Missing Twilio Credentials)"

            elif provider == "FAST2SMS":
                api_key = config.get("api_key")
                if api_key:
                    url = "https://www.fast2sms.com/dev/bulkV2"
                    headers = {"authorization": api_key}
                    payload = {
                        "variables_values": message,
                        "route": "otp",
                        "numbers": recipient_phone.replace("+", "").replace(" ", "")
                    }
                    r = requests.post(url, json=payload, headers=headers, timeout=5.0)
                    if r.status_code == 200:
                        status = "DELIVERED"
                    else:
                        status = f"FAILED ({r.status_code})"
                else:
                    status = "SIMULATED (Missing Fast2SMS Key)"

            else:
                # Production Simulator / Live Mock Gateway
                status = "DELIVERED (Gateway Simulator)"

        except Exception as e:
            logger.error(f"Error dispatching SMS to {recipient_phone}: {e}")
            status = f"FAILED ({str(e)[:30]})"

        # Log entry to database
        log_entry = {
            "id": sms_id,
            "recipient_phone": recipient_phone,
            "recipient_name": recipient_name,
            "message": message,
            "status": status,
            "node_id": node_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "provider": provider
        }
        db_store.save_sms_log(log_entry)
        logger.info(f"SMS Alert [{sms_id}] dispatched to {recipient_name} ({recipient_phone}) - Status: {status}")

        return log_entry

    def send_subsidence_sms_alert(
        self,
        node_id: str,
        subsidence_probability: float,
        scenario_context: str
    ) -> List[Dict[str, Any]]:
        """
        Triggered automatically when the AI ML pipeline detects a ground subsidence pattern.
        Dispatches emergency SMS alerts to all registered mine safety personnel.
        """
        config = db_store.get_sms_config()
        if not config.get("auto_send_subsidence", True):
            logger.info(f"Auto-SMS dispatch is disabled in configuration. Skipping SMS for {node_id}.")
            return []

        message = (
            f"BHURAKSHAK EMERGENCY ALERT: Ground Subsidence Pattern Detected on Mesh Node {node_id}. "
            f"AI Probability: {subsidence_probability*100:.1f}%, Scenario: {scenario_context}. "
            f"Immediate evacuation & field inspection required!"
        )

        sent_logs = []
        for rec in DEFAULT_RECIPIENTS:
            log_res = self.dispatch_sms(
                recipient_phone=rec["phone"],
                recipient_name=rec["name"],
                message=message,
                node_id=node_id
            )
            sent_logs.append(log_res)

        return sent_logs

    def send_custom_broadcast(
        self,
        node_id: str,
        message: str,
        recipients: Optional[List[Dict[str, str]]] = None
    ) -> List[Dict[str, Any]]:
        """
        Triggered manually by an Admin from the Dashboard or Alerts panel.
        """
        target_recipients = recipients or DEFAULT_RECIPIENTS
        sent_logs = []
        for rec in target_recipients:
            log_res = self.dispatch_sms(
                recipient_phone=rec["phone"],
                recipient_name=rec["name"],
                message=message,
                node_id=node_id
            )
            sent_logs.append(log_res)
        return sent_logs

sms_service = SmsService()
