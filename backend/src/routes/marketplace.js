import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  createListing,
  getListings,
  getMyListings,
  updateListing,
  createRequirement,
  getRequirements,
  getMyRequirements,
  runMatching,
  getMatchById,
  getFairPrice,
  calculateLogistics,
  createOffer,
  acceptOffer,
  rejectOffer,
  getMyTransactions,
  updateTransactionStatus,
  payTransaction,
  getTradeOpportunities,
  createSupplyPool,
  getSupplyPools,
  getSupplyPoolById,
  contributeToSupplyPool,
  confirmSupplyPool,
  updatePickupStopStatus,
  advancePoolShipmentStatus,
  confirmPoolDelivery,
  settlePoolPayment,
  getShipments,
  getShipmentById,
  getTradeAnalysis,
} from '../controllers/marketplaceController.js';

export const marketplaceRouter = Router();

// Produce listings
marketplaceRouter.post('/listings', requireAuth, requireRole('farmer', 'seller', 'admin'), createListing);
marketplaceRouter.get('/listings', requireAuth, getListings);
marketplaceRouter.get('/listings/mine', requireAuth, requireRole('farmer', 'seller', 'admin'), getMyListings);
marketplaceRouter.patch('/listings/:id', requireAuth, requireRole('farmer', 'seller', 'admin'), updateListing);

// Buyer requirements
marketplaceRouter.post('/requirements', requireAuth, requireRole('buyer', 'admin'), createRequirement);
marketplaceRouter.get('/requirements', requireAuth, getRequirements);
marketplaceRouter.get('/requirements/mine', requireAuth, requireRole('buyer', 'admin'), getMyRequirements);

// AI matching & Trade Viability
marketplaceRouter.get('/matches', requireAuth, runMatching);
marketplaceRouter.get('/matches/:id', requireAuth, getMatchById);
marketplaceRouter.post('/trade-analysis', requireAuth, getTradeAnalysis);

// Supply Pooling (Multi-farmer Aggregation & Fulfillment Lifecycle)
marketplaceRouter.post('/pools', requireAuth, requireRole('farmer', 'seller', 'buyer', 'admin'), createSupplyPool);
marketplaceRouter.get('/pools', requireAuth, getSupplyPools);
marketplaceRouter.get('/pools/:id', requireAuth, getSupplyPoolById);
marketplaceRouter.post('/pools/:id/contribute', requireAuth, requireRole('farmer', 'seller', 'admin'), contributeToSupplyPool);
marketplaceRouter.post('/pools/:id/confirm', requireAuth, requireRole('buyer', 'admin'), confirmSupplyPool);
marketplaceRouter.patch('/pools/:id/pickup-stop', requireAuth, updatePickupStopStatus);
marketplaceRouter.patch('/pools/:id/advance-shipment', requireAuth, advancePoolShipmentStatus);
marketplaceRouter.post('/pools/:id/confirm-delivery', requireAuth, requireRole('buyer', 'admin'), confirmPoolDelivery);
marketplaceRouter.post('/pools/:id/settle', requireAuth, requireRole('buyer', 'admin', 'farmer', 'seller'), settlePoolPayment);

// Shipments (Consolidated Logistics & Direct Trade Shipments)
marketplaceRouter.get('/shipments', requireAuth, getShipments);
marketplaceRouter.get('/shipments/:id', requireAuth, getShipmentById);

// Fair price
marketplaceRouter.get('/fair-price', requireAuth, getFairPrice);

// Logistics calculation
marketplaceRouter.get('/logistics', requireAuth, calculateLogistics);

// Offers (Direct Trade)
marketplaceRouter.post('/offers', requireAuth, requireRole('buyer', 'farmer', 'seller', 'admin'), createOffer);
marketplaceRouter.patch('/offers/:id/accept', requireAuth, requireRole('farmer', 'seller', 'buyer', 'admin'), acceptOffer);
marketplaceRouter.patch('/offers/:id/reject', requireAuth, requireRole('farmer', 'seller', 'buyer', 'admin'), rejectOffer);

// Transactions & Settlement
marketplaceRouter.get('/transactions', requireAuth, getMyTransactions);
marketplaceRouter.patch('/transactions/:id/status', requireAuth, updateTransactionStatus);
marketplaceRouter.post('/transactions/:id/pay', requireAuth, payTransaction);

// Trade opportunities
marketplaceRouter.get('/opportunities', requireAuth, getTradeOpportunities);
