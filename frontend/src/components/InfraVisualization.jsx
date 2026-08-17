import { useEffect, useState } from "react";
import { useTilt } from "../hooks/useTilt";

// Balanced, centered layout around the core to avoid clipped top-left content.
// Positions chosen so no node or label sits near the absolute top-left corner.
const CORE = { x: 300, y: 170 };
const NODES = [
  { id: "ec2", label: "EC2", x: CORE.x, y: CORE.y - 80, className: "node-a" }, // top
  { id: "rds", label: "RDS", x: CORE.x - 120, y: CORE.y, className: "node-b" }, // left
  { id: "s3", label: "S3", x: CORE.x + 120, y: CORE.y, className: "node-c" }, // right
  { id: "dashboard", label: "DASHBOARD", x: CORE.x, y: CORE.y + 90, className: "node-d" }, // bottom receiver
];

function pathFor(node) {
  // Gentle curved bezier from node toward the central AI core.
  const midX = (node.x + CORE.x) / 2;
  const midY = (node.y + CORE.y) / 2 + (node.y < CORE.y ? -18 : 18);
  return `M ${node.x} ${node.y} Q ${midX} ${midY} ${CORE.x} ${CORE.y}`;
}

function statusColor(status) {
  return { healthy: "#17b287", warning: "#e2960f", critical: "#ef4a68" }[status] || "#17b287";
}

/**
 * nodeStatuses: { ec2: 'healthy'|'warning'|'critical', rds, s3 }
 * The "dashboard" node always renders as the calm receiving end of the flow.
 */
export default function InfraVisualization({ nodeStatuses = {} }) {
  const tiltRef = useTilt();
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e) => setReducedMotion(e.matches);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);

  const statusFor = (id) => (id === "dashboard" ? "healthy" : nodeStatuses[id] || "healthy");

  return (
    <div className="glass-card glass-strong tilt infra-viz-card" ref={tiltRef}>
      <svg
        className="infra-viz-svg"
        viewBox="0 0 600 340"
        preserveAspectRatio="xMidYMid meet"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Live infrastructure data flow visualization: EC2, RDS, and S3 feeding the AI engine, which feeds the dashboard"
      >
        <defs>
          <radialGradient id="coreGradient" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="45%" stopColor="#c9d7ff" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#8657f0" stopOpacity="0.25" />
          </radialGradient>
        </defs>

        {/* Flow paths + particles */}
        {NODES.map((node) => {
          const d = pathFor(node);
          const color = statusColor(statusFor(node.id));
          return (
            <g key={node.id}>
              <path id={`flowpath-${node.id}`} className="flow-path" d={d} />
              {!reducedMotion &&
                [0, 1.1, 2.2].map((delay, i) => (
                  <circle key={i} r={2.4} fill={color} className="flow-particle">
                    <animateMotion
                      dur="3.3s"
                      begin={`${delay}s`}
                      repeatCount="indefinite"
                      path={d}
                      keyPoints={node.id === "dashboard" ? "1;0" : "0;1"}
                      keyTimes="0;1"
                    />
                    <animate
                      attributeName="opacity"
                      values="0;1;1;0"
                      keyTimes="0;0.1;0.85;1"
                      dur="3.3s"
                      begin={`${delay}s`}
                      repeatCount="indefinite"
                    />
                  </circle>
                ))}
            </g>
          );
        })}

        {/* Orbital rings around the core */}
        <ellipse className="orbit-ring ring-1" cx={CORE.x} cy={CORE.y} rx={78} ry={40} />
        <ellipse className="orbit-ring ring-2" cx={CORE.x} cy={CORE.y} rx={100} ry={58} />
        <ellipse className="orbit-ring ring-3" cx={CORE.x} cy={CORE.y} rx={60} ry={60} />

        {/* Central AI core */}
        <g className="core-group">
          <circle className="core-glow" cx={CORE.x} cy={CORE.y} r={34} />
          <circle className="core-ring" cx={CORE.x} cy={CORE.y} r={34} />
          <g className="core-inner-spin">
            <circle className="core-ring" cx={CORE.x} cy={CORE.y} r={22} strokeDasharray="2 5" />
          </g>
          <text
            x={CORE.x}
            y={CORE.y + 4}
            className="node-label"
            fontSize="10"
            fontWeight="600"
            fill="var(--ink)"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            AI ENGINE
          </text>
        </g>

        {/* Infrastructure nodes */}
        {NODES.map((node) => {
          const status = statusFor(node.id);
          return (
            <g key={node.id} className={`infra-node ${node.className}`} transform={`translate(${node.x}, ${node.y})`}>
              <circle className={`node-pulse-ring pulse-${status}`} r={22} />
              <circle className="node-glass" r={20} />
              <circle className={`node-dot dot-${status}`} r={4} cy={-2} />
              <text y={38} className="node-label" textAnchor="middle" dominantBaseline="hanging">
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
