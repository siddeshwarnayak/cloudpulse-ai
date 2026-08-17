import { useTilt } from "../hooks/useTilt";
import { formatCount, formatPercent, formatSeconds, resourceTypeLabel } from "../utils/format";

export default function ResourceCard({ resource }) {
  const tiltRef = useTilt();
  const metric = resource.latestMetric;

  const statusClass =
    resource.openIncidentCount > 0
      ? resource.status === "degraded"
        ? "status-critical"
        : "status-warning"
      : "status-healthy";

  return (
    <div className="glass-card tilt resource-card" ref={tiltRef}>
      <div className="resource-card-header">
        <span className="resource-type-badge">{resource.resourceType.toUpperCase()}</span>
        <span className={`status-dot ${statusClass}`} aria-hidden="true" />
      </div>

      <div>
        <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>{resource.resourceId}</div>
        <div className="text-muted" style={{ fontSize: "0.78rem" }}>
          {resourceTypeLabel(resource.resourceType)} · {resource.region}
        </div>
      </div>

      <div className="resource-metrics-row">
        {metric?.cpu != null && (
          <div className="resource-metric">
            <span className="resource-metric-label">CPU</span>
            <span className="resource-metric-value mono">{formatPercent(metric.cpu)}</span>
          </div>
        )}
        {metric?.memory != null && (
          <div className="resource-metric">
            <span className="resource-metric-label">Memory</span>
            <span className="resource-metric-value mono">{formatPercent(metric.memory)}</span>
          </div>
        )}
        <div className="resource-metric">
          <span className="resource-metric-label">Requests</span>
          <span className="resource-metric-value mono">{formatCount(metric?.requestCount ?? 0)}/tick</span>
        </div>
        <div className="resource-metric">
          <span className="resource-metric-label">Response</span>
          <span className="resource-metric-value mono">{formatSeconds(metric?.responseTime ?? 0)}</span>
        </div>
      </div>

      {resource.openIncidentCount > 0 && (
        <div className="text-muted" style={{ fontSize: "0.78rem" }}>
          {resource.openIncidentCount} open anomal{resource.openIncidentCount === 1 ? "y" : "ies"}
        </div>
      )}
    </div>
  );
}
