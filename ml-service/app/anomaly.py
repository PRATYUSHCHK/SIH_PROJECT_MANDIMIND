from __future__ import annotations

import numpy as np
from sklearn.ensemble import IsolationForest


def detect_anomalies(series: list[float], dates: list | None = None) -> dict:
    if not series or len(series) < 10:
        return {"points": [], "method": "insufficient-history"}
    x = np.array(series, dtype=float).reshape(-1, 1)
    model = IsolationForest(contamination=0.06, random_state=4)
    labels = model.fit_predict(x)
    scores = model.decision_function(x)
    mu, sd = float(np.mean(series)), float(np.std(series) + 1e-6)
    points = []
    for i, (v, lab, sc) in enumerate(zip(series, labels, scores)):
        z = abs((v - mu) / sd)
        if lab == -1 or z > 2.4:
            points.append(
                {
                    "index": i,
                    "date": dates[i] if dates else i,
                    "value": float(v),
                    "zscore": round(z, 2),
                    "kind": "price_spike" if v > mu else "price_drop",
                }
            )
    return {"points": points, "method": "IsolationForest + z-score overlay"}
