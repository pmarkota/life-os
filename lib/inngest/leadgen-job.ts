import { inngest } from "./client";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── Types ───────────────────────────────────────
interface LeadgenConfig {
  market: string;
  niche: string;
  cities: Array<{ city: string; state?: string; count: number }>;
  min_rating: number;
  min_reviews: number;
  skip_web_check: boolean;
}

interface SearchResult {
  business_name: string;
  location: string;
  phone: string | null;
  website_url: string | null;
  rating: number | null;
  reviews: number | null;
  snippet: string | null;
}

interface ProcessedLead {
  business_name: string;
  location: string;
  phone: string | null;
  website_url: string | null;
  email: string | null;
  instagram: string | null;
  facebook: string | null;
  rating: number | null;
  reviews: number | null;
  snippet: string | null;
  web_status: string;
  quality_score: number;
  page_speed: number | null;
  has_ssl: boolean | null;
  is_mobile_responsive: boolean | null;
  tech_stack: string | null;
  channel: string;
  message: string;
  market: string;
  niche: string;
  owner_name: string | null;
  selected: boolean;
  removed: boolean;
}

// ─── Inngest Function ────────────────────────────
export const leadgenJob = inngest.createFunction(
  {
    id: "leadgen-job",
    retries: 1,
    concurrency: [{ limit: 2 }],
    triggers: [{ event: "leadgen/job.start" }],
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async ({ event, step }: { event: any; step: any }) => {
    const { job_id, user_id, config } = event.data as {
      job_id: string;
      user_id: string;
      config: LeadgenConfig;
    };

    const supabase = createAdminClient();

    // Helper to update job progress in DB
    async function updateJob(updates: Record<string, unknown>) {
      await supabase
        .from("leadgen_jobs")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", job_id);
    }

    // ─── STEP 1: Search Google Maps ──────────────
    const rawResults = await step.run("search-google-maps", async () => {
      await updateJob({ status: "searching" });

      const { NICHE_QUERIES, DACH_GL_MAP } = await import("@/lib/leadgen/queries");
      const { cleanBusinessName } = await import("@/lib/leadgen/helpers");

      const serperKey = process.env.SERPER_API_KEY;
      if (!serperKey) throw new Error("SERPER_API_KEY not configured");

      const queries = NICHE_QUERIES[config.market]?.[config.niche] ?? [config.niche];

      // Fetch existing leads for dedup
      const { data: existingLeads } = await supabase
        .from("leads")
        .select("business_name, phone")
        .eq("user_id", user_id);

      const existingNames = new Set(
        (existingLeads ?? []).map((l) =>
          l.business_name.toLowerCase().replace(/[.\-\s]/g, ""),
        ),
      );
      const existingPhones = new Set(
        (existingLeads ?? [])
          .filter((l) => l.phone)
          .map((l) => (l.phone as string).replace(/[^\d]/g, "")),
      );

      const allResults: SearchResult[] = [];
      const seenPhones = new Set<string>();
      const seenNames = new Set<string>();
      const requestedTotal = config.cities.reduce((s, c) => s + c.count, 0);
      const fetchTarget = requestedTotal * 4;

      for (const cityConfig of config.cities) {
        const { city, state } = cityConfig;
        const cityLabel = state ? `${city}, ${state}` : city;
        let cityResults = 0;

        let gl = "hr";
        let hl = "hr";
        if (config.market === "dach") {
          gl = DACH_GL_MAP[city.toLowerCase()] ?? "at";
          hl = "de";
        } else if (config.market === "us") {
          gl = "us"; hl = "en";
        } else if (config.market === "uk") {
          gl = "gb"; hl = "en";
        }

        const location = state ? `${city}, ${state}` : city;

        for (const query of queries) {
          if (cityResults >= fetchTarget) break;
          if (!query) continue;

          try {
            const response = await fetch("https://google.serper.dev/maps", {
              method: "POST",
              headers: { "X-API-KEY": serperKey, "Content-Type": "application/json" },
              body: JSON.stringify({ q: `${query} ${location}`, gl, hl, num: 20 }),
            });

            if (!response.ok) continue;
            const data = await response.json();

            for (const place of data.places ?? []) {
              if (cityResults >= fetchTarget) break;

              if (place.rating !== undefined && place.rating < config.min_rating) continue;
              if (place.ratingCount !== undefined && place.ratingCount < config.min_reviews) continue;

              const normalizedPhone = place.phone ? place.phone.replace(/[^\d]/g, "") : null;
              if (normalizedPhone) {
                if (seenPhones.has(normalizedPhone) || existingPhones.has(normalizedPhone)) continue;
                seenPhones.add(normalizedPhone);
              }

              const nameKey = place.title.toLowerCase().replace(/[.\-\s]/g, "");
              if (seenNames.has(nameKey) || existingNames.has(nameKey)) continue;
              seenNames.add(nameKey);

              allResults.push({
                business_name: cleanBusinessName(place.title),
                location: cityLabel,
                phone: place.phone ?? null,
                website_url: place.website ?? null,
                rating: place.rating ?? null,
                reviews: place.ratingCount ?? null,
                snippet: place.address ?? null,
              });
              cityResults++;
            }
          } catch {
            // continue
          }

          if (queries.length > 1) {
            await new Promise((r) => setTimeout(r, 300));
          }
        }
      }

      await updateJob({
        progress: {
          searched: allResults.length,
          checked: 0,
          qualifying: 0,
          skipped: 0,
          target: requestedTotal,
        },
      });

      return allResults;
    });

    // ─── STEP 2: Process each lead (web check + message) ───
    // Process in individual steps so Inngest can retry/resume each one
    const requestedTotal = config.cities.reduce((s, c) => s + c.count, 0);
    const processedLeads: ProcessedLead[] = [];
    let qualifyingCount = 0;

    await updateJob({ status: "processing" });

    for (let i = 0; i < rawResults.length; i++) {
      if (qualifyingCount >= requestedTotal) break;

      const lead = await step.run(`process-lead-${i}`, async () => {
        const place = rawResults[i];

        const {
          isSocialMediaUrl,
          scoreWebsiteQuality,
          classifyWebsite,
          detectTechStack,
          extractEmail,
          extractInstagram,
          extractFacebook,
          determineChannel,
          CONTACT_SUBPAGES,
        } = await import("@/lib/leadgen/helpers");

        let webData = {
          web_status: "NO_WEB",
          quality_score: 10,
          page_speed: null as number | null,
          email: null as string | null,
          instagram: null as string | null,
          facebook: null as string | null,
          has_ssl: false,
          is_mobile_responsive: false,
          tech_stack: null as string | null,
        };

        // Check website
        if (place.website_url && !config.skip_web_check) {
          const url = place.website_url.startsWith("http")
            ? place.website_url
            : `https://${place.website_url}`;

          if (!isSocialMediaUrl(url)) {
            try {
              const controller = new AbortController();
              const timeout = setTimeout(() => controller.abort(), 10000);
              const resp = await fetch(url, {
                signal: controller.signal,
                redirect: "follow",
                headers: { "User-Agent": "Mozilla/5.0 (compatible; PetarOS/1.0)" },
              });
              clearTimeout(timeout);

              const finalUrl = resp.url;
              const html = await resp.text();
              const lower = html.toLowerCase();

              const { score } = scoreWebsiteQuality(html, finalUrl);
              const webStatus = classifyWebsite(score);

              webData.web_status = webStatus;
              webData.quality_score = score;
              webData.has_ssl = finalUrl.startsWith("https");
              webData.is_mobile_responsive = lower.includes("viewport");
              webData.tech_stack = detectTechStack(html, finalUrl);
              webData.email = extractEmail(html);
              webData.instagram = extractInstagram(html);
              webData.facebook = extractFacebook(html);

              // Try subpages for email
              if (!webData.email) {
                const baseUrl = new URL(finalUrl).origin;
                const subpages = CONTACT_SUBPAGES[config.market] ?? CONTACT_SUBPAGES.hr;
                for (const subpage of subpages) {
                  try {
                    const sc = new AbortController();
                    const st = setTimeout(() => sc.abort(), 5000);
                    const sr = await fetch(`${baseUrl}${subpage}`, {
                      signal: sc.signal,
                      headers: { "User-Agent": "Mozilla/5.0 (compatible; PetarOS/1.0)" },
                    });
                    clearTimeout(st);
                    if (sr.ok) {
                      const sh = await sr.text();
                      const foundEmail = extractEmail(sh);
                      if (foundEmail) { webData.email = foundEmail; break; }
                    }
                  } catch { /* continue */ }
                }
              }

              // PageSpeed for non-GOOD
              if (webData.web_status !== "GOOD") {
                try {
                  const pc = new AbortController();
                  const pt = setTimeout(() => pc.abort(), 30000);
                  const pr = await fetch(
                    `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(finalUrl)}&strategy=mobile`,
                    { signal: pc.signal },
                  );
                  clearTimeout(pt);
                  if (pr.ok) {
                    const pd = await pr.json();
                    const perf = pd?.lighthouseResult?.categories?.performance?.score;
                    if (typeof perf === "number") webData.page_speed = Math.round(perf * 100);
                  }
                } catch { /* continue */ }
              }

              // Reclassify GOOD with bad PageSpeed
              if (webData.web_status === "GOOD" && webData.page_speed !== null && webData.page_speed < 50) {
                webData.web_status = "BAD_WEB";
              }
            } catch {
              // fetch failed
            }
          }
        }

        // Skip GOOD websites
        if (webData.web_status === "GOOD" && !config.skip_web_check) {
          return {
            ...place,
            email: webData.email,
            instagram: webData.instagram,
            facebook: webData.facebook,
            web_status: "GOOD",
            quality_score: webData.quality_score,
            page_speed: webData.page_speed,
            has_ssl: webData.has_ssl,
            is_mobile_responsive: webData.is_mobile_responsive,
            tech_stack: webData.tech_stack,
            channel: "email",
            message: "",
            market: config.market,
            niche: config.niche,
            owner_name: null,
            selected: false,
            removed: true,
          } as ProcessedLead;
        }

        // Determine channel
        const channel = determineChannel(
          config.market,
          webData.email,
          place.phone,
          webData.instagram,
        );

        // Generate message
        let message = "";
        try {
          const { getSystemPrompt, getFallbackMessage } = await import("@/lib/ai/system-prompts");
          const apiKey = process.env.ANTHROPIC_API_KEY;

          if (apiKey) {
            const systemPrompt = getSystemPrompt(config.market);
            const userPrompt = [
              `Business: ${place.business_name}`,
              `City: ${place.location}`,
              `Niche: ${config.niche}`,
              place.rating !== null ? `Google Rating: ${place.rating}` : null,
              place.reviews !== null ? `Google Reviews: ${place.reviews}` : null,
              webData.web_status ? `Website Status: ${webData.web_status}` : null,
              place.snippet ? `Address/Info: ${place.snippet}` : null,
              `Channel: ${channel}`,
            ].filter(Boolean).join("\n");

            const resp = await fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: {
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
              },
              body: JSON.stringify({
                model: "claude-sonnet-4-20250514",
                max_tokens: 300,
                system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
                messages: [{ role: "user", content: `Write a personalized first outreach message for this lead:\n\n${userPrompt}` }],
              }),
            });

            if (resp.ok) {
              const data = await resp.json();
              message = data?.content?.[0]?.text ?? "";
            }
          }

          if (!message) {
            message = getFallbackMessage(config.market, webData.web_status, place.business_name, place.location);
          }
        } catch {
          const { getFallbackMessage } = await import("@/lib/ai/system-prompts");
          message = getFallbackMessage(config.market, webData.web_status, place.business_name, place.location);
        }

        return {
          ...place,
          email: webData.email,
          instagram: webData.instagram,
          facebook: webData.facebook,
          web_status: webData.web_status,
          quality_score: webData.quality_score,
          page_speed: webData.page_speed,
          has_ssl: webData.has_ssl,
          is_mobile_responsive: webData.is_mobile_responsive,
          tech_stack: webData.tech_stack,
          channel,
          message,
          market: config.market,
          niche: config.niche,
          owner_name: null,
          selected: true,
          removed: false,
        } as ProcessedLead;
      });

      processedLeads.push(lead);
      if (!lead.removed) qualifyingCount++;

      // Update progress after each lead
      await step.run(`update-progress-${i}`, async () => {
        await updateJob({
          progress: {
            searched: rawResults.length,
            checked: i + 1,
            qualifying: qualifyingCount,
            skipped: processedLeads.filter((l) => l.removed).length,
            target: requestedTotal,
          },
          results: processedLeads,
        });
      });
    }

    // ─── STEP 3: Mark complete ──────────────────
    await step.run("mark-complete", async () => {
      await updateJob({
        status: "completed",
        results: processedLeads,
        completed_at: new Date().toISOString(),
        progress: {
          searched: rawResults.length,
          checked: processedLeads.length,
          qualifying: qualifyingCount,
          skipped: processedLeads.filter((l) => l.removed).length,
          target: requestedTotal,
        },
      });
    });

    return { job_id, qualifying: qualifyingCount, total: processedLeads.length };
  },
);
