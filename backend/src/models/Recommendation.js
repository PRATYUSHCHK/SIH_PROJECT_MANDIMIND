import mongoose from 'mongoose';

const recommendationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    commodity: { type: mongoose.Schema.Types.ObjectId, ref: 'Commodity' },
    quantityKg: { type: Number },
    expectedProfitInr: { type: Number },
    confidence: { type: Number },
    risk: { type: String, enum: ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'] },
    factors: [{ label: String, impactPct: Number, direction: String }],
    explanation: { type: Object },
    dataStatus: { type: String, default: 'AI_FORECAST' },
  },
  { timestamps: true }
);

export const Recommendation = mongoose.model('Recommendation', recommendationSchema);
