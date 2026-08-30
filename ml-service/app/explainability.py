from __future__ import annotations

import numpy as np

from .inference import load_models
from .preprocessing import FEATURE_NAMES, vector_from_payload

LABELS = {
    "dow": "Day of week",
    "month": "Month / seasonality",
    "season": "Crop season",
    "holiday": "Holiday / event",
    "price": "Current price",
    "lag_demand": "Recent demand",
    "lag_price": "Recent price",
    "rainfall": "Rainfall",
    "temp": "Temperature",
    "humidity": "Humidity",
    "inventory": "Inventory",
    "commodity_id": "Commodity",
    "arrivals": "Market arrivals",
}


def explain(payload: dict) -> dict:
    models = load_models()
    model = models["demand_xgb"]
    x = vector_from_payload(payload)
    shap_values = None
    try:
        import shap

        explainer = shap.TreeExplainer(model)
        sv = explainer.shap_values(x)
        shap_values = sv[0].tolist()
    except Exception:
        gain = model.feature_importances_
        shap_values = (gain * (x[0] / (np.abs(x[0]).mean() + 1e-6))).tolist()

    pairs = sorted(zip(FEATURE_NAMES, shap_values), key=lambda t: abs(t[1]), reverse=True)
    factors = []
    for name, val in pairs[:6]:
        pct = float(np.clip(val / (abs(sum(shap_values)) + 1e-6) * 100, -40, 40))
        factors.append(
            {
                "label": LABELS.get(name, name),
                "impactPct": round(pct, 1),
                "direction": "up" if val >= 0 else "down",
                "feature": name,
            }
        )
    return {
        "method": "SHAP TreeExplainer (fallback: XGBoost gain)" if shap_values is not None else "feature-gain",
        "factors": factors,
        "headline": f"Why {payload.get('quantityKg', 420)} kg?",
        "caveat": "Feature attributions explain this model’s forecast, not guaranteed market outcomes.",
    }
