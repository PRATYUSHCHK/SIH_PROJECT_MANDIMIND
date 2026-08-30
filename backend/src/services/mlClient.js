import { config } from '../config/index.js';

async function post(path, body) {
  const res = await fetch(`${config.mlServiceUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ML service ${path} failed: ${res.status} ${text}`);
  }
  return res.json();
}

export const mlClient = {
  async health() {
    try {
      const res = await fetch(`${config.mlServiceUrl}/health`, { signal: AbortSignal.timeout(3000) });
      return res.ok;
    } catch {
      return false;
    }
  },
  forecastDemand: (payload) => post('/forecast/demand', payload),
  forecastPrice: (payload) => post('/forecast/price', payload),
  forecastSupply: (payload) => post('/forecast/supply', payload),
  elasticity: (payload) => post('/elasticity', payload),
  spoilage: (payload) => post('/spoilage', payload),
  optimize: (payload) => post('/optimize', payload),
  explain: (payload) => post('/explain', payload),
  simulate: (payload) => post('/simulate', payload),
  anomalies: (payload) => post('/anomalies', payload),
  farmerRank: (payload) => post('/farmer/rank', payload),
  performance: () => fetch(`${config.mlServiceUrl}/performance`).then((r) => r.json()),
};
