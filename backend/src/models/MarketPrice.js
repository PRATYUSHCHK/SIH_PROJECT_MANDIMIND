import mongoose from 'mongoose';

const marketPriceSchema = new mongoose.Schema(
  {
    market: { type: mongoose.Schema.Types.ObjectId, ref: 'Market', required: true },
    commodity: { type: mongoose.Schema.Types.ObjectId, ref: 'Commodity', required: true },
    date: { type: Date, required: true },
    modalPriceInr: { type: Number, required: true },
    minPriceInr: { type: Number, required: true },
    maxPriceInr: { type: Number, required: true },
    dataStatus: { type: String, default: 'SIMULATED' },
  },
  { timestamps: true }
);

marketPriceSchema.index({ market: 1, commodity: 1, date: 1 });

export const MarketPrice = mongoose.model('MarketPrice', marketPriceSchema);
