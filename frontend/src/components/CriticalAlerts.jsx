import { useTilt } from "../hooks/useTilt";
import { EmptyView } from "./StateViews";
import { anomalyTypeLabel, formatRelativeTime, severityLabel } from "../utils/format";

export default function CriticalAlerts({ incidents }) {
  const tiltRef = useTilt();

  return (
    <div className="glass-card tilt panel" ref={tiltRef}>
      <div className="section-title">Critical Alerts</div>

      {incidents.length === 0 ? (
        <EmptyView title="No anomalies detected" subtitle="All monitored resources are operating normally." />
      ) : (
        <div>
          {incidents.slice(0, 6).map((incident) => (
            <div className="alert-item" key={incident.id}>
              <span className={`severity-chip severity-${incident.severity}`}>{severityLabel(incident.severity)}</span>
              <div className="alert-body">
                <div className="alert-title">{anomalyTypeLabel(incident.anomalyType)}</div>
                <div className="alert-meta">
                  {incident.resource?.resourceId || "Unknown resource"} · {formatRelativeTime(incident.detectedAt)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
