import { RiskBadge } from './RiskBadge.jsx';

export function MarketComparisonTable({ rows = [], why, recommendedMarket }) {
  const top = recommendedMarket || (rows.find((r) => r.recommended) || rows[0]);

  return (
    <div className="space-y-6">
      {top && (
        <div className="relative overflow-hidden rounded-xl border border-forest/30 bg-earth/70 p-5 dark:border-harvest/30 dark:bg-night-card">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">🥇</span>
              <span className="text-xs font-extrabold uppercase tracking-widest text-forest dark:text-harvest">
                Recommended Market Highlight
              </span>
            </div>
            <span className="rounded-full bg-forest px-3 py-1 text-xs font-bold text-white dark:bg-harvest dark:text-ink">
              BEST NET PROFIT
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <h3 className="text-2xl font-extrabold text-forest-ink dark:text-night-text">{top.name || top.market}</h3>
              <div className="text-xs text-mute">{top.city}</div>
            </div>
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wider text-mute">Expected Net Profit</div>
              <div className="text-2xl font-extrabold tabular text-forest dark:text-harvest">
                ₹{top.expectedProfitInrPerKg}/kg
              </div>
              <div className="text-xs font-semibold text-mute">
                Total batch profit: ₹{(top.totalExpectedProfitInr || Math.round(top.expectedProfitInrPerKg * 500)).toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 rounded-lg bg-white/80 p-3 dark:bg-night-lift/60 sm:grid-cols-3">
            <div>
              <div className="text-[11px] uppercase text-mute">Gross Selling Price</div>
              <div className="font-bold tabular text-ink dark:text-night-text">₹{top.expectedSellingPriceInr}/kg</div>
            </div>
            <div>
              <div className="text-[11px] uppercase text-mute">Transport Cost</div>
              <div className="font-bold tabular text-ink dark:text-night-text">₹{top.transportInr}/kg</div>
            </div>
            <div>
              <div className="text-[11px] uppercase text-mute">Risk Level</div>
              <div className="mt-0.5">
                <RiskBadge risk={top.risk} />
              </div>
            </div>
          </div>

          <div className="mt-3 text-xs text-ink/80 dark:text-night-text/80">
            <span className="font-bold text-forest dark:text-harvest">Selection Rationale: </span>
            {top.reason || why || `Provides the best risk-adjusted net return after transportation and mandi fees.`}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[840px] text-left text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-mute border-b border-line dark:border-night-mute/30">
              <th className="pb-3">Market</th>
              <th>Selling Price</th>
              <th>Purchase Cost</th>
              <th>Transport</th>
              <th>Fees & Spoilage</th>
              <th>Net Profit / kg</th>
              <th>Total Profit (500 kg)</th>
              <th>Risk</th>
              <th>AI Score</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/60 dark:divide-night-mute/20">
            {rows.map((r) => (
              <tr key={r.slug} className={r.recommended ? 'bg-earth/80 font-medium dark:bg-night-lift/80' : ''}>
                <td className="py-3 font-semibold">
                  {r.market}
                  <div className="text-xs font-normal text-mute">{r.city}</div>
                </td>
                <td className="tabular font-medium">₹{r.expectedSellingPriceInr}</td>
                <td className="tabular text-mute">₹{r.purchasePriceInr}</td>
                <td className="tabular text-mute">₹{r.transportInr}</td>
                <td className="tabular text-xs text-mute">₹{((r.handlingInr || 0.4) + (r.commissionInr || 0.5) + (r.spoilageLossInr || 0.5)).toFixed(2)}</td>
                <td className="tabular font-extrabold text-forest dark:text-harvest">₹{r.expectedProfitInrPerKg}</td>
                <td className="tabular font-bold text-ink dark:text-night-text">₹{(r.totalExpectedProfitInr || Math.round(r.expectedProfitInrPerKg * 500)).toLocaleString('en-IN')}</td>
                <td>
                  <RiskBadge risk={r.risk} />
                </td>
                <td className="tabular font-bold">{r.aiScore}</td>
                <td>{r.recommended && <span className="rounded-full bg-forest/10 px-2.5 py-1 text-xs font-bold text-forest dark:bg-harvest/10 dark:text-harvest">🥇 Recommended</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
