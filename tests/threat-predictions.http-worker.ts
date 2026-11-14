import { parentPort, workerData } from "node:worker_threads";
import { GET } from "../src/app/api/threat-predictions/route.ts";

const { upstreamUrl, upstreamStatus, upstreamPayload } = workerData as {
  upstreamUrl?: string;
  upstreamStatus?: number;
  upstreamPayload?: unknown;
};

if (upstreamUrl) {
  process.env.THREAT_PREDICTIONS_API_URL = upstreamUrl;
  globalThis.fetch = async () => {
    if (upstreamStatus !== undefined) return new Response(null, { status: upstreamStatus });
    return Response.json(upstreamPayload);
  };
} else {
  delete process.env.THREAT_PREDICTIONS_API_URL;
}

const response = await GET();
parentPort?.postMessage({ status: response.status, body: await response.json() });
