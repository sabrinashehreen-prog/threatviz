import { NextResponse } from "next/server";
import { env } from "@/config/env";
import {
  extractPredictions,
  isValidPredictions,
  samplePredictions,
} from "@/app/api/threat-predictions/route";

export const dynamic = "force-dynamic";

export async function GET() {
  const checkedAt = new Date().toISOString();
  const configuredUrl = env.THREAT_PREDICTIONS_API_URL;

  if (!configuredUrl) {
    const valid = isValidPredictions(samplePredictions);
    return NextResponse.json(
      {
        status: valid ? "ok" : "error",
        predictionPayload: valid ? "valid-sample" : "invalid-sample",
        checkedAt,
      },
      { status: valid ? 200 : 503 },
    );
  }

  const startedAt = Date.now();

  try {
    const response = await fetch(configuredUrl, {
      headers: env.THREAT_PREDICTIONS_API_KEY
        ? { Authorization: `Bearer ${env.THREAT_PREDICTIONS_API_KEY}` }
        : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { status: "error", predictionPayload: "service-unavailable", checkedAt },
        { status: 503 },
      );
    }

    const payload: unknown = await response.json();
    const valid = isValidPredictions(extractPredictions(payload));

    return NextResponse.json(
      {
        status: valid ? "ok" : "error",
        predictionPayload: valid ? "valid" : "invalid",
        latencyMs: Date.now() - startedAt,
        checkedAt,
      },
      { status: valid ? 200 : 503 },
    );
  } catch {
    return NextResponse.json(
      { status: "error", predictionPayload: "unreachable", checkedAt },
      { status: 503 },
    );
  }
}
