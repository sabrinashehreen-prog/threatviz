import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Worker } from "node:worker_threads";
import {
  extractPredictions,
  isValidPredictions,
  samplePredictions,
} from "../src/app/api/threat-predictions/route.ts";

const invokeRoute = (workerData: Record<string, unknown>) => new Promise<{ status: number; body: unknown }>((resolve, reject) => {
  const worker = new Worker(new URL("./threat-predictions.http-worker.ts", import.meta.url), {
    workerData,
    execArgv: ["--import", "tsx/esm"],
  });
  worker.once("message", resolve);
  worker.once("error", reject);
  worker.once("exit", (code) => {
    if (code !== 0) reject(new Error(`HTTP test worker exited with code ${code}`));
  });
});

const validPrediction = {
  id: "T-2048",
  source: "Unknown · 185.220.101.42",
  target: "Gateway · edge-01",
  type: "Credential probing",
  severity: "Critical",
  confidence: 96,
  timestamp: "2026-11-14T10:42:18.000Z",
  color: "#fb7185",
  x: 18,
  y: 28,
  tx: 48,
  ty: 48,
};

describe("threat prediction API HTTP contract", () => {
  it("returns 200 with sample predictions when no upstream is configured", async () => {
    const response = await invokeRoute({});

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { predictions: samplePredictions, source: "sample" });
  });

  it("returns 200 with API predictions for a valid upstream response", async () => {
    const response = await invokeRoute({
      upstreamUrl: "https://predictions.example.test",
      upstreamPayload: [validPrediction],
    });

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { predictions: [validPrediction], source: "api" });
  });

  it("returns 502 when the upstream service responds unsuccessfully", async () => {
    const response = await invokeRoute({
      upstreamUrl: "https://predictions.example.test",
      upstreamStatus: 503,
    });

    assert.equal(response.status, 502);
    assert.deepEqual(response.body, { error: "Threat prediction service unavailable." });
  });

  it("returns 502 when the upstream payload is invalid", async () => {
    const response = await invokeRoute({
      upstreamUrl: "https://predictions.example.test",
      upstreamPayload: { predictions: [{ ...validPrediction, confidence: 101 }] },
    });

    assert.equal(response.status, 502);
    assert.deepEqual(response.body, { error: "Threat prediction service returned invalid data." });
  });
});

describe("threat prediction API payload contract", () => {
  it("accepts a raw array of valid predictions", () => {
    const payload = [validPrediction];

    assert.deepEqual(extractPredictions(payload), payload);
    assert.equal(isValidPredictions(extractPredictions(payload)), true);
  });

  it("accepts an object containing a predictions array", () => {
    const payload = { predictions: [validPrediction] };

    assert.deepEqual(extractPredictions(payload), payload.predictions);
    assert.equal(isValidPredictions(extractPredictions(payload)), true);
  });

  it("accepts the built-in sample predictions", () => {
    assert.equal(isValidPredictions(samplePredictions), true);
  });

  it("rejects payloads without a predictions array", () => {
    assert.equal(extractPredictions({ results: [validPrediction] }), null);
    assert.equal(isValidPredictions(extractPredictions({ results: [validPrediction] })), false);
    assert.equal(isValidPredictions(null), false);
    assert.equal(isValidPredictions({ predictions: [validPrediction] }), false);
  });

  it("rejects predictions missing required string fields", () => {
    const { target: _target, ...missingTarget } = validPrediction;

    assert.equal(isValidPredictions([missingTarget]), false);
  });

  it("rejects predictions with non-string text fields", () => {
    assert.equal(isValidPredictions([{ ...validPrediction, severity: 3 }]), false);
  });

  it("rejects predictions missing numeric fields or containing non-finite values", () => {
    const { confidence: _confidence, ...missingConfidence } = validPrediction;

    assert.equal(isValidPredictions([missingConfidence]), false);
    assert.equal(isValidPredictions([{ ...validPrediction, x: Number.NaN }]), false);
  });

  it("rejects confidence outside the inclusive 0–100 range", () => {
    assert.equal(isValidPredictions([{ ...validPrediction, confidence: -1 }]), false);
    assert.equal(isValidPredictions([{ ...validPrediction, confidence: 101 }]), false);
  });

  it("rejects map coordinates outside the inclusive 0–100 range", () => {
    for (const coordinate of ["x", "y", "tx", "ty"] as const) {
      assert.equal(isValidPredictions([{ ...validPrediction, [coordinate]: -1 }]), false);
      assert.equal(isValidPredictions([{ ...validPrediction, [coordinate]: 101 }]), false);
    }
  });

  it("rejects a payload when any prediction in the array is invalid", () => {
    assert.equal(
      isValidPredictions([validPrediction, { ...validPrediction, confidence: 101 }]),
      false,
    );
  });
});
