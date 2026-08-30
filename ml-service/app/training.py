from __future__ import annotations

from pathlib import Path

import joblib
import numpy as np
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.model_selection import train_test_split
from xgboost import XGBRegressor

from .preprocessing import FEATURE_NAMES, make_training_frame

ART = Path(__file__).resolve().parent.parent / "artifacts"
ART.mkdir(exist_ok=True)


def _mape(y_true, y_pred):
    y_true = np.array(y_true)
    y_pred = np.array(y_pred)
    return float(np.mean(np.abs((y_true - y_pred) / np.clip(np.abs(y_true), 1e-6, None))) * 100)


def train_all():
    df = make_training_frame()
    X = df[FEATURE_NAMES]
    models = {}
    metrics = []
    for target, name in (("demand", "demand_xgb"), ("price_next", "price_xgb"), ("supply", "supply_xgb")):
        y = df[target]
        Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, random_state=7)
        model = XGBRegressor(
            n_estimators=120,
            max_depth=4,
            learning_rate=0.08,
            subsample=0.85,
            colsample_bytree=0.85,
            random_state=7,
            n_jobs=2,
        )
        model.fit(Xtr, ytr)
        pred = model.predict(Xte)
        naive = Xte["lag_demand"] if target == "demand" else Xte["lag_price"] if target == "price_next" else Xte["arrivals"]
        models[name] = model
        joblib.dump(model, ART / f"{name}.joblib")
        metrics.append(
            {
                "modelName": name,
                "MAE": float(mean_absolute_error(yte, pred)),
                "RMSE": float(mean_squared_error(yte, pred) ** 0.5),
                "MAPE": _mape(yte, pred),
                "baselineMAE": float(mean_absolute_error(yte, naive)),
                "n_test": int(len(yte)),
            }
        )
        resid_std = float(np.std(yte - pred))
        joblib.dump({"resid_std": resid_std, "features": FEATURE_NAMES}, ART / f"{name}_meta.joblib")
    joblib.dump(metrics, ART / "metrics.joblib")
    return models, metrics
