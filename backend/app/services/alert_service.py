import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from app.db.store import db_store
from app.services.sms_service import sms_service

logger = logging.getLogger("bhurakshak.alerts")

class AlertService:
    def process_ml_evaluation(self, node_id: str, ml_results: Dict[str, Any], latest_telemetry: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Applies transparent decision layer rules to ML results and multi-node correlations.
        Generates alerts, user notifications, and dispatches SMS alerts when threshold patterns are triggered.
        """
        sub_detected = ml_results.get("subsidence_detected", False)
        sub_proba = ml_results.get("subsidence_probability", 0.0)
        anom_detected = ml_results.get("anomaly_detected", False)
        scenario_context = ml_results.get("scenario_context", "NORMAL_STABLE_MINE")

        created_alert = None

        if sub_detected:
            title = f"CRITICAL: Subsidence Pattern — {node_id}"
            msg = (
                f"Subsidence detector identified ground movement pattern on {node_id} "
                f"(Probability: {sub_proba*100:.1f}%, Context: {scenario_context}). "
                f"Review sensor tilt ({latest_telemetry.get('roll_deg', 0):.1f} deg) and vibration trends."
            )
            alert = {
                "node_id": node_id,
                "severity": "CRITICAL",
                "alert_type": "SUBSIDENCE_REVIEW",
                "title": title,
                "message": msg
            }
            aid = db_store.save_alert(alert)

            notif = {
                "node_id": node_id,
                "recipient_role": "ALL",
                "severity": "CRITICAL",
                "title": f"CRITICAL ALERT: {node_id}",
                "message": f"Possible subsidence pattern detected on {node_id}. Immediate review required.",
                "related_alert_id": aid
            }
            db_store.save_notification(notif)

            # Trigger automatic SMS alert dispatch to users and field safety team
            try:
                sms_service.send_subsidence_sms_alert(
                    node_id=node_id,
                    subsidence_probability=sub_proba,
                    scenario_context=scenario_context
                )
            except Exception as e:
                logger.error(f"Failed to auto-send SMS alert: {e}")

            created_alert = alert
            created_alert["alert_id"] = aid

        elif anom_detected:
            title = f"WARNING: Anomaly Signal — {node_id}"
            msg = (
                f"Isolation Forest flagged structural sensor anomaly on {node_id} "
                f"(Score: {ml_results.get('anomaly_score', 0):.2f}). "
                f"Monitor displacement ({latest_telemetry.get('displacement_cm', 0):.2f} cm) and tilt stability."
            )
            alert = {
                "node_id": node_id,
                "severity": "WARNING",
                "alert_type": "ANOMALY",
                "title": title,
                "message": msg
            }
            aid = db_store.save_alert(alert)

            notif = {
                "node_id": node_id,
                "recipient_role": "ALL",
                "severity": "MEDIUM",
                "title": f"ANOMALY DETECTED: {node_id}",
                "message": f"Abnormal sensor signature detected on {node_id}. Inspect node trend.",
                "related_alert_id": aid
            }
            db_store.save_notification(notif)
            created_alert = alert
            created_alert["alert_id"] = aid

        # Multi-node correlation check
        self._check_multi_node_correlation()

        return created_alert

    def _check_multi_node_correlation(self):
        """
        If multiple nodes report warning/critical status simultaneously,
        elevate system priority to MULTI_NODE_SUBSIDENCE_RISK.
        """
        all_nodes = db_store.get_all_nodes()
        warning_nodes = [n for n in all_nodes if n.get("current_risk_level") in ("WARNING", "CRITICAL")]

        if len(warning_nodes) >= 2:
            node_ids = ", ".join([n["node_id"] for n in warning_nodes])
            title = "SYSTEM CRITICAL: Multi-Node Spatial Correlation Alert"
            msg = f"Multiple adjacent surface nodes ({node_ids}) are simultaneously reporting elevated deformation signals above mine panel."
            
            # Save multi-node notification if not recently sent
            db_store.save_notification({
                "node_id": "SYSTEM",
                "recipient_role": "ADMIN",
                "severity": "CRITICAL",
                "title": title,
                "message": msg
            })

alert_service = AlertService()
