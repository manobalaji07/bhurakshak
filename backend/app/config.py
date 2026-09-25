from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_ENV: str = "development"
    APP_NAME: str = "BhuRakshak Underground Mine Safety Monitoring"
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000

    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DATABASE: str = "bhurakshak"

    JWT_SECRET: str = "bhurakshak_underground_mine_safety_secret_key_2026"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    NODE_OFFLINE_TIMEOUT_SECONDS: float = 30.0

    ML_SUBSIDENCE_RF_PATH: str = "app/ml/models/subsidence_rf.joblib"
    ML_SUBSIDENCE_FEATURES_PATH: str = "app/ml/models/subsidence_feature_columns.joblib"
    ML_ISOLATION_FOREST_PATH: str = "app/ml/models/isolation_forest.joblib"
    ML_ISOLATION_FEATURES_PATH: str = "app/ml/models/isolation_forest_feature_columns.joblib"
    ML_CONTEXT_RF_PATH: str = "app/ml/models/random_forest_20class.joblib"
    ML_CONTEXT_FEATURES_PATH: str = "app/ml/models/random_forest_20class_feature_columns.joblib"
    ML_CONTEXT_NAMES_PATH: str = "app/ml/models/random_forest_20class_names.joblib"

    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
