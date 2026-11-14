import { parentPort, workerData } from "node:worker_threads";

const { upstreamUrl, upstreamStatus, upstreamPayload } = workerData as {
  upstreamUrl?: string;
  upstreamStatus?: number;
  upstreamPayload?: unknown;
};

async function run() {
  if (upstreamUrl) {
    process.env.THREAT_PREDICTIONS_API_URL = upstreamUrl;
    globalThis.fetch = async () => {
      if (upstreamStatus !== undefined) {
        return new Response(null, { status: upstreamStatus });
      }
      return Response.json(upstreamPayload);
    };
  } else {
    delete process.env.THREAT_PREDICTIONS_API_URL;
  }

  const { GET } = await import("../src/app/api/threat-predictions/route");
  const response = await GET();
  parentPort?.postMessage({
    status: response.status,
    body: await response.json(),
  });
}

void run().catch((error: unknown) => {
  parentPort?.postMessage({
    error: error instanceof Error ? error.message : String(error),
    status: 0,
    body: null,
  });
});
