# MandiMind — End-to-End System Workflow & Architecture Blueprint

```
========================================================================================
           MANDIMIND — AI-POWERED AGRICULTURAL DEMAND, PRICE & MARKETPLACE
                          COMPREHENSIVE SYSTEM WORKFLOW
========================================================================================
```

MandiMind is an intelligent agricultural decision-support and direct marketplace platform designed for **Farmers**, **Agricultural Buyers/Processors**, **Traders/Sellers**, and **Market Administrators**.

---

## 1. High-Level System Architecture & Flow

```mermaid
graph TB
    subgraph Client_Layer ["Client Layer (Port 5173)"]
        UI["React 18 Single Page App<br/>(Vite + Tailwind CSS + Lucide)"]
        Maps["Leaflet Geospatial Maps<br/>(Mandi & Logistics Route Overlays)"]
        Charts["Recharts Visualizations<br/>(Price Bands, Demand Curves, SHAP)"]
        I18n["Multi-Language Engine<br/>(English, Hindi, Telugu)"]
    end

    subgraph API_Gateway ["Backend REST API Layer (Port 5000)"]
        Express["Express.js Server (ES Modules)"]
        AuthMid["JWT Auth & Role Guard Middleware"]
        Controllers["Business Logic Controllers<br/>(Marketplace, Intelligence, Simulator, Auth)"]
        Adapters["Data Adapters & Transparency Engine<br/>(SIMULATED / AI_FORECAST / LIVE)"]
    end

    subgraph Intelligence_Layer ["AI / ML Microservice (Port 8000)"]
        FastAPI["FastAPI (Python 3.11)"]
        XGBoost["XGBoost Forecast Models<br/>(Demand, Price, Supply/Arrivals)"]
        SciPy["SciPy Optimization Engine<br/>(Bounded Profit Maximizer)"]
        Spoilage["Perishable Decay Model<br/>(Arrhenius Temp + Humidity Decay)"]
        SHAP["SHAP TreeExplainer<br/>(Feature Impact & Explainability)"]
        Anomaly["Isolation Forest & Z-Score<br/>(Price Volatility Anomaly Detection)"]
    end

    subgraph Storage_Layer ["Persistence Layer (Port 27017)"]
        Mongo[("MongoDB 7 Database")]
        Collections["Users • ProduceListings • BuyerRequirements<br/>SupplyPools • Transactions • Offers • MarketplaceMatches<br/>MarketPrices • MarketArrivals • WeatherRecords • Inventory"]
    end

    UI -->|REST / JSON Requests| Express
    Express -->|Authenticate & Validate| AuthMid
    AuthMid --> Controllers
    Controllers -->|Read / Write Documents| Mongo
    Controllers -->|Async HTTP Forecast / Optimize RPC| FastAPI
    FastAPI --> XGBoost & SciPy & Spoilage & SHAP & Anomaly
    Mongo --> Collections
```

---

## 2. End-to-End Product Pipeline

The core decision loop in MandiMind follows a 5-stage sequential intelligence pipeline:

```mermaid
flowchart LR
    A["1. DATA INGESTION<br/>• Mandi Arrivals<br/>• Modal Prices<br/>• Weather Metrics<br/>• Current Inventory"] --> B["2. ML INFERENCE<br/>• 7-Day Demand (demand_xgb)<br/>• Price Range (price_xgb)<br/>• Oversupply (supply_xgb)<br/>• Spoilage Decay Curve"]
    B --> C["3. BOUNDED OPTIMIZATION<br/>• SciPy minimize_scalar<br/>• Storage Constraints<br/>• Capital Budget Limits<br/>• Shelf-Life Decay Penalty"]
    C --> D["4. DECISION SYNTHESIS<br/>• Buy / Hold / Sell / Pool<br/>• Optimal Quantity (KG)<br/>• Match Scoring (0-100)<br/>• Viability Verdict"]
    D --> E["5. EXPLAINABILITY<br/>• SHAP Feature Gain<br/>• Price Breakdown<br/>• Route Cost Breakdown<br/>• Data Badge (SIMULATED/AI)"]
```

---

## 3. Core Persona Workflows

### 3.1. Farmer Workflow: From Planning to Direct Sale & Aggregation

```mermaid
sequenceDiagram
    autonumber
    actor Farmer as 🌾 Farmer
    participant UI as Web Frontend
    participant API as Backend REST API
    participant ML as ML Service (FastAPI)
    participant DB as MongoDB

    Note over Farmer, UI: Phase 1: Land & Crop Optimization
    Farmer->>UI: Enter Land Size, Soil Type, Irrigation & Budget
    UI->>API: POST /api/intelligence/farmer-plan
    API->>ML: POST /predict/farmer-crops
    ML-->>API: Ranked Crops with Expected Net Yield, Water Sensitivity & Margin
    API-->>UI: Display Ranked Crop Cards & AI Insights
    UI-->>Farmer: Actionable planting plan with confidence bounds

    Note over Farmer, UI: Phase 2: Listing Produce & AI Matching
    Farmer->>UI: Create Produce Listing (Commodity, Grade, Quantity, Delivery Preference)
    UI->>API: POST /api/marketplace/listings
    API->>DB: Save ProduceListing document (status: 'active')
    API->>API: Execute AI Match Engine (haversine distance, price spread, quality)
    API->>DB: Upsert MarketplaceMatch records
    API-->>UI: Return Listing Created + Instant Match Opportunities

    Note over Farmer, UI: Phase 3: FPO Supply Pool Aggregation
    Farmer->>UI: View Open Bulk Buyer Requirements / Supply Pools
    Farmer->>UI: Commit 350 KG to Active Onion Pool
    UI->>API: POST /api/marketplace/pools/:id/contribute
    API->>DB: Add contributor waypoint & update collected quantity
    API->>API: Recalculate consolidated multi-stop route & transport savings
    API-->>UI: Updated pool status, route sequence, and estimated 22.4% cost savings
```

---

### 3.2. Buyer & Food Processor Workflow: Sourcing & Logistics Optimization

```mermaid
sequenceDiagram
    autonumber
    actor Buyer as 🏭 Buyer / Processor
    participant UI as Web Frontend
    participant API as Backend REST API
    participant ML as ML Service (FastAPI)
    participant DB as MongoDB

    Buyer->>UI: Post Requirement (e.g. 1000 KG Onion, Max ₹28/kg, Allow Pooling)
    UI->>API: POST /api/marketplace/requirements
    API->>DB: Save BuyerRequirement document
    API->>API: Run AI Matchmaker across individual listings & active pools
    API-->>UI: Present Matches with Deal Verdicts (GREAT_DEAL / FAIR_DEAL)

    alt Direct Trade Offer
        Buyer->>UI: Make counter-offer on specific listing
        UI->>API: POST /api/marketplace/offers
        API->>DB: Save Offer (status: 'pending')
    else FPO Supply Pool Aggregation
        Buyer->>UI: Create Dedicated Supply Pool
        UI->>API: POST /api/marketplace/pools
        API->>DB: Initialize SupplyPool (target: 1000kg)
    end

    Note over Buyer, DB: Order Execution & Spoilage-Aware Logistics
    Buyer->>UI: Confirm Transaction & View Logistics Plan
    UI->>API: GET /api/marketplace/transactions/:id
    API->>ML: POST /optimize/logistics (Distance, ETA, Spoilage Risk, Vehicle Type)
    ML-->>API: Waypoint Sequence + Refrig/Standard vehicle recommendation
    API-->>UI: Render Interactive Leaflet Route Map & Cold-Chain Alerts
```

---

### 3.3. Trader & Seller Workflow: Procurement, Inventory & What-If Simulation

```mermaid
sequenceDiagram
    autonumber
    actor Seller as 🛒 Trader / Seller
    participant UI as Web Frontend
    participant API as Backend REST API
    participant ML as ML Service (FastAPI)
    participant DB as MongoDB

    Note over Seller, UI: Daily Intelligence & Recommendations
    Seller->>UI: Open Seller Dashboard
    UI->>API: GET /api/dashboard/summary & /api/recommendations
    API->>ML: POST /optimize/procurement (Inventory Age, Shelf-Life, Forecasts)
    ML-->>API: Bounded Recommendation (e.g., BUY 250 KG Tomato, Expected ROI: +18.4%)
    ML-->>API: SHAP Explanation (Main drivers: 14-day arrival dip + rainfall surge)
    API-->>UI: Display Procurement Cards, Spoilage Gauges & Price Forecast Bands

    Note over Seller, UI: Dynamic "What-If" Scenario Simulation
    Seller->>UI: Adjust Sliders (Weather shock +25% rain, Arrivals -15%, Budget ₹60k)
    UI->>API: POST /api/intelligence/simulate
    API->>ML: POST /simulate/market-scenario
    ML-->>API: Scenario Matrix (Delta in Expected Profit, Spoilage Risk %, Volatility)
    API-->>UI: Render Comparative Scenario Overlay Chart
```

---

### 3.4. Administrator & Governance Workflow: ML Monitoring & Anomaly Detection

```mermaid
sequenceDiagram
    autonumber
    actor Admin as 🛡️ Admin
    participant UI as Web Frontend
    participant API as Backend REST API
    participant DB as MongoDB

    Admin->>UI: Access Admin & Model Governance Panel
    UI->>API: GET /api/admin/models & /api/admin/alerts
    API->>DB: Fetch ModelPerformance metrics & System Alerts
    API-->>UI: Return Model Metrics (MAE, RMSE, MAPE vs Naive Baseline)
    UI-->>Admin: Display ML Health Status, Live Adapter Connectivity & Anomaly Alerts
```

---

## 4. Transaction & Supply Pool State Machines

### 4.1. Direct Marketplace Transaction Lifecycle

```mermaid
stateDiagram-v2
    [*] --> listed: Farmer posts listing
    listed --> matched: AI Matchmaker matches Requirement
    matched --> offer_pending: Buyer makes Offer
    offer_pending --> rejected: Farmer rejects terms
    offer_pending --> accepted: Farmer accepts Offer
    accepted --> logistics_planned: Route & Transport assigned
    logistics_planned --> in_transit: Vehicle dispatched
    in_transit --> delivered: Produce arrived at destination
    delivered --> completed: Quality verified & funds settled
    rejected --> [*]
    completed --> [*]
```

### 4.2. FPO Multi-Farmer Supply Pool Aggregation Lifecycle

```mermaid
stateDiagram-v2
    [*] --> open: Bulk Requirement opens pool (e.g. 1000 KG)
    open --> open: Farmer 1 commits 350 KG (Collected: 350 KG)
    open --> target_reached: Farmer 2 commits 450 KG + Farmer 3 commits 200 KG (Target 100% met)
    target_reached --> contracted: Buyer signs multi-party contract
    contracted --> in_logistics: Consolidated waypoint pickup starts
    in_logistics --> completed: Bulk delivery & margin redistribution
    open --> cancelled: Expired without reaching quorum
    cancelled --> [*]
    completed --> [*]
```

---

## 5. Machine Learning & Optimization Engines

```mermaid
graph TD
    subgraph Ingestion ["Input Data Ingestion"]
        P[Historical Market Prices]
        A[Mandi Arrivals]
        W[Weather: Temp, Rainfall, Humidity]
        I[Current Seller Inventory & Age]
    end

    subgraph Models ["Predictive AI Models"]
        M1["demand_xgb<br/>(Gradient Boosting Demand Regressor)"]
        M2["price_xgb<br/>(Modal Price Regressor + Confidence Envelope)"]
        M3["supply_xgb<br/>(Arrival Volume Forecast & Surplus Indicator)"]
        M4["Spoilage Decay Function<br/>(Arrhenius Perishability Index)"]
    end

    subgraph Optimization ["SciPy Optimization Engine"]
        Opt["maximize: Net Profit = (P_future × Q) - (P_current × Q) - Spoilage(Q, T) - HoldingCost(Q)<br/>subject to: Q ≤ StorageCapacity, Cost(Q) ≤ Budget"]
    end

    subgraph Explainability ["SHAP Engine"]
        SHAP_Mod["TreeExplainer Feature Attributions<br/>(Decomposes contribution of Rain, History, Day-of-Week)"]
    end

    P & A & W --> M1 & M2 & M3
    W & I --> M4
    M1 & M2 & M3 & M4 --> Opt
    M1 & M2 --> SHAP_Mod
    Opt --> Output["Actionable Decision:<br/>BUY/SELL/HOLD Quantity • Expected Profit INR • Risk Classification"]
    SHAP_Mod --> ExpOutput["Farmer/Trader Explainability Card"]
```

---

## 6. Multi-Stop Logistics & Spoilage Mitigation Flow

When multiple farmers contribute to an FPO Supply Pool, the system optimizes both logistics economics and spoilage prevention:

```mermaid
flowchart TD
    Start["Initiate Consolidated Logistics"] --> Geocode["Extract GPS Coordinates of All Contributors & Buyer"]
    Geocode --> Distance["Calculate Haversine Distance Matrix"]
    Distance --> TSP["Determine Optimal Multi-Stop Waypoint Sequence"]
    TSP --> SpoilageCheck{"Calculate Transit Time & Spoilage Risk<br/>(Temperature + Humidity + Commodity Perishability)"}
    
    SpoilageCheck -->|Transit > Shelf Life Limit or Risk = HIGH| ColdChain["Recommend Refrigerated Vehicle (₹18/km)<br/>Prevents Cargo Spoilage"]
    SpoilageCheck -->|Perishable = Low/Med & Risk = LOW| Ambient["Assign Standard Transport (₹12/km)<br/>Minimizes Transport Cost"]
    
    ColdChain --> CostCalc["Compute Consolidated Transport Cost Per KG<br/>vs Individual Trips (Avg 22% Savings)"]
    Ambient --> CostCalc
    CostCalc --> RouteMap["Render Interactive Leaflet Route with Step-by-Step Waypoints"]
```

---

## 7. Data Transparency & Verification Protocol

MandiMind maintains strict data accountability across all interfaces:

| Badge | Identifier | Definition & Protocol |
| :--- | :--- | :--- |
| <span style="background-color:#0284c7;color:white;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:bold;">SIMULATED</span> | `SIMULATED` | Pre-seeded baseline demo series (clearly marked to avoid mistaking for real government mandis). |
| <span style="background-color:#7c3aed;color:white;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:bold;">AI_FORECAST</span> | `AI_FORECAST` | Machine learning model outputs (`demand_xgb`, `price_xgb`, `supply_xgb`, SHAP values). |
| <span style="background-color:#d97706;color:white;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:bold;">HISTORICAL</span> | `HISTORICAL` | Held-out validation and benchmark dataset metrics for tracking model accuracy (MAE, RMSE, MAPE). |
| <span style="background-color:#16a34a;color:white;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:bold;">LIVE</span> | `LIVE` | Reserved exclusively for active external government API feeds (e-NAM / AGMARKNET) upon key configuration. |

---

## 8. Summary of Ports, Services & Docker Topology

```
+---------------------------------------------------------------------------------------+
|                                    DOCKER COMPOSE                                     |
|                                                                                       |
|   +-------------------+    +--------------------+    +----------------------------+   |
|   |   mandimind-web   |    |   mandimind-api    |    |        mandimind-ml        |   |
|   |     (Frontend)    |    |     (Backend)      |    |        (ML Service)        |   |
|   |     Port: 5173    |    |     Port: 5000     |    |         Port: 8000         |   |
|   |   React 18 + Vite |    |  Express + Node.js |    |      FastAPI + Python      |   |
|   +---------+---------+    +---------+----------+    +--------------+-------------+   |
|             |                        |                              |                 |
|             +-------- HTTP --------->+-------------- HTTP --------->+                 |
|                                      |                                                |
|                            +---------v----------+                                     |
|                            |  mandimind-mongo   |                                     |
|                            |    (DB Server)     |                                     |
|                            |    Port: 27017     |                                     |
|                            |      MongoDB 7     |                                     |
|                            +--------------------+                                     |
+---------------------------------------------------------------------------------------+
```
