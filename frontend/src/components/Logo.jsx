export function Logo({ compact = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg viewBox="0 0 36 36" className="h-9 w-9" aria-hidden>
        <rect width="36" height="36" rx="10" fill="#14532D" />
        <path d="M8 24c7-12 12-16 19-18-2 9-7 16-19 18z" fill="#22C55E" />
        <polyline points="7,22 14,17 18,19 28,12" fill="none" stroke="#EAB308" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {!compact && (
        <div>
          <div className="text-[15px] font-extrabold tracking-tight text-forest-ink dark:text-night-text">MandiMind</div>
          <div className="text-[10px] uppercase tracking-[0.14em] text-mute dark:text-night-mute">Market intelligence</div>
        </div>
      )}
    </div>
  );
}
