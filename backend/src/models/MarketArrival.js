import mongoose from 'mongoose';

const marketArrivalSchema = new mongoose.Schema(
  {
    market: { type: mongoose.Schema.Types.ObjectId, ref: 'Market', required: true },
    commodity: { type: mongoose.Schema.Types.ObjectId, ref: 'Commodity', required: true },
    date: { type: Date, required: true },
    quantityKg: { type: Number, required: true },
    dataStatus: { type: String, default: 'SIMULATED' },
  },
  { timestamps: true }
);

marketArrivalSchema.index({ market: 1, commodity: 1, date: 1 });

export const MarketArrival = mongoose.model('MarketArrival', marketArrivalSchema);
