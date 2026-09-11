import { SupplyPool, Transaction, Shipment, BuyerRequirement, ProduceListing } from '../models/index.js';

/**
 * Intelligent context-aware MandiMind Assistant
 * Understands Supply Pools, Direct Trades, Pickup Stops, Logistics, and Settlements.
 */
export async function answerAssistantQuery({ query, user }) {
  if (!query || query.trim().length === 0) {
    return {
      answer: "Hello! I am your MandiMind AI Assistant. You can ask me about your orders, supply pools, pickup schedules, shipment status, or payments.",
      contextType: 'GREETING',
    };
  }

  const cleanQ = query.toLowerCase().trim();
  const userId = user?._id;
  const role = user?.role || 'farmer';

  // Find user's active/recent supply pools and transactions
  let poolFilter = {};
  let txFilter = {};

  if (role === 'farmer' || role === 'seller') {
    poolFilter = { 'contributors.farmer': userId };
    txFilter = { $or: [{ farmer: userId }, { 'poolContributors.farmer': userId }] };
  } else if (role === 'buyer') {
    poolFilter = { buyer: userId };
    txFilter = { buyer: userId };
  }

  const pools = await SupplyPool.find(poolFilter)
    .populate('buyer', 'name location')
    .populate('commodity', 'name slug perishability')
    .populate('contributors.farmer', 'name location')
    .populate('shipment')
    .populate('poolTransaction')
    .sort({ updatedAt: -1 })
    .limit(10);

  const transactions = await Transaction.find(txFilter)
    .populate('buyer', 'name location')
    .populate('farmer', 'name location')
    .populate('supplyPool')
    .populate('shipment')
    .sort({ updatedAt: -1 })
    .limit(10);

  // 1. Intent: "What happens after..." / "What is next..." / "What happens after we collect..."
  if (
    cleanQ.includes('what happens') ||
    cleanQ.includes('next step') ||
    cleanQ.includes('what next') ||
    cleanQ.includes('after collect') ||
    cleanQ.includes('target reached')
  ) {
    // Check if there is a pool in target_reached or open
    const relevantPool = pools[0] || (await SupplyPool.findOne({ status: { $in: ['target_reached', 'buyer_confirmation_pending', 'open'] } }).populate('buyer', 'name'));
    const buyerName = relevantPool?.buyerName || relevantPool?.buyer?.name || 'the buyer';
    const commodity = relevantPool?.commodityName || 'produce';

    if (relevantPool && (relevantPool.status === 'target_reached' || relevantPool.status === 'buyer_confirmation_pending' || relevantPool.collectedQuantityKg >= relevantPool.targetQuantityKg)) {
      return {
        answer: `The required ${relevantPool.targetQuantityKg} kg ${commodity} quantity has been collected. The next step is for ${buyerName} to confirm the pooled order. After confirmation, MandiMind will create the combined delivery plan and assign a transport vehicle for pickup.`,
        contextType: 'SUPPLY_POOL_LIFECYCLE',
        poolId: relevantPool._id,
      };
    }

    if (relevantPool && relevantPool.status === 'buyer_confirmed') {
      return {
        answer: `The pooled order has been confirmed by ${buyerName}. The logistics coordination engine is planning the consolidated multi-stop pickup route and assigning a cargo vehicle.`,
        contextType: 'SUPPLY_POOL_LIFECYCLE',
        poolId: relevantPool._id,
      };
    }

    return {
      answer: `When the target quantity is collected in a Supply Pool, the status moves to Target Reached (Buyer Confirmation Pending). The buyer then reviews and confirms the pooled order, which generates the Combined Order Transaction and schedules consolidated pickup logistics.`,
      contextType: 'SUPPLY_POOL_LIFECYCLE',
    };
  }

  // 2. Intent: "Where is my potato/crop?" / "Where is my shipment/order?"
  if (
    cleanQ.includes('where is my') ||
    cleanQ.includes('where is the') ||
    cleanQ.includes('track') ||
    cleanQ.includes('shipment status') ||
    cleanQ.includes('location of')
  ) {
    // Check for commodity mentioned
    let targetPool = pools.find((p) => cleanQ.includes(p.commodityName.toLowerCase()));
    if (!targetPool && pools.length > 0) targetPool = pools[0];

    if (targetPool) {
      const buyerName = targetPool.buyerName || targetPool.buyer?.name || 'the buyer';
      const myContrib = targetPool.contributors.find((c) => c.farmer?.toString() === userId?.toString() || c.farmer?._id?.toString() === userId?.toString());
      const qtyText = myContrib ? `Your ${myContrib.quantityKg} kg contribution` : `The ${targetPool.collectedQuantityKg} kg pooled order`;

      if (targetPool.status === 'in_transit') {
        return {
          answer: `${qtyText} is part of the ${targetPool.targetQuantityKg} kg pooled order for ${buyerName}. The combined shipment is currently in transit to ${targetPool.destinationLocation}.`,
          contextType: 'SHIPMENT_STATUS',
          poolId: targetPool._id,
          status: targetPool.status,
        };
      }

      if (targetPool.status === 'pickup_scheduled' || targetPool.status === 'pickup_in_progress') {
        const pickupStatus = myContrib?.pickupStatus === 'picked_up' ? 'picked up' : 'scheduled for pickup';
        return {
          answer: `${qtyText} is allocated for ${buyerName}. Transporter pickup is currently ${pickupStatus} in the multi-farmer consolidation route.`,
          contextType: 'PICKUP_STATUS',
          poolId: targetPool._id,
          status: targetPool.status,
        };
      }

      if (targetPool.status === 'consolidated') {
        return {
          answer: `${qtyText} has been picked up from all participating farmers and fully consolidated into the vehicle. The shipment is preparing for transit to ${buyerName}.`,
          contextType: 'CONSOLIDATED_STATUS',
          poolId: targetPool._id,
        };
      }

      if (targetPool.status === 'delivered' || targetPool.status === 'completed') {
        return {
          answer: `${qtyText} has been successfully delivered to ${buyerName} at ${targetPool.destinationLocation}. Farmer payment settlement is ${myContrib?.settlementStatus === 'settled' ? 'completed' : 'ready'}.`,
          contextType: 'DELIVERY_STATUS',
          poolId: targetPool._id,
        };
      }

      if (targetPool.status === 'target_reached' || targetPool.status === 'buyer_confirmation_pending') {
        return {
          answer: `${qtyText} has reached the target ${targetPool.targetQuantityKg} kg goal and is awaiting confirmation from ${buyerName}.`,
          contextType: 'POOL_STATUS',
          poolId: targetPool._id,
        };
      }
    }

    // Check direct transactions
    const targetTx = transactions[0];
    if (targetTx) {
      return {
        answer: `Your order #${targetTx._id.toString().slice(-6)} for ${targetTx.commodityName} (${targetTx.quantityKg} kg) is currently in ${targetTx.status.replace('_', ' ')} status.`,
        contextType: 'TRANSACTION_STATUS',
        txId: targetTx._id,
      };
    }

    return {
      answer: `You do not have any active shipments in transit right now. Once a trade is confirmed and logistics are assigned, you can track it live here.`,
      contextType: 'GENERAL',
    };
  }

  // 3. Intent: Buyer asks "Has my order been collected?" / "Has potato been collected?"
  if (
    cleanQ.includes('collected') ||
    cleanQ.includes('has my') ||
    cleanQ.includes('pool collected')
  ) {
    const targetPool = pools[0] || (await SupplyPool.findOne().sort({ updatedAt: -1 }));
    if (targetPool) {
      const isTargetReached = targetPool.collectedQuantityKg >= targetPool.targetQuantityKg;
      return {
        answer: isTargetReached
          ? `Yes! The required ${targetPool.targetQuantityKg} kg of ${targetPool.commodityName} has been fully collected from ${targetPool.contributors.length} participating farmers. Status is ${targetPool.status.replace('_', ' ')}.`
          : `Currently, ${targetPool.collectedQuantityKg} kg out of ${targetPool.targetQuantityKg} kg ${targetPool.commodityName} has been collected from ${targetPool.contributors.length} farmers (${targetPool.targetQuantityKg - targetPool.collectedQuantityKg} kg remaining).`,
        contextType: 'COLLECTION_STATUS',
        poolId: targetPool._id,
      };
    }
  }

  // 4. Intent: Payment & Settlement ("When will I get paid?", "Settlement", "How much will I get?")
  if (
    cleanQ.includes('pay') ||
    cleanQ.includes('settle') ||
    cleanQ.includes('amount') ||
    cleanQ.includes('money') ||
    cleanQ.includes('price')
  ) {
    const targetPool = pools[0];
    if (targetPool && (role === 'farmer' || role === 'seller')) {
      const myContrib = targetPool.contributors.find((c) => c.farmer?.toString() === userId?.toString() || c.farmer?._id?.toString() === userId?.toString());
      if (myContrib) {
        const gross = myContrib.quantityKg * (myContrib.offeredPriceInr || targetPool.targetPriceInr);
        return {
          answer: `Your contribution of ${myContrib.quantityKg} kg @ ₹${myContrib.offeredPriceInr || targetPool.targetPriceInr}/kg totals ₹${gross.toLocaleString('en-IN')}. Payment is based on verified delivered quantity and agreed price upon buyer delivery confirmation.`,
          contextType: 'SETTLEMENT_INFO',
          poolId: targetPool._id,
        };
      }
    }

    return {
      answer: `Payments in MandiMind are based on verified delivered quantity and the agreed price. Once the buyer confirms delivery, farmer-wise settlements are generated and credited with zero hidden commissions.`,
      contextType: 'SETTLEMENT_INFO',
    };
  }

  // Default fallback response
  return {
    answer: `I can assist you with MandiMind trades. You can ask: "What happens after we collect 1000 kg?", "Where is my potato?", "Has my order been collected?", or check pickup routes and settlements.`,
    contextType: 'HELP',
  };
}
