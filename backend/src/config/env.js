import "dotenv/config";

function required(name, fallback = undefined) {
  const value = process.env[name] ?? fallback;
  return value;
}

export const env = {
  PORT: Number(required("PORT", 4000)),
  NODE_ENV: required("NODE_ENV", "development"),
  FRONTEND_ORIGIN: required("FRONTEND_ORIGIN", "http://localhost:5173"),
  DATABASE_URL: required("DATABASE_URL"),
  ANTHROPIC_API_KEY: required("ANTHROPIC_API_KEY", ""),
  SIMULATION_TIME_MULTIPLIER: Number(required("SIMULATION_TIME_MULTIPLIER", 10)),
  METRIC_TICK_INTERVAL_MS: Number(required("METRIC_TICK_INTERVAL_MS", 3000)),
  JWT_SECRET: required("JWT_SECRET", "change-me-in-production"),
};

export const isAiEnabled = () => Boolean(env.ANTHROPIC_API_KEY && env.ANTHROPIC_API_KEY.trim().length > 0);
