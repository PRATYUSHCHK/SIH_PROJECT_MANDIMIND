function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

export function localOptimize(input) {
  const demand = input.predictedDemandKg ?? 480;
  const inventory = input.currentInventoryKg ?? 180;
  const safety = input.safetyStockKg ?? 80;
  const priceBuy = input.purchasePriceInr ?? 24;
  const priceSell = input.expectedSellingPriceInr ?? 32.4;
  const spoilage = input.spoilageProb ?? 0.08;
  const capacity = input.storageCapacityKg ?? 4000;
  const budget = input.budgetInr ?? 50000;
  const transport = input.transportCostPerKg ?? 1.2;
  const gap = Math.max(0, demand + safety - inventory);
  const affordable = Math.floor(budget / (priceBuy + transport));
  const qty = Math.min(gap, affordable, Math.max(0, capacity - inventory));
  const expectedProfit = Math.round(
    qty * (priceSell - priceBuy - transport) * (1 - spoilage) - Math.max(0, inventory - demand) * priceBuy * 0.08
  );
  const conf = clamp(0.86 - Math.abs(input.demandUncertainty ?? 0.12) * 0.4, 0.55, 0.93);
  let risk = 'LOW';
  if (spoilage > 0.25 || (input.oversupplyProb ?? 0) > 0.55) risk = 'HIGH';
  else if (spoilage > 0.12 || (input.oversupplyProb ?? 0) > 0.3) risk = 'MODERATE';
  return {
    action: qty > 40 ? 'BUY' : qty === 0 && inventory > demand * 1.15 ? 'HOLD_SELL' : 'HOLD',
    quantityKg: qty,
    expectedProfitInr: expectedProfit,
    confidence: Number(conf.toFixed(2)),
    risk,
    fallback: true,
  };
}

export function buildFactors({ demandDelta, inventoryDelta, priceDelta, supplyDelta, weatherDelta, spoilageDelta }) {
  return [
    { label: 'Demand', impactPct: demandDelta, direction: demandDelta >= 0 ? 'up' : 'down' },
    { label: 'Inventory', impactPct: inventoryDelta, direction: inventoryDelta >= 0 ? 'up' : 'down' },
    { label: 'Expected price', impactPct: priceDelta, direction: priceDelta >= 0 ? 'up' : 'down' },
    { label: 'Supply', impactPct: supplyDelta, direction: supplyDelta >= 0 ? 'up' : 'down' },
    { label: 'Weather impact', impactPct: weatherDelta, direction: weatherDelta >= 0 ? 'up' : 'down' },
    { label: 'Spoilage risk', impactPct: spoilageDelta, direction: spoilageDelta >= 0 ? 'up' : 'down' },
  ];
}
