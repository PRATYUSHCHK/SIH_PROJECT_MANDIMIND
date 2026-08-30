export function InventoryHealth({ items = [] }) {
  return (
    <div className="space-y-3">
      {items.map((i) => (
        <div key={i.slug} className="flex items-center justify-between rounded-mm border border-line px-3 py-3 dark:border-night-mute/20">
          <div>
            <div className="font-semibold">{i.commodity}</div>
            <div className="text-xs text-mute">
              {i.quantityKg} kg · {i.ageDays}d old
            </div>
          </div>
          <div className="text-right text-xs font-semibold uppercase">
            <div>{i.status}</div>
            <div className="text-mute">spoilage {i.spoilageRisk}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
