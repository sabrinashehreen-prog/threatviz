export const samplePredictions = [
  {
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
  },
  {
    id: "T-2047",
    source: "External · 45.83.64.12",
    target: "Web server · web-02",
    type: "Port scanning",
    severity: "High",
    confidence: 88,
    timestamp: "2026-11-14T10:41:52.000Z",
    color: "#fb923c",
    x: 82,
    y: 22,
    tx: 68,
    ty: 48,
  },
  {
    id: "T-2046",
    source: "Guest Wi-Fi · 10.0.4.28",
    target: "File server · fs-01",
    type: "Lateral movement",
    severity: "Elevated",
    confidence: 74,
    timestamp: "2026-11-14T10:40:31.000Z",
    color: "#facc15",
    x: 16,
    y: 76,
    tx: 48,
    ty: 48,
  },
];

export function extractPredictions(payload: unknown): unknown {
  return Array.isArray(payload)
    ? payload
    : typeof payload === "object" &&
        payload !== null &&
        "predictions" in payload
      ? (payload as { predictions: unknown }).predictions
      : null;
}

export function isValidPredictions(value: unknown): boolean {
  return Array.isArray(value) && value.every(isPrediction);
}

function isPrediction(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  const hasStringFields = [
    "id",
    "source",
    "target",
    "type",
    "severity",
    "timestamp",
    "color",
  ].every(key => typeof item[key] === "string");
  const confidence = item.confidence;

  if (
    !hasStringFields ||
    typeof confidence !== "number" ||
    !Number.isFinite(confidence) ||
    confidence < 0 ||
    confidence > 100
  ) {
    return false;
  }

  return [item.x, item.y, item.tx, item.ty].every(
    coordinate =>
      typeof coordinate === "number" &&
      Number.isFinite(coordinate) &&
      coordinate >= 0 &&
      coordinate <= 100
  );
}
