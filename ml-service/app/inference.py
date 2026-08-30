from __future__ import annotations

from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import IsolationForest

from .preprocessing import FEATURE_NAMES, vector_from_payload
from .training import ART, train_all

_MODELS = None
_META = {}
_METRICS = []
_IFOREST = None


def load_models():
    global _MODELS, _META, _METRICS, _IFOREST
    try:
        _MODELS = {
            "demand_xgb": joblib.load(ART / "demand_xgb.joblib"),
            "price_xgb": joblib.load(ART / "price_xgb.joblib"),
            "supply_xgb": joblib.load(ART / "supply_xgb.joblib"),
        }
        for name in _MODELS:
            _META[name] = joblib.load(ART / f"{name}_meta.joblib")
        _METRICS = joblib.load(ART / "metrics.joblib")
    except Exception:
        _MODELS, _METRICS = train_all()
        for name in _MODELS:
            _META[name] = joblib.load(ART / f"{name}_meta.joblib")
    rng = np.random.default_rng(3)
    dummy = rng.normal(size=(400, 1))
    dummy[0:12, 0] = 8
    _IFOREST = IsolationForest(contamination=0.04, random_state=3).fit(dummy)
    return _MODELS


def interval(point: float, std: float, conf: float):
    z = 1.15 if conf < 0.8 else 1.0
    return float(max(0, point - z * std)), float(point + z * std)


def forecast_demand(payload: dict) -> dict:
    load_models()
    x = vector_from_payload(payload)
    yhat = float(_MODELS["demand_xgb"].predict(x)[0])
    std = _META["demand_xgb"]["resid_std"]
    conf = float(np.clip(0.9 - std / max(yhat, 1) * 0.35, 0.58, 0.93))
    lo, up = interval(yhat, std, conf)
    hist = payload.get("historicalDemand") or []
    series = []
    for i in range(7):
        series.append({"day": i + 1, "expected": yhat * (1 + 0.015 * i), "lower": lo * (1 + 0.01 * i), "upper": up * (1 + 0.02 * i)})
    return {
        "expected": round(yhat, 1),
        "lower": round(lo, 1),
        "upper": round(up, 1),
        "confidence": round(conf, 2),
        "series": series,
        "historicalLength": len(hist),
        "model": "demand_xgb",
    }


def forecast_price(payload: dict) -> dict:
    load_models()
    x = vector_from_payload(payload)
    yhat = float(_MODELS["price_xgb"].predict(x)[0])
    std = _META["price_xgb"]["resid_std"]
    conf = float(np.clip(0.88 - std / max(yhat, 1) * 0.4, 0.56, 0.92))
    lo, up = interval(yhat, std, conf)
    current = float(payload.get("currentPrice", yhat))
    trend = "up" if yhat >= current else "down"
    return {
        "expected": round(yhat, 2),
        "lower": round(lo, 2),
        "upper": round(up, 2),
        "confidence": round(conf, 2),
        "trend": trend,
        "model": "price_xgb",
    }


def forecast_supply(payload: dict) -> dict:
    load_models()
    x = vector_from_payload(payload)
    yhat = float(_MODELS["supply_xgb"].predict(x)[0])
    std = _META["supply_xgb"]["resid_std"]
    conf = float(np.clip(0.86 - std / max(yhat, 1) * 0.3, 0.55, 0.91))
    demand = float((payload.get("historicalDemand") or [400])[-1])
    over = float(np.clip((yhat - demand * 1.4) / max(yhat, 1), 0, 0.9))
    short = float(np.clip((demand - yhat * 0.6) / max(demand, 1), 0, 0.9))
    return {
        "expected": round(yhat, 1),
        "confidence": round(conf, 2),
        "oversupplyProb": round(over, 2),
        "shortageProb": round(short, 2),
        "model": "supply_xgb",
    }


def performance():
    load_models()
    return {"metrics": _METRICS, "features": FEATURE_NAMES}
