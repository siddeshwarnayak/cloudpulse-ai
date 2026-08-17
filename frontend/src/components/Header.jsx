import { NavLink } from "react-router-dom";

export default function Header({ healthStatus = "healthy" }) {
  // Accept either a string or an object { status, warnings, criticals }
  const status = typeof healthStatus === "string" ? healthStatus : healthStatus?.status ?? "healthy";
  const warnings = typeof healthStatus === "object" ? healthStatus.warnings ?? 0 : 0;
  const criticals = typeof healthStatus === "object" ? healthStatus.criticals ?? 0 : 0;

  let healthLabel = "All systems normal";
  if (status === "warning") healthLabel = `${warnings} warning${warnings === 1 ? "" : "s"}`;
  if (status === "critical") healthLabel = `${criticals} critical incident${criticals === 1 ? "" : "s"}`;

  return (
    <header className="app-header">
      <div className="brand-block">
        <div className="brand-mark" aria-hidden="true" />
        <span className="brand-name">CloudPulse AI</span>
      </div>

      <nav className="main-nav" aria-label="Primary">
        <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
          Dashboard
        </NavLink>
        <NavLink to="/resources" className={({ isActive }) => (isActive ? "active" : "")}>
          Resources
        </NavLink>
        <NavLink to="/anomalies" className={({ isActive }) => (isActive ? "active" : "")}>
          Anomalies
        </NavLink>
        <NavLink to="/cost" className={({ isActive }) => (isActive ? "active" : "")}>
          Cost
        </NavLink>
      </nav>

      <div className="health-indicator">
        <span className={`health-orb ${healthStatus}`} aria-hidden="true" />
        {healthLabel}
      </div>
    </header>
  );
}
