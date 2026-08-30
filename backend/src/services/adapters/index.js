/**
 * Data adapter layer. Live government APIs are not wired by default.
 * Implementations must never fabricate "LIVE" status for seeded data.
 */
import { config } from '../../config/index.js';

export const adapters = {
  agmarknet: {
    name: 'AGMARKNET / e-NAM',
    available: false,
    reason: 'Not connected in this demo. Using simulated historical-style series.',
  },
  weather: {
    name: 'Weather adapter',
    available: false,
    reason: 'No weather API key configured. Using simulated weather records.',
  },
  userTransactions: {
    name: 'User-entered transactions',
    available: true,
  },
};

export function sourceCatalog() {
  return {
    dataMode: config.dataMode,
    adapters,
    note: 'If an adapter is unavailable, MandiMind uses clearly labelled SIMULATED DEMO DATA.',
  };
}
