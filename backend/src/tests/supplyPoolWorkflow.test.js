import mongoose from 'mongoose';
import { config } from '../config/index.js';
import { seed } from '../seed/seed.js';
import { SupplyPool, Transaction, Shipment, User, BuyerRequirement, ProduceListing } from '../models/index.js';
import {
  confirmSupplyPool,
  updatePickupStopStatus,
  advancePoolShipmentStatus,
  confirmPoolDelivery,
  settlePoolPayment,
} from '../controllers/marketplaceController.js';
import { answerAssistantQuery } from '../services/chatbotService.js';

async function runEndToEndVerification() {
  console.log('--- STARTING MANDIMIND SUPPLY POOL E2E VERIFICATION ---');

  // Connect to MongoDB
  await mongoose.connect(config.mongoUri);
  console.log('✓ Connected to MongoDB');

  // 1. Seed fresh database
  await seed({ force: true });
  console.log('✓ Seeded database with Potato demo scenario');

  // 2. Fetch seeded Potato supply pool
  const pool = await SupplyPool.findOne({ commodityName: 'Potato' })
    .populate('buyer')
    .populate('contributors.farmer');

  if (!pool) throw new Error('Potato supply pool not found after seeding!');
  console.log(`✓ Retrieved Supply Pool: ${pool.poolCode} (${pool.commodityName}, ${pool.collectedQuantityKg}/${pool.targetQuantityKg} kg collected)`);
  console.log(`  Status: ${pool.status}`);
  console.log(`  Buyer: ${pool.buyerName}`);
  console.log(`  Contributors: ${pool.contributors.map(c => `${c.farmerName} (${c.quantityKg}kg)`).join(', ')}`);

  // Assert target reached
  if (pool.status !== 'target_reached') throw new Error(`Expected status target_reached, got ${pool.status}`);

  // Test Assistant before confirmation
  const farmer1 = pool.contributors[0].farmer;
  const q1 = await answerAssistantQuery({ query: 'What happens after we collect 1000 kg?', user: farmer1 });
  console.log(`✓ Assistant Q1 ("What happens after..."): "${q1.answer}"`);

  // 3. Buyer confirms the pool
  const buyerUser = pool.buyer;
  const mockReqConfirm = {
    params: { id: pool._id.toString() },
    user: buyerUser,
  };

  let confirmResponseData = null;
  const mockResConfirm = {
    json: (data) => { confirmResponseData = data; },
  };

  await confirmSupplyPool(mockReqConfirm, mockResConfirm);
  console.log('✓ Buyer confirmed pooled order');

  const poolAfterConfirm = await SupplyPool.findById(pool._id);
  const tx = await Transaction.findById(poolAfterConfirm.poolTransaction);
  const shipment = await Shipment.findById(poolAfterConfirm.shipment);

  if (poolAfterConfirm.status !== 'buyer_confirmed') throw new Error(`Expected buyer_confirmed, got ${poolAfterConfirm.status}`);
  if (!tx || !tx.isPoolOrder) throw new Error('Pool Transaction not created or missing isPoolOrder flag');
  if (!shipment || shipment.pickupStops.length !== 2) throw new Error('Consolidated Shipment not created or missing pickup stops');

  console.log(`✓ Pool Transaction created: #${tx.orderNumber || tx._id} (Value: ₹${tx.totalValueInr}, Total Qty: ${tx.quantityKg}kg)`);
  console.log(`✓ Consolidated Shipment created: #${shipment.shipmentNumber} (Vehicle: ${shipment.vehicle.modelName}, ${shipment.pickupStops.length} stops)`);

  // 4. Test Multi-Stop Pickups
  console.log('--- EXECUTING MULTI-STOP PICKUPS ---');
  // Stop 1: Ravi Reddy
  await updatePickupStopStatus(
    { params: { id: pool._id.toString() }, body: { stopIndex: 0, status: 'picked_up' }, user: buyerUser },
    { json: () => {} }
  );
  console.log('✓ Stop 1 Picked Up (Ravi Reddy 900kg)');

  // Stop 2: dhanush
  await updatePickupStopStatus(
    { params: { id: pool._id.toString() }, body: { stopIndex: 1, status: 'picked_up' }, user: buyerUser },
    { json: () => {} }
  );
  console.log('✓ Stop 2 Picked Up (dhanush 100kg)');

  const poolAfterPickups = await SupplyPool.findById(pool._id);
  const shipmentAfterPickups = await Shipment.findById(poolAfterConfirm.shipment);
  if (shipmentAfterPickups.status !== 'consolidated' || poolAfterPickups.status !== 'consolidated') {
    throw new Error(`Expected consolidated after all stops picked up, got ${shipmentAfterPickups.status}`);
  }
  console.log('✓ Produce fully consolidated in cargo vehicle! (Status: consolidated)');

  // 5. Advance to In Transit & Arriving
  console.log('--- TRANSIT & ARRIVAL ---');
  await advancePoolShipmentStatus(
    { params: { id: pool._id.toString() }, body: { nextStatus: 'in_transit' }, user: buyerUser },
    { json: () => {} }
  );
  console.log('✓ Shipment in transit');

  // Test Assistant during in-transit
  const q2 = await answerAssistantQuery({ query: 'Where is my potato?', user: farmer1 });
  console.log(`✓ Assistant Q2 ("Where is my potato?"): "${q2.answer}"`);

  await advancePoolShipmentStatus(
    { params: { id: pool._id.toString() }, body: { nextStatus: 'arriving' }, user: buyerUser },
    { json: () => {} }
  );
  console.log('✓ Shipment arriving at destination');

  // 6. Confirm Delivery Receipt by Buyer
  console.log('--- DELIVERY CONFIRMATION ---');
  await confirmPoolDelivery(
    { params: { id: pool._id.toString() }, user: buyerUser },
    { json: () => {} }
  );

  const poolDelivered = await SupplyPool.findById(pool._id);
  if (poolDelivered.status !== 'delivered') throw new Error(`Expected delivered, got ${poolDelivered.status}`);
  const allReady = poolDelivered.contributors.every(c => c.settlementStatus === 'ready');
  if (!allReady) throw new Error('Expected all contributors to have settlementStatus ready');
  console.log('✓ Delivery confirmed by buyer! All farmer settlement statuses set to READY.');

  // 7. Execute Settlement
  console.log('--- SETTLEMENT & PAYOUT ---');
  let settleResult = null;
  await settlePoolPayment(
    { params: { id: pool._id.toString() }, body: { paymentMethod: 'UPI Multi-Party Disbursement' }, user: buyerUser },
    { json: (data) => { settleResult = data; } }
  );

  const poolFinal = await SupplyPool.findById(pool._id);
  const txFinal = await Transaction.findById(poolFinal.poolTransaction);
  const shipmentFinal = await Shipment.findById(poolFinal.shipment);

  if (poolFinal.status !== 'completed' || txFinal.status !== 'completed' || shipmentFinal.status !== 'completed') {
    throw new Error('Expected all entities to be COMPLETED');
  }

  console.log('✓ Settlement completed successfully!');
  console.log('✓ Farmer-Wise Payout Breakdown:');
  settleResult.settlements.forEach((s) => {
    console.log(`  • ${s.farmerName} (${s.location}): ${s.verifiedQuantityKg} kg @ ₹${s.agreedPriceInr}/kg = ₹${s.grossPayoutInr.toLocaleString('en-IN')} [Tx: ${s.settlementTxId}]`);
  });

  console.log('--- ALL E2E VERIFICATION CHECKS PASSED SUCCESSFULLY ---');
  await mongoose.disconnect();
}

runEndToEndVerification().catch((err) => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
