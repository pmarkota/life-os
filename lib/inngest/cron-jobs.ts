import { inngest } from "./client";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendDiscordMessage, COLORS } from "./discord";

// Helper: get single user ID (single-user app)
let cachedUserId: string | null = null;
async function getUserId(): Promise<string> {
  if (cachedUserId) return cachedUserId;
  const supabase = createAdminClient();
  const { data } = await supabase.auth.admin.listUsers();
  if (!data?.users?.length) throw new Error("No users found");
  cachedUserId = data.users[0].id;
  return cachedUserId;
}

// ═══════════════════════════════════════════════════
// 1. AUTO-SCORE NEW LEADS — Daily 8:30am
// Score any lead added in the last 24h without a score
// ═══════════════════════════════════════════════════

export const autoScoreNewLeads = inngest.createFunction(
  {
    id: "cron-auto-score-new-leads",
    triggers: [{ cron: "TZ=Europe/Zagreb 30 8 * * *" }],
  },
  async ({ step }) => {
    const results = await step.run("score-new-leads", async () => {
      const supabase = createAdminClient();
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // Find leads created in last 24h with no score
      const { data: leads } = await supabase
        .from("leads")
        .select("*")
        .gte("created_at", yesterday)
        .or("lead_score.is.null,lead_score.eq.0")
        .not("status", "in", '("won","lost")');

      if (!leads || leads.length === 0) return { scored: 0 };

      const { calculateLeadScore } = await import("@/lib/scoring/engine");

      // Fetch won leads for similarity
      const { data: wonLeads } = await supabase
        .from("leads")
        .select("*")
        .eq("status", "won");

      let scored = 0;
      for (const lead of leads) {
        // Get enrichment if available
        const { data: enrichment } = await supabase
          .from("lead_enrichment")
          .select("*")
          .eq("lead_id", lead.id)
          .single();

        // Get outreach logs
        const { data: logs } = await supabase
          .from("outreach_log")
          .select("*")
          .eq("lead_id", lead.id);

        const score = calculateLeadScore(lead, enrichment, logs ?? [], wonLeads ?? []);

        await supabase.from("lead_scores").upsert({
          lead_id: lead.id,
          total_score: score.total_score,
          engagement_score: score.engagement_score,
          business_score: score.business_score,
          timing_score: score.timing_score,
          negative_score: score.negative_score,
          recommendation: score.recommendation,
          recommendation_reason: score.recommendation_reason,
          similar_won_leads: score.similar_won_leads,
          scored_at: new Date().toISOString(),
        }, { onConflict: "lead_id" });

        await supabase.from("leads").update({
          lead_score: score.total_score,
          updated_at: new Date().toISOString(),
        }).eq("id", lead.id);

        scored++;
      }

      return { scored };
    });

    if (results.scored > 0) {
      await step.run("notify-scored", async () => {
        await sendDiscordMessage(`Scored **${results.scored}** new leads this morning.`);
      });
    }

    return results;
  },
);

// ═══════════════════════════════════════════════════
// 2. AUTO-ENRICH NEW LEADS — Daily 8:00am
// Enrich leads added in the last 24h without enrichment
// ═══════════════════════════════════════════════════

export const autoEnrichNewLeads = inngest.createFunction(
  {
    id: "cron-auto-enrich-new-leads",
    triggers: [{ cron: "TZ=Europe/Zagreb 0 8 * * *" }],
    retries: 1,
  },
  async ({ step }) => {
    // Find leads to enrich
    const leadIds = await step.run("find-unenriched-leads", async () => {
      const supabase = createAdminClient();
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data: leads } = await supabase
        .from("leads")
        .select("id")
        .gte("created_at", yesterday)
        .is("last_enriched_at", null)
        .not("status", "in", '("won","lost")')
        .limit(20);

      return (leads ?? []).map((l) => l.id);
    });

    if (leadIds.length === 0) return { enriched: 0 };

    let enriched = 0;

    // Enrich each lead as a separate step (retryable individually)
    for (let i = 0; i < leadIds.length; i++) {
      await step.run(`enrich-lead-${i}`, async () => {
        const supabase = createAdminClient();
        const leadId = leadIds[i];

        const { data: lead } = await supabase
          .from("leads")
          .select("*")
          .eq("id", leadId)
          .single();

        if (!lead) return;

        const enrichment: Record<string, unknown> = {
          lead_id: leadId,
          enriched_at: new Date().toISOString(),
        };

        // Website analysis
        if (lead.website_url) {
          const url = lead.website_url.startsWith("http") ? lead.website_url : `https://${lead.website_url}`;

          // PageSpeed Mobile
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 15000);
            const res = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile`, { signal: controller.signal });
            clearTimeout(timeout);
            if (res.ok) {
              const data = await res.json();
              const score = data?.lighthouseResult?.categories?.performance?.score;
              if (typeof score === "number") enrichment.page_speed_mobile = Math.round(score * 100);
            }
          } catch { /* timeout */ }

          // Fetch HTML for tech stack detection
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);
            const res = await fetch(url, { signal: controller.signal, redirect: "follow", headers: { "User-Agent": "Mozilla/5.0 (compatible; PetarOS/1.0)" } });
            clearTimeout(timeout);
            const finalUrl = res.url;
            const html = await res.text();
            const lower = html.toLowerCase();

            enrichment.has_ssl = finalUrl.startsWith("https");
            enrichment.is_mobile_responsive = lower.includes("viewport");

            if (lower.includes("wp-content")) enrichment.tech_stack = "WordPress";
            else if (lower.includes("wix.com")) enrichment.tech_stack = "Wix";
            else if (lower.includes("squarespace")) enrichment.tech_stack = "Squarespace";
            else if (lower.includes("shopify")) enrichment.tech_stack = "Shopify";
            else if (finalUrl.includes("business.site")) enrichment.tech_stack = "Google Sites";
            else enrichment.tech_stack = "Custom";
          } catch { /* fetch error */ }
        }

        // Google Places
        const serperKey = process.env.SERPER_API_KEY;
        if (serperKey && lead.business_name && lead.location) {
          try {
            const res = await fetch("https://google.serper.dev/places", {
              method: "POST",
              headers: { "X-API-KEY": serperKey, "Content-Type": "application/json" },
              body: JSON.stringify({ q: `${lead.business_name} ${lead.location}` }),
            });
            if (res.ok) {
              const data = await res.json();
              const first = data?.places?.[0];
              if (first?.rating) enrichment.google_rating = first.rating;
              if (first?.ratingCount) enrichment.google_reviews_count = first.ratingCount;
            }
          } catch { /* serper error */ }
        }

        // Summary
        const parts: string[] = [];
        if (enrichment.page_speed_mobile !== undefined) parts.push(`Mobile: ${enrichment.page_speed_mobile}/100`);
        if (enrichment.has_ssl === false) parts.push("No SSL");
        if (enrichment.tech_stack) parts.push(String(enrichment.tech_stack));
        if (enrichment.google_rating) parts.push(`${enrichment.google_rating}★`);
        enrichment.enrichment_summary = parts.length > 0 ? parts.join(", ") : "Partial data";

        await supabase.from("lead_enrichment").upsert(enrichment, { onConflict: "lead_id" });
        await supabase.from("leads").update({
          page_speed: (enrichment.page_speed_mobile as number) ?? lead.page_speed,
          last_enriched_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", leadId);

        enriched++;
      });
    }

    await step.run("notify-enriched", async () => {
      if (enriched > 0) {
        await sendDiscordMessage(`Enriched **${enriched}** new leads this morning.`);
      }
    });

    return { enriched };
  },
);

// ═══════════════════════════════════════════════════
// 3. TODOIST SYNC — Every 2 hours
// ═══════════════════════════════════════════════════

export const todoistSync = inngest.createFunction(
  {
    id: "cron-todoist-sync",
    triggers: [{ cron: "TZ=Europe/Zagreb 0 */2 * * *" }],
  },
  async ({ step }) => {
    return await step.run("sync-todoist", async () => {
      const token = process.env.TODOIST_API_TOKEN;
      if (!token) return { synced: false, reason: "No TODOIST_API_TOKEN" };

      try {
        // The app already has a todoist sync endpoint — call it internally
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : "http://localhost:3000";

        const res = await fetch(`${baseUrl}/api/todoist/sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        if (res.ok) {
          return { synced: true };
        }
        return { synced: false, reason: "Sync endpoint returned error" };
      } catch (e) {
        return { synced: false, reason: String(e) };
      }
    });
  },
);

// ═══════════════════════════════════════════════════
// 4. FOLLOW-UP AUTO-SCHEDULER — Daily 7:30am
// Set next_follow_up for leads that are missing it
// ═══════════════════════════════════════════════════

export const followUpScheduler = inngest.createFunction(
  {
    id: "cron-followup-scheduler",
    triggers: [{ cron: "TZ=Europe/Zagreb 30 7 * * *" }],
  },
  async ({ step }) => {
    return await step.run("schedule-followups", async () => {
      const supabase = createAdminClient();

      const { data: leads } = await supabase
        .from("leads")
        .select("id, follow_up_count, status, last_contacted_at")
        .is("next_follow_up", null)
        .not("status", "in", '("won","lost")');

      if (!leads || leads.length === 0) return { scheduled: 0 };

      let scheduled = 0;
      const now = Date.now();

      for (const lead of leads) {
        // Only schedule if they've been contacted at least once
        if (!lead.last_contacted_at) continue;

        const count = lead.follow_up_count ?? 0;
        let daysOut = 3;
        if (count >= 3) daysOut = 14;
        else if (count >= 2) daysOut = 7;

        const nextDate = new Date(now + daysOut * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10);

        await supabase
          .from("leads")
          .update({ next_follow_up: nextDate, updated_at: new Date().toISOString() })
          .eq("id", lead.id);

        scheduled++;
      }

      if (scheduled > 0) {
        await sendDiscordMessage(`Scheduled follow-ups for **${scheduled}** leads.`);
      }

      return { scheduled };
    });
  },
);

// ═══════════════════════════════════════════════════
// 5. WEEKLY PIPELINE DIGEST — Monday 8:00am
// Summary of the week: new leads, movement, conversion, MRR
// ═══════════════════════════════════════════════════

export const weeklyPipelineDigest = inngest.createFunction(
  {
    id: "cron-weekly-pipeline-digest",
    triggers: [{ cron: "TZ=Europe/Zagreb 0 8 * * 1" }],
  },
  async ({ step }) => {
    return await step.run("generate-digest", async () => {
      const supabase = createAdminClient();
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const now = new Date().toISOString();

      // New leads this week
      const { count: newLeadsCount } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .gte("created_at", weekAgo);

      // Leads won this week
      const { data: wonLeads } = await supabase
        .from("leads")
        .select("business_name, niche")
        .eq("status", "won")
        .gte("updated_at", weekAgo);

      // Leads lost this week
      const { count: lostCount } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("status", "lost")
        .gte("updated_at", weekAgo);

      // Total active pipeline
      const { count: activeCount } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .not("status", "in", '("won","lost")');

      // Total won all time (for conversion rate)
      const { count: totalWon } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("status", "won");

      const { count: totalLeads } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true });

      const conversionRate = (totalLeads ?? 0) > 0
        ? (((totalWon ?? 0) / (totalLeads ?? 1)) * 100).toFixed(1)
        : "0";

      // MRR
      const { data: clients } = await supabase
        .from("clients")
        .select("mrr")
        .eq("status", "active");

      const totalMRR = (clients ?? []).reduce((sum, c) => sum + Number(c.mrr ?? 0), 0);

      // Outreach stats this week
      const { count: outreachCount } = await supabase
        .from("outreach_log")
        .select("*", { count: "exact", head: true })
        .gte("sent_at", weekAgo);

      // Top scored leads
      const { data: topLeads } = await supabase
        .from("leads")
        .select("business_name, lead_score, status")
        .not("status", "in", '("won","lost")')
        .not("lead_score", "is", null)
        .gt("lead_score", 0)
        .order("lead_score", { ascending: false })
        .limit(5);

      // Build Discord embed
      const wonNames = (wonLeads ?? []).map((l) => l.business_name).join(", ") || "None";
      const topLeadsList = (topLeads ?? [])
        .map((l) => `${l.business_name} (${l.lead_score})`)
        .join(", ") || "None scored";

      await sendDiscordMessage("", [
        {
          title: "Weekly Pipeline Digest",
          color: COLORS.blue,
          fields: [
            { name: "New Leads", value: String(newLeadsCount ?? 0), inline: true },
            { name: "Won", value: String(wonLeads?.length ?? 0), inline: true },
            { name: "Lost", value: String(lostCount ?? 0), inline: true },
            { name: "Active Pipeline", value: String(activeCount ?? 0), inline: true },
            { name: "Conversion Rate", value: `${conversionRate}%`, inline: true },
            { name: "Total MRR", value: `€${totalMRR.toFixed(0)}`, inline: true },
            { name: "Outreach Sent", value: String(outreachCount ?? 0), inline: true },
            { name: "Won This Week", value: wonNames },
            { name: "Top Leads by Score", value: topLeadsList },
          ],
          footer: { text: "Petar OS — Weekly Digest" },
          timestamp: now,
        },
      ]);

      return {
        new_leads: newLeadsCount ?? 0,
        won: wonLeads?.length ?? 0,
        lost: lostCount ?? 0,
        active: activeCount ?? 0,
        conversion_rate: conversionRate,
        mrr: totalMRR,
        outreach_sent: outreachCount ?? 0,
      };
    });
  },
);

// ═══════════════════════════════════════════════════
// 6. RE-SCORE ALL LEADS — Sunday 10pm
// Weekly full re-score (timing scores change seasonally)
// ═══════════════════════════════════════════════════

export const weeklyRescore = inngest.createFunction(
  {
    id: "cron-weekly-rescore",
    triggers: [{ cron: "TZ=Europe/Zagreb 0 22 * * 0" }],
    retries: 1,
  },
  async ({ step }) => {
    const leadIds = await step.run("find-active-leads", async () => {
      const supabase = createAdminClient();
      const { data: leads } = await supabase
        .from("leads")
        .select("id")
        .not("status", "in", '("won","lost")');

      return (leads ?? []).map((l) => l.id);
    });

    if (leadIds.length === 0) return { rescored: 0 };

    let rescored = 0;

    // Score in batches of 10 per step
    const batchSize = 10;
    for (let b = 0; b < leadIds.length; b += batchSize) {
      const batch = leadIds.slice(b, b + batchSize);

      await step.run(`rescore-batch-${b}`, async () => {
        const supabase = createAdminClient();
        const { calculateLeadScore } = await import("@/lib/scoring/engine");

        const { data: wonLeads } = await supabase
          .from("leads")
          .select("*")
          .eq("status", "won");

        for (const leadId of batch) {
          const { data: lead } = await supabase
            .from("leads")
            .select("*")
            .eq("id", leadId)
            .single();

          if (!lead) continue;

          const { data: enrichment } = await supabase
            .from("lead_enrichment")
            .select("*")
            .eq("lead_id", leadId)
            .single();

          const { data: logs } = await supabase
            .from("outreach_log")
            .select("*")
            .eq("lead_id", leadId);

          const score = calculateLeadScore(lead, enrichment, logs ?? [], wonLeads ?? []);

          await supabase.from("lead_scores").upsert({
            lead_id: leadId,
            total_score: score.total_score,
            engagement_score: score.engagement_score,
            business_score: score.business_score,
            timing_score: score.timing_score,
            negative_score: score.negative_score,
            recommendation: score.recommendation,
            recommendation_reason: score.recommendation_reason,
            similar_won_leads: score.similar_won_leads,
            scored_at: new Date().toISOString(),
          }, { onConflict: "lead_id" });

          await supabase.from("leads").update({
            lead_score: score.total_score,
            updated_at: new Date().toISOString(),
          }).eq("id", leadId);

          rescored++;
        }
      });
    }

    await step.run("notify-rescored", async () => {
      await sendDiscordMessage(`Weekly re-score complete: **${rescored}** leads re-scored.`);
    });

    return { rescored };
  },
);
