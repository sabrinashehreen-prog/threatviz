import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseKevFeed } from "../src/lib/cisa-kev";

const validEntry = {
  cveID: "CVE-2026-1234",
  vendorProject: "Example Vendor",
  product: "Example Product",
  vulnerabilityName: "Example vulnerability",
  dateAdded: "2026-11-13",
  dueDate: "2026-11-20",
  shortDescription: "A vulnerability listed in CISA KEV.",
  knownRansomwareCampaignUse: "Unknown",
};

describe("CISA KEV feed parser", () => {
  it("accepts a valid catalog and preserves its entries", () => {
    const payload = {
      count: 1,
      dateReleased: "2026-11-13T20:24:18.3008Z",
      vulnerabilities: [validEntry],
    };

    assert.deepEqual(parseKevFeed(payload), payload);
  });

  it("rejects malformed catalog metadata or entries", () => {
    assert.equal(
      parseKevFeed({
        count: 1,
        dateReleased: "2026-11-13T20:24:18Z",
        vulnerabilities: [{ ...validEntry, cveID: "not-a-cve" }],
      }),
      null
    );
    assert.equal(parseKevFeed({ vulnerabilities: [] }), null);
  });
});
