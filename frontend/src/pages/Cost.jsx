import { usePolling } from "../hooks/usePolling";
import { api } from "../services/api";
import CostRecommendationCard from "../components/CostRecommendationCard";
import StatCard from "../components/StatCard";
import { LoadingView, BackendUnavailableView, EmptyView } from "../components/StateViews";
import { formatCurrency } from "../utils/format";

export default function Cost() {
  const summaryPoll = usePolling(() => api.cost.summary(), { intervalMs: 6000 });
  const recPoll = usePolling(() => api.cost.recommendations(), { intervalMs: 6000 });

  if (summaryPoll.loading && !summaryPoll.data) return <LoadingView label="Loading cost data…" />;
  if (summaryPoll.error && !summaryPoll.data) return <BackendUnavailableView onRetry={summaryPoll.refetch} />;

  const summary = summaryPoll.data;
  const recommendations = recPoll.data || [];
  const totalSavings = recommendations.reduce((sum, c) => sum + (c.recommendation?.estimatedMonthlySaving || 0), 0);

  return (
    <div>
      <h2 style={{ marginBottom: 18 }}>Cost Optimization</h2>

      <div className="stat-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <StatCard label="Estimated Monthly Cost" value={formatCurrency(summary?.estimatedMonthlyCost)} sub="simulated pricing" accent="brand" />
        <StatCard label="Resources Tracked" value={String(summary?.resourceCount ?? 0)} sub="active resources" accent="violet" />
        <StatCard label="Estimated Monthly Savings" value={formatCurrency(totalSavings)} sub="from idle/waste recommendations" accent="mint" />
      </div>

      <p className="text-muted" style={{ marginBottom: 16 }}>
        All figures below are simulated estimates for demonstration purposes, not real AWS billing data.
      </p>

      {recommendations.length === 0 ? (
        <div className="glass-card panel">
          <EmptyView
            title="No cost recommendations yet"
            subtitle="CloudPulse AI generates a recommendation when a resource shows sustained low utilization (idle/waste detection)."
          />
        </div>
      ) : (
        recommendations.map((cost) => <CostRecommendationCard key={cost.id} cost={cost} />)
      )}
    </div>
  );
}
