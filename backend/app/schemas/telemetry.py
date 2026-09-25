from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional, Any, Union


def _safe_float(v: Any) -> Optional[float]:
    """Coerces strings, '--' sentinel, and None safely to float or None."""
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return float(v)
    s = str(v).strip()
    if s in ("--", "", "null", "nan", "None"):
        return None
    try:
        return float(s)
    except (ValueError, TypeError):
        return None


def _safe_int(v: Any) -> Optional[int]:
    """Coerces strings, '--' sentinel, and None safely to int or None."""
    if v is None:
        return None
    if isinstance(v, bool):
        return int(v)
    if isinstance(v, int):
        return v
    s = str(v).strip()
    if s in ("--", "", "null", "None"):
        return None
    try:
        return int(float(s))
    except (ValueError, TypeError):
        return None


class TelemetryPayload(BaseModel):
    """
    Accepts telemetry from:
    - Original single-node ESP32 sketch (accel_x_g, gyro_x_dps, ...)
    - New multi-node gateway (ax, ay, az, gx, gy, gz, distance, gas, rssi, voltage, ...)

    All numeric fields accept strings, floats, ints, or '--' sentinel values.
    '--' is treated as None (missing data). Remapping happens in telemetry_service._normalize_payload().
    """
    model_config = ConfigDict(extra='allow')

    node_id: Optional[str] = Field(None)
    timestamp: Optional[str] = Field(None)

    # --- Standard canonical field names (emulator / original sketch) ---
    potential_difference_v: Optional[float] = None
    signal_strength_dbm: Optional[int] = None
    ultrasonic_distance_cm: Optional[float] = None
    accel_x_g: Optional[float] = None
    accel_y_g: Optional[float] = None
    accel_z_g: Optional[float] = None
    gyro_x_dps: Optional[float] = None
    gyro_y_dps: Optional[float] = None
    gyro_z_dps: Optional[float] = None
    roll_deg: Optional[float] = None
    pitch_deg: Optional[float] = None
    vibration: Optional[float] = None
    gas_detection: Optional[float] = None
    displacement_cm: Optional[float] = None
    mpu_movement: Optional[float] = None
    mpu_detection: Optional[int] = None
    communication_ok: Optional[bool] = True
    connection_status: Optional[str] = "CONNECTED"

    # --- New gateway short-form field names (esp32_gateway.ino) ---
    # These are remapped to canonical names in _normalize_payload()
    ax: Optional[float] = None           # -> accel_x_g
    ay: Optional[float] = None           # -> accel_y_g
    az: Optional[float] = None           # -> accel_z_g
    gx: Optional[float] = None           # -> gyro_x_dps
    gy: Optional[float] = None           # -> gyro_y_dps
    gz: Optional[float] = None           # -> gyro_z_dps
    distance: Optional[float] = None     # -> ultrasonic_distance_cm
    displacement: Optional[float] = None # -> displacement_cm
    gas: Optional[float] = None          # -> gas_detection
    rssi: Optional[int] = None           # -> signal_strength_dbm
    voltage: Optional[float] = None      # -> potential_difference_v
    mpu: Optional[int] = None            # -> mpu_detection (binary tilt flag 0/1)
    tilt_sensor: Optional[int] = None    # -> mpu_detection (gateway-derived calc)
    movement: Optional[float] = None     # -> mpu_movement (if not already present)
    count: Optional[int] = None          # anomaly event count from sensor node

    # --- Float fields: coerce strings and '--' sentinel ---
    @field_validator(
        'potential_difference_v', 'ultrasonic_distance_cm',
        'accel_x_g', 'accel_y_g', 'accel_z_g',
        'gyro_x_dps', 'gyro_y_dps', 'gyro_z_dps',
        'roll_deg', 'pitch_deg', 'vibration', 'gas_detection',
        'displacement_cm', 'mpu_movement',
        'ax', 'ay', 'az', 'gx', 'gy', 'gz',
        'distance', 'displacement', 'gas', 'voltage', 'movement',
        mode='before'
    )
    @classmethod
    def coerce_float(cls, v: Any) -> Optional[float]:
        return _safe_float(v)

    # --- Int fields: coerce strings and '--' sentinel ---
    @field_validator(
        'signal_strength_dbm', 'mpu_detection', 'rssi', 'mpu', 'tilt_sensor', 'count',
        mode='before'
    )
    @classmethod
    def coerce_int(cls, v: Any) -> Optional[int]:
        return _safe_int(v)


class TelemetryResponse(BaseModel):
    success: bool = True
    node_id: str
    received_at: str
    buffered: bool = True
    subsidence_detected: Optional[bool] = False
    speaker_alert: Optional[bool] = False
    risk_level: Optional[str] = "NORMAL"
    alert_mode: Optional[str] = "NONE"
    kinematic_projection: Optional[Any] = None
