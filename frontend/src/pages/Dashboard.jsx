import { usePolling } from "../hooks/usePolling";
import { api } from "../services/api";
import StatCard from "../components/StatCard";
import InfraVisualization from "../components/InfraVisualization";
import MetricChart from "../components/MetricChart";
import CriticalAlerts from "../components/CriticalAlerts";
import AIInsightPanel from "../components/AIInsightPanel";
import { LoadingView, BackendUnavailableView } from "../components/StateViews";
import { formatCurrency, formatCount } from "../utils/format";

export default function Dashboard({ onHealthChange }) {
  const resourcesPoll = usePolling(() => api.resources.list(), { intervalMs: 4000 });
  const anomaliesPoll = usePolling(() => api.anomalies.list("open"), { intervalMs: 4000 });
  const costPoll = usePolling(() => api.cost.summary(), { intervalMs: 6000 });
  const metricsPoll = usePolling(() => api.metrics.recent(60), { intervalMs: 4000 });
  const healthPoll = usePolling(() => api.health(), { intervalMs: 10000 });

  const loading = resourcesPoll.loading || anomaliesPoll.loading;
  const hardError = resourcesPoll.error && !resourcesPoll.data;

  if (loading && !resourcesPoll.data) return <LoadingView label="Connecting to CloudPulse backend…" />;
  if (hardError) return <BackendUnavailableView onRetry={resourcesPoll.refetch} />;

  const resources = resourcesPoll.data || [];
  const openIncidents = anomaliesPoll.data || [];
  const costSummary = costPoll.data;
  const recentMetrics = metricsPoll.data || [];

  // Compute current per-resource state from open incidents (active only).
  const resourceSeverityMap = {};
  // Map resourceId -> severity: 'critical' > 'warning' > 'healthy'
  for (const inc of openIncidents) {
    const rid = inc.resourceId || inc.resource?.id || inc.resource?.resourceId;
    if (!rid) continue;
    const sev = inc.severity === "high" ? "critical" : inc.severity === "medium" ? "warning" : "healthy";
    if (!resourceSeverityMap[rid] || (resourceSeverityMap[rid] === "warning" && sev === "critical")) {
      resourceSeverityMap[rid] = sev;
    }
  }

  const resourceCurrentState = resources.map((r) => ({
    id: r.id,
    resourceType: r.resourceType,
    state: resourceSeverityMap[r.id] ?? "healthy",
  }));

  const healthyCount = resourceCurrentState.filter((r) => r.state === "healthy").length;
  const highSeverityCount = resourceCurrentState.filter((r) => r.state === "critical").length;
  const mediumSeverityCount = resourceCurrentState.filter((r) => r.state === "warning").length;

  const overallHealth = highSeverityCount > 0 ? "critical" : mediumSeverityCount > 0 ? "warning" : "healthy";
  onHealthChange?.({ status: overallHealth, warnings: mediumSeverityCount, criticals: highSeverityCount });

  const nodeStatuses = ["ec2", "rds", "s3"].reduce((acc, type) => {
    const typeIncidents = openIncidents.filter((i) => i.resource?.resourceType === type);
    acc[type] = typeIncidents.some((i) => i.severity === "high")
      ? "critical"
      : typeIncidents.length > 0
      ? "warning"
      : "healthy";
    return acc;
  }, {});

  // Chart data: most recent EC2-type resource's metrics for a representative trend line.
  const chartMetrics = recentMetrics.filter((m) => m.cpu != null).slice(-40);

  const latestIncident = openIncidents[0] || null;

  return (
    <div>
      <div className="stat-grid">
        <StatCard label="Resources" value={String(resources.length)} sub="monitored" accent="brand" />
        <StatCard
          label="Healthy"
          value={String(healthyCount)}
          sub={`${healthyCount} resources operating normally`}
          accent="mint"
        />
        <StatCard
          label="Anomalies"
          value={String(openIncidents.length)}
          sub={
            openIncidents.length > 0
              ? `${openIncidents.filter((i) => i.severity === "medium").length} medium-severity anomalies detected`
              : "none detected"
          }
          accent="amber"
        />
        <StatCard
          label="Estimated Cost"
          value={costSummary ? formatCurrency(costSummary.estimatedMonthlyCost) : "—"}
          sub="simulated monthly estimate"
          accent="violet"
        />
      </div>

      <InfraVisualization nodeStatuses={nodeStatuses} />

      <div className="dashboard-grid">
        <div>
          <MetricChart metrics={chartMetrics} />
          <CriticalAlerts incidents={openIncidents} />
        </div>
        <div>
          <AIInsightPanel incident={latestIncident} aiEnabled={healthPoll.data?.aiEnabled ?? true} />
        </div>
      </div>

      {highSeverityCount > 0 && (
        <p className="text-muted" style={{ marginTop: 4 }}>
          {highSeverityCount} high-severity incident{highSeverityCount === 1 ? "" : "s"} require attention. Total simulated
          requests observed recently: {formatCount(recentMetrics.reduce((s, m) => s + m.requestCount, 0))}.
        </p>
      )}
    </div>
  );
}
