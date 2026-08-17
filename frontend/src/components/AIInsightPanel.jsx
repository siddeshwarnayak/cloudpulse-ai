import { useTilt } from "../hooks/useTilt";
import { EmptyView } from "./StateViews";
import { anomalyTypeLabel, severityLabel } from "../utils/format";

export default function AIInsightPanel({ incident, aiEnabled }) {
  const tiltRef = useTilt();

  return (
    <div className="glass-card tilt panel insight-panel" ref={tiltRef}>
      <div className="section-title">AI Insight</div>

      {!incident ? (
        <EmptyView
          title="No AI insight yet"
          subtitle="Once an anomaly is detected, CloudPulse AI will explain the likely cause and recommended actions here."
        />
      ) : (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            <span className={`severity-chip severity-${incident.severity}`}>{severityLabel(incident.severity)}</span>
            <span className={`ai-badge ${incident.recommendation?.aiGenerated ? "" : "fallback"}`}>
              {incident.recommendation?.aiGenerated ? "AI generated" : "Rule-based fallback"}
            </span>
          </div>

          <div className="insight-block">
            <div className="insight-label">Anomaly</div>
            <div className="insight-text">{anomalyTypeLabel(incident.anomalyType)}</div>
          </div>

          <div className="insight-block">
            <div className="insight-label">Likely cause</div>
            <div className="insight-text">{incident.aiAnalysis}</div>
          </div>

          <div className="insight-block">
            <div className="insight-label">Impact</div>
            <div className="insight-text">{incident.recommendation?.impact}</div>
          </div>

          <div className="insight-block">
            <div className="insight-label">Recommended actions</div>
            <ul className="recommendation-list">
              {(incident.recommendation?.recommendations || []).map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          </div>

          {!aiEnabled && (
            <p className="text-muted" style={{ fontSize: "0.78rem", marginTop: 10 }}>
              Live AI analysis is off. Add ANTHROPIC_API_KEY to backend/.env to enable it.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
