import { NextResponse } from "next/server";
import { env } from "@/config/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const configuredUrl = env.THREAT_PREDICTIONS_API_URL;

  if (!configuredUrl) {
    return NextResponse.json({
      status: "ok",
      predictionService: "sample",
      checkedAt: new Date().toISOString(),
    });
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
        {
          status: "error",
          predictionService: "unavailable",
          checkedAt: new Date().toISOString(),
        },
        { status: 503 },
      );
    }

    return NextResponse.json({
      status: "ok",
      predictionService: "connected",
      latencyMs: Date.now() - startedAt,
      checkedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      {
        status: "error",
        predictionService: "unreachable",
        checkedAt: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
