import Anthropic from "@anthropic-ai/sdk";
import { env, isAiEnabled } from "../../config/env.js";
import { logger } from "../../utils/logger.js";

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 1000;

let client = null;
function getClient() {
  if (!isAiEnabled()) return null;
  if (!client) client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return client;
}

function buildPrompt({ cpu, memory, requestsPerMin, responseTimeSec, historicalCpuRange, resourceType }) {
  return `ROLE:
You are a cloud infrastructure analyst.

TASK:
Analyze the provided infrastructure metrics and identify the likely cause of the anomaly.

INPUT:
${JSON.stringify({ cpu, memory, requestsPerMin, responseTimeSec, historicalCpuRange, resourceType }, null, 2)}

REQUIREMENTS:
1. Identify the anomaly type and severity (low/medium/high).
2. State the likely cause in 1-2 sentences.
3. State the potential impact in 1 sentence.
4. Give 2-4 concrete recommended actions.
5. Return ONLY valid JSON, no markdown fences, no preamble, matching this schema:
   { "severity": string, "cause": string, "impact": string, "recommendations": string[] }`;
}

function stripCodeFences(text) {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

function isValidAnalysis(obj) {
  return (
    obj &&
    typeof obj === "object" &&
    ["low", "medium", "high"].includes(obj.severity) &&
    typeof obj.cause === "string" &&
    typeof obj.impact === "string" &&
    Array.isArray(obj.recommendations) &&
    obj.recommendations.every((r) => typeof r === "string") &&
    obj.recommendations.length > 0
  );
}

function fallbackAnalysis(input, ruleSeverity) {
  return {
    severity: ruleSeverity ?? "medium",
    cause:
      "AI analysis is currently unavailable, so this is a rule-based summary: the deterministic anomaly engine flagged this reading based on threshold/statistical rules.",
    impact: "Service performance or cost efficiency may be affected until this is reviewed manually.",
    recommendations: [
      "Review recent metric history for this resource",
      "Check application and infrastructure logs around the detection time",
      "Add ANTHROPIC_API_KEY to backend/.env to enable live AI root-cause analysis",
    ],
    aiGenerated: false,
  };
}

/**
 * Analyzes an anomaly and returns a validated { severity, cause, impact,
 * recommendations, aiGenerated } object. Never throws - on any failure
 * (no API key, network error, malformed JSON) it returns a safe fallback
 * so the caller can always store an Incident.
 */
export async function analyzeAnomaly(input, ruleSeverity) {
  const anthropic = getClient();
  if (!anthropic) {
    logger.warn("AI analysis skipped: ANTHROPIC_API_KEY not set. Using fallback analysis.");
    return fallbackAnalysis(input, ruleSeverity);
  }

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{ role: "user", content: buildPrompt(input) }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock) throw new Error("No text content in Anthropic response");

    const cleaned = stripCodeFences(textBlock.text);
    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      throw new Error(`Failed to parse AI response as JSON: ${parseErr.message}`);
    }

    if (!isValidAnalysis(parsed)) {
      throw new Error("AI response failed schema validation");
    }

    return { ...parsed, aiGenerated: true };
  } catch (err) {
    logger.error("AI analysis failed, using fallback:", err.message);
    return fallbackAnalysis(input, ruleSeverity);
  }
}

function buildCostPrompt({ resourceType, currentSize, utilization, runningDurationHours, monthlyBaseCost }) {
  return `ROLE:
You are a cloud cost optimization analyst.

TASK:
Given simulated utilization data for a cloud resource, recommend a right-sizing action.

INPUT:
${JSON.stringify({ resourceType, currentSize, utilization, runningDurationHours, monthlyBaseCost }, null, 2)}

REQUIREMENTS:
1. Assess whether utilization is low, moderate, or high.
2. Recommend a target resource size/type (or "keep current" if already efficient).
3. Estimate a monthly saving in USD if the recommendation is applied (0 if none).
4. Give a short explanation (1-3 sentences).
5. Return ONLY valid JSON, no markdown fences, no preamble, matching this schema:
   { "utilizationAssessment": string, "recommendedSize": string, "estimatedMonthlySaving": number, "explanation": string }`;
}

function isValidCostRecommendation(obj) {
  return (
    obj &&
    typeof obj === "object" &&
    typeof obj.utilizationAssessment === "string" &&
    typeof obj.recommendedSize === "string" &&
    typeof obj.estimatedMonthlySaving === "number" &&
    typeof obj.explanation === "string"
  );
}

function fallbackCostRecommendation(input) {
  const isLow = input.utilization < 15;
  return {
    utilizationAssessment: isLow ? "low" : input.utilization < 50 ? "moderate" : "high",
    recommendedSize: isLow ? "downsize or consider stopping this resource during idle windows" : "keep current size",
    estimatedMonthlySaving: isLow ? Math.round(input.monthlyBaseCost * 0.4) : 0,
    explanation:
      "AI cost analysis is currently unavailable, so this is a rule-based estimate derived from simulated utilization data. Add ANTHROPIC_API_KEY to enable live AI recommendations.",
    aiGenerated: false,
  };
}

export async function recommendCostOptimization(input) {
  const anthropic = getClient();
  if (!anthropic) {
    logger.warn("Cost AI analysis skipped: ANTHROPIC_API_KEY not set. Using fallback.");
    return fallbackCostRecommendation(input);
  }

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{ role: "user", content: buildCostPrompt(input) }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock) throw new Error("No text content in Anthropic response");

    const cleaned = stripCodeFences(textBlock.text);
    const parsed = JSON.parse(cleaned);

    if (!isValidCostRecommendation(parsed)) throw new Error("Cost AI response failed schema validation");

    return { ...parsed, aiGenerated: true };
  } catch (err) {
    logger.error("Cost AI analysis failed, using fallback:", err.message);
    return fallbackCostRecommendation(input);
  }
}
