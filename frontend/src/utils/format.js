export function formatPercent(value) {
  if (value === null || value === undefined) return "—";
  return `${value.toFixed(1)}%`;
}

export function formatSeconds(value) {
  if (value === null || value === undefined) return "—";
  return `${value.toFixed(2)}s`;
}

export function formatCount(value) {
  if (value === null || value === undefined) return "—";
  return value.toLocaleString("en-US");
}

export function formatCurrency(value) {
  if (value === null || value === undefined) return "—";
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function formatRelativeTime(dateInput) {
  const date = new Date(dateInput);
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  return `${diffHr}h ago`;
}

export function severityLabel(severity) {
  return { low: "Low", medium: "Medium", high: "High" }[severity] || severity;
}

export function anomalyTypeLabel(type) {
  return (
    {
      cpu: "High CPU utilization",
      memory: "High memory utilization",
      traffic: "Traffic surge",
      responseTime: "Elevated response time",
      idle: "Idle resource",
    }[type] || type
  );
}

export function resourceTypeLabel(type) {
  return { ec2: "EC2 Instance", rds: "RDS Database", s3: "S3 Bucket" }[type] || type;
}
