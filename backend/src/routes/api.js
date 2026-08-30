import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { sellerDashboard } from '../controllers/dashboardController.js';
import {
  markets,
  commodities,
  marketCompare,
  mapData,
  inventory,
  elasticity,
  simulate,
  farmerRank,
  anomalies,
} from '../controllers/intelligenceController.js';
import { modelPerformance, adminOverview, alerts, markAlertRead } from '../controllers/adminController.js';
import { marketplaceRouter } from './marketplace.js';

export const apiRouter = Router();

apiRouter.use(requireAuth);
apiRouter.use('/marketplace', marketplaceRouter);
apiRouter.get('/dashboard/seller', requireRole('seller', 'admin'), sellerDashboard);
apiRouter.get('/markets', markets);
apiRouter.get('/commodities', commodities);
apiRouter.get('/markets/compare', requireRole('seller', 'admin'), marketCompare);
apiRouter.get('/map', mapData);
apiRouter.get('/inventory', requireRole('seller', 'admin'), inventory);
apiRouter.get('/elasticity', requireRole('seller', 'admin'), elasticity);
apiRouter.post('/simulate', requireRole('seller', 'admin'), simulate);
apiRouter.post('/farmer/rank', requireRole('farmer', 'admin'), farmerRank);
apiRouter.get('/anomalies', requireRole('seller', 'admin'), anomalies);
apiRouter.get('/models/performance', requireRole('admin', 'seller'), modelPerformance);
apiRouter.get('/admin/overview', requireRole('admin'), adminOverview);
apiRouter.get('/alerts', alerts);
apiRouter.patch('/alerts/:id/read', markAlertRead);
