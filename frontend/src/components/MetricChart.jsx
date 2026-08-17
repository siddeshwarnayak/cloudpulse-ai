import { useTilt } from "../hooks/useTilt";

const WIDTH = 640;
const HEIGHT = 220;
const PAD = 28;

function buildPath(values, max = 100) {
  if (values.length === 0) return "";
  const stepX = (WIDTH - PAD * 2) / Math.max(values.length - 1, 1);
  return values
    .map((v, i) => {
      const x = PAD + i * stepX;
      const y = HEIGHT - PAD - (Math.min(v, max) / max) * (HEIGHT - PAD * 2);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function buildArea(values, max = 100) {
  if (values.length === 0) return "";
  const stepX = (WIDTH - PAD * 2) / Math.max(values.length - 1, 1);
  const line = values
    .map((v, i) => {
      const x = PAD + i * stepX;
      const y = HEIGHT - PAD - (Math.min(v, max) / max) * (HEIGHT - PAD * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const lastX = PAD + (values.length - 1) * stepX;
  return `M ${PAD},${HEIGHT - PAD} L ${line} L ${lastX.toFixed(1)},${HEIGHT - PAD} Z`;
}

export default function MetricChart({ metrics, title = "CPU / Memory" }) {
  const tiltRef = useTilt();
  const cpuValues = metrics.map((m) => m.cpu ?? 0);
  const memValues = metrics.map((m) => m.memory ?? 0);

  const hasData = metrics.length > 1;

  return (
    <div className="glass-card tilt chart-card" ref={tiltRef}>
      <div className="section-title">
        {title}
        <div className="chart-legend">
          <span className="legend-item">
            <span className="legend-swatch" style={{ background: "var(--brand)" }} />
            CPU %
          </span>
          <span className="legend-item">
            <span className="legend-swatch" style={{ background: "var(--violet)" }} />
            Memory %
          </span>
        </div>
      </div>

      {!hasData ? (
        <p className="text-muted">Waiting for enough simulated metrics to plot a trend…</p>
      ) : (
        <svg className="chart-svg chart-animate-in" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none">
          {[0, 25, 50, 75, 100].map((pct) => {
            const y = HEIGHT - PAD - (pct / 100) * (HEIGHT - PAD * 2);
            return <line key={pct} className="chart-grid-line" x1={PAD} x2={WIDTH - PAD} y1={y} y2={y} />;
          })}

          <path className="chart-area cpu-area" d={buildArea(cpuValues)} />
          <path className="chart-area memory-area" d={buildArea(memValues)} />
          <path className="chart-line cpu-line" d={buildPath(cpuValues)} />
          <path className="chart-line memory-line" d={buildPath(memValues)} />

          <text x={PAD} y={16} className="chart-axis-label">
            100%
          </text>
          <text x={PAD} y={HEIGHT - PAD + 14} className="chart-axis-label">
            0%
          </text>
        </svg>
      )}
    </div>
  );
}
