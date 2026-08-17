import { useTilt } from "../hooks/useTilt";

export default function StatCard({ label, value, sub, accent = "brand" }) {
  const tiltRef = useTilt();
  return (
    <div className="glass-card tilt stat-card" ref={tiltRef}>
      <span className="stat-label">{label}</span>
      <span className="stat-value mono">{value}</span>
      {sub && <span className="stat-sub">{sub}</span>}
      <span className={`stat-accent-bar accent-${accent}`} aria-hidden="true" />
    </div>
  );
}
