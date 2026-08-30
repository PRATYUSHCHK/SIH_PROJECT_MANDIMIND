import { motion } from 'framer-motion';

export function WhyRecommendationDrawer({ open, onClose, rec }) {
  if (!open || !rec) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-forest-ink/30" onClick={onClose} role="presentation">
      <motion.aside
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="h-full w-full max-w-md overflow-y-auto border-l border-line bg-white p-6 dark:border-night-mute/20 dark:bg-night-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Recommendation explanation"
      >
        <div className="text-[11px] font-bold uppercase tracking-widest text-harvest">Why?</div>
        <h3 className="mt-2 text-2xl font-bold">Why {rec.headline?.toLowerCase()}?</h3>
        <p className="mt-2 text-sm text-mute">Feature attributions from the demand model. This is decision support, not a guaranteed outcome.</p>
        <ul className="mt-6 space-y-3">
          {(rec.factors || rec.why?.factors || []).map((f) => (
            <li key={f.label} className="flex items-center justify-between rounded-mm border border-line px-3 py-3 dark:border-night-mute/20">
              <span>{f.label}</span>
              <span className="tabular font-semibold">
                {f.impactPct > 0 ? '+' : ''}
                {f.impactPct}%
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-6 text-sm">
          Model confidence: <strong>{Math.round((rec.confidence > 1 ? rec.confidence : rec.confidence * 100) || 0)}%</strong>
        </div>
        <button type="button" onClick={onClose} className="mt-8 w-full rounded-full border border-line py-2.5 text-sm font-semibold">
          Close
        </button>
      </motion.aside>
    </div>
  );
}
