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

// AI matching
marketplaceRouter.get('/matches', requireAuth, runMatching);
marketplaceRouter.get('/matches/:id', requireAuth, getMatchById);

// Fair price
marketplaceRouter.get('/fair-price', requireAuth, getFairPrice);

// Logistics
marketplaceRouter.get('/logistics', requireAuth, calculateLogistics);

// Offers
marketplaceRouter.post('/offers', requireAuth, requireRole('buyer', 'farmer', 'seller', 'admin'), createOffer);
marketplaceRouter.patch('/offers/:id/accept', requireAuth, requireRole('farmer', 'seller', 'buyer', 'admin'), acceptOffer);
marketplaceRouter.patch('/offers/:id/reject', requireAuth, requireRole('farmer', 'seller', 'buyer', 'admin'), rejectOffer);

// Transactions & Settlement
marketplaceRouter.get('/transactions', requireAuth, getMyTransactions);
marketplaceRouter.patch('/transactions/:id/status', requireAuth, updateTransactionStatus);
marketplaceRouter.post('/transactions/:id/pay', requireAuth, payTransaction);

// Trade opportunities
marketplaceRouter.get('/opportunities', requireAuth, getTradeOpportunities);
