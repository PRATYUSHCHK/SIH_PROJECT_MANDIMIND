import { asyncHandler } from '../utils/asyncHandler.js';
import { ProduceListing } from '../models/ProduceListing.js';
import { BuyerRequirement } from '../models/BuyerRequirement.js';
import { Transaction } from '../models/Transaction.js';
import { MarketplaceMatch } from '../models/MarketplaceMatch.js';
import { SupplyPool } from '../models/SupplyPool.js';
import { Alert } from '../models/Alert.js';

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const globalSearch = asyncHandler(async (req, res) => {
  const rawQ = (req.query.q || '').trim();
  if (!rawQ || rawQ.length < 2) {
    return res.json({
      query: rawQ,
      listings: [],
      requirements: [],
      transactions: [],
      matches: [],
      supplyPools: [],
      logistics: [],
      alerts: [],
      pages: [],
      totalCount: 0,
    });
  }

  // Clean and tokenize query
  const cleanQ = rawQ.replace(/[₹$,]/g, '').trim();
  const tokens = cleanQ.split(/\s+/).filter(Boolean);
  const primaryRegex = new RegExp(escapeRegex(cleanQ), 'i');

  const numbers = tokens
    .map((t) => parseFloat(t.replace(/[^0-9.]/g, '')))
    .filter((n) => !isNaN(n) && n > 0);

  const role = req.user.role;
  const userId = req.user._id;

  // 1. PRODUCE LISTINGS
  let listRoleFilter = {};
  if (role === 'farmer' || role === 'seller') {
    listRoleFilter = { $or: [{ status: 'active' }, { farmer: userId }] };
  } else if (role === 'buyer') {
    listRoleFilter = { status: 'active' };
  }

  const allListings = await ProduceListing.find(listRoleFilter)
    .populate('farmer', 'name location email')
    .sort({ createdAt: -1 })
    .limit(100);

  const matchedListings = allListings.filter((item) => {
    const farmerName = item.farmer?.name || '';
    const farmerLoc = item.farmer?.location || '';
    const loc = item.location || '';
    const commodity = item.commodityName || '';
    const grade = item.qualityGrade || '';
    const status = item.status || '';
    const combinedText = `${commodity} ${farmerName} ${farmerLoc} ${loc} ${grade} ${status}`.toLowerCase();

    const textMatches = tokens.every((tok) => combinedText.includes(tok.toLowerCase()));
    const numMatches = numbers.some((n) => {
      const qDiff = Math.abs(item.quantityKg - n);
      const pDiff = Math.abs(item.expectedPriceInr - n);
      return qDiff === 0 || pDiff === 0 || (n >= 10 && (qDiff <= n * 0.1 || pDiff <= 2));
    });

    return textMatches || numMatches || primaryRegex.test(combinedText);
  });

  // 2. BUYER REQUIREMENTS
  let reqRoleFilter = {};
  if (role === 'buyer') {
    reqRoleFilter = { $or: [{ status: 'active' }, { buyer: userId }] };
  } else {
    reqRoleFilter = role === 'admin' ? {} : { status: 'active' };
  }

  const allRequirements = await BuyerRequirement.find(reqRoleFilter)
    .populate('buyer', 'name location email')
    .sort({ createdAt: -1 })
    .limit(100);

  const matchedRequirements = allRequirements.filter((item) => {
    const buyerName = item.buyer?.name || '';
    const deliveryLoc = item.deliveryLocation || '';
    const commodity = item.commodityName || '';
    const grade = item.qualityGrade || '';
    const status = item.status || '';
    const combinedText = `${commodity} ${buyerName} ${deliveryLoc} ${grade} ${status}`.toLowerCase();

    const textMatches = tokens.every((tok) => combinedText.includes(tok.toLowerCase()));
    const numMatches = numbers.some((n) => {
      const qDiff = Math.abs(item.quantityKg - n);
      const pDiff = Math.abs(item.maximumPriceInr - n);
      return qDiff === 0 || pDiff === 0 || (n >= 10 && (qDiff <= n * 0.1 || pDiff <= 2));
    });

    return textMatches || numMatches || primaryRegex.test(combinedText);
  });

  // 3. SUPPLY POOLS (Multi-Farmer Aggregations)
  const allSupplyPools = await SupplyPool.find()
    .populate('buyerRequirement')
    .populate('commodity', 'name slug')
    .populate('contributors.farmer', 'name location')
    .sort({ createdAt: -1 })
    .limit(50);

  const matchedSupplyPools = allSupplyPools.filter((item) => {
    const commodity = item.commodityName || '';
    const dest = item.destinationLocation || '';
    const status = item.status || '';
    const notes = item.notes || '';
    const combinedText = `${commodity} ${dest} ${status} ${notes} supply pool aggregation fpo`.toLowerCase();

    const textMatches = tokens.every((tok) => combinedText.includes(tok.toLowerCase()));
    const numMatches = numbers.some((n) => {
      return Math.abs(item.targetQuantityKg - n) <= 10 || Math.abs(item.targetPriceInr - n) <= 2;
    });

    return textMatches || numMatches || primaryRegex.test(combinedText);
  });

  // 4. TRANSACTIONS
  let txFilter = {};
  if (role === 'farmer' || role === 'seller') {
    txFilter.farmer = userId;
  } else if (role === 'buyer') {
    txFilter.buyer = userId;
  }

  const allTransactions = await Transaction.find(txFilter)
    .populate('farmer', 'name location')
    .populate('buyer', 'name location')
    .sort({ createdAt: -1 })
    .limit(100);

  const matchedTransactions = allTransactions.filter((item) => {
    const farmerName = item.farmer?.name || '';
    const buyerName = item.buyer?.name || '';
    const commodity = item.commodityName || '';
    const status = item.status || '';
    const paymentStatus = item.paymentStatus || '';
    const paymentId = item.paymentId || '';
    const txId = item._id.toString();
    const combinedText = `${commodity} ${farmerName} ${buyerName} ${status} ${paymentStatus} ${paymentId} ${txId}`.toLowerCase();

    const textMatches = tokens.every((tok) => combinedText.includes(tok.toLowerCase()));
    const numMatches = numbers.some((n) => {
      const qDiff = Math.abs(item.quantityKg - n);
      const pDiff = Math.abs(item.agreedPriceInr - n);
      const vDiff = Math.abs(item.totalValueInr - n);
      return qDiff === 0 || pDiff === 0 || vDiff === 0;
    });

    return textMatches || numMatches || primaryRegex.test(combinedText);
  });

  // 5. LOGISTICS
  const matchedLogistics = allTransactions
    .filter((item) => ['accepted', 'logistics_planned', 'in_transit', 'delivered', 'completed'].includes(item.status))
    .filter((item) => {
      const pickup = item.logistics?.pickupLocation || item.farmer?.location || '';
      const delivery = item.logistics?.deliveryLocation || item.buyer?.location || '';
      const commodity = item.commodityName || '';
      const farmerName = item.farmer?.name || '';
      const buyerName = item.buyer?.name || '';
      const combinedText = `${commodity} ${pickup} ${delivery} ${farmerName} ${buyerName} logistics route`.toLowerCase();

      const textMatches = tokens.every((tok) => combinedText.includes(tok.toLowerCase()));
      const numMatches = numbers.some((n) => {
        return Math.abs((item.logistics?.distanceKm || 0) - n) <= 5 || Math.abs(item.quantityKg - n) === 0;
      });

      return textMatches || numMatches || primaryRegex.test(combinedText);
    });

  // 6. AI MATCHES
  const allMatches = await MarketplaceMatch.find()
    .populate({ path: 'listing', populate: { path: 'farmer', select: 'name location' } })
    .populate({ path: 'requirement', populate: { path: 'buyer', select: 'name location' } })
    .sort({ matchScore: -1 })
    .limit(100);

  const userMatches = allMatches.filter((m) => {
    if (role === 'admin' || role === 'seller') return true;
    if (role === 'farmer') return m.listing?.farmer?._id?.toString() === userId.toString();
    if (role === 'buyer') return m.requirement?.buyer?._id?.toString() === userId.toString();
    return true;
  });

  const matchedAiMatches = userMatches.filter((item) => {
    const commodity = item.listing?.commodityName || item.requirement?.commodityName || '';
    const farmerName = item.listing?.farmer?.name || '';
    const buyerName = item.requirement?.buyer?.name || '';
    const loc = `${item.listing?.location || ''} ${item.requirement?.deliveryLocation || ''}`;
    const verdict = item.dealVerdict || '';
    const combinedText = `${commodity} ${farmerName} ${buyerName} ${loc} ${verdict} match ai`.toLowerCase();

    const textMatches = tokens.every((tok) => combinedText.includes(tok.toLowerCase()));
    const numMatches = numbers.some((n) => {
      return (
        Math.abs((item.listing?.quantityKg || 0) - n) === 0 ||
        Math.abs((item.aiFairPriceInr || 0) - n) <= 2 ||
        Math.abs(item.matchScore - n) === 0
      );
    });

    return textMatches || numMatches || primaryRegex.test(combinedText);
  });

  // 7. ALERTS
  const alertFilter = {
    $or: [{ user: userId }, { user: null }, { role: 'all' }, { role: role }],
  };
  const allAlerts = await Alert.find(alertFilter).sort({ createdAt: -1 }).limit(50);
  const matchedAlerts = allAlerts.filter((a) => {
    const text = `${a.title || ''} ${a.body || ''} ${a.commodity || ''} ${a.severity || ''}`.toLowerCase();
    return tokens.every((tok) => text.includes(tok.toLowerCase())) || primaryRegex.test(text);
  });

  // 8. PAGES
  const ALL_PAGES = [
    { key: 'marketplace', label: 'Marketplace', path: '/marketplace', desc: 'Direct farmer-buyer trading floor & produce listings', roles: ['seller', 'farmer', 'admin', 'buyer'], keywords: ['marketplace', 'listings', 'requirements', 'trade', 'buy', 'sell', 'produce', 'crop', 'pool'] },
    { key: 'matches', label: 'AI Matches', path: '/matches', desc: 'AI-powered produce & demand compatibility engine', roles: ['seller', 'farmer', 'admin', 'buyer'], keywords: ['matches', 'matching', 'ai matches', 'deals', 'fair price', 'offers', 'viability'] },
    { key: 'transactions', label: 'Transactions', path: '/transactions', desc: 'Orders, incoming offers, settlement & payments', roles: ['seller', 'farmer', 'admin', 'buyer'], keywords: ['transactions', 'orders', 'payments', 'settlement', 'receipts', 'offers'] },
    { key: 'logistics', label: 'Logistics', path: '/logistics', desc: 'AI route calculation, cost optimization & transit', roles: ['seller', 'farmer', 'admin', 'buyer'], keywords: ['logistics', 'delivery', 'route', 'truck', 'transport', 'distance', 'spoilage'] },
    { key: 'dashboard', label: 'Dashboard', path: '/dashboard', desc: 'Market overview, KPI analytics & trends', roles: ['seller', 'admin'], keywords: ['dashboard', 'analytics', 'kpi', 'revenue', 'overview'] },
    { key: 'intelligence', label: 'Market Intelligence', path: '/intelligence', desc: 'Price forecasts, elasticity & market arrivals', roles: ['seller', 'admin'], keywords: ['intelligence', 'analytics', 'trends', 'arrivals', 'elasticity'] },
    { key: 'inventory', label: 'Inventory', path: '/inventory', desc: 'Stock levels, spoilage risk & shelf life', roles: ['seller', 'admin'], keywords: ['inventory', 'stock', 'warehouse', 'storage'] },
    { key: 'recommendations', label: 'Recommendations', path: '/recommendations', desc: 'AI sell/hold & pricing advisory', roles: ['seller', 'admin'], keywords: ['recommendations', 'advisory', 'sell hold', 'advice'] },
    { key: 'map', label: 'Market Map', path: '/map', desc: 'Geographic mandi distribution & logistics routes', roles: ['seller', 'farmer', 'admin', 'buyer'], keywords: ['map', 'geography', 'mandis', 'locations'] },
    { key: 'forecasts', label: 'Forecasts', path: '/forecasts', desc: 'Commodity price forecast charts & volatility', roles: ['seller', 'admin'], keywords: ['forecasts', 'future price', 'predictions', 'arima', 'xgboost'] },
    { key: 'farmer', label: 'Farmer Mode', path: '/farmer', desc: 'Farmer crop planner, fair pricing & buyer demand', roles: ['farmer', 'admin', 'seller'], keywords: ['farmer mode', 'crop planner', 'harvest', 'farmer', 'net realization'] },
    { key: 'simulator', label: 'What-If Simulator', path: '/simulator', desc: 'Market shock simulator & price stress testing', roles: ['seller', 'admin'], keywords: ['simulator', 'what if', 'stress test', 'scenario'] },
    { key: 'alerts', label: 'Alerts', path: '/alerts', desc: 'Price drop, surge & weather notification alerts', roles: ['seller', 'farmer', 'admin'], keywords: ['alerts', 'notifications', 'warning', 'price alert'] },
    { key: 'models', label: 'Model Performance', path: '/models', desc: 'ML model accuracy, MAPE, RMSE metrics', roles: ['admin', 'seller'], keywords: ['models', 'accuracy', 'mape', 'rmse', 'ml'] },
    { key: 'settings', label: 'Settings', path: '/settings', desc: 'Language preferences, profile & configuration', roles: ['seller', 'farmer', 'admin', 'buyer'], keywords: ['settings', 'language', 'profile', 'preferences', 'theme'] },
  ];

  const matchedPages = ALL_PAGES.filter((p) => p.roles.includes(role)).filter((p) => {
    const combined = `${p.label} ${p.desc} ${p.keywords.join(' ')}`.toLowerCase();
    return tokens.some((tok) => combined.includes(tok.toLowerCase())) || primaryRegex.test(combined);
  });

  const totalCount =
    matchedListings.length +
    matchedRequirements.length +
    matchedSupplyPools.length +
    matchedTransactions.length +
    matchedLogistics.length +
    matchedAiMatches.length +
    matchedAlerts.length +
    matchedPages.length;

  let assistant = null;
  try {
    const { answerAssistantQuery } = await import('../services/chatbotService.js');
    assistant = await answerAssistantQuery({ query: rawQ, user: req.user });
  } catch {
    // fallback
  }

  res.json({
    query: rawQ,
    assistant,
    listings: matchedListings.slice(0, 6),
    requirements: matchedRequirements.slice(0, 6),
    supplyPools: matchedSupplyPools.slice(0, 6),
    transactions: matchedTransactions.slice(0, 6),
    logistics: matchedLogistics.slice(0, 6),
    matches: matchedAiMatches.slice(0, 6),
    alerts: matchedAlerts.slice(0, 5),
    pages: matchedPages.slice(0, 4),
    counts: {
      listings: matchedListings.length,
      requirements: matchedRequirements.length,
      supplyPools: matchedSupplyPools.length,
      transactions: matchedTransactions.length,
      logistics: matchedLogistics.length,
      matches: matchedAiMatches.length,
      alerts: matchedAlerts.length,
      pages: matchedPages.length,
    },
    totalCount,
    dataStatus: 'LIVE_SEARCH',
  });
});

export const assistantChat = asyncHandler(async (req, res) => {
  const { query } = req.body;
  const { answerAssistantQuery } = await import('../services/chatbotService.js');
  const result = await answerAssistantQuery({ query: query || '', user: req.user });
  res.json({
    dataStatus: 'AI_FORECAST',
    ...result,
  });
});
