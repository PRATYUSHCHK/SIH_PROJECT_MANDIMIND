================================================================================
  MANDIMIND — SIH PROBLEM STATEMENT 26033
  IMPLEMENTATION CHANGELOG
================================================================================

  Date: August 30, 2026
  Scope: Transform MandiMind into an AI-Powered Direct Farmer–Buyer
         Agricultural Marketplace

================================================================================
  WHAT WAS ALREADY IN THE PROJECT (PRESERVED)
================================================================================

  The following existing features were NOT modified and remain intact:

  - React frontend with Vite, Tailwind CSS, Recharts, Leaflet
  - Express.js backend with JWT authentication
  - MongoDB with Mongoose ODM
  - FastAPI ML service with XGBoost, SHAP explainability
  - 7-day demand forecasting
  - Price forecasting with confidence bounds
  - Supply/arrival forecasting
  - Inventory health monitoring with spoilage risk
  - Supply-demand imbalance analysis
  - What-If Simulator (scenario testing)
  - Market Intelligence (cross-market comparison)
  - Market Map (Leaflet with mandi markers)
  - Farmer Mode (crop ranking & planning)
  - Alerts system
  - Model Performance tracking
  - Recommendations engine
  - Data transparency badges (SIMULATED / AI_FORECAST / LIVE)
  - Green theme, responsive layout, dark mode, Lucide icons
  - Docker Compose architecture (mongo, api, ml, web)
  - Demo credentials (seller, farmer, admin)

================================================================================
  NEW FILES CREATED
================================================================================

  BACKEND (3 new files)
  ─────────────────────

  1. backend/src/models/ProduceListing.js
     - Mongoose schema for farmer produce listings
     - Fields: farmer, commodity, commodityName, quantityKg, unit,
       qualityGrade (A/B/C/Organic), harvestDate, expectedPriceInr,
       minimumPriceInr, location, lat/lng, availableFrom,
       deliveryPreference (pickup/delivery/both), status, availableQuantityKg
     - Indexes on commodity+status+location and farmer+status

  2. backend/src/models/BuyerRequirement.js
     - Mongoose schema for buyer purchase requirements
     - Fields: buyer, commodity, commodityName, quantityKg, qualityGrade,
       maximumPriceInr, deliveryLocation, deliveryLat/deliveryLng,
       requiredByDate, status, fulfilledQuantityKg
     - Indexes on commodity+status and buyer+status

  3. backend/src/models/Transaction.js
     - Mongoose schema for marketplace transactions
     - Fields: listing, requirement, farmer, buyer, commodity,
       quantityKg, agreedPriceInr, totalValueInr, transportCostInr,
       farmerNetValueInr, buyerTotalCostInr, status (9 states),
       logistics subdocument (distance, ETA, cost, route, locations),
       matchScore, matchReasons, aiConfidence, completedAt
     - Status lifecycle: listed → matched → offer_pending → accepted
       → logistics_planned → in_transit → delivered → completed
       (also: rejected, cancelled)

  4. backend/src/models/MarketplaceMatch.js
     - Mongoose schema for AI matching results
     - Fields: listing, requirement, matchScore (0-100),
       commodityMatch, qualityMatch, priceMatch, locationMatch,
       quantityMatch, demandMatch, matchReasons[], aiFairPriceInr,
       aiPriceRange, dealVerdict, demandTrend, status
     - Unique compound index on listing+requirement

  5. backend/src/models/Offer.js
     - Mongoose schema for buyer offers
     - Fields: listing, requirement, buyer, farmer, priceInr,
       quantityKg, totalValueInr, message, status
     - Indexes on listing+status, buyer+status, farmer+status

  6. backend/src/controllers/marketplaceController.js
     - Full marketplace controller (~450 lines) containing:
       * createListing, getListings, getMyListings, updateListing
       * createRequirement, getRequirements, getMyRequirements
       * runMatching (with multi-farmer consolidation)
       * getMatchById
       * getFairPrice (uses ML service + local fallback)
       * calculateLogistics (haversine distance, route comparison)
       * createOffer, acceptOffer, rejectOffer
       * getMyTransactions, updateTransactionStatus
       * getTradeOpportunities (for both farmer and buyer roles)
     - Internal helpers:
       * haversineKm() — distance calculation between two lat/lng points
       * calcTransportCost() — simulated transport cost (₹12/km + ₹0.80/kg)
       * calcETA() — estimated travel time at 40 km/h average
       * getCommodityPriceInfo() — fetches market price history
       * computeAIFairPrice() — fair price using market data + quality
         + volume adjustments
       * computeMatchScore() — multi-factor scoring (commodity 25pts,
         quality 20pts, price 25pts, location 15pts, quantity 10pts,
         demand trend 5pts)

  7. backend/src/routes/marketplace.js
     - Express router with 16 endpoints under /api/marketplace
     - All endpoints use requireAuth middleware
     - Role-based access: farmer for listings, buyer for requirements,
       farmer/admin for accept/reject offers

  FRONTEND (5 new files)
  ──────────────────────

  8. frontend/src/pages/MarketplacePage.jsx
     - Main marketplace with tabbed UI (Listings / Requirements)
     - ListingCard component with commodity info, grade badge,
       price, quantity, location, "Find Buyers" action
     - RequirementCard component with buyer info, grade badge,
       required quantity, max price, delivery location, "Find Suppliers"
     - CreateListingForm modal with all listing fields
     - CreateRequirementForm modal with all requirement fields
     - Commodity filter dropdown
     - Empty states with helpful messages
     - Data source transparency banner

  9. frontend/src/pages/MatchesPage.jsx
     - AI matching results page with match score badges
     - MatchCard component showing:
       * Match score badge (color-coded: green ≥80, yellow ≥60, etc.)
       * Deal verdict badge (FAIR_DEAL, GOOD_FOR_FARMER, etc.)
       * Commodity, quantity, farmer→buyer info, AI fair price
       * Match analysis with ✓/~ /✗ indicators
       * Demand trend display
       * Expandable price details (farmer asking, buyer max, AI fair, range)
       * "Make Offer" action button
     - MultiFarmerCard for consolidated supply matching
     - OfferModal for submitting offers with price, quantity, message,
       total value calculation
     - Re-run matching button
     - Data source banner showing AI_FORECAST status

  10. frontend/src/pages/TransactionsPage.jsx
     - Transaction list with status filters
     - TransactionCard with:
       * Status timeline (8-step visual progress bar)
       * Status badge with icon
       * Details grid: agreed price, total value, transport cost, farmer net
       * Expandable logistics details (distance, ETA, cost/kg, route)
       * Status advancement buttons (Accept Offer, Advance to next status)
       * Creation and completion timestamps
     - Summary cards: total, pending offers, active, completed counts
     - Filter tabs for status-based filtering

  11. frontend/src/pages/LogisticsPage.jsx
     - Delivery route and cost calculator
     - Selection form for pickup listing and delivery destination
     - Delivery Plan card with pickup/delivery locations, quantity, distance
     - Cost breakdown: total transport, cost/kg, estimated travel time
     - AI Recommended Routes comparison:
       * Route A — Direct, Route B — Highway, Route C — Rural roads
       * Distance, ETA, cost for each route
       * Recommended badge and savings display
     - Leaflet map showing pickup (green), delivery (yellow), route line
     - SIMULATED data transparency warning

  12. frontend/src/pages/FarmerDashboard.jsx
     - "What should I sell today?" dashboard for farmers
     - Quick stats: active listings, AI opportunities, quick actions
     - OpportunityCard for SELL opportunities showing:
       * Buyer name, offer price, AI fair price, transport cost
       * Estimated farmer net per kg
       * AI confidence indicator
       * "Why This Deal?" reasons list
       * "View Deal" link to matches page
     - OpportunityCard for BUY opportunities showing:
       * Required commodity, nearby available quantity
       * AI fair price, matched suppliers count, logistics estimate
       * Top 3 supplier list with match scores
       * "View Matches" link
     - Empty states for no opportunities

  UPDATED FILES (10 modified)
  ──────────────────────────

  13. backend/src/models/User.js
      - ADDED 'buyer' to role enum: ['farmer', 'seller', 'admin', 'buyer']

  14. backend/src/models/index.js
      - ADDED exports for ProduceListing, BuyerRequirement, Transaction,
        MarketplaceMatch, Offer

  15. backend/src/controllers/authController.js
      - ADDED 'buyer' to demo login allowed roles list

  16. backend/src/routes/api.js
      - ADDED import of marketplaceRouter
      - ADDED mounted marketplace routes: apiRouter.use('/marketplace', marketplaceRouter)

  17. backend/src/seed/seed.js
      - ADDED import of new marketplace models
      - ADDED cleanup of marketplace collections during re-seed
      - ADDED 2 buyer users:
        * Hyderabad Fresh Foods (buyer@mandimind.demo)
        * Delhi Wholesale Corp (buyer2@mandimind.demo)
      - ADDED 3 sample produce listings:
        * Tomato 500kg Grade A Nalgonda ₹28/kg
        * Onion 300kg Grade A Nalgonda ₹26/kg
        * Chilli 200kg Grade B Nalgonda ₹55/kg
      - ADDED 3 buyer requirements:
        * Tomato 800kg Grade A Hyderabad max ₹30/kg
        * Onion 500kg Any Grade Hyderabad max ₹28/kg
        * Potato 1000kg Grade A Delhi max ₹25/kg

  18. frontend/src/App.jsx
      - ADDED lazy imports: FarmerDashboard, MarketplacePage,
        MatchesPage, TransactionsPage, LogisticsPage
      - ADDED routes: /marketplace, /matches, /transactions, /logistics
      - CHANGED /farmer route to use FarmerDashboard instead of FarmerPage
      - UPDATED Guard to redirect buyers to /farmer
      - UPDATED catch-all redirect to handle buyer role

  19. frontend/src/layouts/AppShell.jsx
      - ADDED icons: Store, Zap, Truck, Receipt from lucide-react
      - ADDED navigation items: Marketplace, AI Matches, Logistics,
        Transactions (with buyer role access)
      - REORDERED nav: Marketplace and AI Matches near top,
        Logistics after Recommendations, Transactions after Forecasts

  20. frontend/src/pages/LoginPage.jsx
      - CHANGED go() function to redirect buyers to /farmer
      - CHANGED demo buttons from 3 (seller/farmer/admin) to 4
        (seller/farmer/buyer/admin) in 2x2 grid

================================================================================
  FIXES APPLIED
================================================================================

  1. DUPLICATE IMPORT IN SEED.JS
     - Problem: ProduceListing, BuyerRequirement, Transaction, Offer were
       imported twice (once for cleanup, once for marketplace seed)
     - Fix: Removed the second import, reusing the first one

  2. DUPLICATE VARIABLE DECLARATION IN SEED.JS
     - Problem: `today` was declared with `const` in both the original
       seed data and the marketplace seed section
     - Fix: Removed the duplicate declaration, reusing the original `today`

  3. DUPLICATE TARGET COMPONENT IN TRANSACTIONSPAGE
     - Problem: A custom Target SVG component was defined locally but
       Target exists in lucide-react
     - Fix: Added Target to lucide-react import, removed local definition

  4. BUYER ROLE REDIRECT PATHS
     - Problem: Buyers logging in had no specific redirect path
     - Fix: Updated LoginPage.go(), App.jsx Guard, catch-all route,
       and login route to redirect buyers to /farmer (which shows
       the marketplace opportunity dashboard)

  5. FRONTEND BUILD CLEANUP
     - Verified clean Vite build with no errors after all changes
     - Backend syntax verified with node --check on all modified files

================================================================================
  API ENDPOINTS SUMMARY
================================================================================

  Marketplace endpoints (all under /api/marketplace):

  Method  Endpoint                    Auth Required    Roles
  ──────  ──────────────────────────  ──────────────    ──────────────────
  POST    /listings                   Yes              farmer, admin
  GET     /listings                   Yes              any authenticated
  GET     /listings/mine              Yes              farmer, admin
  PATCH   /listings/:id               Yes              farmer, admin
  POST    /requirements               Yes              buyer, admin, seller
  GET     /requirements               Yes              any authenticated
  GET     /requirements/mine          Yes              buyer, admin, seller
  GET     /matches                    Yes              any authenticated
  GET     /matches/:id                Yes              any authenticated
  GET     /fair-price                 Yes              any authenticated
  GET     /logistics                  Yes              any authenticated
  POST    /offers                     Yes              buyer, admin, seller
  PATCH   /offers/:id/accept          Yes              farmer, admin
  PATCH   /offers/:id/reject          Yes              farmer, admin
  GET     /transactions               Yes              any authenticated
  PATCH   /transactions/:id/status    Yes              any authenticated
  GET     /opportunities              Yes              any authenticated

================================================================================
  DEMO CREDENTIALS
================================================================================

  Existing (unchanged):
    seller@mandimind.demo / demo1234
    farmer@mandimind.demo / demo1234
    admin@mandimind.demo  / demo1234

  New:
    buyer@mandimind.demo  / demo1234  (Hyderabad Fresh Foods)
    buyer2@mandimind.demo / demo1234  (Delhi Wholesale Corp)

================================================================================
  SIH DEMO WORKFLOW MAP
================================================================================

  Step 1: Login as Farmer (farmer@mandimind.demo)
  Step 2: See dashboard — "What should I sell today?" with AI opportunities
  Step 3: Go to Marketplace — see 3 pre-listed produce items
  Step 4: Create new listing (Tomato, 500kg, Grade A, ₹28/kg, Hyderabad)
  Step 5: Login as Buyer (buyer@mandimind.demo)
  Step 6: Go to Marketplace — switch to "Buyer Requirements" tab
  Step 7: See existing requirement (Tomato 800kg, max ₹30/kg, Hyderabad)
  Step 8: Click "Find Suppliers" on the requirement
  Step 9: See AI matching results with 92% match score
  Step 10: Review AI fair price (₹28.20/kg), deal verdict (FAIR_DEAL)
  Step 11: Click "Make Offer" — submit ₹29/kg for 500kg
  Step 12: Login as Farmer — see offer pending in Transactions
  Step 13: Click "Accept Offer" — inventory updates, status → accepted
  Step 14: Go to Logistics — see delivery plan, route options, costs
  Step 15: Advance status → logistics_planned → in_transit → delivered → completed
  Step 16: Transaction shows as completed with timeline

================================================================================
  DATA TRANSPARENCY
================================================================================

  All new marketplace data is labeled as SIMULATED or AI_FORECAST:
  - Produce listings: SIMULATED
  - Buyer requirements: SIMULATED
  - Match scores: AI_FORECAST (using existing ML forecasting data)
  - Fair price calculations: AI_FORECAST (using market price history)
  - Route/logistics calculations: SIMULATED (clearly noted)
  - Transaction data: SIMULATED

  Every page with new data shows a DataStatusBadge and a data source
  banner explaining the data origin.

================================================================================
  SYSTEM ARCHITECTURE
================================================================================

  MandiMind follows a 4-layer architecture orchestrated via Docker Compose:

  ┌─────────────────────────────────────────────────────────────────────┐
  │                         FRONTEND LAYER                              │
  │  React 18, Vite, Tailwind CSS, React Router, Recharts, Leaflet     │
  │  Lucide Icons, Framer Motion                                       │
  │  Port: 5173                                                        │
  └────────────────────────────┬────────────────────────────────────────┘
                               │  HTTP / REST API
  ┌────────────────────────────▼────────────────────────────────────────┐
  │                          BACKEND LAYER                              │
  │  Node.js (ES Modules), Express.js, JWT Auth, Mongoose ODM          │
  │  Helmet Security, Rate Limiting, Morgan Logging                    │
  │  Port: 5000                                                        │
  └───────────┬──────────────────────────┬─────────────────────────────┘
              │  MongoDB (27017)          │  HTTP Client (8000)
  ┌───────────▼──────────┐  ┌────────────▼─────────────────────────────┐
  │    DATABASE LAYER    │  │         ML SERVICE LAYER                 │
  │  MongoDB 7           │  │  FastAPI (Python 3.11)                   │
  │  Docker Volume       │  │  scikit-learn, XGBoost, SciPy           │
  │  Pre-seeded demo     │  │  SHAP, IsolationForest                  │
  │  data                │  │  Port: 8000                             │
  └──────────────────────┘  └─────────────────────────────────────────┘

  DATA FLOW:

  Farmer/FPO ──► List Produce ──► AI Matching Engine ──► Buyer
       │               │                │                  │
       ▼               ▼                ▼                  ▼
  Inventory       ProduceListing   MarketplaceMatch    Requirement
  System          MongoDB          + Fair Price         MongoDB
       │               │            + Logistics            │
       ▼               ▼                │                  ▼
  Updated on       Buyer sees      Route Calculation   Offer Made
  Transaction      listing         (Haversine)         by Buyer
       │               │                │                  │
       ▼               ▼                ▼                  ▼
  Transaction ◄── Accept Offer ◄── Delivery Plan ◄── Transaction
  Status: DONE      (Farmer)        (Cost + ETA)       Created

  AI INTEGRATION:

  ┌──────────────────────────────────────────────────────────────┐
  │                    EXISTING ML PIPELINE                      │
  │                                                              │
  │  demand_xgb  ──► Demand Forecast ──► Match scoring input     │
  │  price_xgb   ──► Price Forecast  ──► Fair price calculation │
  │  supply_xgb  ──► Supply Forecast ──► Demand trend signal     │
  │  SHAP        ──► Explainability  ──► "Why this deal?"       │
  │  optimize    ──► Procurement     ──► Recommendation engine  │
  │  spoilage    ──► Risk assessment ──► Inventory decisions     │
  │                                                              │
  │  All existing models are reused. No new ML models added.    │
  └──────────────────────────────────────────────────────────────┘
                          │
                          ▼
  ┌──────────────────────────────────────────────────────────────┐
  │                  NEW MARKETPLACE LAYER                       │
  │                                                              │
  │  Matching Engine ──► computeMatchScore()                     │
  │    ├─ Commodity match (25 pts)                               │
  │    ├─ Quality match (20 pts)                                 │
  │    ├─ Price match (25 pts)                                   │
  │    ├─ Location match (15 pts, haversine)                     │
  │    ├─ Quantity match (10 pts)                                │
  │    └─ Demand trend bonus (5 pts)                             │
  │                                                              │
  │  Fair Price Engine ──► computeAIFairPrice()                  │
  │    ├─ Market price history (avg of 30 days)                  │
  │    ├─ Quality multiplier (A=1.08, B=0.95, Organic=1.2)      │
  │    ├─ Volume discount (500kg+=0.97, 1000kg+=0.95)           │
  │    └─ ML price forecast (when available)                     │
  │                                                              │
  │  Logistics Engine ──► calculateLogistics()                   │
  │    ├─ Haversine distance calculation                         │
  │    ├─ Transport cost (₹12/km + ₹0.80/kg)                   │
  │    ├─ ETA (40 km/h average)                                  │
  │    └─ 3 route options with cost comparison                   │
  │                                                              │
  │  Multi-Farmer Consolidation                                  │
  │    └─ Combine partial listings to fulfill large orders       │
  └──────────────────────────────────────────────────────────────┘

  TRANSACTION LIFECYCLE:

  LISTED ──► MATCHED ──► OFFER_PENDING ──► ACCEPTED
                                        │
    ┌───────────────────────────────────┘
    ▼
  LOGISTICS_PLANNED ──► IN_TRANSIT ──► DELIVERED ──► COMPLETED
    │
    └──► REJECTED / CANCELLED (at any point)

  TRANSACTION EFFECTS:
  - On ACCEPTED: farmer inventory reduced, listing quantity reduced
  - On COMPLETED: timestamp recorded
  - Every transition validated against allowed status transitions

================================================================================
  FULL PROJECT FILE STRUCTURE
================================================================================

  mandimind/
  ├── .env.example                          # Environment variables template
  ├── .gitignore                            # Git ignore rules
  ├── docker-compose.yml                    # Container orchestration
  ├── MANDIMIND_PROJECT_OVERVIEW.txt        # Original project overview
  ├── README.md                             # Project readme
  ├── CHANGELOG.md                          # This file — SIH implementation log
  │
  ├── backend/                              # Express.js REST API
  │   ├── Dockerfile                        # Backend container build
  │   ├── .dockerignore                     # Docker ignore rules
  │   ├── package.json                      # Node.js dependencies
  │   ├── package-lock.json                 # Dependency lock file
  │   └── src/
  │       ├── server.js                     # App entry point (Express, CORS, routes)
  │       │
  │       ├── config/                       # Configuration
  │       │   ├── index.js                  #   Environment config (ports, URIs, secrets)
  │       │   └── db.js                     #   MongoDB connection
  │       │
  │       ├── middleware/                    # Express middleware
  │       │   ├── auth.js                   #   JWT verification + role guard
  │       │   ├── error.js                  #   Global error handler (AppError class)
  │       │   └── rateLimit.js              #   API rate limiting
  │       │
  │       ├── models/                       # Mongoose schemas (22 models)
  │       │   ├── index.js                  #   Central re-export barrel
  │       │   │
  │       │   │── EXISTING MODELS ──────────────────────────────
  │       │   ├── User.js                   #   Users (farmer/seller/admin/buyer)
  │       │   ├── FarmerProfile.js          #   Farmer profile (land, soil, budget)
  │       │   ├── SellerProfile.js          #   Seller profile (business, storage)
  │       │   ├── Commodity.js              #   Commodities (tomato, onion, etc.)
  │       │   ├── Market.js                 #   Mandi/market locations
  │       │   ├── MarketPrice.js            #   Daily market prices per commodity
  │       │   ├── MarketArrival.js          #   Daily market arrivals per commodity
  │       │   ├── WeatherRecord.js          #   Weather data per market
  │       │   ├── Inventory.js              #   Seller inventory stock
  │       │   ├── Sale.js                   #   Historical sales records
  │       │   ├── Purchase.js               #   Historical purchase records
  │       │   ├── Prediction.js             #   ML prediction logs
  │       │   ├── Recommendation.js         #   AI recommendation records
  │       │   ├── Alert.js                  #   System alerts
  │       │   ├── Simulation.js             #   What-if simulation history
  │       │   ├── ModelPerformance.js       #   ML model benchmark metrics
  │       │   │
  │       │   │── NEW MARKETPLACE MODELS ──────────────────────
  │       │   ├── ProduceListing.js         #   Farmer produce listings ***NEW***
  │       │   ├── BuyerRequirement.js       #   Buyer purchase requirements ***NEW***
  │       │   ├── MarketplaceMatch.js       #   AI matching results ***NEW***
  │       │   ├── Offer.js                  #   Buyer offers on listings ***NEW***
  │       │   └── Transaction.js            #   Marketplace transactions ***NEW***
  │       │
  │       ├── controllers/                  # Business logic
  │       │   ├── authController.js         #   Login, demo login, profile
  │       │   ├── dashboardController.js    #   Seller dashboard (forecasts + optimization)
  │       │   ├── intelligenceController.js #   Market data, inventory, simulation
  │       │   ├── adminController.js        #   Admin overview, alerts, model perf
  │       │   └── marketplaceController.js  #   Marketplace CRUD, matching, pricing, ***NEW***
  │       │                                  #   logistics, transactions, opportunities
  │       │
  │       ├── routes/                       # Express routers
  │       │   ├── auth.js                   #   /api/auth/* (login, me, demo)
  │       │   ├── api.js                    #   /api/* (all protected routes + marketplace)
  │       │   └── marketplace.js            #   /api/marketplace/* (16 endpoints) ***NEW***
  │       │
  │       ├── services/                     # External service clients
  │       │   ├── mlClient.js               #   FastAPI ML service HTTP client
  │       │   ├── optimization.js           #   Local fallback optimization (SciPy-free)
  │       │   ├── dataStatus.js             #   SIMULATED/AI_FORECAST/LIVE badge helper
  │       │   └── adapters/
  │       │       └── index.js              #   Data adapter catalog
  │       │
  │       ├── seed/                         # Demo data seeder
  │       │   └── seed.js                   #   Creates all demo data (users, commodities,
  │       │                                  #   markets, prices, arrivals, weather, inventory,
  │       │                                  #   alerts, model performance, buyer users,
  │       │                                  #   produce listings, buyer requirements) ***UPDATED***
  │       │
  │       └── utils/                        # Utility functions
  │           └── asyncHandler.js           #   Express async error wrapper
  │
  ├── frontend/                             # React + Vite Web Application
  │   ├── Dockerfile                        # Frontend container build
  │   ├── .dockerignore                     # Docker ignore rules
  │   ├── package.json                      # Frontend dependencies
  │   ├── package-lock.json                 # Dependency lock file
  │   ├── index.html                        # HTML entry point
  │   ├── vite.config.js                    # Vite build configuration
  │   ├── tailwind.config.js                # Tailwind CSS theme (green theme)
  │   ├── postcss.config.js                 # PostCSS configuration
  │   │
  │   └── src/
  │       ├── main.jsx                      # React root mount
  │       ├── App.jsx                       # Router + route guards ***UPDATED***
  │       ├── index.css                     # Global styles + Tailwind directives
  │       │
  │       ├── context/                      # React contexts
  │       │   ├── AuthContext.jsx            #   JWT auth state + login/logout/demo
  │       │   ├── ThemeContext.jsx           #   Dark/light theme toggle
  │       │   └── ToastContext.jsx           #   Toast notification system
  │       │
  │       ├── layouts/                      # Layout components
  │       │   └── AppShell.jsx              #   Sidebar nav + header + mobile nav ***UPDATED***
  │       │                                  #   (added Marketplace, Matches, Logistics,
  │       │                                  #    Transactions navigation items)
  │       │
  │       ├── services/                     # API clients
  │       │   └── api.js                    #   Axios instance with JWT interceptor
  │       │
  │       ├── i18n/                         # Internationalization
  │       │   └── index.js                  #   i18n configuration
  │       │
  │       ├── pages/                        # Page components (18 pages)
  │       │   │
  │       │   │── EXISTING PAGES ──────────────────────────────
  │       │   ├── LoginPage.jsx             #   Login + demo ***UPDATED*** (buyer button)
  │       │   ├── SellerDashboard.jsx       #   Seller intelligence dashboard
  │       │   ├── FarmerPage.jsx            #   Original farmer crop ranking
  │       │   ├── IntelligencePage.jsx      #   Market intelligence analytics
  │       │   ├── InventoryPage.jsx         #   Inventory health + decisions
  │       │   ├── RecommendationsPage.jsx   #   AI procurement recommendations
  │       │   ├── ForecastsPage.jsx         #   Demand/price/supply forecasts
  │       │   ├── MapPage.jsx               #   Interactive mandi map
  │       │   ├── SimulatorPage.jsx         #   What-if scenario simulator
  │       │   ├── AlertsPage.jsx            #   System alerts
  │       │   ├── ModelsPage.jsx            #   ML model performance
  │       │   ├── AdminPage.jsx             #   Admin overview
  │       │   ├── SettingsPage.jsx          #   User settings
  │       │   │
  │       │   │── NEW MARKETPLACE PAGES ──────────────────────
  │       │   ├── FarmerDashboard.jsx       #   "What should I sell today?" ***NEW***
  │       │   ├── MarketplacePage.jsx       #   Listings + requirements CRUD ***NEW***
  │       │   ├── MatchesPage.jsx           #   AI matching + fair price + offers ***NEW***
  │       │   ├── TransactionsPage.jsx      #   Transaction lifecycle tracking ***NEW***
  │       │   └── LogisticsPage.jsx         #   Route/cost calculator + map ***NEW***
  │       │
  │       ├── components/                   # Reusable UI components
  │       │   │
  │       │   │── EXISTING COMPONENTS ─────────────────────────
  │       │   ├── AIRecommendationCard.jsx  #   AI decision card with factors
  │       │   ├── AlertCard.jsx             #   Alert display card
  │       │   ├── ConfidenceIndicator.jsx   #   AI confidence meter
  │       │   ├── DataStatusBadge.jsx       #   SIMULATED/AI_FORECAST/LIVE badge
  │       │   ├── InventoryHealth.jsx       #   Inventory health grid
  │       │   ├── Logo.jsx                  #   MandiMind logo
  │       │   ├── MarketComparisonTable.jsx #   Cross-market comparison table
  │       │   ├── MarketMap.jsx             #   Leaflet map with mandi markers
  │       │   ├── MetricCard.jsx            #   Metric display card
  │       │   ├── PageHeader.jsx            #   Page header with eyebrow + title
  │       │   ├── RiskBadge.jsx             #   Risk level indicator
  │       │   ├── States.jsx                #   Loading skeleton + error state
  │       │   ├── SupplyDemandBalance.jsx   #   Supply-demand visual
  │       │   ├── WhyRecommendationDrawer.jsx # SHAP explanation drawer
  │       │   │
  │       │   ├── charts/                   # Chart components
  │       │   │   └── ForecastCharts.jsx    #   Demand + price forecast charts
  │       │   │
  │       │   └── simulator/                # Simulator components
  │       │       └── WhatIf.jsx            #   What-if scenario UI
  │       │
  │       └── dist/                         # Build output (gitignored)
  │
  └── ml-service/                           # FastAPI Python ML Microservice
      ├── Dockerfile                        # ML container build
      ├── requirements.txt                  # Python dependencies
      ├── artifacts/                        # Trained model artifacts
      │
      └── app/                             # Python application
          ├── __init__.py                   # Package init
          ├── main.py                       # FastAPI routes + startup
          ├── inference.py                  # Prediction endpoints
          ├── training.py                   # Model training pipeline
          ├── preprocessing.py              # Data preprocessing
          ├── optimization.py               # Bounded optimization (SciPy)
          ├── explainability.py             # SHAP TreeExplainer
          └── anomaly.py                    # IsolationForest anomalies

================================================================================
  DATABASE SCHEMA RELATIONSHIPS
================================================================================

  User ──────────────────────┬── FarmerProfile (1:1, role=farmer)
    │                        ├── SellerProfile (1:1, role=seller)
    │                        ├── ProduceListing (1:N, role=farmer)  ***NEW***
    │                        ├── BuyerRequirement (1:N, role=buyer) ***NEW***
    │                        ├── Offer (1:N, as buyer or farmer)    ***NEW***
    │                        ├── Transaction (1:N, as buyer/farmer) ***NEW***
    │                        ├── Inventory (1:N, role=seller)
    │                        ├── Sale (1:N)
    │                        ├── Purchase (1:N)
    │                        ├── Recommendation (1:N)
    │                        └── Simulation (1:N)
    │
  Commodity ─────────────────┬── MarketPrice (1:N)
    │                        ├── MarketArrival (1:N)
    │                        ├── ProduceListing (1:N)               ***NEW***
    │                        ├── BuyerRequirement (1:N)             ***NEW***
    │                        └── Transaction (1:N)                  ***NEW***
    │
  Market ────────────────────┬── MarketPrice (1:N)
    │                        ├── MarketArrival (1:N)
    │                        └── WeatherRecord (1:N)
    │
  ProduceListing ─────────────┬── MarketplaceMatch (1:N)            ***NEW***
    │                        ├── Offer (1:N)                        ***NEW***
    │                        └── Transaction (1:N)                  ***NEW***
    │
  BuyerRequirement ───────────┬── MarketplaceMatch (1:N)            ***NEW***
    │                        ├── Offer (1:N)                        ***NEW***
    │                        └── Transaction (1:N)                  ***NEW***
    │
  MarketplaceMatch ───────────┐                                   ***NEW***
    (listing + requirement, unique pair with score)                 ***NEW***

================================================================================
  ROLE-BASED ACCESS MATRIX
================================================================================

  Feature                  Farmer  Buyer  Seller  Admin
  ───────────────────────  ──────  ─────  ──────  ─────
  Dashboard                ✓       ✓*     ✓       ✓
  Marketplace (browse)     ✓       ✓      ✓       ✓
  Marketplace (create)     ✓       ✓      ✗       ✓
  AI Matches               ✓       ✓      ✓       ✓
  Market Intelligence      ✗       ✗      ✓       ✓
  Inventory                ✗       ✗      ✓       ✓
  Recommendations          ✗       ✗      ✓       ✓
  Logistics                ✓       ✓      ✓       ✓
  Market Map               ✓       ✓      ✓       ✓
  Forecasts                ✗       ✗      ✓       ✓
  Transactions             ✓       ✓      ✓       ✓
  What-If Simulator        ✗       ✗      ✓       ✓
  Farmer Mode              ✓       ✗      ✓       ✓
  Alerts                   ✓       ✓      ✓       ✓
  Model Performance        ✗       ✗      ✓       ✓
  Settings                 ✓       ✓      ✓       ✓

  * Buyer sees FarmerDashboard (opportunity-focused) not SellerDashboard

================================================================================
  KEY DESIGN DECISIONS
================================================================================

  1. NO NEW DEPENDENCIES
     All marketplace features use existing packages: Express, Mongoose,
     Axios, React, Tailwind, Leaflet, Lucide. Zero npm install needed.

  2. REUSED ML PIPELINE
     The matching engine calls the SAME demand_xgb, price_xgb, and
     supply_xgb models already trained by the ML service. No new
     training required.

  3. MODULAR CONTROLLER
     marketplaceController.js is a single file with clearly separated
     sections (CRUD, matching, pricing, logistics, transactions) for
     easy maintenance in a college/SIH project context.

  4. SIMULATED TRANSPARENCY
     Logistics uses haversine distance + ₹12/km cost model, clearly
     labeled as SIMULATED. A real API (Google Maps, OSRM) can be
     swapped in by replacing 3 functions in the controller.

  5. INVENTORY INTEGRATION
     When a farmer accepts an offer, their Inventory document is
     updated directly — no separate inventory sync needed.

  6. MULTI-FARMER SUPPORT
     When a buyer needs more than one farmer's supply, the matching
     engine identifies partial-match combinations that sum to the
     required quantity.

  7. GRACEFUL ML FALLBACK
     Every ML-dependent endpoint has a local fallback using the
     existing optimization.js localOptimize() and buildFactors()
     functions, ensuring the app works even if the ML service is down.

================================================================================
