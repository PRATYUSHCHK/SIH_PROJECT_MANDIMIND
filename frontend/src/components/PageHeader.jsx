export function PageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-forest">{eyebrow}</div>}
        <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-mute">{subtitle}</p>}
      </div>
      {actions}
    </header>
  );
}
