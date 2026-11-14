import { NextResponse } from "next/server";
import { env } from "@/config/env";

export const samplePredictions = [
  { id: "T-2048", source: "Unknown · 185.220.101.42", target: "Gateway · edge-01", type: "Credential probing", severity: "Critical", confidence: 96, timestamp: "2026-11-14T10:42:18.000Z", color: "#fb7185", x: 18, y: 28, tx: 48, ty: 48 },
  { id: "T-2047", source: "External · 45.83.64.12", target: "Web server · web-02", type: "Port scanning", severity: "High", confidence: 88, timestamp: "2026-11-14T10:41:52.000Z", color: "#fb923c", x: 82, y: 22, tx: 68, ty: 48 },
  { id: "T-2046", source: "Guest Wi-Fi · 10.0.4.28", target: "File server · fs-01", type: "Lateral movement", severity: "Elevated", confidence: 74, timestamp: "2026-11-14T10:40:31.000Z", color: "#facc15", x: 16, y: 76, tx: 48, ty: 48 },
];

export async function GET() {
  const configuredUrl = env.THREAT_PREDICTIONS_API_URL;
  const apiKey = env.THREAT_PREDICTIONS_API_KEY;

  if (!configuredUrl) {
    return NextResponse.json({ predictions: samplePredictions, source: "sample" });
  }

  try {
    const response = await fetch(configuredUrl, {
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      return NextResponse.json({ error: "Threat prediction service unavailable." }, { status: 502 });
    }

    const payload: unknown = await response.json();
    const predictions = extractPredictions(payload);

    if (!isValidPredictions(predictions)) {
      return NextResponse.json({ error: "Threat prediction service returned invalid data." }, { status: 502 });
    }

    return NextResponse.json({ predictions, source: "api" });
  } catch {
    return NextResponse.json({ error: "Unable to reach threat prediction service." }, { status: 502 });
  }
}

export function extractPredictions(payload: unknown): unknown {
  return Array.isArray(payload)
    ? payload
    : typeof payload === "object" && payload !== null && "predictions" in payload
      ? (payload as { predictions: unknown }).predictions
      : null;
}

export function isValidPredictions(value: unknown): boolean {
  return Array.isArray(value) && value.every(isPrediction);
}

function isPrediction(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return ["id", "source", "target", "type", "severity", "timestamp", "color"].every(
    (key) => typeof item[key] === "string",
  ) && ["confidence", "x", "y", "tx", "ty"].every(
    (key) => typeof item[key] === "number" && Number.isFinite(item[key]),
  ) && item.confidence >= 0 && item.confidence <= 100 &&
    [item.x, item.y, item.tx, item.ty].every((coordinate) => coordinate >= 0 && coordinate <= 100);
}
