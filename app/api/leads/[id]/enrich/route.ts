import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Lead, LeadEnrichment } from "@/types";

type RouteParams = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const EMAIL_BLACKLIST = [
  "wix.com",
  "wordpress.com",
  "example.com",
  "google.com",
  "facebook.com",
  "schema.org",
  "sentry.io",
  "w3.org",
  "gravatar.com",
  "googleapis.com",
];

function extractEmails(html: string): string[] {
  const regex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
  const matches = html.match(regex) ?? [];
  return [
    ...new Set(
      matches.filter(
        (email) =>
          !EMAIL_BLACKLIST.some((domain) =>
            email.toLowerCase().endsWith(`@${domain}`),
          ),
      ),
    ),
  ];
}

function extractInstagram(html: string): string | null {
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9_.]{1,30})\/?/gi,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(html);
    if (match?.[1]) {
      const handle = match[1].toLowerCase();
      if (
        ["p", "reel", "stories", "explore", "accounts", "about", "legal"].includes(
          handle,
        )
      ) {
        continue;
      }
      return handle;
    }
  }

  return null;
}

function detectTechStack(html: string, url: string): string {
  const lower = html.toLowerCase();
  const urlLower = url.toLowerCase();

  if (lower.includes("wp-content") || lower.includes("wp-includes")) {
    return "WordPress";
  }
  if (urlLower.includes("wixsite.com") || urlLower.includes("wix.com") || lower.includes("wix.com")) {
    return "Wix";
  }
  if (lower.includes("squarespace")) {
    return "Squarespace";
  }
  if (lower.includes("shopify") || lower.includes("cdn.shopify.com")) {
    return "Shopify";
  }
  if (urlLower.includes("business.site") || urlLower.includes("google.com/business")) {
    return "Google Sites";
  }
  if (urlLower.includes("godaddysites") || lower.includes("godaddy")) {
    return "GoDaddy";
  }
  if (lower.includes("webflow") || lower.includes("wf-cdn")) {
    return "Webflow";
  }
  if (lower.includes("_next") || lower.includes("__next")) {
    return "Next.js";
  }
  if (lower.includes("gatsby")) {
    return "Gatsby";
  }

  return "Custom";
}

function hasViewportMeta(html: string): boolean {
  return /meta[^>]+name\s*=\s*["']viewport["']/i.test(html);
}

async function fetchPageSpeedScore(
  url: string,
  strategy: "mobile" | "desktop",
): Promise<number | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}`;
    const res = await fetch(apiUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const data = await res.json();
    const score = data?.lighthouseResult?.categories?.performance?.score;
    if (typeof score === "number") {
      return Math.round(score * 100);
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchWebsiteData(
  url: string,
): Promise<{
  html: string;
  finalUrl: string;
  hasSsl: boolean;
} | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const targetUrl = url.startsWith("http") ? url : `https://${url}`;
    const res = await fetch(targetUrl, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; PetarOS/1.0; +https://eleverastudio.com)",
      },
    });
    clearTimeout(timeout);

    const finalUrl = res.url;
    const hasSsl = finalUrl.startsWith("https");
    const html = await res.text();

    return { html, finalUrl, hasSsl };
  } catch {
    return null;
  }
}

async function fetchGooglePlaces(
  businessName: string,
  location: string,
): Promise<{ rating: number | null; ratingCount: number | null }> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    return { rating: null, ratingCount: null };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch("https://google.serper.dev/places", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: `${businessName} ${location}` }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return { rating: null, ratingCount: null };

    const data = await res.json();
    const first = data?.places?.[0];
    if (!first) return { rating: null, ratingCount: null };

    return {
      rating: typeof first.rating === "number" ? first.rating : null,
      ratingCount:
        typeof first.ratingCount === "number" ? first.ratingCount : null,
    };
  } catch {
    return { rating: null, ratingCount: null };
  }
}

function generateSummary(enrichment: {
  pageSpeedMobile: number | null;
  pageSpeedDesktop: number | null;
  hasSsl: boolean | null;
  isMobileResponsive: boolean | null;
  techStack: string | null;
  googleRating: number | null;
  googleReviewsCount: number | null;
  hasWebsite: boolean;
}): string {
  const parts: string[] = [];

  if (enrichment.hasWebsite) {
    if (enrichment.pageSpeedMobile !== null) {
      parts.push(
        `Website scores ${enrichment.pageSpeedMobile}/100 mobile${enrichment.pageSpeedDesktop !== null ? `, ${enrichment.pageSpeedDesktop}/100 desktop` : ""}`,
      );
    }

    if (enrichment.hasSsl === false) {
      parts.push("no SSL");
    } else if (enrichment.hasSsl === true) {
      parts.push("has SSL");
    }

    if (enrichment.isMobileResponsive === false) {
      parts.push("not mobile responsive");
    }

    if (enrichment.techStack) {
      parts.push(enrichment.techStack);
    }
  } else {
    parts.push("No website found");
  }

  if (enrichment.googleRating !== null) {
    const reviewPart =
      enrichment.googleReviewsCount !== null
        ? ` with ${enrichment.googleReviewsCount} reviews`
        : "";
    parts.push(`Google: ${enrichment.googleRating}★${reviewPart}`);
  }

  const isWeakWebsite =
    enrichment.hasWebsite &&
    ((enrichment.pageSpeedMobile !== null && enrichment.pageSpeedMobile < 50) ||
      enrichment.hasSsl === false ||
      enrichment.isMobileResponsive === false);

  const noWebsite = !enrichment.hasWebsite;

  if (noWebsite || isWeakWebsite) {
    parts.push("Strong candidate.");
  } else if (
    enrichment.pageSpeedMobile !== null &&
    enrichment.pageSpeedMobile >= 80 &&
    enrichment.hasSsl &&
    enrichment.isMobileResponsive
  ) {
    parts.push("Website is decent — harder sell.");
  } else {
    parts.push("Moderate candidate.");
  }

  return parts.join(". ") + (parts[parts.length - 1]?.endsWith(".") ? "" : ".");
}

// ---------------------------------------------------------------------------
// POST /api/leads/[id]/enrich
// ---------------------------------------------------------------------------

export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch lead
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("*")
      .eq("id", id)
      .single();

    if (leadError || !lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const typedLead = lead as Lead;

    // Initialize enrichment data
    let pageSpeedMobile: number | null = null;
    let pageSpeedDesktop: number | null = null;
    let hasSsl: boolean | null = null;
    let isMobileResponsive: boolean | null = null;
    let techStack: string | null = null;
    let googleRating: number | null = null;
    let googleReviewsCount: number | null = null;
    let extractedEmail: string | null = null;
    let extractedInstagram: string | null = null;
    const rawData: Record<string, unknown> = {};

    // 2. Website enrichment
    if (typedLead.website_url) {
      const [mobileScore, desktopScore, websiteData] = await Promise.all([
        fetchPageSpeedScore(typedLead.website_url, "mobile"),
        fetchPageSpeedScore(typedLead.website_url, "desktop"),
        fetchWebsiteData(typedLead.website_url),
      ]);

      pageSpeedMobile = mobileScore;
      pageSpeedDesktop = desktopScore;

      if (websiteData) {
        hasSsl = websiteData.hasSsl;
        isMobileResponsive = hasViewportMeta(websiteData.html);
        techStack = detectTechStack(websiteData.html, websiteData.finalUrl);

        const emails = extractEmails(websiteData.html);
        if (emails.length > 0) {
          extractedEmail = emails[0];
          rawData.extracted_emails = emails;
        }

        extractedInstagram = extractInstagram(websiteData.html);
        if (extractedInstagram) {
          rawData.extracted_instagram = extractedInstagram;
        }

        rawData.final_url = websiteData.finalUrl;
      }
    }

    // 3. Google Places enrichment
    if (typedLead.business_name && typedLead.location) {
      const places = await fetchGooglePlaces(
        typedLead.business_name,
        typedLead.location,
      );
      googleRating = places.rating;
      googleReviewsCount = places.ratingCount;
    }

    // 4. Generate summary
    const enrichmentSummary = generateSummary({
      pageSpeedMobile,
      pageSpeedDesktop,
      hasSsl,
      isMobileResponsive,
      techStack,
      googleRating,
      googleReviewsCount,
      hasWebsite: !!typedLead.website_url,
    });

    // 5. Upsert lead_enrichment
    const enrichmentPayload = {
      lead_id: id,
      page_speed_mobile: pageSpeedMobile,
      page_speed_desktop: pageSpeedDesktop,
      has_ssl: hasSsl,
      is_mobile_responsive: isMobileResponsive,
      tech_stack: techStack,
      google_rating: googleRating,
      google_reviews_count: googleReviewsCount,
      instagram_followers: null as number | null,
      website_last_modified: null as string | null,
      enrichment_summary: enrichmentSummary,
      enriched_at: new Date().toISOString(),
      raw_data: Object.keys(rawData).length > 0 ? rawData : null,
    };

    const { data: enrichment, error: enrichError } = await supabase
      .from("lead_enrichment")
      .upsert(enrichmentPayload, { onConflict: "lead_id" })
      .select()
      .single();

    if (enrichError) {
      console.error("Supabase error upserting enrichment:", enrichError);
      return NextResponse.json(
        { error: enrichError.message },
        { status: 500 },
      );
    }

    // 6. Update leads table
    const leadUpdate: Record<string, unknown> = {
      page_speed: pageSpeedMobile,
      last_enriched_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (extractedEmail && !typedLead.email) {
      leadUpdate.email = extractedEmail;
    }
    if (extractedInstagram && !typedLead.instagram) {
      leadUpdate.instagram = extractedInstagram;
    }

    await supabase.from("leads").update(leadUpdate).eq("id", id);

    return NextResponse.json(enrichment as LeadEnrichment);
  } catch (error) {
    console.error("Enrichment route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
