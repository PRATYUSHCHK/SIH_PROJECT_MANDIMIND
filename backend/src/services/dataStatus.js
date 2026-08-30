import { config } from '../config/index.js';

const DATA_LABEL = {
  LIVE: 'LIVE',
  HISTORICAL: 'HISTORICAL',
  SIMULATED: 'SIMULATED',
  AI_FORECAST: 'AI_FORECAST',
};

export function dataBadge() {
  return {
    mode: config.dataMode === 'live' ? DATA_LABEL.LIVE : DATA_LABEL.SIMULATED,
    disclaimer: 'Seeded values are simulated demo data, not live government market feeds.',
  };
}

export { DATA_LABEL };
