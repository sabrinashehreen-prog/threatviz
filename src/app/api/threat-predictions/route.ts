import { NextResponse } from "next/server";
import { env } from "../../../config/env";
import {
  extractPredictions,
  isValidPredictions,
  samplePredictions,
} from "../../../lib/threat-predictions";

export async function GET() {
  const configuredUrl = env.THREAT_PREDICTIONS_API_URL;
  const apiKey = env.THREAT_PREDICTIONS_API_KEY;

  if (!configuredUrl) {
    return NextResponse.json({
      predictions: samplePredictions,
      source: "sample",
    });
  }

  try {
    const response = await fetch(configuredUrl, {
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      return NextResponse.json(
        { error: "Threat prediction service unavailable." },
        { status: 502 }
      );
    }

    const payload: unknown = await response.json();
    const predictions = extractPredictions(payload);

    if (!isValidPredictions(predictions)) {
      return NextResponse.json(
        { error: "Threat prediction service returned invalid data." },
        { status: 502 }
      );
    }

    return NextResponse.json({ predictions, source: "api" });
  } catch {
    return NextResponse.json(
      { error: "Unable to reach threat prediction service." },
      { status: 502 }
    );
  }
}
