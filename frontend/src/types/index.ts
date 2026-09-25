export type Role = 'ADMIN' | 'USER';

export interface User {
  user_id: string;
  username: string;
  role: Role;
  full_name: string;
  email?: string;
}

export type HealthStatus = 'ONLINE' | 'DEGRADED' | 'OFFLINE' | 'NO_DATA';
export type RiskLevel = 'NORMAL' | 'WARNING' | 'CRITICAL';

export interface NodeReading {
  node_id: string;
  timestamp: string;
  // Power & Signal
  potential_difference_v: number;   // voltage (V)
  signal_strength_dbm: number;      // RSSI dBm
  // Ultrasonic
  ultrasonic_distance_cm: number;
  displacement_cm: number;
  // MPU6050
  accel_x_g: number;
  accel_y_g: number;
  accel_z_g: number;
  gyro_x_dps: number;
  gyro_y_dps: number;
  gyro_z_dps: number;
  roll_deg: number;
  pitch_deg: number;
  mpu_movement: number;
  mpu_detection: number;            // binary tilt flag
  // Vibration sensor (digital)
  vibration: number;                // 0 or 1 from sensor, or float g from emulator
  // Gas
  gas_detection: number;            // MQ2 raw ADC value
  // Status
  count: number;                    // anomaly event count from node
  status: string;                   // SAFE / WARNING / CRITICAL sent by node
  communication_ok: boolean;
  connection_status: string;
}

export interface KinematicProjection {
  time_to_threshold: string;
  time_to_threshold_hours: number | null;
  progress_percent: number;
  model_confidence_pct: number;
  safety_margin: string;
  threshold_driver: string;
  driver_unit: string;
  current_value: number;
  threshold_value: number;
  rate_per_hour: number;
  status_code: string;
}

export interface NodeState {
  node_id: string;
  name: string;
  spatial_x: number;
  spatial_y: number;
  spatial_z: number;
  health_status: HealthStatus;
  connection_status: string;
  communication_ok: boolean;
  last_seen: string | null;
  signal_strength_dbm: number;
  current_risk_level: RiskLevel;
  latest_reading: NodeReading;
  latest_ml_result?: MLResult;
  latest_kinematic_projection?: KinematicProjection;
  speaker_alert?: boolean;
  alert_mode?: 'NONE' | 'WARNING' | 'DANGER';
  buffered_samples?: number;
}

export interface MLResult {
  subsidence_detected: boolean;
  subsidence_label: 'SUBSIDENCE' | 'NO_SUBSIDENCE';
  subsidence_probability: number;
  anomaly_detected: boolean;
  anomaly_label: 'ANOMALY' | 'NORMAL';
  anomaly_score: number;
  scenario_context: string;
  is_synthetic_notice: string;
}

export interface Alert {
  alert_id: string;
  node_id: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  alert_type: string;
  title: string;
  message: string;
  created_at: string;
  acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
}

export interface NotificationItem {
  notification_id: string;
  node_id: string;
  recipient_role: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  message: string;
  created_at: string;
  read: boolean;
  related_alert_id?: string;
}

export interface AnalyticsSummary {
  overall_status: 'SAFE' | 'ATTENTION' | 'CRITICAL';
  total_nodes: number;
  online_nodes: number;
  warning_nodes: number;
  critical_nodes: number;
  active_alerts_count: number;
  unread_notifications_count: number;
  nodes: NodeState[];
}
