import { ModelPerformance, Alert } from '../models/index.js';
import { sourceCatalog } from '../services/adapters/index.js';
import { mlClient } from '../services/mlClient.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { dataBadge } from '../services/dataStatus.js';

export const modelPerformance = asyncHandler(async (req, res) => {
  const rows = await ModelPerformance.find();
  let live = null;
  try {
    live = await mlClient.performance();
  } catch {
    live = null;
  }
  res.json({
    dataStatus: 'HISTORICAL',
    badge: dataBadge(),
    note: 'Metrics are from the demo evaluation split. They are not a claim of live production accuracy.',
    rows,
    live,
  });
});

export const adminOverview = asyncHandler(async (req, res) => {
  const alerts = await Alert.find({ $or: [{ role: 'admin' }, { role: 'all' }] }).sort({ createdAt: -1 }).limit(12);
  const mlUp = await mlClient.health();
  res.json({
    dataStatus: 'SIMULATED',
    badge: dataBadge(),
    sources: sourceCatalog(),
    modelHealth: {
      status: mlUp ? 'healthy' : 'degraded',
      label: mlUp ? 'ML service reachable' : 'ML service unreachable — using labelled fallbacks',
    },
    alerts,
  });
});

export const alerts = asyncHandler(async (req, res) => {
  const items = await Alert.find({
    $or: [{ role: req.user.role }, { role: 'all' }, { user: req.user._id }],
  }).sort({ createdAt: -1 });
  res.json({ dataStatus: 'SIMULATED', items });
});

export const markAlertRead = asyncHandler(async (req, res) => {
  const item = await Alert.findByIdAndUpdate(req.params.id, { read: true }, { new: true });
  res.json({ item });
});
