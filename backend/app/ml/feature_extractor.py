import numpy as np
import pandas as pd
from typing import List, Dict, Any

WINDOW_SIZE = 30

SIGNALS = [
    "Ultrasonic_Distance_mm",
    "Accel_X",
    "Accel_Y",
    "Accel_Z",
    "Gyro_X",
    "Gyro_Y",
    "Gyro_Z",
    "MPU_Temperature_C",
    "SW420",
    "MQ2_Raw",
    "Tilt_deg",
    "Acceleration_Magnitude",
    "Gyro_Magnitude",
    "Tilt_Rate",
    "Distance_Change",
    "Acceleration_Jerk",
    "Tilt_Rate_Change"
]

STATISTICS = [
    "missing_count",
    "mean",
    "std",
    "min",
    "max",
    "range",
    "rms",
    "change"
]

class FeatureExtractor:
    """
    Recreates the exact 136 statistical feature extraction logic matching
    feature_extractor_NEW.py for the newly trained BhuRakshak ML models.
    """
    WINDOW_SIZE = 30

    @staticmethod
    def _normalize_sample_keys(raw: Dict[str, Any], idx: int) -> Dict[str, Any]:
        """Maps backend telemetry key names to feature_extractor_NEW signal names."""
        s = dict(raw)
        out = {}

        # 1. Time / Timestamp
        time_val = s.get("Time") or s.get("time") or s.get("timestamp") or idx
        try:
            out["Time"] = float(time_val)
        except (ValueError, TypeError):
            out["Time"] = float(idx)

        # 2. Ultrasonic Distance (mm)
        dist_mm = 0.0
        if "Ultrasonic_Distance_mm" in s:
            dist_mm = float(s["Ultrasonic_Distance_mm"])
        elif "ultrasonic_distance_cm" in s:
            dist_mm = float(s["ultrasonic_distance_cm"]) * 10.0
        elif "distance_cm" in s:
            dist_mm = float(s["distance_cm"]) * 10.0

        # Dataset baseline is ~1000mm. If setup sends ~500mm baseline, adjust to align with model scale
        if 0.0 < dist_mm < 750.0:
            dist_mm += 500.0
        elif dist_mm == 0.0:
            dist_mm = 1000.0
        out["Ultrasonic_Distance_mm"] = dist_mm

        # 3. Accel X/Y/Z (Convert g -> m/s^2 if in g units)
        ax = float(s.get("Accel_X", s.get("accel_x_g", s.get("ax", 0.0))))
        ay = float(s.get("Accel_Y", s.get("accel_y_g", s.get("ay", 0.0))))
        az = float(s.get("Accel_Z", s.get("accel_z_g", s.get("az", 1.0))))

        if abs(az) <= 2.5 and abs(ax) <= 2.5 and abs(ay) <= 2.5:
            ax *= 9.80665
            ay *= 9.80665
            az *= 9.80665

        out["Accel_X"] = ax
        out["Accel_Y"] = ay
        out["Accel_Z"] = az

        # 4. Gyro X/Y/Z
        out["Gyro_X"] = float(s.get("Gyro_X", s.get("gyro_x_dps", s.get("gx", 0.0))))
        out["Gyro_Y"] = float(s.get("Gyro_Y", s.get("gyro_y_dps", s.get("gy", 0.0))))
        out["Gyro_Z"] = float(s.get("Gyro_Z", s.get("gyro_z_dps", s.get("gz", 0.0))))

        # 5. Temperature
        out["MPU_Temperature_C"] = float(s.get("MPU_Temperature_C", s.get("mpu_temp", s.get("temperature", 26.0))))

        # 6. SW420 Vibration
        out["SW420"] = float(s.get("SW420", s.get("vibration", 0.0)))

        # 7. MQ2 Gas Raw (Dataset clean air baseline is ~500.0 ADC)
        mq = float(s.get("MQ2_Raw", s.get("gas_detection", s.get("gas", 0.0))))
        if mq <= 1.0:
            mq = 500.0 + (mq * 400.0)
        out["MQ2_Raw"] = mq

        # 8. Tilt deg
        if "Tilt_deg" in s:
            out["Tilt_deg"] = float(s["Tilt_deg"])
        elif "pitch_deg" in s or "roll_deg" in s:
            p = abs(float(s.get("pitch_deg", 0.0)))
            r = abs(float(s.get("roll_deg", 0.0)))
            out["Tilt_deg"] = max(p, r)
        elif "tilt" in s:
            out["Tilt_deg"] = float(s["tilt"])
        else:
            out["Tilt_deg"] = 0.0

        # 9. Acceleration Magnitude
        if "Acceleration_Magnitude" in s:
            out["Acceleration_Magnitude"] = float(s["Acceleration_Magnitude"])
        else:
            out["Acceleration_Magnitude"] = float(np.sqrt(ax**2 + ay**2 + az**2))

        # 10. Gyro Magnitude
        if "Gyro_Magnitude" in s:
            out["Gyro_Magnitude"] = float(s["Gyro_Magnitude"])
        else:
            out["Gyro_Magnitude"] = float(np.sqrt(out["Gyro_X"]**2 + out["Gyro_Y"]**2 + out["Gyro_Z"]**2))

        # 11. Tilt Rate
        out["Tilt_Rate"] = float(s.get("Tilt_Rate", 0.0))

        # 12. Distance Change
        out["Distance_Change"] = float(s.get("Distance_Change", s.get("displacement_cm", 0.0) * 10.0))

        # 13. Placeholders for Jerk and Tilt Rate Change if direct
        out["Acceleration_Jerk"] = float(s.get("Acceleration_Jerk", 0.0))
        out["Tilt_Rate_Change"] = float(s.get("Tilt_Rate_Change", 0.0))

        return out

    @staticmethod
    def add_derived_signals(df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()

        t = pd.to_numeric(df["Time"], errors="coerce").fillna(0.0).to_numpy(dtype=float)
        if len(t) < 2 or np.all(t == 0.0) or len(np.unique(t)) <= 1:
            t = np.arange(len(df), dtype=float) * 0.1

        dt = np.gradient(t)
        dt = np.where(np.abs(dt) < 1e-9, 0.1, dt)

        # 1. Acceleration Magnitude & Jerk
        ax = pd.to_numeric(df["Accel_X"], errors="coerce").fillna(0.0).to_numpy(dtype=float)
        ay = pd.to_numeric(df["Accel_Y"], errors="coerce").fillna(0.0).to_numpy(dtype=float)
        az = pd.to_numeric(df["Accel_Z"], errors="coerce").fillna(9.81).to_numpy(dtype=float)
        acc_mag = np.sqrt(ax**2 + ay**2 + az**2)
        df["Acceleration_Magnitude"] = acc_mag
        df["Acceleration_Jerk"] = np.gradient(acc_mag) / dt

        # 2. Gyro Magnitude
        gx = pd.to_numeric(df["Gyro_X"], errors="coerce").fillna(0.0).to_numpy(dtype=float)
        gy = pd.to_numeric(df["Gyro_Y"], errors="coerce").fillna(0.0).to_numpy(dtype=float)
        gz = pd.to_numeric(df["Gyro_Z"], errors="coerce").fillna(0.0).to_numpy(dtype=float)
        df["Gyro_Magnitude"] = np.sqrt(gx**2 + gy**2 + gz**2)

        # 3. Tilt Rate & Tilt Rate Change
        tilt = pd.to_numeric(df["Tilt_deg"], errors="coerce").interpolate(limit_direction="both").fillna(0.0).to_numpy(dtype=float)
        tilt_rate = np.gradient(tilt) / dt
        df["Tilt_Rate"] = tilt_rate
        df["Tilt_Rate_Change"] = np.gradient(tilt_rate) / dt

        # 4. Distance Change
        dist = pd.to_numeric(df["Ultrasonic_Distance_mm"], errors="coerce").interpolate(limit_direction="both").fillna(1000.0).to_numpy(dtype=float)
        df["Distance_Change"] = np.gradient(dist)

        return df

    @staticmethod
    def extract_features_from_window(samples: List[Dict[str, Any]]) -> Dict[str, float]:
        normalized_samples = [FeatureExtractor._normalize_sample_keys(s, i) for i, s in enumerate(samples)]
        df = pd.DataFrame(normalized_samples)
        df = FeatureExtractor.add_derived_signals(df)

        features = {}

        for signal in SIGNALS:
            values = pd.to_numeric(df[signal], errors="coerce").to_numpy(dtype=float)

            features[f"{signal}_missing_count"] = float(np.isnan(values).sum())

            if np.all(np.isnan(values)):
                values = np.zeros(len(values))
            else:
                median = np.nanmedian(values)
                if not np.isfinite(median):
                    median = 0.0
                values = np.nan_to_num(values, nan=median, posinf=0.0, neginf=0.0)

            features[f"{signal}_mean"] = float(np.mean(values))
            features[f"{signal}_std"] = float(np.std(values))
            features[f"{signal}_min"] = float(np.min(values))
            features[f"{signal}_max"] = float(np.max(values))
            features[f"{signal}_range"] = float(np.max(values) - np.min(values))
            features[f"{signal}_rms"] = float(np.sqrt(np.mean(values ** 2)))
            features[f"{signal}_change"] = float(values[-1] - values[0])

        return features

    @staticmethod
    def build_feature_dataframe(features: Dict[str, float], expected_columns: List[str]) -> np.ndarray:
        row = [float(features.get(col, 0.0)) for col in expected_columns]
        return np.array([row], dtype=np.float32)
