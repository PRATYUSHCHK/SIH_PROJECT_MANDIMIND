# MandiMind

**AI-Powered Agricultural Demand, Price & Inventory Intelligence**

Decision-support for farmers, sellers/traders, and agricultural analysts.

> Make smarter agricultural decisions before the market moves.

All seeded prices, arrivals, weather, and inventory in this repository are **SIMULATED DEMO DATA**. They are not live e-NAM / AGMARKNET feeds.

## Stack

| Layer | Stack |
| --- | --- |
| Frontend | React, Vite, Tailwind, React Router, Recharts, Leaflet |
| Backend | Node.js, Express, JWT, Mongoose |
| ML | FastAPI, scikit-learn, XGBoost, SciPy |
| Data | MongoDB (Docker) |

## Quick start (Docker)

```bash
docker compose up --build
```

- App: https://sih-project-mandimind.vercel.app/
- API: http://localhost:5000/api/health
- ML: http://localhost:8000/health

## Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Seller | seller@mandimind.demo | demo1234 |
| Farmer | farmer@mandimind.demo | demo1234 |
| Admin | admin@mandimind.demo | demo1234 |

## Local (without Docker)

1. Start MongoDB.
2. `cd backend && npm install && npm run seed && npm run dev`
3. `cd ml-service && pip install -r requirements.txt && uvicorn app.main:app --reload --port 8000`
4. `cd frontend && npm install && npm run dev`

## Product pipeline

**DATA → ML PREDICTION → OPTIMIZATION → DECISION → EXPLANATION**

MandiMind never claims guaranteed profit. Forecasts always include a range, model confidence, and risk.
