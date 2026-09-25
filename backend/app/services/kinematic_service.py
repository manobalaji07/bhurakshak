import math
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional

logger = logging.getLogger("bhurakshak.kinematic")

DISPLACEMENT_THRESHOLD_MM = 15.0  # 15 mm displacement limit
TILT_THRESHOLD_DEG = 5.0          # 5.0 deg inclination limit


class KinematicService:
    def parse_timestamp(self, ts_str: str) -> Optional[datetime]:
        if not ts_str:
            return None
        try:
            ts_str = ts_str.replace("Z", "+00:00")
            return datetime.fromisoformat(ts_str)
        except Exception:
            return None

    def linear_regression(self, times_hr: List[float], values: List[float]):
        """
        Computes least-squares linear regression: y = m * t + c
        Returns: (slope m, intercept c, r_squared R2)
        """
        n = len(times_hr)
        if n < 2:
            return 0.0, values[-1] if values else 0.0, 0.0

        sum_t = sum(times_hr)
        sum_y = sum(values)
        sum_t2 = sum(t * t for t in times_hr)
        sum_ty = sum(t * y for t, y in zip(times_hr, values))

        denom = n * sum_t2 - sum_t * sum_t
        if abs(denom) < 1e-9:
            # Constant time or no variance in time
            return 0.0, sum_y / n, 0.0

        slope = (n * sum_ty - sum_t * sum_y) / denom
        intercept = (sum_y - slope * sum_t) / n

        # R^2 calculation
        mean_y = sum_y / n
        ss_tot = sum((y - mean_y) ** 2 for y in values)
        ss_res = sum((y - (slope * t + intercept)) ** 2 for t, y in zip(times_hr, values))

        if ss_tot < 1e-9:
            r2 = 1.0  # Constant values with zero residual
        else:
            r2 = max(0.0, min(1.0, 1.0 - (ss_res / ss_tot)))

        return slope, intercept, r2

    def calculate_projection(self, telemetry_history: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Calculates Kinematic Projection Model metrics from recent telemetry samples.
        Samples can be passed chronologically or newest-first.
        """
        if not telemetry_history:
            return {
                "time_to_threshold": "AWAITING DATA",
                "time_to_threshold_hours": None,
                "progress_percent": 0.0,
                "model_confidence_pct": 0.0,
                "safety_margin": "15.0 mm",
                "threshold_driver": "Displacement",
                "driver_unit": "mm",
                "current_value": 0.0,
                "threshold_value": DISPLACEMENT_THRESHOLD_MM,
                "rate_per_hour": 0.0,
                "status_code": "NO_DATA"
            }

        # Ensure chronological order (oldest to newest)
        history = list(telemetry_history)
        t0_dt = self.parse_timestamp(history[0].get("timestamp", ""))
        t_last_dt = self.parse_timestamp(history[-1].get("timestamp", ""))

        if t0_dt and t_last_dt and t0_dt > t_last_dt:
            history.reverse()

        sample_count = len(history)
        if sample_count < 3:
            last_r = history[-1]
            raw_disp = float(last_r.get("displacement_cm") or 0.0)
            curr_disp = abs(raw_disp)  # use magnitude (gateway may send negative delta)
            return {
                "time_to_threshold": "INSUFFICIENT TREND DATA",
                "time_to_threshold_hours": None,
                "progress_percent": round(min(100.0, (curr_disp / DISPLACEMENT_THRESHOLD_MM) * 100.0), 1),
                "model_confidence_pct": 0.0,
                "safety_margin": f"{max(0.0, DISPLACEMENT_THRESHOLD_MM - curr_disp):.1f} mm",
                "threshold_driver": "Displacement",
                "driver_unit": "mm",
                "current_value": round(curr_disp, 2),
                "threshold_value": DISPLACEMENT_THRESHOLD_MM,
                "rate_per_hour": 0.0,
                "status_code": "INSUFFICIENT_DATA"
            }

        # Extract timestamps relative to start (in hours)
        first_dt = self.parse_timestamp(history[0].get("timestamp", ""))
        times_hr = []

        for idx, r in enumerate(history):
            dt = self.parse_timestamp(r.get("timestamp", ""))
            if first_dt and dt:
                delta_sec = (dt - first_dt).total_seconds()
                times_hr.append(delta_sec / 3600.0)
            else:
                # Fallback: assume 1 second interval between samples
                times_hr.append(idx / 3600.0)

        # Extract displacement and tilt series
        # Use abs() for displacement — the gateway tracks delta from a baseline
        # so values may be negative. We care about magnitude of movement.
        disp_series = [abs(float(r.get("displacement_cm") or 0.0)) for r in history]

        tilt_series = []
        for r in history:
            roll = float(r.get("roll_deg") or 0.0)
            pitch = float(r.get("pitch_deg") or 0.0)
            tilt_series.append(math.sqrt(roll * roll + pitch * pitch))

        # Perform linear regression for both metrics
        m_disp, c_disp, r2_disp = self.linear_regression(times_hr, disp_series)
        m_tilt, c_tilt, r2_tilt = self.linear_regression(times_hr, tilt_series)

        curr_disp = disp_series[-1]
        curr_tilt = tilt_series[-1]

        disp_margin = DISPLACEMENT_THRESHOLD_MM - curr_disp
        tilt_margin = TILT_THRESHOLD_DEG - curr_tilt

        MIN_SIGNIFICANT_RATE = 0.10  # 0.10 mm/hr or deg/hr is minimum significant movement rate above sensor noise

        # Displacement projection
        if curr_disp >= DISPLACEMENT_THRESHOLD_MM:
            t_disp_hr = 0.0
        elif m_disp >= MIN_SIGNIFICANT_RATE:  # Significant positive displacement rate
            t_disp_hr = disp_margin / m_disp
        else:
            t_disp_hr = None

        # Tilt projection
        if curr_tilt >= TILT_THRESHOLD_DEG:
            t_tilt_hr = 0.0
        elif m_tilt >= MIN_SIGNIFICANT_RATE:  # Significant positive tilt rate
            t_tilt_hr = tilt_margin / m_tilt
        else:
            t_tilt_hr = None

        # Pick primary driver
        if t_disp_hr == 0.0 or t_tilt_hr == 0.0:
            driver = "Displacement" if t_disp_hr == 0.0 else "Tilt"
            time_hr = 0.0
            status_code = "EXCEEDED"
            time_str = "0.0 HOURS (EXCEEDED)"
        elif t_disp_hr is not None and t_tilt_hr is not None:
            if t_disp_hr <= t_tilt_hr:
                driver = "Displacement"
                time_hr = t_disp_hr
            else:
                driver = "Tilt"
                time_hr = t_tilt_hr
            status_code = "PROJECTED"
            time_str = f"{time_hr:.1f} HOURS" if time_hr <= 48.0 else "> 48 HOURS (NOMINAL)"
        elif t_disp_hr is not None:
            driver = "Displacement"
            time_hr = t_disp_hr
            status_code = "PROJECTED"
            time_str = f"{time_hr:.1f} HOURS" if time_hr <= 48.0 else "> 48 HOURS (NOMINAL)"
        elif t_tilt_hr is not None:
            driver = "Tilt"
            time_hr = t_tilt_hr
            status_code = "PROJECTED"
            time_str = f"{time_hr:.1f} HOURS" if time_hr <= 48.0 else "> 48 HOURS (NOMINAL)"
        else:
            # Neither is approaching threshold at a significant rate
            disp_prog = curr_disp / DISPLACEMENT_THRESHOLD_MM
            tilt_prog = curr_tilt / TILT_THRESHOLD_DEG
            driver = "Displacement" if disp_prog >= tilt_prog else "Tilt"
            time_hr = None
            status_code = "NO_CROSSING"
            time_str = "NO PROJECTED CROSSING"

        # Active driver details
        if driver == "Displacement":
            curr_val = curr_disp
            thresh_val = DISPLACEMENT_THRESHOLD_MM
            unit = "mm"
            margin_val = disp_margin
            r2_val = r2_disp
            rate_val = m_disp
        else:
            curr_val = curr_tilt
            thresh_val = TILT_THRESHOLD_DEG
            unit = "°"
            margin_val = tilt_margin
            r2_val = r2_tilt
            rate_val = m_tilt

        progress_pct = max(0.0, min(100.0, (curr_val / thresh_val) * 100.0))
        confidence_pct = max(0.0, min(100.0, r2_val * 100.0))

        margin_str = f"{margin_val:.1f} {unit}" if margin_val >= 0 else f"{margin_val:.1f} {unit} (EXCEEDED)"

        return {
            "time_to_threshold": time_str,
            "time_to_threshold_hours": round(time_hr, 1) if time_hr is not None else None,
            "progress_percent": round(progress_pct, 1),
            "model_confidence_pct": round(confidence_pct, 1),
            "safety_margin": margin_str,
            "threshold_driver": driver,
            "driver_unit": unit,
            "current_value": round(curr_val, 2),
            "threshold_value": thresh_val,
            "rate_per_hour": round(rate_val, 3),
            "status_code": status_code
        }


kinematic_service = KinematicService()
