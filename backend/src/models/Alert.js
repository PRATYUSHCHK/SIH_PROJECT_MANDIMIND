import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['farmer', 'seller', 'buyer', 'admin', 'all'], default: 'all' },
    severity: { type: String, enum: ['info', 'moderate', 'high', 'critical'], default: 'info' },
    title: { type: String, required: true },
    body: { type: String, required: true },
    commodity: { type: String },
    read: { type: Boolean, default: false },
    dataStatus: { type: String, default: 'SIMULATED' },
  },
  { timestamps: true }
);

export const Alert = mongoose.model('Alert', alertSchema);
