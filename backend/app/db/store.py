import sqlite3
import json
import os
import uuid
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any

logger = logging.getLogger("bhurakshak.db")

DB_FILE = os.path.join(os.path.dirname(__file__), "bhurakshak.db")

class DatabaseStore:
    def __init__(self, db_path: str = DB_FILE):
        self.db_path = db_path
        self._init_sqlite()
        self._seed_default_nodes()
        self._seed_default_users()

    def _get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_sqlite(self):
        """Creates table schemas for persistent storage."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            # Telemetry Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS telemetry (
                    id TEXT PRIMARY KEY,
                    node_id TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    received_at TEXT NOT NULL,
                    potential_difference_v REAL,
                    signal_strength_dbm INTEGER,
                    ultrasonic_distance_cm REAL,
                    accel_x_g REAL,
                    accel_y_g REAL,
                    accel_z_g REAL,
                    gyro_x_dps REAL,
                    gyro_y_dps REAL,
                    gyro_z_dps REAL,
                    roll_deg REAL,
                    pitch_deg REAL,
                    vibration REAL,
                    gas_detection REAL,
                    displacement_cm REAL,
                    mpu_movement REAL,
                    mpu_detection INTEGER,
                    communication_ok INTEGER,
                    connection_status TEXT,
                    raw_json TEXT
                )
            """)
            
            # Nodes Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS nodes (
                    node_id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    spatial_x REAL,
                    spatial_y REAL,
                    spatial_z REAL,
                    health_status TEXT NOT NULL,
                    connection_status TEXT NOT NULL,
                    communication_ok INTEGER NOT NULL,
                    last_seen TEXT,
                    signal_strength_dbm INTEGER,
                    current_risk_level TEXT,
                    latest_reading_json TEXT,
                    latest_ml_result_json TEXT
                )
            """)
            try:
                cursor.execute("ALTER TABLE nodes ADD COLUMN latest_ml_result_json TEXT")
            except sqlite3.OperationalError:
                pass # Column already exists

            # Feature Windows Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS feature_windows (
                    window_id TEXT PRIMARY KEY,
                    node_id TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    sample_count INTEGER NOT NULL,
                    subsidence_prediction TEXT,
                    subsidence_probability REAL,
                    anomaly_prediction TEXT,
                    anomaly_score REAL,
                    scenario_context TEXT,
                    features_json TEXT
                )
            """)

            # Alerts Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS alerts (
                    alert_id TEXT PRIMARY KEY,
                    node_id TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    alert_type TEXT NOT NULL,
                    title TEXT NOT NULL,
                    message TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    acknowledged INTEGER NOT NULL DEFAULT 0,
                    acknowledged_by TEXT,
                    acknowledged_at TEXT
                )
            """)

            # Notifications Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS notifications (
                    notification_id TEXT PRIMARY KEY,
                    node_id TEXT NOT NULL,
                    recipient_role TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    title TEXT NOT NULL,
                    message TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    read INTEGER NOT NULL DEFAULT 0,
                    related_alert_id TEXT
                )
            """)

            # Users Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    user_id TEXT PRIMARY KEY,
                    username TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    role TEXT NOT NULL,
                    full_name TEXT NOT NULL,
                    email TEXT
                )
            """)

            # Audit Logs Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS audit_logs (
                    id TEXT PRIMARY KEY,
                    timestamp TEXT NOT NULL,
                    user_id TEXT,
                    action TEXT NOT NULL,
                    details TEXT
                )
            """)

            # SMS Logs Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS sms_logs (
                    id TEXT PRIMARY KEY,
                    recipient_phone TEXT NOT NULL,
                    recipient_name TEXT NOT NULL,
                    message TEXT NOT NULL,
                    status TEXT NOT NULL,
                    node_id TEXT,
                    created_at TEXT NOT NULL,
                    provider TEXT NOT NULL
                )
            """)

            # SMS Config Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS sms_config (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    provider TEXT NOT NULL DEFAULT 'SIMULATED',
                    api_key TEXT DEFAULT '',
                    account_sid TEXT DEFAULT '',
                    from_number TEXT DEFAULT '+18005550199',
                    auto_send_subsidence INTEGER NOT NULL DEFAULT 1
                )
            """)
            cursor.execute("INSERT OR IGNORE INTO sms_config (id, provider, auto_send_subsidence) VALUES (1, 'SIMULATED', 1)")

            # Add phone column to users table if missing
            try:
                cursor.execute("ALTER TABLE users ADD COLUMN phone TEXT")
            except sqlite3.OperationalError:
                pass

            conn.commit()

    def _seed_default_nodes(self):
        """Initializes the required 3 sensor nodes in the database."""
        nodes_data = [
            ("NODE_01", "Surface Sensor Panel North", 150.0, 320.0, 45.0),
            ("NODE_02", "Surface Sensor Panel Central", 340.0, 210.0, 42.0),
            ("NODE_03", "Surface Sensor Panel South", 520.0, 350.0, 48.0)
        ]
        now_str = datetime.now(timezone.utc).isoformat()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            for nid, name, x, y, z in nodes_data:
                cursor.execute("SELECT node_id FROM nodes WHERE node_id = ?", (nid,))
                if not cursor.fetchone():
                    cursor.execute("""
                        INSERT INTO nodes (node_id, name, spatial_x, spatial_y, spatial_z, health_status, connection_status, communication_ok, last_seen, signal_strength_dbm, current_risk_level, latest_reading_json)
                        VALUES (?, ?, ?, ?, ?, 'NO_DATA', 'DISCONNECTED', 0, ?, -70, 'NORMAL', '{}')
                    """, (nid, name, x, y, z, now_str))
            conn.commit()

    def _seed_default_users(self):
        """Seeds default Admin and User credentials."""
        # Simple saltless SHA-256 / hash for demo security requirement (bcrypt can also be used)
        import hashlib
        def hash_pw(pw: str) -> str:
            return hashlib.sha256(pw.encode()).hexdigest()

        users_data = [
            ("usr_admin", "admin", hash_pw("admin123"), "ADMIN", "Mine Control Center Admin", "admin@bhurakshak.in"),
            ("usr_field", "user", hash_pw("user123"), "USER", "Field Safety Supervisor", "supervisor@bhurakshak.in")
        ]
        with self._get_connection() as conn:
            cursor = conn.cursor()
            for uid, uname, phash, role, fname, email in users_data:
                cursor.execute("SELECT username FROM users WHERE username = ?", (uname,))
                if not cursor.fetchone():
                    cursor.execute("""
                        INSERT INTO users (user_id, username, password_hash, role, full_name, email)
                        VALUES (?, ?, ?, ?, ?, ?)
                    """, (uid, uname, phash, role, fname, email))
            conn.commit()

    # --- TELEMETRY OPERATIONS ---
    def save_telemetry(self, telemetry_dict: Dict[str, Any]) -> str:
        tid = str(uuid.uuid4())
        received_at = datetime.now(timezone.utc).isoformat()
        node_id = telemetry_dict.get("node_id", "UNKNOWN")
        ts = telemetry_dict.get("timestamp", received_at)

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO telemetry (
                    id, node_id, timestamp, received_at, potential_difference_v, signal_strength_dbm,
                    ultrasonic_distance_cm, accel_x_g, accel_y_g, accel_z_g, gyro_x_dps, gyro_y_dps, gyro_z_dps,
                    roll_deg, pitch_deg, vibration, gas_detection, displacement_cm, mpu_movement, mpu_detection,
                    communication_ok, connection_status, raw_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                tid, node_id, ts, received_at,
                telemetry_dict.get("potential_difference_v", 0.0),
                telemetry_dict.get("signal_strength_dbm", -65),
                telemetry_dict.get("ultrasonic_distance_cm", 0.0),
                telemetry_dict.get("accel_x_g", 0.0),
                telemetry_dict.get("accel_y_g", 0.0),
                telemetry_dict.get("accel_z_g", 0.0),
                telemetry_dict.get("gyro_x_dps", 0.0),
                telemetry_dict.get("gyro_y_dps", 0.0),
                telemetry_dict.get("gyro_z_dps", 0.0),
                telemetry_dict.get("roll_deg", 0.0),
                telemetry_dict.get("pitch_deg", 0.0),
                telemetry_dict.get("vibration", 0.0),
                telemetry_dict.get("gas_detection", 0.0),
                telemetry_dict.get("displacement_cm", 0.0),
                telemetry_dict.get("mpu_movement", 0.0),
                int(telemetry_dict.get("mpu_detection", 0)),
                1 if telemetry_dict.get("communication_ok", True) else 0,
                telemetry_dict.get("connection_status", "CONNECTED"),
                json.dumps(telemetry_dict)
            ))
            conn.commit()
        return tid

    def get_recent_telemetry(self, node_id: Optional[str] = None, limit: int = 100) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            if node_id:
                cursor.execute("SELECT raw_json FROM telemetry WHERE node_id = ? ORDER BY timestamp DESC LIMIT ?", (node_id, limit))
            else:
                cursor.execute("SELECT raw_json FROM telemetry ORDER BY timestamp DESC LIMIT ?", (limit,))
            rows = cursor.fetchall()
            return [json.loads(row["raw_json"]) for row in rows]

    # --- NODE OPERATIONS ---
    def get_all_nodes(self) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM nodes ORDER BY node_id ASC")
            rows = cursor.fetchall()
            nodes = []
            for r in rows:
                n = dict(r)
                n["latest_reading"] = json.loads(n["latest_reading_json"]) if n.get("latest_reading_json") else {}
                n["latest_ml_result"] = json.loads(n["latest_ml_result_json"]) if n.get("latest_ml_result_json") else None
                n["communication_ok"] = bool(n["communication_ok"])
                nodes.append(n)
            return nodes

    def get_node(self, node_id: str) -> Optional[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM nodes WHERE node_id = ?", (node_id,))
            row = cursor.fetchone()
            if not row:
                return None
            n = dict(row)
            n["latest_reading"] = json.loads(n["latest_reading_json"]) if n.get("latest_reading_json") else {}
            n["latest_ml_result"] = json.loads(n["latest_ml_result_json"]) if n.get("latest_ml_result_json") else None
            n["communication_ok"] = bool(n["communication_ok"])
            return n

    def update_node_state(self, node_id: str, health_status: str, connection_status: str, communication_ok: bool, latest_telemetry: Dict[str, Any], risk_level: str = "NORMAL", ml_result: Optional[Dict[str, Any]] = None):
        now_str = datetime.now(timezone.utc).isoformat()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            if ml_result is not None:
                cursor.execute("""
                    UPDATE nodes
                    SET health_status = ?,
                        connection_status = ?,
                        communication_ok = ?,
                        last_seen = ?,
                        signal_strength_dbm = ?,
                        current_risk_level = ?,
                        latest_reading_json = ?,
                        latest_ml_result_json = ?
                    WHERE node_id = ?
                """, (
                    health_status,
                    connection_status,
                    1 if communication_ok else 0,
                    now_str,
                    latest_telemetry.get("signal_strength_dbm", -65),
                    risk_level,
                    json.dumps(latest_telemetry),
                    json.dumps(ml_result),
                    node_id
                ))
            else:
                cursor.execute("""
                    UPDATE nodes
                    SET health_status = ?,
                        connection_status = ?,
                        communication_ok = ?,
                        last_seen = ?,
                        signal_strength_dbm = ?,
                        current_risk_level = ?,
                        latest_reading_json = ?
                    WHERE node_id = ?
                """, (
                    health_status,
                    connection_status,
                    1 if communication_ok else 0,
                    now_str,
                    latest_telemetry.get("signal_strength_dbm", -65),
                    risk_level,
                    json.dumps(latest_telemetry),
                    node_id
                ))
            conn.commit()

    # --- FEATURE WINDOW LOGGING ---
    def save_feature_window(self, record: Dict[str, Any]) -> str:
        wid = str(uuid.uuid4())
        now_str = datetime.now(timezone.utc).isoformat()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO feature_windows (
                    window_id, node_id, created_at, sample_count, subsidence_prediction,
                    subsidence_probability, anomaly_prediction, anomaly_score, scenario_context, features_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                wid,
                record.get("node_id"),
                now_str,
                record.get("sample_count", 30),
                record.get("subsidence_prediction", "NO_SUBSIDENCE"),
                float(record.get("subsidence_probability", 0.0)),
                record.get("anomaly_prediction", "NORMAL"),
                float(record.get("anomaly_score", 0.0)),
                record.get("scenario_context", "NORMAL_MINE"),
                json.dumps(record.get("features", {}))
            ))
            conn.commit()
        return wid

    # --- ALERTS & NOTIFICATIONS ---
    def save_alert(self, alert_dict: Dict[str, Any]) -> str:
        aid = alert_dict.get("alert_id", str(uuid.uuid4()))
        created_at = alert_dict.get("created_at", datetime.now(timezone.utc).isoformat())
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO alerts (alert_id, node_id, severity, alert_type, title, message, created_at, acknowledged)
                VALUES (?, ?, ?, ?, ?, ?, ?, 0)
            """, (
                aid,
                alert_dict.get("node_id"),
                alert_dict.get("severity", "WARNING"),
                alert_dict.get("alert_type", "ANOMALY"),
                alert_dict.get("title", "Alert Notice"),
                alert_dict.get("message", ""),
                created_at
            ))
            conn.commit()
        return aid

    def acknowledge_alert(self, alert_id: str, user_id: str) -> bool:
        now_str = datetime.now(timezone.utc).isoformat()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE alerts
                SET acknowledged = 1, acknowledged_by = ?, acknowledged_at = ?
                WHERE alert_id = ?
            """, (user_id, now_str, alert_id))
            conn.commit()
            return cursor.rowcount > 0

    def get_alerts(self, limit: int = 50) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM alerts ORDER BY created_at DESC LIMIT ?", (limit,))
            rows = cursor.fetchall()
            alerts = []
            for r in rows:
                a = dict(r)
                a["acknowledged"] = bool(a["acknowledged"])
                alerts.append(a)
            return alerts

    def save_notification(self, notif_dict: Dict[str, Any]) -> str:
        nid = notif_dict.get("notification_id", str(uuid.uuid4()))
        created_at = notif_dict.get("created_at", datetime.now(timezone.utc).isoformat())
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO notifications (notification_id, node_id, recipient_role, severity, title, message, created_at, read, related_alert_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
            """, (
                nid,
                notif_dict.get("node_id", "SYSTEM"),
                notif_dict.get("recipient_role", "ALL"),
                notif_dict.get("severity", "INFO"),
                notif_dict.get("title", "Notification"),
                notif_dict.get("message", ""),
                created_at,
                notif_dict.get("related_alert_id")
            ))
            conn.commit()
        return nid

    def mark_notification_read(self, notification_id: str) -> bool:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE notifications SET read = 1 WHERE notification_id = ?", (notification_id,))
            conn.commit()
            return cursor.rowcount > 0

    def get_notifications(self, role: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            if role:
                cursor.execute("SELECT * FROM notifications WHERE recipient_role IN ('ALL', ?) ORDER BY created_at DESC LIMIT ?", (role, limit))
            else:
                cursor.execute("SELECT * FROM notifications ORDER BY created_at DESC LIMIT ?", (limit,))
            rows = cursor.fetchall()
            notifs = []
            for r in rows:
                n = dict(r)
                n["read"] = bool(n["read"])
                notifs.append(n)
            return notifs

    # --- USER AUTHENTICATION ---
    def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
            row = cursor.fetchone()
            return dict(row) if row else None

    # --- SMS OPERATIONS ---
    def save_sms_log(self, sms_dict: Dict[str, Any]) -> str:
        sid = sms_dict.get("id") or str(uuid.uuid4())
        created_at = sms_dict.get("created_at") or datetime.now(timezone.utc).isoformat()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO sms_logs (id, recipient_phone, recipient_name, message, status, node_id, created_at, provider)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                sid,
                sms_dict.get("recipient_phone", "+91 9876543210"),
                sms_dict.get("recipient_name", "Field Personnel"),
                sms_dict.get("message", ""),
                sms_dict.get("status", "SENT"),
                sms_dict.get("node_id", "GLOBAL"),
                created_at,
                sms_dict.get("provider", "SIMULATED")
            ))
            conn.commit()
        return sid

    def get_all_sms_logs(self, limit: int = 50) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM sms_logs ORDER BY created_at DESC LIMIT ?", (limit,))
            rows = cursor.fetchall()
            return [dict(r) for r in rows]

    def get_sms_config(self) -> Dict[str, Any]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM sms_config WHERE id = 1")
            row = cursor.fetchone()
            if row:
                res = dict(row)
                res["auto_send_subsidence"] = bool(res["auto_send_subsidence"])
                return res
            return {"provider": "SIMULATED", "api_key": "", "account_sid": "", "from_number": "+18005550199", "auto_send_subsidence": True}

    def update_sms_config(self, provider: str, api_key: str, account_sid: str, from_number: str, auto_send_subsidence: bool):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE sms_config
                SET provider = ?, api_key = ?, account_sid = ?, from_number = ?, auto_send_subsidence = ?
                WHERE id = 1
            """, (provider, api_key, account_sid, from_number, 1 if auto_send_subsidence else 0))
            conn.commit()

db_store = DatabaseStore()
