import mongoose from 'mongoose';

const simulationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    commodity: { type: String, required: true },
    inputs: { type: Object, required: true },
    baseline: { type: Object, required: true },
    simulated: { type: Object, required: true },
    dataStatus: { type: String, default: 'SIMULATED' },
  },
  { timestamps: true }
);

export const Simulation = mongoose.model('Simulation', simulationSchema);
