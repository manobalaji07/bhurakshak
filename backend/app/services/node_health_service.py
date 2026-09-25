import time
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List

from app.config import settings
from app.db.store import db_store

logger = logging.getLogger("bhurakshak.node_health")

class NodeHealthService:
    def __init__(self):
        self.timeout_seconds = settings.NODE_OFFLINE_TIMEOUT_SECONDS

    def evaluate_node_health(self, node_id: str, latest_telemetry: Dict[str, Any], risk_level: str = "NORMAL", ml_result: Any = None) -> Dict[str, Any]:
        """
        Evaluates current node health based on incoming telemetry and communication status.
        """
        comm_ok = bool(latest_telemetry.get("communication_ok", True))
        conn_status = latest_telemetry.get("connection_status", "CONNECTED")

        if not comm_ok or conn_status == "DISCONNECTED":
            health = "OFFLINE"
        elif conn_status == "DEGRADED":
            health = "DEGRADED"
        else:
            health = "ONLINE"

        db_store.update_node_state(
            node_id=node_id,
            health_status=health,
            connection_status=conn_status,
            communication_ok=comm_ok,
            latest_telemetry=latest_telemetry,
            risk_level=risk_level,
            ml_result=ml_result
        )

        return db_store.get_node(node_id)

    def check_all_nodes_timeout(self) -> List[Dict[str, Any]]:
        """
        Periodically called by background monitor task to detect missing heartbeats.
        If a node hasn't sent telemetry within timeout, marks it OFFLINE.
        """
        nodes = db_store.get_all_nodes()
        now = datetime.now(timezone.utc)
        updated_nodes = []

        for node in nodes:
            last_seen_str = node.get("last_seen")
            if not last_seen_str:
                continue

            try:
                last_seen_dt = datetime.fromisoformat(last_seen_str)
                if last_seen_dt.tzinfo is None:
                    last_seen_dt = last_seen_dt.replace(tzinfo=timezone.utc)
                
                age_seconds = (now - last_seen_dt).total_seconds()
                
                if age_seconds > self.timeout_seconds and node["health_status"] != "OFFLINE":
                    logger.warning(f"Node {node['node_id']} timeout ({age_seconds:.1f}s > {self.timeout_seconds}s). Marking OFFLINE.")
                    
                    db_store.update_node_state(
                        node_id=node["node_id"],
                        health_status="OFFLINE",
                        connection_status="DISCONNECTED",
                        communication_ok=False,
                        latest_telemetry=node.get("latest_reading", {}),
                        risk_level="CRITICAL"
                    )
                    
                    # Generate NODE_OFFLINE alert & notification
                    alert = {
                        "node_id": node["node_id"],
                        "severity": "CRITICAL",
                        "alert_type": "NODE_OFFLINE",
                        "title": f"{node['node_id']} Heartbeat Lost",
                        "message": f"Sensor node {node['node_id']} has stopped sending HTTP telemetry ({age_seconds:.1f}s timeout)."
                    }
                    aid = db_store.save_alert(alert)

                    notif = {
                        "node_id": node["node_id"],
                        "recipient_role": "ALL",
                        "severity": "CRITICAL",
                        "title": f"NODE OFFLINE: {node['node_id']}",
                        "message": f"Communication lost for {node['node_id']}. Immediate field inspection recommended.",
                        "related_alert_id": aid
                    }
                    db_store.save_notification(notif)
                    updated_nodes.append(db_store.get_node(node["node_id"]))
            except Exception as e:
                logger.error(f"Error checking node timeout for {node.get('node_id')}: {e}")

        return updated_nodes

node_health_service = NodeHealthService()
