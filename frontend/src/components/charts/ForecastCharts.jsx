import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export function DemandForecastChart({ historical = [], forecastSeries = [], anomalies = [] }) {
  const hist = historical.slice(-21).map((h, i) => ({
    i,
    hist: h.value ?? h,
    date: h.date,
  }));
  const last = hist.length;
  const merged = [...hist];
  forecastSeries.forEach((f, idx) => {
    merged.push({
      i: last + idx,
      expected: f.expected,
      lower: f.lower,
      upper: f.upper,
    });
  });
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <AreaChart data={merged}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E9E3" />
          <XAxis dataKey="i" hide />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Area dataKey="upper" stroke="none" fill="#166534" fillOpacity={0.08} />
          <Area dataKey="lower" stroke="none" fill="#F7F8F5" fillOpacity={1} />
          <Line type="monotone" dataKey="hist" stroke="#14532D" strokeWidth={2} dot={false} name="Historical" />
          <Line type="monotone" dataKey="expected" stroke="#EAB308" strokeDasharray="4 4" strokeWidth={2} dot={false} name="Forecast" />
        </AreaChart>
      </ResponsiveContainer>
      <p className="mt-2 text-xs text-mute">Shaded band is the prediction interval. Forecast is not a point certainty. {anomalies.length ? `${anomalies.length} anomalies flagged.` : ''}</p>
    </div>
  );
}

export function PriceForecastChart({ historical = [], current, expected, lower, upper }) {
  const data = historical.slice(-21).map((h, i) => ({ i, price: h.value ?? h }));
  data.push({ i: data.length, price: expected, bandLo: lower, bandHi: upper });
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E9E3" />
          <XAxis dataKey="i" hide />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Line type="monotone" dataKey="price" stroke="#166534" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-3 flex flex-wrap gap-6 text-sm">
        <div>
          <div className="text-[11px] uppercase text-mute">Current</div>
          <div className="tabular text-xl font-bold">₹{current}/kg</div>
        </div>
        <div>
          <div className="text-[11px] uppercase text-mute">Forecast range</div>
          <div className="tabular text-xl font-bold">
            ₹{lower}–₹{upper}/kg
          </div>
        </div>
      </div>
    </div>
  );
}

export function PredictionChart(props) {
  return <DemandForecastChart {...props} />;
}
