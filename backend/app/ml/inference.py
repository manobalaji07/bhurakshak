import os
import joblib
import logging
import numpy as np
import pandas as pd
from typing import Dict, Any, Optional

from app.config import settings
from app.ml.feature_extractor import FeatureExtractor

logger = logging.getLogger("bhurakshak.ml")

class InferenceEngine:
    """
    ML Inference Service that manages loading pre-trained models
    and running live prediction pipeline.
    """

    def __init__(self):
        self.subsidence_model = None
        self.subsidence_features = None

        self.isolation_model = None
        self.isolation_features = None

        self.context_model = None
        self.context_features = None
        self.context_classes = None

        self._load_models()

    def _resolve_path(self, path_str: str) -> str:
        if os.path.isabs(path_str):
            return path_str
        # Relative to project root
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
        return os.path.join(base_dir, path_str)

    def _load_models(self):
        # 1. Subsidence Model
        try:
            sub_path = self._resolve_path(settings.ML_SUBSIDENCE_RF_PATH)
            sub_feat_path = self._resolve_path(settings.ML_SUBSIDENCE_FEATURES_PATH)

            if os.path.exists(sub_path) and os.path.exists(sub_feat_path):
                self.subsidence_model = joblib.load(sub_path)
                self.subsidence_features = joblib.load(sub_feat_path)
                logger.info(f"Loaded Subsidence RF model from {sub_path}")
            else:
                logger.warning(f"Subsidence model files not found at {sub_path}")
        except Exception as e:
            logger.error(f"Failed loading Subsidence RF model: {e}")

        # 2. Isolation Forest Model
        try:
            iso_path = self._resolve_path(settings.ML_ISOLATION_FOREST_PATH)
            iso_feat_path = self._resolve_path(settings.ML_ISOLATION_FEATURES_PATH)

            if os.path.exists(iso_path) and os.path.exists(iso_feat_path):
                self.isolation_model = joblib.load(iso_path)
                self.isolation_features = joblib.load(iso_feat_path)
                logger.info(f"Loaded Isolation Forest model from {iso_path}")
            else:
                logger.warning(f"Isolation Forest model files not found at {iso_path}")
        except Exception as e:
            logger.error(f"Failed loading Isolation Forest model: {e}")

        # 3. Context 20-class Model
        try:
            ctx_path = self._resolve_path(settings.ML_CONTEXT_RF_PATH)
            ctx_feat_path = self._resolve_path(settings.ML_CONTEXT_FEATURES_PATH)
            ctx_names_path = self._resolve_path(settings.ML_CONTEXT_NAMES_PATH)

            if os.path.exists(ctx_path) and os.path.exists(ctx_feat_path):
                self.context_model = joblib.load(ctx_path)
                self.context_features = joblib.load(ctx_feat_path)
                if os.path.exists(ctx_names_path):
                    self.context_classes = joblib.load(ctx_names_path)
                logger.info(f"Loaded Context 20-Class RF model from {ctx_path}")
        except Exception as e:
            logger.error(f"Failed loading Context RF model: {e}")

    def evaluate_window(self, samples_30: list) -> Dict[str, Any]:
        """
        Processes a 30-sample window, extracts features, and runs ML inference.
        """
        extracted_features = FeatureExtractor.extract_features_from_window(samples_30)

        res = {
            "subsidence_detected": False,
            "subsidence_label": "NO_SUBSIDENCE",
            "subsidence_probability": 0.0,
            "anomaly_detected": False,
            "anomaly_label": "NORMAL",
            "anomaly_score": 0.0,
            "scenario_context": "NORMAL_STABLE_MINE",
            "extracted_features": extracted_features,
            "is_synthetic_notice": "Prototype Decision-Support Signal (Synthetic Data Baseline)"
        }

        # 1. Subsidence RF Evaluation
        if self.subsidence_model is not None and self.subsidence_features is not None:
            try:
                df_sub = FeatureExtractor.build_feature_dataframe(extracted_features, self.subsidence_features)
                sub_pred = self.subsidence_model.predict(df_sub)[0]
                sub_proba = float(self.subsidence_model.predict_proba(df_sub)[0][1]) if hasattr(self.subsidence_model, "predict_proba") else (1.0 if sub_pred == 1 else 0.0)

                res["subsidence_probability"] = round(sub_proba, 4)
                if sub_pred == 1 or sub_proba >= 0.5:
                    res["subsidence_detected"] = True
                    res["subsidence_label"] = "SUBSIDENCE"
                else:
                    res["subsidence_detected"] = False
                    res["subsidence_label"] = "NO_SUBSIDENCE"
            except Exception as e:
                logger.error(f"Error evaluating Subsidence RF: {e}")

        # 2. Isolation Forest Evaluation
        if self.isolation_model is not None and self.isolation_features is not None:
            try:
                df_iso = FeatureExtractor.build_feature_dataframe(extracted_features, self.isolation_features)
                df_iso_clean = np.nan_to_num(df_iso, nan=0.0, posinf=0.0, neginf=0.0)
                
                # Isolation Forest returns -1 for outlier/anomaly, 1 for inlier/normal
                iso_pred = self.isolation_model.predict(df_iso_clean)[0]
                iso_score = float(-self.isolation_model.score_samples(df_iso_clean)[0]) if hasattr(self.isolation_model, "score_samples") else (1.0 if iso_pred == -1 else 0.0)

                res["anomaly_score"] = round(iso_score, 4)
                if iso_pred == -1:
                    res["anomaly_detected"] = True
                    res["anomaly_label"] = "ANOMALY"
                else:
                    res["anomaly_detected"] = False
                    res["anomaly_label"] = "NORMAL"
            except Exception as e:
                logger.error(f"Error evaluating Isolation Forest: {e}")

        # 3. Context 20-Class RF Evaluation
        if self.context_model is not None and self.context_features is not None:
            try:
                df_ctx = FeatureExtractor.build_feature_dataframe(extracted_features, self.context_features)
                ctx_pred = self.context_model.predict(df_ctx)[0]
                if self.context_classes and isinstance(self.context_classes, dict):
                    res["scenario_context"] = str(self.context_classes.get(ctx_pred, ctx_pred))
                else:
                    res["scenario_context"] = str(ctx_pred)
            except Exception as e:
                logger.error(f"Error evaluating Context RF: {e}")

        # Post-process context alignment:
        sub_prob = res.get("subsidence_probability", 0.0)
        iso_score = res.get("anomaly_score", 0.0)

        if res.get("subsidence_detected") or sub_prob >= 0.5:
            if res["scenario_context"] in ["ULTRASONIC_SENSOR_FAILURE", "MPU_SENSOR_FAILURE", "NORMAL_STABLE_MINE"]:
                res["scenario_context"] = "SINGLE_NODE_GRADUAL_SUBSIDENCE"
        elif sub_prob < 0.35 and iso_score < 0.75:
            if res["scenario_context"] in ["ULTRASONIC_SENSOR_FAILURE", "MPU_SENSOR_FAILURE"]:
                res["scenario_context"] = "NORMAL_STABLE_MINE"

        return res

    def get_status(self) -> Dict[str, Any]:
        return {
            "subsidence_rf_loaded": self.subsidence_model is not None,
            "isolation_forest_loaded": self.isolation_model is not None,
            "context_rf_loaded": self.context_model is not None,
            "all_models_loaded": (
                self.subsidence_model is not None and
                self.isolation_model is not None and
                self.context_model is not None
            )
        }

ml_engine = InferenceEngine()

