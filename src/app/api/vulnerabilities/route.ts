import { NextResponse } from "next/server";
import { parseKevFeed } from "@/lib/cisa-kev";

const CISA_KEV_URL =
  "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";

export const revalidate = 3600;

export async function GET() {
  try {
    const response = await fetch(CISA_KEV_URL, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "CISA vulnerability catalog is unavailable." },
        { status: 502 }
      );
    }

    const feed = parseKevFeed(await response.json());
    if (!feed) {
      return NextResponse.json(
        { error: "CISA returned an invalid vulnerability catalog." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      source: "CISA KEV",
      count: feed.count,
      dateReleased: feed.dateReleased,
      vulnerabilities: feed.vulnerabilities.slice(0, 5),
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to reach the CISA vulnerability catalog." },
      { status: 502 }
    );
  }
}
