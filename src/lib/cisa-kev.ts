export type KevEntry = {
  cveID: string;
  vendorProject: string;
  product: string;
  vulnerabilityName: string;
  dateAdded: string;
  dueDate: string;
  shortDescription: string;
  knownRansomwareCampaignUse: string;
};

export type KevFeed = {
  count: number;
  dateReleased: string;
  vulnerabilities: KevEntry[];
};

export function parseKevFeed(payload: unknown): KevFeed | null {
  if (typeof payload !== "object" || payload === null) return null;

  const feed = payload as Record<string, unknown>;
  if (
    typeof feed.count !== "number" ||
    !Number.isInteger(feed.count) ||
    typeof feed.dateReleased !== "string" ||
    !Array.isArray(feed.vulnerabilities) ||
    !feed.vulnerabilities.every(isKevEntry)
  ) {
    return null;
  }

  return {
    count: feed.count,
    dateReleased: feed.dateReleased,
    vulnerabilities: feed.vulnerabilities,
  };
}

function isKevEntry(value: unknown): value is KevEntry {
  if (typeof value !== "object" || value === null) return false;

  const entry = value as Record<string, unknown>;
  return (
    typeof entry.cveID === "string" &&
    /^CVE-\d{4}-\d+$/.test(entry.cveID) &&
    typeof entry.vendorProject === "string" &&
    typeof entry.product === "string" &&
    typeof entry.vulnerabilityName === "string" &&
    typeof entry.dateAdded === "string" &&
    typeof entry.dueDate === "string" &&
    typeof entry.shortDescription === "string" &&
    typeof entry.knownRansomwareCampaignUse === "string"
  );
}
