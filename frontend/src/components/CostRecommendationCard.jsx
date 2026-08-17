import { useTilt } from "../hooks/useTilt";
import { formatCurrency, formatPercent } from "../utils/format";

export default function CostRecommendationCard({ cost }) {
  const tiltRef = useTilt();
  const rec = cost.recommendation || {};

  return (
    <div className="glass-card tilt cost-card" ref={tiltRef}>
      <div className="resource-card-header">
        <div>
          <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>{cost.resource?.resourceId}</div>
          <div className="text-muted" style={{ fontSize: "0.78rem" }}>
            {cost.resource?.resourceType?.toUpperCase()} · Utilization {formatPercent(cost.utilization)}
          </div>
        </div>
        <span className={`ai-badge ${rec.aiGenerated ? "" : "fallback"}`}>{rec.aiGenerated ? "AI" : "Rule-based"}</span>
      </div>

      <p className="insight-text" style={{ marginTop: 10 }}>
        {rec.explanation}
      </p>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
        <div>
          <div className="estimated-label">Estimated monthly saving</div>
          <div className="saving-badge mono">{formatCurrency(rec.estimatedMonthlySaving)}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="estimated-label">Recommended</div>
          <div style={{ fontSize: "0.85rem" }}>{rec.recommendedSize}</div>
        </div>
      </div>
    </div>
  );
}
