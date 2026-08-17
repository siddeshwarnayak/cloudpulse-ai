import { usePolling } from "../hooks/usePolling";
import { api } from "../services/api";
import ResourceCard from "../components/ResourceCard";
import { LoadingView, BackendUnavailableView, EmptyView } from "../components/StateViews";

export default function Resources() {
  const { data: resources, error, loading, refetch } = usePolling(() => api.resources.list(), { intervalMs: 4000 });

  if (loading && !resources) return <LoadingView label="Loading resources…" />;
  if (error && !resources) return <BackendUnavailableView onRetry={refetch} />;

  const list = resources || [];

  return (
    <div>
      <h2 style={{ marginBottom: 18 }}>Resources</h2>
      {list.length === 0 ? (
        <EmptyView title="No resources found" subtitle="Resources should be seeded automatically on backend startup." />
      ) : (
        <div className="resource-grid">
          {list.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}
        </div>
      )}
    </div>
  );
}
