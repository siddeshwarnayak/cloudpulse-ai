import { useState } from "react";
import { usePolling } from "../hooks/usePolling";
import { api } from "../services/api";
import { LoadingView, BackendUnavailableView, EmptyView } from "../components/StateViews";
import { anomalyTypeLabel, formatRelativeTime, severityLabel } from "../utils/format";

export default function Anomalies() {
  const [filter, setFilter] = useState("open");
  const { data: incidents, error, loading, refetch } = usePolling(() => api.anomalies.list(filter), {
    intervalMs: 4000,
    deps: [filter],
  });

  const [resolving, setResolving] = useState(null);

  async function handleResolve(id) {
    setResolving(id);
    try {
      await api.anomalies.resolve(id);
      await refetch();
    } catch {
      // resolve failures surface via refetch's own error state on the next poll
    } finally {
      setResolving(null);
    }
  }

  if (loading && !incidents) return <LoadingView label="Loading anomalies…" />;
  if (error && !incidents) return <BackendUnavailableView onRetry={refetch} />;

  const list = incidents || [];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <h2>Anomalies</h2>
        <div style={{ display: "flex", gap: 6 }}>
          {["open", "resolved"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="btn-retry"
              style={{
                background: filter === f ? "var(--glass-strong)" : "rgba(255,255,255,0.5)",
                fontWeight: filter === f ? 600 : 500,
              }}
            >
              {f === "open" ? "Open" : "Resolved"}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card panel">
        {list.length === 0 ? (
          <EmptyView
            title={filter === "open" ? "No open anomalies" : "No resolved anomalies yet"}
            subtitle={filter === "open" ? "All monitored resources are operating normally." : undefined}
          />
        ) : (
          list.map((incident) => (
            <div className="alert-item" key={incident.id}>
              <span className={`severity-chip severity-${incident.severity}`}>{severityLabel(incident.severity)}</span>
              <div className="alert-body">
                <div className="alert-title">{anomalyTypeLabel(incident.anomalyType)}</div>
                <div className="alert-meta">
                  {incident.resource?.resourceId} · {formatRelativeTime(incident.detectedAt)}
                </div>
                {incident.aiAnalysis && (
                  <p className="text-muted" style={{ fontSize: "0.85rem", marginTop: 6 }}>
                    {incident.aiAnalysis}
                  </p>
                )}
              </div>
              {filter === "open" && (
                <button className="btn-retry" disabled={resolving === incident.id} onClick={() => handleResolve(incident.id)}>
                  {resolving === incident.id ? "Resolving…" : "Resolve"}
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
