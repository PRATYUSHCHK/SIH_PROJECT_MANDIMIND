import mongoose from 'mongoose';

const modelPerformanceSchema = new mongoose.Schema(
  {
    modelName: { type: String, required: true },
    metric: { type: String, required: true },
    baselineValue: { type: Number, required: true },
    mandimindValue: { type: Number, required: true },
    notes: { type: String },
    dataStatus: { type: String, default: 'HISTORICAL' },
  },
  { timestamps: true }
);

export const ModelPerformance = mongoose.model('ModelPerformance', modelPerformanceSchema);
