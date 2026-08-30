from __future__ import annotations

import numpy as np
import pandas as pd

COMMODITY_INDEX = {"tomato": 0, "onion": 1, "potato": 2, "chilli": 3, "spinach": 4}
FEATURE_NAMES = [
    "dow",
    "month",
    "season",
    "holiday",
    "price",
    "lag_demand",
    "lag_price",
    "rainfall",
    "temp",
    "humidity",
    "inventory",
    "commodity_id",
    "arrivals",
]


def season_from_month(month: int) -> int:
    if month in (6, 7, 8, 9, 10):
        return 1  # kharif
    if month in (11, 12, 1, 2):
        return 2  # rabi
    return 0  # zaid / other


def make_training_frame(n: int = 2400, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    rows = []
    for i in range(n):
        cid = int(i % 5)
        dow = int(i % 7)
        month = int((i // 7) % 12) + 1
        price = 18 + cid * 6 + rng.normal(0, 2.2)
        rainfall = max(0, rng.gamma(1.4, 4))
        temp = 28 + rng.normal(0, 3)
        humidity = np.clip(55 + rainfall * 0.8 + rng.normal(0, 6), 30, 95)
        inventory = max(0, rng.normal(250, 140))
        arrivals = max(80, rng.normal(900, 220) + rainfall * 8)
        holiday = 1 if i % 23 == 0 else 0
        lag_demand = 220 + 40 * np.sin(i / 6) + rng.normal(0, 25)
        lag_price = price + rng.normal(0, 1)
        demand = (
            380
            - 6.2 * (price - 24)
            + 18 * (dow in (5, 6))
            + 40 * holiday
            + 0.35 * (300 - inventory)
            - 0.04 * arrivals
            + 1.1 * rainfall
            + rng.normal(0, 28)
            + cid * 12
        )
        price_next = price + 0.02 * (demand - 400) - 0.01 * (arrivals - 900) + rng.normal(0, 0.8)
        supply = arrivals * (0.92 + 0.04 * np.sin(month / 2)) + rng.normal(0, 40)
        rows.append(
            {
                "dow": dow,
                "month": month,
                "season": season_from_month(month),
                "holiday": holiday,
                "price": price,
                "lag_demand": lag_demand,
                "lag_price": lag_price,
                "rainfall": rainfall,
                "temp": temp,
                "humidity": humidity,
                "inventory": inventory,
                "commodity_id": cid,
                "arrivals": arrivals,
                "demand": max(40, demand),
                "price_next": max(8, price_next),
                "supply": max(50, supply),
            }
        )
    return pd.DataFrame(rows)


def vector_from_payload(p: dict) -> np.ndarray:
    cid = COMMODITY_INDEX.get(str(p.get("commodity", "tomato")).lower(), 0)
    hist_d = p.get("historicalDemand") or [220]
    hist_p = p.get("historicalPrice") or [28]
    hist_a = p.get("historicalArrivals") or [900]
    month = int(p.get("month") or 8)
    return np.array(
        [
            [
                float(p.get("dayOfWeek", 4)),
                month,
                season_from_month(month),
                float(p.get("holiday", 0)),
                float(p.get("currentPrice", hist_p[-1])),
                float(hist_d[-1]),
                float(hist_p[-1]),
                float(p.get("rainfallMm", 6)),
                float(p.get("temperatureC", 30)),
                float(p.get("humidityPct", 62)),
                float(p.get("currentInventoryKg", 180)),
                cid,
                float(hist_a[-1] if hist_a else 900),
            ]
        ],
        dtype=float,
    )
