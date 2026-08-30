export function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-40 rounded-mm bg-line/70 dark:bg-night-lift" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-24 rounded-mm bg-line/70 dark:bg-night-lift" />
        <div className="h-24 rounded-mm bg-line/70 dark:bg-night-lift" />
        <div className="h-24 rounded-mm bg-line/70 dark:bg-night-lift" />
      </div>
      <div className="h-64 rounded-mm bg-line/70 dark:bg-night-lift" />
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="rounded-mm border border-alert/30 bg-white p-8 text-center dark:bg-night-card">
      <h2 className="text-lg font-bold">Something went wrong</h2>
      <p className="mt-2 text-sm text-mute">{message || 'The request failed. Check the API and try again.'}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-4 rounded-full bg-forest px-4 py-2 text-sm font-semibold text-white">
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, body }) {
  return (
    <div className="rounded-mm border border-dashed border-line p-10 text-center">
      <h2 className="font-bold">{title}</h2>
      <p className="mt-2 text-sm text-mute">{body}</p>
    </div>
  );
}
