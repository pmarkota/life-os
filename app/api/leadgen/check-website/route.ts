import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/leadgen/check-website — Check website quality, PageSpeed, extract contacts
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { url, market } = (await request.json()) as { url: string; market?: string };
    if (!url) {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }

    // Import helpers
    const {
      isSocialMediaUrl,
      scoreWebsiteQuality,
      classifyWebsite,
      detectTechStack,
      extractEmail,
      extractInstagram,
      extractFacebook,
      CONTACT_SUBPAGES,
    } = await import("@/lib/leadgen/helpers");

    // Check if it's a social media URL
    if (isSocialMediaUrl(url)) {
      return NextResponse.json({
        web_status: "NO_WEB",
        quality_score: 10,
        page_speed: null,
        email: null,
        instagram: null,
        facebook: null,
        has_ssl: false,
        is_mobile_responsive: false,
        tech_stack: null,
      });
    }

    let html = "";
    let finalUrl = url;
    let fetchSuccess = false;

    // Fetch website HTML
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;
      const response = await fetch(normalizedUrl, {
        signal: controller.signal,
        redirect: "follow",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });
      clearTimeout(timeout);
      finalUrl = response.url;
      html = await response.text();
      fetchSuccess = true;
    } catch {
      // Website unreachable
      return NextResponse.json({
        web_status: "NO_WEB",
        quality_score: 10,
        page_speed: null,
        email: null,
        instagram: null,
        facebook: null,
        has_ssl: false,
        is_mobile_responsive: false,
        tech_stack: null,
      });
    }

    if (!fetchSuccess || !html) {
      return NextResponse.json({
        web_status: "NO_WEB",
        quality_score: 10,
        page_speed: null,
        email: null,
        instagram: null,
        facebook: null,
        has_ssl: false,
        is_mobile_responsive: false,
        tech_stack: null,
      });
    }

    // Score website quality
    const { score: qualityScore } = scoreWebsiteQuality(html, finalUrl);
    let webStatus = classifyWebsite(qualityScore);
    const hasSsl = finalUrl.startsWith("https");
    const isMobileResponsive = html.toLowerCase().includes("viewport");
    const techStack = detectTechStack(html, finalUrl);

    // Extract contact info
    let email = extractEmail(html);
    const instagram = extractInstagram(html);
    const facebook = extractFacebook(html);

    // If no email on homepage, try subpages (market-specific like Python)
    if (!email) {
      const baseUrl = new URL(finalUrl).origin;
      const mkt = market ?? "hr";
      const subpages = CONTACT_SUBPAGES[mkt] ?? CONTACT_SUBPAGES.hr;
      for (const subpage of subpages) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);
          const subResponse = await fetch(`${baseUrl}${subpage}`, {
            signal: controller.signal,
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
          });
          clearTimeout(timeout);
          if (subResponse.ok) {
            const subHtml = await subResponse.text();
            email = extractEmail(subHtml);
            if (email) break;
          }
        } catch {
          // Continue to next subpage
        }
      }
    }

    // PageSpeed check for non-GOOD websites (captures all 4 metrics like Python)
    let pageSpeed: number | null = null;
    let pagespeedSeo: number | null = null;
    let pagespeedA11y: number | null = null;
    let pagespeedBestPractices: number | null = null;

    if (webStatus !== "GOOD" || qualityScore <= 2) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);
        const psUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(finalUrl)}&strategy=mobile`;
        const psResponse = await fetch(psUrl, { signal: controller.signal });
        clearTimeout(timeout);

        if (psResponse.ok) {
          const psData = await psResponse.json();
          const cats = psData?.lighthouseResult?.categories;
          const perf = cats?.performance?.score;
          const seo = cats?.seo?.score;
          const a11y = cats?.accessibility?.score;
          const bp = cats?.["best-practices"]?.score;
          if (typeof perf === "number") pageSpeed = Math.round(perf * 100);
          if (typeof seo === "number") pagespeedSeo = Math.round(seo * 100);
          if (typeof a11y === "number") pagespeedA11y = Math.round(a11y * 100);
          if (typeof bp === "number") pagespeedBestPractices = Math.round(bp * 100);
        }
      } catch {
        // PageSpeed failed, continue without it
      }

      // If website scored as GOOD but PageSpeed is bad, reclassify
      if (webStatus === "GOOD" && pageSpeed !== null && pageSpeed < 50) {
        webStatus = "BAD_WEB";
      }
    }

    return NextResponse.json({
      web_status: webStatus,
      quality_score: qualityScore,
      page_speed: pageSpeed,
      page_speed_seo: pagespeedSeo,
      page_speed_a11y: pagespeedA11y,
      page_speed_best_practices: pagespeedBestPractices,
      email,
      instagram,
      facebook,
      has_ssl: hasSsl,
      is_mobile_responsive: isMobileResponsive,
      tech_stack: techStack,
    });
  } catch (error) {
    console.error("Website check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
