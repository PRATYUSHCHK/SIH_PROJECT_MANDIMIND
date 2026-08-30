import mongoose from 'mongoose';

const predictionSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['demand', 'price', 'supply'], required: true },
    commodity: { type: mongoose.Schema.Types.ObjectId, ref: 'Commodity' },
    market: { type: mongoose.Schema.Types.ObjectId, ref: 'Market' },
    horizonDays: { type: Number, default: 1 },
    expected: { type: Number, required: true },
    lower: { type: Number, required: true },
    upper: { type: Number, required: true },
    confidence: { type: Number, required: true },
    modelVersion: { type: String, default: 'v1-demo' },
    dataStatus: { type: String, default: 'AI_FORECAST' },
    features: { type: Object },
  },
  { timestamps: true }
);

export const Prediction = mongoose.model('Prediction', predictionSchema);
