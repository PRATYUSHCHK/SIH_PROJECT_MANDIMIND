from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .anomaly import detect_anomalies
from .explainability import explain
from .inference import forecast_demand, forecast_price, forecast_supply, load_models, performance
from .optimization import optimize_procurement

app = FastAPI(title="MandiMind ML", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class Payload(BaseModel):
    model_config = {"extra": "allow"}
    commodity: str = "tomato"


@app.on_event("startup")
def startup():
    load_models()


@app.get("/health")
def health():
    return {"ok": True, "service": "mandimind-ml", "data": "SIMULATED DEMO MODELS"}


@app.get("/performance")
def perf():
    return performance()


@app.post("/forecast/demand")
def demand(p: Payload):
    return forecast_demand(p.model_dump())


@app.post("/forecast/price")
def price(p: Payload):
    return forecast_price(p.model_dump())


@app.post("/forecast/supply")
def supply(p: Payload):
    return forecast_supply(p.model_dump())


@app.post("/elasticity")
def elasticity(p: Payload):
    base = 30.0
    curve = []
    for price in [20, 25, 30, 35, 40]:
        demand = max(80, 470 * (base / price) ** 1.15)
        curve.append({"price": price, "demandKg": int(demand)})
    return {"curve": curve, "elasticity": -1.15, "note": "Estimated own-price elasticity on demo series."}


@app.post("/spoilage")
def spoilage(p: Payload):
    d = p.model_dump()
    perish = {"tomato": 0.12, "spinach": 0.22, "chilli": 0.1, "onion": 0.04, "potato": 0.03}.get(d.get("commodity", "tomato"), 0.08)
    age = float(d.get("ageDays", 2))
    temp = float(d.get("temperatureC", 30))
    hum = float(d.get("humidityPct", 62))
    qty = float(d.get("quantityKg", 180))
    demand = float(d.get("estimatedDemandKg", 400))
    days_cover = qty / max(demand, 1)
    prob = min(0.85, perish * (1 + age * 0.35) * (1 + max(0, temp - 28) * 0.03) * (1 + max(0, hum - 60) * 0.008) * (1 + max(0, days_cover - 1) * 0.2))
    loss = qty * float(d.get("unitCostInr", 24)) * prob
    return {"probability": round(prob, 3), "estimatedLossInr": int(loss), "drivers": ["age", "temperature", "humidity", "cover vs demand"]}


@app.post("/optimize")
def optimize(p: Payload):
    return optimize_procurement(p.model_dump())


@app.post("/explain")
def explain_route(p: Payload):
    return explain(p.model_dump())


@app.post("/anomalies")
def anomalies(p: Payload):
    d = p.model_dump()
    return detect_anomalies(p_series := d.get("series") or [], d.get("dates"))


@app.post("/simulate")
def simulate(p: Payload):
    d = p.model_dump()
    base = {
        "price": float(d.get("baselinePrice", d.get("currentPrice", 30))),
        "rainfall": float(d.get("baselineRainfall", 8)),
        "arrivalsGrowth": 0.0,
        "demandGrowth": 0.0,
        "stock": float(d.get("currentInventoryKg", 180)),
        "budget": float(d.get("budgetInr", 50000)),
        "transport": float(d.get("transportCostPerKg", 1.2)),
        "temp": float(d.get("temperatureC", 30)),
    }
    sim = {
        "price": float(d.get("price", base["price"])),
        "rainfall": float(d.get("rainfallMm", base["rainfall"])),
        "arrivalsGrowth": float(d.get("arrivalsGrowth", 0)),
        "demandGrowth": float(d.get("demandGrowth", 0)),
        "stock": float(d.get("currentStockKg", base["stock"])),
        "budget": float(d.get("budgetInr", base["budget"])),
        "transport": float(d.get("transportCostPerKg", 1.2)),
        "temp": float(d.get("temperatureC", 30)),
    }

    def run(s):
        payload = {**d, "currentPrice": s["price"], "rainfallMm": s["rainfall"], "currentInventoryKg": s["stock"], "budgetInr": s["budget"]}
        dem = forecast_demand(payload)
        pr = forecast_price(payload)
        sup = forecast_supply(payload)
        dem_adj = dem["expected"] * (1 + s["demandGrowth"] / 100) * (1 + (s["rainfall"] - 8) * 0.006)
        sup_adj = sup["expected"] * (1 + s["arrivalsGrowth"] / 100)
        over = max(0, (sup_adj - dem_adj * 1.2) / max(sup_adj, 1))
        spoil = min(0.8, 0.06 + max(0, s["temp"] - 30) * 0.012 + max(0, s["rainfall"] - 20) * 0.004)
        opt = optimize_procurement(
            {
                **payload,
                "predictedDemandKg": dem_adj,
                "demandLower": dem["lower"],
                "demandUpper": dem["upper"],
                "predictedPriceInr": pr["expected"] * (s["price"] / max(base["price"], 1)),
                "purchasePriceInr": s["price"] * 0.82,
                "expectedSellingPriceInr": pr["expected"],
                "currentInventoryKg": s["stock"],
                "spoilageProb": spoil,
                "oversupplyProb": over,
                "budgetInr": s["budget"],
                "transportCostPerKg": s["transport"],
            }
        )
        revenue = opt["quantityKg"] * pr["expected"]
        risk_score = int(min(100, over * 70 + spoil * 80))
        return {
            "predictedDemandKg": round(dem_adj, 1),
            "predictedPriceInr": pr["expected"],
            "recommendedPurchaseKg": opt["quantityKg"],
            "expectedRevenueInr": int(revenue),
            "expectedProfitInr": opt["expectedProfitInr"],
            "spoilageProb": round(spoil, 3),
            "riskScore": risk_score,
            "oversupplyProb": round(over, 2),
            "risk": opt["risk"],
            "action": opt["action"],
        }

    baseline = run(base)
    simulated = run(sim)
    def delta(a, b):
        if a == 0:
            return 0
        return round((b - a) / abs(a) * 100, 1)

    return {
        "baseline": baseline,
        "simulated": simulated,
        "deltas": {
            "profitPct": delta(baseline["expectedProfitInr"], simulated["expectedProfitInr"]),
            "demandPct": delta(baseline["predictedDemandKg"], simulated["predictedDemandKg"]),
            "purchasePct": delta(max(baseline["recommendedPurchaseKg"], 1), simulated["recommendedPurchaseKg"]),
        },
        "warnings": (
            ["HIGH OVERSUPPLY RISK"] if simulated["oversupplyProb"] > 0.35 else []
        ),
        "dataStatus": "SIMULATED",
    }


@app.post("/farmer/rank")
def farmer_rank(p: Payload):
    d = p.model_dump()
    acres = float(d.get("landSizeAcres", 2))
    budget = float(d.get("budgetInr", 80000))
    irrigation = d.get("irrigation", "drip")
    soil = d.get("soilType", "loam")
    season = d.get("season", "kharif")
    crops = [
        {"crop": "Tomato", "yieldKgPerAcre": 8200, "costPerAcre": 42000, "water": "high", "demand": 0.86, "price": 28},
        {"crop": "Onion", "yieldKgPerAcre": 6500, "costPerAcre": 31000, "water": "medium", "demand": 0.74, "price": 26},
        {"crop": "Chilli", "yieldKgPerAcre": 2400, "costPerAcre": 38000, "water": "medium", "demand": 0.8, "price": 55},
        {"crop": "Potato", "yieldKgPerAcre": 9000, "costPerAcre": 28000, "water": "medium", "demand": 0.7, "price": 22},
        {"crop": "Spinach", "yieldKgPerAcre": 4100, "costPerAcre": 18000, "water": "high", "demand": 0.69, "price": 18},
    ]
    water_pen = 0.0 if irrigation in ("drip", "canal") else 0.18
    ranked = []
    for c in crops:
        cost = c["costPerAcre"] * acres
        if cost > budget * 1.05:
            continue
        water_fit = 1 - (0.15 if c["water"] == "high" and water_pen else 0)
        season_fit = 1.05 if season in ("kharif", "rabi") else 1
        revenue = c["yieldKgPerAcre"] * acres * c["price"] * 0.55 * c["demand"] * water_fit * season_fit
        profit = revenue - cost
        risk = "MODERATE" if c["water"] == "high" else "LOW"
        if c["crop"] == "Spinach":
            risk = "HIGH"
        score = profit / max(cost, 1) * c["demand"] * (0.85 if risk == "HIGH" else 1)
        ranked.append(
            {
                "crop": c["crop"],
                "expectedRevenueInr": int(revenue),
                "expectedCostInr": int(cost),
                "estimatedReturnInr": int(profit),
                "risk": risk,
                "confidence": 0.72 if soil else 0.64,
                "riskAdjustedOpportunity": round(score, 2),
                "why": f"Expected demand is {'strong' if c['demand'] > 0.78 else 'steady'}. Likely price range uses simulated mandi levels. Confidence in this estimate is moderate.",
            }
        )
    ranked.sort(key=lambda r: r["riskAdjustedOpportunity"], reverse=True)
    return {
        "rankings": ranked,
        "disclaimer": "Estimated return and risk-adjusted opportunity — not guaranteed profit.",
        "languageNote": "Avoids model jargon for farmer-facing copy.",
    }


@app.post("/spoilage/risk")
def spoilage_risk_detailed(p: Payload):
    d = p.model_dump()
    commodity = d.get("commodity", "tomato").lower()
    dist_km = float(d.get("distanceKm", 100))
    transit_hours = float(d.get("transitHours", dist_km / 40.0))
    vehicle = d.get("vehicleType", "standard")
    temp = float(d.get("temperatureC", 31))
    harvest_age = float(d.get("harvestAgeDays", 1))

    perish_map = {
        "spinach": {"base_decay": 0.020, "level": "VERY HIGH", "max_safe_std": 6, "max_safe_ref": 24},
        "tomato": {"base_decay": 0.008, "level": "HIGH", "max_safe_std": 12, "max_safe_ref": 48},
        "chilli": {"base_decay": 0.004, "level": "MEDIUM", "max_safe_std": 24, "max_safe_ref": 72},
        "onion": {"base_decay": 0.002, "level": "MEDIUM", "max_safe_std": 48, "max_safe_ref": 120},
        "potato": {"base_decay": 0.001, "level": "LOW", "max_safe_std": 72, "max_safe_ref": 168},
    }
    prof = perish_map.get(commodity, {"base_decay": 0.005, "level": "MEDIUM", "max_safe_std": 18, "max_safe_ref": 48})
    max_safe = prof["max_safe_ref"] if vehicle == "refrigerated" else prof["max_safe_std"]
    
    temp_mult = 1.0 + max(0.0, (temp - 24.0) * 0.04) if vehicle != "refrigerated" else 1.0
    age_mult = 1.0 + max(0.0, (harvest_age - 1.0) * 0.25)
    prob = prof["base_decay"] * transit_hours * temp_mult * age_mult
    if vehicle != "refrigerated" and transit_hours > max_safe:
        prob += (transit_hours - max_safe) * 0.035
    prob = min(0.85, max(0.02, round(prob, 3)))

    risk_label = "HIGH" if prob > 0.20 or transit_hours > max_safe * 1.2 else ("MEDIUM" if prob > 0.09 else "LOW")

    return {
        "spoilageRiskScore": risk_label,
        "spoilageProbability": prob,
        "spoilagePercent": round(prob * 100, 1),
        "maxSafeTransitHours": max_safe,
        "perishability": prof["level"],
        "dataStatus": "AI_FORECAST",
    }


@app.post("/trade/viability")
def trade_viability_ai(p: Payload):
    d = p.model_dump()
    gross_price = float(d.get("grossPriceInr", 30))
    transport_cost = float(d.get("transportCostPerKg", 2.0))
    distance_km = float(d.get("distanceKm", 100))
    spoilage_prob = float(d.get("spoilageProbability", 0.05))
    packaging = float(d.get("packagingCostPerKg", 0.8))
    handling = float(d.get("handlingCostPerKg", 0.4))
    platform_fee = 0.50

    expected_spoilage_loss = round(gross_price * spoilage_prob, 2)
    net_realization = round(gross_price - transport_cost - packaging - handling - expected_spoilage_loss - platform_fee, 2)

    margin_pct = (net_realization / max(gross_price, 1)) * 100
    viability_score = 50
    if margin_pct >= 80:
        viability_score += 30
    elif margin_pct >= 70:
        viability_score += 20
    elif margin_pct >= 55:
        viability_score += 10
    else:
        viability_score -= 20

    if distance_km <= 150:
        viability_score += 15
    elif distance_km > 500:
        viability_score -= 15

    if spoilage_prob < 0.08:
        viability_score += 15
    elif spoilage_prob > 0.20:
        viability_score -= 20

    viability_score = max(10, min(98, viability_score))
    is_recommended = viability_score >= 60 and net_realization >= (gross_price * 0.55) and spoilage_prob <= 0.25

    return {
        "viabilityScore": viability_score,
        "netFarmerRealizationInr": net_realization,
        "expectedSpoilageLossInr": expected_spoilage_loss,
        "isRecommended": is_recommended,
        "marginPct": round(margin_pct, 1),
        "dataStatus": "AI_FORECAST",
    }
