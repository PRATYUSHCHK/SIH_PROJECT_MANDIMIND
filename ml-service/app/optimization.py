from __future__ import annotations

import numpy as np
from scipy.optimize import minimize_scalar


def expected_profit(q, demand_mu, demand_std, buy, sell, spoilage, transport, inventory):
    q = max(0, q)
    available = inventory + q
    # truncated demand expectation approximation
    sold = min(available, demand_mu)
    unsold = max(0, available - demand_mu)
    lost = max(0, demand_mu - available)
    margin = sell - buy - transport
    profit = sold * margin - unsold * buy * (0.12 + spoilage) - lost * margin * 0.25 - q * transport * 0.15
    # uncertainty penalty
    profit -= demand_std * 0.08 * (q / max(demand_mu, 1))
    return profit


def optimize_procurement(payload: dict) -> dict:
    demand = float(payload.get("predictedDemandKg", 480))
    lo = float(payload.get("demandLower", demand * 0.85))
    up = float(payload.get("demandUpper", demand * 1.15))
    std = max(8, (up - lo) / 2)
    inventory = float(payload.get("currentInventoryKg", 180))
    buy = float(payload.get("purchasePriceInr", 24))
    sell = float(payload.get("expectedSellingPriceInr", payload.get("predictedPriceInr", 32.4)))
    spoilage = float(payload.get("spoilageProb", 0.08))
    transport = float(payload.get("transportCostPerKg", 1.2))
    capacity = float(payload.get("storageCapacityKg", 4000))
    budget = float(payload.get("budgetInr", 50000))
    max_q = min(max(0, capacity - inventory), budget / max(buy + transport, 1))

    def objective(q):
        return -expected_profit(q, demand, std, buy, sell, spoilage, transport, inventory)

    if max_q <= 1:
        q_star = 0.0
    else:
        res = minimize_scalar(objective, bounds=(0, max_q), method="bounded")
        q_star = float(res.x)

    profit = expected_profit(q_star, demand, std, buy, sell, spoilage, transport, inventory)
    over = float(payload.get("oversupplyProb", 0.2))
    conf = float(np.clip(0.9 - std / demand * 0.5 - over * 0.15, 0.55, 0.93))
    if spoilage > 0.28 or over > 0.6:
        risk = "CRITICAL"
    elif spoilage > 0.18 or over > 0.4:
        risk = "HIGH"
    elif spoilage > 0.1 or over > 0.25:
        risk = "MODERATE"
    else:
        risk = "LOW"
    action = "BUY" if q_star > 40 else "HOLD"
    if inventory > demand * 1.2 and q_star < 20:
        action = "HOLD_SELL"
    return {
        "action": action,
        "quantityKg": int(round(q_star)),
        "expectedProfitInr": int(round(profit)),
        "confidence": round(conf, 2),
        "risk": risk,
        "objective": "max expected profit subject to spoilage, capacity, budget, uncertainty",
        "constraints": {"maxQty": int(max_q), "budgetInr": budget, "capacityKg": capacity},
    }
