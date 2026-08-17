export function LoadingView({ label = "Loading data…" }) {
  return (
    <div className="state-view">
      <div className="spinner" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}

export function EmptyView({ title, subtitle }) {
  return (
    <div className="state-view">
      <div className="state-icon">◇</div>
      <h4>{title}</h4>
      {subtitle && <p>{subtitle}</p>}
    </div>
  );
}

export function ErrorView({ title = "Something went wrong", subtitle, onRetry }) {
  return (
    <div className="state-view state-view-error">
      <div className="state-icon">!</div>
      <h4>{title}</h4>
      {subtitle && <p>{subtitle}</p>}
      {onRetry && (
        <button className="btn-retry" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function BackendUnavailableView({ onRetry }) {
  return (
    <ErrorView
      title="Can't reach the CloudPulse backend"
      subtitle="Make sure the backend is running (npm run dev in /backend) and PostgreSQL is up (docker compose up -d)."
      onRetry={onRetry}
    />
  );
}
