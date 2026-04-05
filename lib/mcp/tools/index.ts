import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createAdminClient } from "@/lib/supabase/admin";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/**
 * Resolve the single user's ID. Petar OS is a single-user app so we
 * grab the first (and only) user from Supabase Auth.
 *
 * Cached per serverless invocation to avoid redundant auth round-trips
 * when multiple tools run in the same request.
 */
let cachedUserId: string | null = null;

async function getUserId(): Promise<string> {
  if (cachedUserId) return cachedUserId;

  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.listUsers();

  if (error) throw new Error(`Failed to list users: ${error.message}`);
  if (!data?.users?.length) throw new Error("No users found in Supabase Auth");

  cachedUserId = data.users[0].id;
  return cachedUserId;
}

/** Standard MCP text response */
function text(msg: string) {
  return { content: [{ type: "text" as const, text: msg }] };
}

/** Standard MCP error response */
function errorResponse(msg: string) {
  return { content: [{ type: "text" as const, text: `Error: ${msg}` }] };
}

// ─────────────────────────────────────────────
// CRM Tools
// ─────────────────────────────────────────────

function registerCrmTools(server: McpServer): void {
  server.registerTool("create_lead", {
    description:
      "Create a new lead in the Elevera Studio CRM pipeline. Use this when Petar finds a potential client (dental, frizer, restoran, etc.) that could benefit from a website.",
    inputSchema: {
      business_name: z.string().describe("Name of the business, e.g. 'Apartmani ANITA'"),
      contact_name: z.string().optional().describe("Owner or manager name"),
      email: z.string().email().optional().describe("Primary contact email address"),
      phone: z.string().optional().describe("Phone number"),
      website_url: z.string().url().optional().describe("Their current website URL, if any"),
      location: z.string().optional().describe("City or region, e.g. 'Pula', 'Split'"),
      niche: z
        .enum([
          "dental",
          "frizer",
          "restoran",
          "autoservis",
          "fizioterapija",
          "wellness",
          "fitness",
          "apartmani",
          "kozmetika",
          "pekara",
          "ostalo",
        ])
        .optional()
        .describe("Business niche/category"),
      notes: z.string().optional().describe("Free-form notes about the lead"),
      demo_site_url: z.string().url().optional().describe("Vercel demo site link if one was created"),
      source: z.string().optional().describe("How the lead was found"),
      instagram: z.string().optional().describe("Instagram handle, e.g. '@business_name'"),
      channel: z
        .enum(["instagram_dm", "email", "linkedin", "telefon", "whatsapp", "osobno"])
        .optional()
        .describe("Outreach channel used for first contact"),
      market: z
        .enum(["hr", "dach", "us"])
        .optional()
        .describe("Target market for this lead"),
      first_message: z.string().optional().describe("Content of the first outreach message sent"),
      first_contact: z.string().optional().describe("Date of first contact (ISO 8601 YYYY-MM-DD)"),
      page_speed: z.number().int().optional().describe("PageSpeed Insights score (0-100)"),
    },
  }, async (args) => {
    try {
      const supabase = createAdminClient();
      const userId = await getUserId();

      const { data, error } = await supabase
        .from("leads")
        .insert({
          user_id: userId,
          business_name: args.business_name,
          contact_name: args.contact_name ?? null,
          email: args.email ?? null,
          phone: args.phone ?? null,
          website_url: args.website_url ?? null,
          location: args.location ?? null,
          niche: args.niche ?? null,
          status: "new",
          demo_site_url: args.demo_site_url ?? null,
          notes: args.notes ?? null,
          source: args.source ?? "manual",
          instagram: args.instagram ?? null,
          channel: args.channel ?? null,
          market: args.market ?? null,
          first_message: args.first_message ?? null,
          first_contact: args.first_contact ?? null,
          page_speed: args.page_speed ?? null,
        })
        .select()
        .single();

      if (error) return errorResponse(error.message);

      return text(
        `Lead created successfully.\n\n` +
        `  ID: ${data.id}\n` +
        `  Business: ${data.business_name}\n` +
        `  Location: ${data.location ?? "—"}\n` +
        `  Niche: ${data.niche ?? "—"}\n` +
        `  Market: ${data.market ?? "—"}\n` +
        `  Channel: ${data.channel ?? "—"}\n` +
        `  Status: ${data.status}\n` +
        `  Source: ${data.source ?? "—"}\n` +
        `  Created: ${data.created_at}`
      );
    } catch (err) {
      return errorResponse(err instanceof Error ? err.message : String(err));
    }
  });

  server.registerTool("update_lead", {
    description:
      "Update an existing lead's information — status, notes, contact details, or any other field. Use the lead ID to identify which lead to update.",
    inputSchema: {
      lead_id: z.string().uuid().describe("UUID of the lead to update"),
      business_name: z.string().optional().describe("Updated business name"),
      contact_name: z.string().optional().describe("Updated contact name"),
      email: z.string().email().optional().describe("Updated email"),
      phone: z.string().optional().describe("Updated phone"),
      website_url: z.string().url().optional().describe("Updated website URL"),
      location: z.string().optional().describe("Updated location"),
      niche: z
        .enum([
          "dental",
          "frizer",
          "restoran",
          "autoservis",
          "fizioterapija",
          "wellness",
          "fitness",
          "apartmani",
          "kozmetika",
          "pekara",
          "ostalo",
        ])
        .optional()
        .describe("Updated niche"),
      notes: z.string().optional().describe("Updated notes"),
      demo_site_url: z.string().url().optional().describe("Updated demo site URL"),
      instagram: z.string().optional().describe("Updated Instagram handle"),
      channel: z
        .enum(["instagram_dm", "email", "linkedin", "telefon", "whatsapp", "osobno"])
        .optional()
        .describe("Updated outreach channel"),
      market: z
        .enum(["hr", "dach", "us"])
        .optional()
        .describe("Updated target market"),
      first_message: z.string().optional().describe("Updated first message content"),
      first_contact: z.string().optional().describe("Updated first contact date (ISO 8601 YYYY-MM-DD)"),
      page_speed: z.number().int().optional().describe("Updated PageSpeed Insights score (0-100)"),
    },
  }, async (args) => {
    try {
      const supabase = createAdminClient();
      const { lead_id, ...fields } = args;

      // Build update payload — only include fields that were actually provided
      const updates: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined) {
          updates[key] = value;
        }
      }
      updates.updated_at = new Date().toISOString();

      if (Object.keys(updates).length === 1) {
        // Only updated_at — nothing meaningful to update
        return text("No fields provided to update.");
      }

      const { data, error } = await supabase
        .from("leads")
        .update(updates)
        .eq("id", lead_id)
        .select()
        .single();

      if (error) return errorResponse(error.message);

      const changedFields = Object.keys(updates).filter((k) => k !== "updated_at");

      return text(
        `Lead updated successfully.\n\n` +
        `  ID: ${data.id}\n` +
        `  Business: ${data.business_name}\n` +
        `  Status: ${data.status}\n` +
        `  Updated fields: ${changedFields.join(", ")}`
      );
    } catch (err) {
      return errorResponse(err instanceof Error ? err.message : String(err));
    }
  });

  server.registerTool("move_lead", {
    description:
      "Move a lead to a different pipeline stage. Stages flow: new → demo_built → contacted → replied → call_booked → follow_up → won / lost.",
    inputSchema: {
      lead_id: z.string().uuid().describe("UUID of the lead to move"),
      status: z
        .enum([
          "new",
          "demo_built",
          "contacted",
          "replied",
          "call_booked",
          "follow_up",
          "won",
          "lost",
        ])
        .describe("Target pipeline stage"),
    },
  }, async (args) => {
    try {
      const supabase = createAdminClient();

      // Fetch current status for the confirmation message
      const { data: current, error: fetchError } = await supabase
        .from("leads")
        .select("business_name, status")
        .eq("id", args.lead_id)
        .single();

      if (fetchError) return errorResponse(fetchError.message);

      const previousStatus = current.status;

      const { data, error } = await supabase
        .from("leads")
        .update({
          status: args.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", args.lead_id)
        .select()
        .single();

      if (error) return errorResponse(error.message);

      return text(
        `Lead moved successfully.\n\n` +
        `  Business: ${data.business_name}\n` +
        `  Previous stage: ${previousStatus}\n` +
        `  New stage: ${data.status}`
      );
    } catch (err) {
      return errorResponse(err instanceof Error ? err.message : String(err));
    }
  });

  server.registerTool("list_leads", {
    description:
      "Query leads with optional filters. Returns a list of leads matching the criteria. Use this to check pipeline status, find leads by niche or location, or get an overview of outreach progress.",
    inputSchema: {
      status: z
        .enum([
          "new",
          "demo_built",
          "contacted",
          "replied",
          "call_booked",
          "follow_up",
          "won",
          "lost",
        ])
        .optional()
        .describe("Filter by pipeline stage"),
      niche: z
        .enum([
          "dental",
          "frizer",
          "restoran",
          "autoservis",
          "fizioterapija",
          "wellness",
          "fitness",
          "apartmani",
          "kozmetika",
          "pekara",
          "ostalo",
        ])
        .optional()
        .describe("Filter by business niche"),
      channel: z
        .enum(["instagram_dm", "email", "linkedin", "telefon", "whatsapp", "osobno"])
        .optional()
        .describe("Filter by outreach channel"),
      market: z
        .enum(["hr", "dach", "us"])
        .optional()
        .describe("Filter by target market"),
      location: z.string().optional().describe("Filter by city/region"),
      date_from: z.string().optional().describe("Filter leads created after this date (ISO 8601)"),
      date_to: z.string().optional().describe("Filter leads created before this date (ISO 8601)"),
      limit: z.number().int().positive().optional().describe("Maximum number of leads to return"),
    },
  }, async (args) => {
    try {
      const supabase = createAdminClient();

      let query = supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (args.status) query = query.eq("status", args.status);
      if (args.niche) query = query.eq("niche", args.niche);
      if (args.channel) query = query.eq("channel", args.channel);
      if (args.market) query = query.eq("market", args.market);
      if (args.location) query = query.ilike("location", `%${args.location}%`);
      if (args.date_from) query = query.gte("created_at", args.date_from);
      if (args.date_to) query = query.lte("created_at", args.date_to);
      if (args.limit) query = query.limit(args.limit);

      const { data, error } = await query;

      if (error) return errorResponse(error.message);
      if (!data || data.length === 0) return text("No leads found matching the given filters.");

      const filtersUsed = [
        args.status && `status=${args.status}`,
        args.niche && `niche=${args.niche}`,
        args.channel && `channel=${args.channel}`,
        args.market && `market=${args.market}`,
        args.location && `location~${args.location}`,
        args.date_from && `from=${args.date_from}`,
        args.date_to && `to=${args.date_to}`,
      ].filter(Boolean);

      const header = `Found ${data.length} lead${data.length === 1 ? "" : "s"}${filtersUsed.length ? ` (filters: ${filtersUsed.join(", ")})` : ""}:\n`;

      const rows = data.map((lead, i) => {
        const daysSinceContact = lead.last_contacted_at
          ? Math.floor((Date.now() - new Date(lead.last_contacted_at).getTime()) / 86400000)
          : null;

        return (
          `${i + 1}. ${lead.business_name}\n` +
          `   ID: ${lead.id}\n` +
          `   Status: ${lead.status} | Niche: ${lead.niche ?? "—"} | Location: ${lead.location ?? "—"}\n` +
          `   Market: ${lead.market ?? "—"} | Channel: ${lead.channel ?? "—"}\n` +
          `   Email: ${lead.email ?? "—"} | Phone: ${lead.phone ?? "—"}\n` +
          `   Website: ${lead.website_url ?? "—"}\n` +
          `   Demo: ${lead.demo_site_url ?? "—"}\n` +
          (lead.instagram ? `   Instagram: ${lead.instagram}\n` : "") +
          (lead.page_speed != null ? `   PageSpeed: ${lead.page_speed}/100\n` : "") +
          (daysSinceContact !== null ? `   Last contacted: ${daysSinceContact}d ago\n` : "") +
          (lead.next_follow_up ? `   Next follow-up: ${lead.next_follow_up}\n` : "") +
          (lead.notes ? `   Notes: ${lead.notes}\n` : "")
        );
      });

      return text(header + "\n" + rows.join("\n"));
    } catch (err) {
      return errorResponse(err instanceof Error ? err.message : String(err));
    }
  });

  server.registerTool("generate_cold_email", {
    description:
      "Generate a personalized cold email for a lead using their business context, niche, and the ROI argument ('one direct booking pays for the whole year of our service'). Returns lead context and a structured prompt for Claude to compose the email.",
    inputSchema: {
      lead_id: z.string().uuid().describe("UUID of the lead to generate an email for"),
      language: z.enum(["hr", "en"]).default("hr").describe("Email language — Croatian or English"),
      tone: z
        .enum(["formal", "friendly", "direct"])
        .default("friendly")
        .describe("Email tone"),
      include_demo_link: z
        .boolean()
        .default(false)
        .describe("Whether to include a demo site link in the email"),
    },
  }, async (args) => {
    try {
      const supabase = createAdminClient();

      const { data: lead, error } = await supabase
        .from("leads")
        .select("*")
        .eq("id", args.lead_id)
        .single();

      if (error) return errorResponse(error.message);

      // Niche-specific selling angles
      const nicheAngles: Record<string, string> = {
        dental: "Patients search for dentists online before booking. A modern, fast website builds trust and fills appointment slots directly.",
        frizer: "A professional website with online booking reduces no-shows and phone time. Showcase your work better than Instagram alone.",
        restoran: "Guests check menus and reviews online before choosing. A beautiful website with direct reservation captures walk-in and tourist traffic.",
        autoservis: "Vehicle owners search locally for mechanics. A professional site with service listings and booking converts those searches into customers.",
        fizioterapija: "Patients research providers before booking. A clean, trustworthy website with online scheduling fills your calendar.",
        wellness: "Wellness seekers expect a premium online experience matching the in-person one. A stunning website sets the mood before they arrive.",
        fitness: "Members search for gyms and trainers online. A modern site with class schedules and sign-up converts browsers into members.",
        apartmani: "Direct bookings vs Booking.com commission (15-20%). A modern website with direct booking pays for itself with just one reservation.",
        kozmetika: "Clients want to see your work before booking. A portfolio website with online booking converts browsers into loyal clients.",
        pekara: "Local customers look up hours, menus, and locations online. A fast, mobile-friendly site keeps them coming back.",
        ostalo: "A professional web presence builds trust and converts visitors into customers.",
      };

      const nicheAngle = nicheAngles[lead.niche ?? "ostalo"] ?? nicheAngles["ostalo"];

      const context = [
        `=== LEAD CONTEXT FOR COLD EMAIL ===`,
        ``,
        `Business: ${lead.business_name}`,
        `Contact: ${lead.contact_name ?? "Unknown"}`,
        `Niche: ${lead.niche ?? "Unknown"}`,
        `Location: ${lead.location ?? "Unknown"}`,
        `Market: ${lead.market ?? "hr"}`,
        `Current website: ${lead.website_url ?? "None found"}`,
        `Email: ${lead.email ?? "Unknown"}`,
        lead.instagram ? `Instagram: ${lead.instagram}` : null,
        lead.page_speed != null ? `Page speed score: ${lead.page_speed}/100` : null,
        lead.notes ? `Notes: ${lead.notes}` : null,
        ``,
        `=== EMAIL PARAMETERS ===`,
        `Language: ${args.language === "hr" ? "Croatian" : "English"}`,
        `Tone: ${args.tone}`,
        args.include_demo_link && lead.demo_site_url
          ? `Include demo link: ${lead.demo_site_url}`
          : `Include demo link: No`,
        ``,
        `=== NICHE-SPECIFIC ANGLE ===`,
        nicheAngle,
        ``,
        `=== ROI ARGUMENT (core selling point) ===`,
        `Elevera Studio builds modern, fast websites for ${lead.niche ?? "small"} businesses.`,
        `Key argument: One direct booking/client from the website pays for the entire year of service.`,
        `Plans start at €79/month (basic) or €99/month (standard) — includes hosting, maintenance, and updates.`,
        ``,
        `=== SENDER INFO ===`,
        `From: Petar Markota, Elevera Studio (eleverastudio.com)`,
        ``,
        `Please compose a cold email using the above context. Keep it concise (under 150 words), personalized to this specific business, and end with a clear CTA.`,
      ]
        .filter((line) => line !== null)
        .join("\n");

      // Log this as an outreach attempt
      const userId = await getUserId();
      await supabase.from("outreach_log").insert({
        user_id: userId,
        lead_id: lead.id,
        type: "email",
        content: `Cold email generation requested (${args.language}, ${args.tone} tone)`,
        sent_at: new Date().toISOString(),
        response_received: false,
      });

      // Update last_contacted_at on the lead
      await supabase
        .from("leads")
        .update({
          last_contacted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", lead.id);

      return text(context);
    } catch (err) {
      return errorResponse(err instanceof Error ? err.message : String(err));
    }
  });

  server.registerTool("get_outreach_stats", {
    description:
      "Get outreach performance statistics: conversion rates between pipeline stages, response rates, average time to close, and pipeline velocity. Useful for evaluating outreach effectiveness.",
    inputSchema: {
      period_days: z
        .number()
        .int()
        .positive()
        .default(30)
        .describe("Number of days to look back for statistics"),
    },
  }, async (args) => {
    try {
      const supabase = createAdminClient();
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - args.period_days);
      const cutoffISO = cutoff.toISOString();

      // Fetch all leads and outreach logs within period in parallel
      const [leadsResult, outreachResult] = await Promise.all([
        supabase.from("leads").select("id, status, created_at, updated_at"),
        supabase.from("outreach_log").select("*").gte("sent_at", cutoffISO),
      ]);

      if (leadsResult.error) return errorResponse(leadsResult.error.message);
      if (outreachResult.error) return errorResponse(outreachResult.error.message);

      const allLeads = leadsResult.data ?? [];
      const outreachLogs = outreachResult.data ?? [];

      // Pipeline status counts
      const statusCounts: Record<string, number> = {};
      for (const lead of allLeads) {
        statusCounts[lead.status] = (statusCounts[lead.status] ?? 0) + 1;
      }

      // Outreach stats within period
      const totalOutreach = outreachLogs.length;
      const responses = outreachLogs.filter((o) => o.response_received);
      const responseRate = totalOutreach > 0
        ? ((responses.length / totalOutreach) * 100).toFixed(1)
        : "0.0";

      // Outreach by type
      const byType: Record<string, number> = {};
      for (const log of outreachLogs) {
        byType[log.type] = (byType[log.type] ?? 0) + 1;
      }

      // Leads created within period
      const recentLeads = allLeads.filter(
        (l) => new Date(l.created_at) >= cutoff
      );

      // Win/loss metrics
      const wonLeads = allLeads.filter((l) => l.status === "won");
      const lostLeads = allLeads.filter((l) => l.status === "lost");
      const totalDecided = wonLeads.length + lostLeads.length;
      const winRate = totalDecided > 0
        ? ((wonLeads.length / totalDecided) * 100).toFixed(1)
        : "N/A";

      const report = [
        `=== OUTREACH STATS (last ${args.period_days} days) ===`,
        ``,
        `--- Pipeline Overview (all time) ---`,
        ...Object.entries(statusCounts).map(([status, count]) => `  ${status}: ${count}`),
        `  Total leads: ${allLeads.length}`,
        ``,
        `--- Outreach Activity (last ${args.period_days}d) ---`,
        `  Total outreach actions: ${totalOutreach}`,
        ...Object.entries(byType).map(([type, count]) => `    ${type}: ${count}`),
        `  Responses received: ${responses.length}`,
        `  Response rate: ${responseRate}%`,
        ``,
        `--- Conversion ---`,
        `  New leads (period): ${recentLeads.length}`,
        `  Won (all time): ${wonLeads.length}`,
        `  Lost (all time): ${lostLeads.length}`,
        `  Win rate: ${winRate}%`,
      ];

      return text(report.join("\n"));
    } catch (err) {
      return errorResponse(err instanceof Error ? err.message : String(err));
    }
  });
}

// ─────────────────────────────────────────────
// Finance Tools
// ─────────────────────────────────────────────

function registerFinanceTools(server: McpServer): void {
  server.registerTool("log_income", {
    description:
      "Record an income entry. Sources include father's company salary, Elevera Studio client payments, Etsy shop revenue, Fleet by Elevera, or freelance work.",
    inputSchema: {
      amount: z.number().positive().describe("Amount in EUR"),
      source: z
        .enum(["father_salary", "elevera", "etsy", "fleet", "freelance"])
        .describe("Income source"),
      description: z.string().optional().describe("Description of the income, e.g. 'March salary' or 'Client X monthly payment'"),
      date: z.string().describe("Transaction date in ISO 8601 format (YYYY-MM-DD)"),
      recurring: z.boolean().default(false).describe("Whether this is a monthly recurring income"),
    },
  }, async (args) => {
    try {
      const supabase = createAdminClient();
      const userId = await getUserId();

      const { data, error } = await supabase
        .from("finances")
        .insert({
          user_id: userId,
          type: "income",
          amount: args.amount,
          source: args.source,
          category: null,
          description: args.description ?? null,
          date: args.date,
          recurring: args.recurring,
        })
        .select()
        .single();

      if (error) return errorResponse(error.message);

      return text(
        `Income logged successfully.\n\n` +
        `  ID: ${data.id}\n` +
        `  Amount: €${data.amount}\n` +
        `  Source: ${data.source}\n` +
        `  Date: ${data.date}\n` +
        `  Recurring: ${data.recurring ? "Yes" : "No"}\n` +
        (data.description ? `  Description: ${data.description}` : "")
      );
    } catch (err) {
      return errorResponse(err instanceof Error ? err.message : String(err));
    }
  });

  server.registerTool("log_expense", {
    description:
      "Record an expense entry with category tracking. Categories cover rent, food, subscriptions, domains, transport, gym, and more. Essential for tracking the apartment move-in fund with Nika.",
    inputSchema: {
      amount: z.number().positive().describe("Amount in EUR"),
      category: z
        .enum(["rent", "food", "subscriptions", "domains", "transport", "gym", "other"])
        .describe("Expense category"),
      description: z.string().optional().describe("What the expense was for"),
      date: z.string().describe("Transaction date in ISO 8601 format (YYYY-MM-DD)"),
      recurring: z.boolean().default(false).describe("Whether this is a monthly recurring expense"),
    },
  }, async (args) => {
    try {
      const supabase = createAdminClient();
      const userId = await getUserId();

      const { data, error } = await supabase
        .from("finances")
        .insert({
          user_id: userId,
          type: "expense",
          amount: args.amount,
          source: null,
          category: args.category,
          description: args.description ?? null,
          date: args.date,
          recurring: args.recurring,
        })
        .select()
        .single();

      if (error) return errorResponse(error.message);

      return text(
        `Expense logged successfully.\n\n` +
        `  ID: ${data.id}\n` +
        `  Amount: €${data.amount}\n` +
        `  Category: ${data.category}\n` +
        `  Date: ${data.date}\n` +
        `  Recurring: ${data.recurring ? "Yes" : "No"}\n` +
        (data.description ? `  Description: ${data.description}` : "")
      );
    } catch (err) {
      return errorResponse(err instanceof Error ? err.message : String(err));
    }
  });

  server.registerTool("get_financial_summary", {
    description:
      "Get a complete financial overview: monthly or yearly P&L, total income vs expenses, savings rate, and runway. Answers the question 'can we afford the apartment?' at a glance.",
    inputSchema: {
      period: z.enum(["month", "year"]).default("month").describe("Summary period"),
      month: z.number().int().min(1).max(12).optional().describe("Specific month (1-12). Defaults to current month."),
      year: z.number().int().optional().describe("Specific year. Defaults to current year."),
    },
  }, async (args) => {
    try {
      const supabase = createAdminClient();
      const now = new Date();
      const targetYear = args.year ?? now.getFullYear();
      const targetMonth = args.month ?? (now.getMonth() + 1);

      let dateFrom: string;
      let dateTo: string;
      let periodLabel: string;

      if (args.period === "year") {
        dateFrom = `${targetYear}-01-01`;
        dateTo = `${targetYear}-12-31`;
        periodLabel = `Year ${targetYear}`;
      } else {
        const monthStr = String(targetMonth).padStart(2, "0");
        dateFrom = `${targetYear}-${monthStr}-01`;
        const lastDay = new Date(targetYear, targetMonth, 0).getDate();
        dateTo = `${targetYear}-${monthStr}-${String(lastDay).padStart(2, "0")}`;
        periodLabel = `${monthStr}/${targetYear}`;
      }

      const { data: records, error } = await supabase
        .from("finances")
        .select("*")
        .gte("date", dateFrom)
        .lte("date", dateTo)
        .order("date", { ascending: true });

      if (error) return errorResponse(error.message);

      const incomeRecords = (records ?? []).filter((r) => r.type === "income");
      const expenseRecords = (records ?? []).filter((r) => r.type === "expense");

      const totalIncome = incomeRecords.reduce((sum, r) => sum + Number(r.amount), 0);
      const totalExpenses = expenseRecords.reduce((sum, r) => sum + Number(r.amount), 0);
      const net = totalIncome - totalExpenses;
      const savingsRate = totalIncome > 0 ? ((net / totalIncome) * 100).toFixed(1) : "N/A";

      // Income by source
      const incomeBySource: Record<string, number> = {};
      for (const r of incomeRecords) {
        const src = r.source ?? "unknown";
        incomeBySource[src] = (incomeBySource[src] ?? 0) + Number(r.amount);
      }

      // Expenses by category
      const expenseByCategory: Record<string, number> = {};
      for (const r of expenseRecords) {
        const cat = r.category ?? "other";
        expenseByCategory[cat] = (expenseByCategory[cat] ?? 0) + Number(r.amount);
      }

      // Recurring monthly obligations
      const recurringExpenses = expenseRecords
        .filter((r) => r.recurring)
        .reduce((sum, r) => sum + Number(r.amount), 0);

      const report = [
        `=== FINANCIAL SUMMARY — ${periodLabel} ===`,
        ``,
        `--- P&L ---`,
        `  Total income:   €${totalIncome.toFixed(2)}`,
        `  Total expenses: €${totalExpenses.toFixed(2)}`,
        `  Net:            €${net.toFixed(2)}`,
        `  Savings rate:   ${savingsRate}%`,
        ``,
        `--- Income by Source ---`,
        ...Object.entries(incomeBySource)
          .sort((a, b) => b[1] - a[1])
          .map(([src, amt]) => `  ${src}: €${amt.toFixed(2)}`),
        ...(Object.keys(incomeBySource).length === 0 ? ["  (no income recorded)"] : []),
        ``,
        `--- Expenses by Category ---`,
        ...Object.entries(expenseByCategory)
          .sort((a, b) => b[1] - a[1])
          .map(([cat, amt]) => `  ${cat}: €${amt.toFixed(2)}`),
        ...(Object.keys(expenseByCategory).length === 0 ? ["  (no expenses recorded)"] : []),
        ``,
        `--- Recurring Monthly Expenses ---`,
        `  Total: €${recurringExpenses.toFixed(2)}`,
        ``,
        `--- Transactions ---`,
        `  Income entries: ${incomeRecords.length}`,
        `  Expense entries: ${expenseRecords.length}`,
      ];

      return text(report.join("\n"));
    } catch (err) {
      return errorResponse(err instanceof Error ? err.message : String(err));
    }
  });

  server.registerTool("get_revenue_by_source", {
    description:
      "Get income breakdown by source (father's company, Elevera, Etsy, Fleet, freelance) for a given period. Shows which revenue streams are growing.",
    inputSchema: {
      period_days: z
        .number()
        .int()
        .positive()
        .default(30)
        .describe("Number of days to look back"),
    },
  }, async (args) => {
    try {
      const supabase = createAdminClient();
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - args.period_days);
      const cutoffDate = cutoff.toISOString().split("T")[0]; // YYYY-MM-DD

      const { data: records, error } = await supabase
        .from("finances")
        .select("*")
        .eq("type", "income")
        .gte("date", cutoffDate)
        .order("date", { ascending: false });

      if (error) return errorResponse(error.message);

      if (!records || records.length === 0) {
        return text(`No income records found in the last ${args.period_days} days.`);
      }

      const totalIncome = records.reduce((sum, r) => sum + Number(r.amount), 0);

      // Group by source
      const bySource: Record<string, { total: number; count: number; entries: Array<{ amount: number; date: string; description: string | null }> }> = {};
      for (const r of records) {
        const src = r.source ?? "unknown";
        if (!bySource[src]) bySource[src] = { total: 0, count: 0, entries: [] };
        bySource[src].total += Number(r.amount);
        bySource[src].count += 1;
        bySource[src].entries.push({
          amount: Number(r.amount),
          date: r.date,
          description: r.description,
        });
      }

      const report = [
        `=== REVENUE BY SOURCE (last ${args.period_days} days) ===`,
        ``,
        `Total income: €${totalIncome.toFixed(2)} from ${records.length} entries`,
        ``,
      ];

      const sorted = Object.entries(bySource).sort((a, b) => b[1].total - a[1].total);
      for (const [src, info] of sorted) {
        const pct = ((info.total / totalIncome) * 100).toFixed(1);
        report.push(`--- ${src} ---`);
        report.push(`  Total: €${info.total.toFixed(2)} (${pct}% of income)`);
        report.push(`  Entries: ${info.count}`);
        for (const entry of info.entries.slice(0, 5)) {
          report.push(`    €${entry.amount.toFixed(2)} on ${entry.date}${entry.description ? ` — ${entry.description}` : ""}`);
        }
        if (info.entries.length > 5) {
          report.push(`    ... and ${info.entries.length - 5} more`);
        }
        report.push(``);
      }

      return text(report.join("\n"));
    } catch (err) {
      return errorResponse(err instanceof Error ? err.message : String(err));
    }
  });
}

// ─────────────────────────────────────────────
// Fitness Tools (Phase 3 — placeholder)
// ─────────────────────────────────────────────

function registerFitnessTools(server: McpServer): void {
  const exerciseSchema = z.object({
    name: z.string().describe("Exercise name, e.g. 'bench press', 'squat', 'deadlift'"),
    sets: z.number().int().positive().describe("Number of sets performed"),
    reps: z.number().int().positive().describe("Number of reps per set"),
    weight_kg: z.number().positive().describe("Weight in kilograms"),
    is_pr: z.boolean().default(false).describe("Whether this was a personal record"),
  });

  server.registerTool("log_workout", {
    description:
      "Log a workout session with exercises, sets, reps, and weights. Petar follows a PPL (Push/Pull/Legs) 6-day split. Example: 'bench 5x5 at 120kg, squat 4x8 at 100kg'.",
    inputSchema: {
      date: z.string().describe("Workout date in ISO 8601 format (YYYY-MM-DD)"),
      type: z.enum(["push", "pull", "legs"]).describe("PPL day type"),
      exercises: z.array(exerciseSchema).describe("List of exercises performed"),
      duration_minutes: z.number().int().positive().optional().describe("Total workout duration in minutes"),
      notes: z.string().optional().describe("How the workout felt, energy level, etc."),
    },
  }, async (args) => {
    try {
      const supabase = createAdminClient();
      const userId = await getUserId();

      const { data, error } = await supabase
        .from("workouts")
        .insert({
          user_id: userId,
          date: args.date,
          type: args.type,
          exercises: args.exercises,
          duration_minutes: args.duration_minutes ?? null,
          notes: args.notes ?? null,
        })
        .select()
        .single();

      if (error) return errorResponse(error.message);

      const prs = args.exercises.filter((e) => e.is_pr);
      const exerciseSummary = args.exercises
        .map((e) => `  ${e.name}: ${e.sets}x${e.reps} @ ${e.weight_kg}kg${e.is_pr ? " (PR!)" : ""}`)
        .join("\n");

      return text(
        `Workout logged successfully.\n\n` +
        `  ID: ${data.id}\n` +
        `  Date: ${data.date}\n` +
        `  Type: ${data.type.toUpperCase()}\n` +
        `  Duration: ${data.duration_minutes ? `${data.duration_minutes} min` : "—"}\n` +
        `  Exercises (${args.exercises.length}):\n${exerciseSummary}\n` +
        (prs.length > 0 ? `\n  New PRs: ${prs.map((e) => `${e.name} ${e.weight_kg}kg`).join(", ")}` : "") +
        (data.notes ? `\n  Notes: ${data.notes}` : "")
      );
    } catch (err) {
      return errorResponse(err instanceof Error ? err.message : String(err));
    }
  });

  server.registerTool("log_meal", {
    description:
      "Log a meal with approximate calories and protein. Tracks nutrition for body composition goals. Sources include home cooking, Konzum, fast food, or restaurants.",
    inputSchema: {
      date: z.string().describe("Meal date in ISO 8601 format (YYYY-MM-DD)"),
      meal_type: z.enum(["breakfast", "lunch", "dinner", "snack"]).describe("Type of meal"),
      description: z.string().describe("What was eaten, e.g. 'chicken breast with rice and salad'"),
      calories_approx: z.number().int().positive().optional().describe("Approximate calorie count"),
      protein_g: z.number().int().positive().optional().describe("Approximate protein in grams"),
      source: z
        .enum(["home", "konzum", "fast_food", "restaurant"])
        .optional()
        .describe("Where the meal came from"),
    },
  }, async (args) => {
    try {
      const supabase = createAdminClient();
      const userId = await getUserId();

      const { data, error } = await supabase
        .from("meals")
        .insert({
          user_id: userId,
          date: args.date,
          meal_type: args.meal_type,
          description: args.description,
          calories_approx: args.calories_approx ?? null,
          protein_g: args.protein_g ?? null,
          source: args.source ?? null,
        })
        .select()
        .single();

      if (error) return errorResponse(error.message);

      return text(
        `Meal logged successfully.\n\n` +
        `  ID: ${data.id}\n` +
        `  Date: ${data.date}\n` +
        `  Type: ${data.meal_type}\n` +
        `  Description: ${data.description}\n` +
        `  Calories: ${data.calories_approx ? `~${data.calories_approx} kcal` : "—"}\n` +
        `  Protein: ${data.protein_g ? `~${data.protein_g}g` : "—"}\n` +
        `  Source: ${data.source ?? "—"}`
      );
    } catch (err) {
      return errorResponse(err instanceof Error ? err.message : String(err));
    }
  });

  server.registerTool("get_fitness_stats", {
    description:
      "Get fitness statistics: personal records history, weekly volume trends per muscle group, calorie tracking, and training streaks. Useful for tracking progress over time.",
    inputSchema: {
      period_days: z
        .number()
        .int()
        .positive()
        .default(30)
        .describe("Number of days to look back for stats"),
      include_prs: z.boolean().default(true).describe("Whether to include personal record history"),
      include_nutrition: z.boolean().default(true).describe("Whether to include calorie/protein stats"),
    },
  }, async (args) => {
    try {
      const supabase = createAdminClient();
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - args.period_days);
      const cutoffDate = cutoff.toISOString().split("T")[0];
      const todayDate = new Date().toISOString().split("T")[0];

      // Fetch workouts and meals in parallel
      const [workoutsResult, mealsResult] = await Promise.all([
        supabase
          .from("workouts")
          .select("*")
          .gte("date", cutoffDate)
          .order("date", { ascending: false }),
        args.include_nutrition
          ? supabase
              .from("meals")
              .select("*")
              .eq("date", todayDate)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (workoutsResult.error) return errorResponse(workoutsResult.error.message);
      if (mealsResult.error) return errorResponse(mealsResult.error.message);

      const workouts = workoutsResult.data ?? [];
      const todayMeals = mealsResult.data ?? [];

      const report: string[] = [
        `=== FITNESS STATS (last ${args.period_days} days) ===`,
        ``,
      ];

      // --- Training overview ---
      report.push(`--- Training Overview ---`);
      report.push(`  Total workouts: ${workouts.length}`);
      const byType: Record<string, number> = {};
      for (const w of workouts) {
        byType[w.type] = (byType[w.type] ?? 0) + 1;
      }
      for (const [type, count] of Object.entries(byType)) {
        report.push(`    ${type}: ${count}`);
      }

      // --- Training streak ---
      let streak = 0;
      if (workouts.length > 0) {
        const sortedDates = [...new Set(workouts.map((w) => w.date))].sort().reverse();
        const today = new Date(todayDate);
        const checkDate = new Date(today);
        // Allow streak to start from today or yesterday
        for (const dateStr of sortedDates) {
          const diff = Math.floor(
            (checkDate.getTime() - new Date(dateStr).getTime()) / 86400000
          );
          if (diff <= 1) {
            streak++;
            checkDate.setTime(new Date(dateStr).getTime());
          } else {
            break;
          }
        }
      }
      report.push(`  Current streak: ${streak} day${streak === 1 ? "" : "s"}`);
      report.push(``);

      // --- Personal Records ---
      if (args.include_prs) {
        report.push(`--- Personal Records (last ${args.period_days}d) ---`);
        const prs: Array<{ name: string; weight_kg: number; date: string }> = [];
        for (const w of workouts) {
          const exercises = w.exercises as Array<{
            name: string;
            sets: number;
            reps: number;
            weight_kg: number;
            is_pr: boolean;
          }>;
          for (const ex of exercises) {
            if (ex.is_pr) {
              prs.push({ name: ex.name, weight_kg: ex.weight_kg, date: w.date });
            }
          }
        }
        if (prs.length === 0) {
          report.push(`  No new PRs in this period.`);
        } else {
          for (const pr of prs) {
            report.push(`  ${pr.name}: ${pr.weight_kg}kg (${pr.date})`);
          }
        }
        report.push(``);
      }

      // --- PPL rotation ---
      if (workouts.length > 0) {
        const lastWorkout = workouts[0];
        const rotation = ["push", "pull", "legs"];
        const nextIndex = (rotation.indexOf(lastWorkout.type) + 1) % rotation.length;
        const nextType = rotation[nextIndex];
        const totalCount = workouts.length;
        // Use total count to determine A/B variant globally
        const variant = totalCount % 2 === 0 ? "A" : "B";
        report.push(`--- PPL Rotation ---`);
        report.push(`  Last workout: ${lastWorkout.type.toUpperCase()} on ${lastWorkout.date}`);
        report.push(`  Next up: ${nextType.toUpperCase()} ${variant}`);
        report.push(``);
      }

      // --- Today's nutrition ---
      if (args.include_nutrition) {
        report.push(`--- Today's Nutrition (${todayDate}) ---`);
        if (todayMeals.length === 0) {
          report.push(`  No meals logged today.`);
        } else {
          let totalCals = 0;
          let totalProtein = 0;
          for (const m of todayMeals) {
            totalCals += m.calories_approx ?? 0;
            totalProtein += m.protein_g ?? 0;
            report.push(`  ${m.meal_type ?? "meal"}: ${m.description} (${m.calories_approx ?? "?"}kcal, ${m.protein_g ?? "?"}g protein)`);
          }
          report.push(`  Total: ~${totalCals} kcal, ~${totalProtein}g protein`);
        }
        report.push(``);
      }

      return text(report.join("\n"));
    } catch (err) {
      return errorResponse(err instanceof Error ? err.message : String(err));
    }
  });

  server.registerTool("get_ppl_schedule", {
    description:
      "Get the current day in the PPL (Push/Pull/Legs) 6-day rotation. Returns which workout type is scheduled for today based on the rotation: Push A → Pull A → Legs A → Push B → Pull B → Legs B.",
    inputSchema: {
      date: z.string().optional().describe("Date to check (ISO 8601). Defaults to today."),
    },
  }, async (args) => {
    try {
      const supabase = createAdminClient();
      const targetDate = args.date ?? new Date().toISOString().split("T")[0];

      // Fetch all workouts ordered by date desc to determine rotation
      const { data: workouts, error } = await supabase
        .from("workouts")
        .select("id, date, type")
        .order("date", { ascending: false });

      if (error) return errorResponse(error.message);

      if (!workouts || workouts.length === 0) {
        return text(
          `No workouts logged yet. The PPL rotation starts with Push A.\n\n` +
          `  Today's schedule: PUSH A\n` +
          `  Full rotation: Push A → Pull A → Legs A → Push B → Pull B → Legs B`
        );
      }

      const lastWorkout = workouts[0];
      const totalCount = workouts.length;
      const rotation = ["push", "pull", "legs"];
      const nextIndex = (rotation.indexOf(lastWorkout.type) + 1) % rotation.length;
      const nextType = rotation[nextIndex];
      // A/B alternates: even total = A variant next, odd = B variant next
      const variant = totalCount % 2 === 0 ? "A" : "B";

      const lastVariant = (totalCount - 1) % 2 === 0 ? "A" : "B";

      return text(
        `PPL Schedule for ${targetDate}:\n\n` +
        `  Today is: ${nextType.toUpperCase()} ${variant} day\n` +
        `  Last workout: ${lastWorkout.type.toUpperCase()} ${lastVariant} on ${lastWorkout.date}\n` +
        `  Total workouts logged: ${totalCount}\n\n` +
        `  Full rotation: Push A → Pull A → Legs A → Push B → Pull B → Legs B`
      );
    } catch (err) {
      return errorResponse(err instanceof Error ? err.message : String(err));
    }
  });
}

// ─────────────────────────────────────────────
// University Tools (Phase 3 — placeholder)
// ─────────────────────────────────────────────

function registerUniversityTools(server: McpServer): void {
  server.registerTool("add_deadline", {
    description:
      "Add an exam, project, or assignment deadline for Algebra university. Tracks due dates with priority levels and course information for the final year countdown.",
    inputSchema: {
      title: z.string().describe("Exam or project name, e.g. 'Web Development Final Exam'"),
      type: z.enum(["exam", "project", "assignment"]).describe("Type of deadline"),
      course: z.string().optional().describe("Course name at Algebra, e.g. 'Web Technologies'"),
      due_date: z.string().describe("Deadline date in ISO 8601 format (YYYY-MM-DD)"),
      priority: z
        .enum(["low", "medium", "high", "critical"])
        .default("medium")
        .describe("Priority level — critical for upcoming exams"),
      notes: z.string().optional().describe("Study notes, resources, or preparation plan"),
    },
  }, async (args) => {
    try {
      const supabase = createAdminClient();
      const userId = await getUserId();

      const { data, error } = await supabase
        .from("deadlines")
        .insert({
          user_id: userId,
          title: args.title,
          type: args.type,
          course: args.course ?? null,
          due_date: args.due_date,
          priority: args.priority,
          notes: args.notes ?? null,
          completed: false,
        })
        .select()
        .single();

      if (error) return errorResponse(error.message);

      const dueDate = new Date(data.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const daysUntil = Math.ceil(
        (dueDate.getTime() - today.getTime()) / 86400000
      );

      const urgency =
        daysUntil < 0
          ? `OVERDUE by ${Math.abs(daysUntil)} day${Math.abs(daysUntil) === 1 ? "" : "s"}`
          : daysUntil === 0
          ? "DUE TODAY"
          : `${daysUntil} day${daysUntil === 1 ? "" : "s"} remaining`;

      return text(
        `Deadline added successfully.\n\n` +
        `  ID: ${data.id}\n` +
        `  Title: ${data.title}\n` +
        `  Type: ${data.type}\n` +
        `  Course: ${data.course ?? "—"}\n` +
        `  Due: ${data.due_date} (${urgency})\n` +
        `  Priority: ${data.priority}\n` +
        (data.notes ? `  Notes: ${data.notes}` : "")
      );
    } catch (err) {
      return errorResponse(err instanceof Error ? err.message : String(err));
    }
  });

  server.registerTool("get_deadlines", {
    description:
      "List upcoming university deadlines sorted by urgency. Shows countdown to each deadline with color-coded priority. Use this for the morning brief or to check what's coming up.",
    inputSchema: {
      include_completed: z
        .boolean()
        .default(false)
        .describe("Whether to include already-completed deadlines"),
      course: z.string().optional().describe("Filter by course name"),
      limit: z.number().int().positive().optional().describe("Maximum number of deadlines to return"),
    },
  }, async (args) => {
    try {
      const supabase = createAdminClient();

      let query = supabase
        .from("deadlines")
        .select("*")
        .order("due_date", { ascending: true });

      if (!args.include_completed) {
        query = query.eq("completed", false);
      }
      if (args.course) {
        query = query.ilike("course", `%${args.course}%`);
      }
      if (args.limit) {
        query = query.limit(args.limit);
      }

      const { data, error } = await query;

      if (error) return errorResponse(error.message);
      if (!data || data.length === 0) {
        return text("No upcoming deadlines found.");
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const rows = data.map((d, i) => {
        const dueDate = new Date(d.due_date);
        const daysUntil = Math.ceil(
          (dueDate.getTime() - today.getTime()) / 86400000
        );

        let countdown: string;
        let flag = "";
        if (daysUntil < 0) {
          countdown = `OVERDUE by ${Math.abs(daysUntil)}d`;
          flag = " !!";
        } else if (daysUntil === 0) {
          countdown = "DUE TODAY";
          flag = " !";
        } else if (daysUntil <= 3) {
          countdown = `${daysUntil}d remaining`;
          flag = " !";
        } else {
          countdown = `${daysUntil}d remaining`;
        }

        return (
          `${i + 1}. ${d.title}${flag}\n` +
          `   Type: ${d.type ?? "—"} | Priority: ${d.priority} | ${d.completed ? "COMPLETED" : countdown}\n` +
          `   Course: ${d.course ?? "—"}\n` +
          `   Due: ${d.due_date}\n` +
          `   ID: ${d.id}` +
          (d.notes ? `\n   Notes: ${d.notes}` : "")
        );
      });

      const overdue = data.filter((d) => {
        const daysUntil = Math.ceil(
          (new Date(d.due_date).getTime() - today.getTime()) / 86400000
        );
        return daysUntil < 0 && !d.completed;
      });

      const header =
        `Found ${data.length} deadline${data.length === 1 ? "" : "s"}` +
        (overdue.length > 0 ? ` (${overdue.length} overdue!)` : "") +
        `:\n`;

      return text(header + "\n" + rows.join("\n\n"));
    } catch (err) {
      return errorResponse(err instanceof Error ? err.message : String(err));
    }
  });
}

// ─────────────────────────────────────────────
// Task & Brief Tools (Phase 4 — placeholder)
// ─────────────────────────────────────────────

function registerTaskTools(server: McpServer): void {
  server.registerTool("sync_todoist", {
    description:
      "Pull tasks from Todoist API across all 4 projects: Elevera Studio, Fakultet, Osobno, and Tatin posao. Syncs task status, due dates, and priorities into the dashboard.",
    inputSchema: {
      project: z
        .enum(["elevera_studio", "fakultet", "osobno", "tatin_posao", "all"])
        .default("all")
        .describe("Which Todoist project to sync, or 'all' for everything"),
    },
  }, async (args) => {
    try {
      const token = process.env.TODOIST_API_TOKEN;
      if (!token) {
        return text(
          "Todoist API token not configured. Set TODOIST_API_TOKEN env var."
        );
      }

      const url = new URL("https://api.todoist.com/rest/v2/tasks");

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return errorResponse(
          `Todoist API error (${res.status}): ${body || res.statusText}`
        );
      }

      const tasks = (await res.json()) as Array<{
        id: string;
        content: string;
        description: string;
        due: { date: string; string: string } | null;
        priority: number;
        project_id: string;
        section_id: string | null;
        labels: string[];
        is_completed: boolean;
      }>;

      // Optionally filter by project name via labels or project mapping
      // Todoist projects: Elevera Studio, Fakultet, Osobno, Tatin posao
      // Since we only have project IDs, we fetch project names for mapping
      let projectMap: Record<string, string> = {};
      try {
        const projectsRes = await fetch(
          "https://api.todoist.com/rest/v2/projects",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (projectsRes.ok) {
          const projects = (await projectsRes.json()) as Array<{
            id: string;
            name: string;
          }>;
          for (const p of projects) {
            projectMap[p.id] = p.name;
          }
        }
      } catch {
        // Non-critical — proceed without project names
      }

      // Map Todoist project names to our filter keys
      const projectNameMap: Record<string, string> = {
        elevera_studio: "elevera studio",
        fakultet: "fakultet",
        osobno: "osobno",
        tatin_posao: "tatin posao",
      };

      let filteredTasks = tasks;
      if (args.project !== "all") {
        const targetName = projectNameMap[args.project]?.toLowerCase();
        if (targetName) {
          const matchingProjectIds = Object.entries(projectMap)
            .filter(([, name]) => name.toLowerCase().includes(targetName))
            .map(([id]) => id);
          filteredTasks = tasks.filter((t) =>
            matchingProjectIds.includes(t.project_id)
          );
        }
      }

      if (filteredTasks.length === 0) {
        return text(
          `No tasks found${args.project !== "all" ? ` for project: ${args.project}` : ""}.`
        );
      }

      // Sort by due date (soonest first), tasks without due date last
      filteredTasks.sort((a, b) => {
        if (!a.due && !b.due) return 0;
        if (!a.due) return 1;
        if (!b.due) return -1;
        return a.due.date.localeCompare(b.due.date);
      });

      // Priority labels (Todoist: 4=urgent, 3=high, 2=medium, 1=normal)
      const priorityLabels: Record<number, string> = {
        4: "URGENT",
        3: "HIGH",
        2: "MEDIUM",
        1: "normal",
      };

      const header = `Todoist Tasks (${args.project === "all" ? "all projects" : args.project}): ${filteredTasks.length} task${filteredTasks.length === 1 ? "" : "s"}\n`;

      const rows = filteredTasks.map((t, i) => {
        const project = projectMap[t.project_id] ?? "Unknown project";
        const due = t.due ? t.due.string || t.due.date : "No due date";
        const prio = priorityLabels[t.priority] ?? "normal";
        return (
          `${i + 1}. ${t.content}\n` +
          `   Project: ${project} | Due: ${due} | Priority: ${prio}` +
          (t.labels.length > 0 ? `\n   Labels: ${t.labels.join(", ")}` : "") +
          (t.description ? `\n   Description: ${t.description}` : "")
        );
      });

      return text(header + "\n" + rows.join("\n\n"));
    } catch (err) {
      return errorResponse(err instanceof Error ? err.message : String(err));
    }
  });

  server.registerTool("get_daily_brief", {
    description:
      "Generate a morning briefing that aggregates data from all modules: today's tasks, follow-up alerts, upcoming deadlines, weather in Zagreb, financial snapshot, and workout schedule. The briefing Petar sees first thing every morning.",
    inputSchema: {
      date: z.string().optional().describe("Date for the brief (ISO 8601). Defaults to today."),
      include_weather: z.boolean().default(true).describe("Whether to include Zagreb weather"),
    },
  }, async (args) => {
    try {
      const supabase = createAdminClient();
      const targetDate = args.date ?? new Date().toISOString().split("T")[0];
      const today = new Date(targetDate);
      today.setHours(0, 0, 0, 0);

      // Date helpers
      const monthStart = `${targetDate.slice(0, 7)}-01`;
      const monthEnd = targetDate;
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoStr = weekAgo.toISOString().split("T")[0];

      // Format the date nicely
      const dateObj = new Date(targetDate + "T12:00:00");
      const dayNames = [
        "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
      ];
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
      ];
      const formattedDate = `${dayNames[dateObj.getDay()]}, ${monthNames[dateObj.getMonth()]} ${dateObj.getDate()}, ${dateObj.getFullYear()}`;

      // ─── Query all modules in parallel ───
      const [
        leadsResult,
        clientsResult,
        financeResult,
        workoutsResult,
        todayMealsResult,
        deadlinesResult,
      ] = await Promise.all([
        supabase.from("leads").select("id, status, next_follow_up, last_contacted_at"),
        supabase.from("clients").select("id, mrr, status"),
        supabase
          .from("finances")
          .select("type, amount, source, category")
          .gte("date", monthStart)
          .lte("date", monthEnd),
        supabase
          .from("workouts")
          .select("id, date, type")
          .order("date", { ascending: false })
          .limit(30),
        supabase.from("meals").select("calories_approx, protein_g").eq("date", targetDate),
        supabase
          .from("deadlines")
          .select("title, due_date, priority, completed")
          .eq("completed", false)
          .gte("due_date", targetDate)
          .lte("due_date", new Date(today.getTime() + 7 * 86400000).toISOString().split("T")[0])
          .order("due_date", { ascending: true }),
      ]);

      const brief: string[] = [];
      brief.push(`DAILY BRIEF — ${formattedDate}`);
      brief.push(`${"─".repeat(50)}`);

      // ─── Weather (Open-Meteo — free, no API key) ───
      if (args.include_weather) {
        try {
          const weatherRes = await fetch(
            "https://api.open-meteo.com/v1/forecast?latitude=45.815&longitude=15.9819&current_weather=true"
          );
          if (weatherRes.ok) {
            const w = (await weatherRes.json()) as {
              current_weather: { temperature: number; weathercode: number };
            };
            const WMO: Record<number, string> = {
              0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
              45: "Foggy", 51: "Light drizzle", 61: "Slight rain", 63: "Moderate rain",
              65: "Heavy rain", 71: "Slight snow", 80: "Rain showers", 95: "Thunderstorm",
            };
            const desc = WMO[w.current_weather.weathercode] ?? "Unknown";
            brief.push(``);
            brief.push(`WEATHER — Zagreb`);
            brief.push(`  ${Math.round(w.current_weather.temperature)}°C, ${desc}`);
          }
        } catch {
          // Weather fetch failed — non-critical, skip
        }
      }

      // ─── Business / CRM ───
      brief.push(``);
      brief.push(`BUSINESS`);
      if (!clientsResult.error && clientsResult.data) {
        const activeClients = clientsResult.data.filter((c) => c.status === "active");
        const totalMRR = activeClients.reduce((sum, c) => sum + Number(c.mrr), 0);
        brief.push(`  MRR: €${totalMRR.toFixed(0)} from ${activeClients.length} active client${activeClients.length === 1 ? "" : "s"}`);
      }
      if (!leadsResult.error && leadsResult.data) {
        const allLeads = leadsResult.data;
        const activeLeads = allLeads.filter(
          (l) => !["won", "lost"].includes(l.status)
        );
        // Follow-up alerts: overdue follow-ups or no contact in 48h+
        const needFollowUp = allLeads.filter((l) => {
          if (l.status === "won" || l.status === "lost") return false;
          if (l.next_follow_up) {
            return new Date(l.next_follow_up) <= today;
          }
          if (l.last_contacted_at) {
            const daysSince = Math.floor(
              (today.getTime() - new Date(l.last_contacted_at).getTime()) / 86400000
            );
            return daysSince >= 2 && ["contacted", "follow_up"].includes(l.status);
          }
          return false;
        });

        // Response rate from outreach logs (quick approximation from lead statuses)
        const contacted = allLeads.filter((l) =>
          ["contacted", "replied", "call_booked", "follow_up", "won", "lost"].includes(l.status)
        ).length;
        const replied = allLeads.filter((l) =>
          ["replied", "call_booked", "won"].includes(l.status)
        ).length;
        const responseRate = contacted > 0 ? ((replied / contacted) * 100).toFixed(0) : "N/A";

        brief.push(`  ${activeLeads.length} active leads (${needFollowUp.length} need follow-up)`);
        brief.push(`  Response rate: ${responseRate}%`);
      }

      // ─── Finances ───
      brief.push(``);
      brief.push(`FINANCES (${monthNames[dateObj.getMonth()]})`);
      if (!financeResult.error && financeResult.data) {
        const records = financeResult.data;
        const income = records
          .filter((r) => r.type === "income")
          .reduce((sum, r) => sum + Number(r.amount), 0);
        const expenses = records
          .filter((r) => r.type === "expense")
          .reduce((sum, r) => sum + Number(r.amount), 0);
        const net = income - expenses;
        const savingsRate = income > 0 ? ((net / income) * 100).toFixed(1) : "N/A";

        brief.push(`  Income: €${income.toFixed(0)} | Expenses: €${expenses.toFixed(0)} | Net: ${net >= 0 ? "+" : ""}€${net.toFixed(0)}`);
        brief.push(`  Savings rate: ${savingsRate}%`);
      } else {
        brief.push(`  (Unable to fetch financial data)`);
      }

      // ─── Fitness ───
      brief.push(``);
      brief.push(`FITNESS`);
      if (!workoutsResult.error && workoutsResult.data) {
        const workouts = workoutsResult.data;
        if (workouts.length > 0) {
          const lastWorkout = workouts[0];

          // Calculate streak
          let streak = 0;
          const sortedDates = [...new Set(workouts.map((w) => w.date))].sort().reverse();
          const checkDate = new Date(today);
          for (const dateStr of sortedDates) {
            const diff = Math.floor(
              (checkDate.getTime() - new Date(dateStr).getTime()) / 86400000
            );
            if (diff <= 1) {
              streak++;
              checkDate.setTime(new Date(dateStr).getTime());
            } else {
              break;
            }
          }

          // Next PPL rotation
          const rotation = ["push", "pull", "legs"];
          const nextIndex = (rotation.indexOf(lastWorkout.type) + 1) % rotation.length;
          const nextType = rotation[nextIndex];
          const totalCount = workouts.length;
          const variant = totalCount % 2 === 0 ? "A" : "B";

          brief.push(`  Last workout: ${lastWorkout.type.charAt(0).toUpperCase() + lastWorkout.type.slice(1)} (${lastWorkout.date}) — ${streak}-day streak`);
          brief.push(`  Next: ${nextType.charAt(0).toUpperCase() + nextType.slice(1)} ${variant}`);
        } else {
          brief.push(`  No workouts logged yet.`);
        }
      }
      // Today's nutrition
      if (!todayMealsResult.error && todayMealsResult.data) {
        const meals = todayMealsResult.data;
        const totalCals = meals.reduce((sum, m) => sum + (m.calories_approx ?? 0), 0);
        const totalProtein = meals.reduce((sum, m) => sum + (m.protein_g ?? 0), 0);
        if (meals.length === 0) {
          brief.push(`  Today's nutrition: no meals logged yet`);
        } else {
          brief.push(`  Today's nutrition: ~${totalCals} kcal / ~${totalProtein}g protein (${meals.length} meal${meals.length === 1 ? "" : "s"})`);
        }
      }

      // ─── University ───
      brief.push(``);
      brief.push(`UNIVERSITY`);
      if (!deadlinesResult.error && deadlinesResult.data) {
        const deadlines = deadlinesResult.data;
        if (deadlines.length === 0) {
          brief.push(`  No upcoming deadlines in the next 7 days.`);
        } else {
          brief.push(`  ${deadlines.length} upcoming deadline${deadlines.length === 1 ? "" : "s"}`);
          for (const d of deadlines) {
            const dueDate = new Date(d.due_date);
            const daysUntil = Math.ceil(
              (dueDate.getTime() - today.getTime()) / 86400000
            );
            const urgencyFlag =
              daysUntil <= 0
                ? " !! OVERDUE"
                : daysUntil <= 2
                ? ` !! in ${daysUntil} day${daysUntil === 1 ? "" : "s"}`
                : ` in ${daysUntil} days`;
            brief.push(`  - ${d.title}${urgencyFlag} (${d.priority})`);
          }
        }
      } else {
        brief.push(`  (Unable to fetch deadlines)`);
      }

      // Also check for overdue deadlines separately
      const overdueResult = await supabase
        .from("deadlines")
        .select("title, due_date")
        .eq("completed", false)
        .lt("due_date", targetDate)
        .order("due_date", { ascending: true });

      if (!overdueResult.error && overdueResult.data && overdueResult.data.length > 0) {
        brief.push(`  OVERDUE (${overdueResult.data.length}):`);
        for (const d of overdueResult.data) {
          const overdueDays = Math.ceil(
            (today.getTime() - new Date(d.due_date).getTime()) / 86400000
          );
          brief.push(`  - ${d.title} (${overdueDays}d overdue)`);
        }
      }

      // ─── Todoist Tasks ───
      brief.push(``);
      brief.push(`TODAY'S TASKS`);
      const todoistToken = process.env.TODOIST_API_TOKEN;
      if (todoistToken) {
        try {
          const todoistRes = await fetch(
            `https://api.todoist.com/rest/v2/tasks?filter=today|overdue`,
            { headers: { Authorization: `Bearer ${todoistToken}` } }
          );
          if (todoistRes.ok) {
            const tasks = (await todoistRes.json()) as Array<{
              content: string;
              due: { date: string } | null;
              priority: number;
            }>;
            if (tasks.length === 0) {
              brief.push(`  No tasks due today.`);
            } else {
              for (const t of tasks) {
                const prio = t.priority === 4 ? "!!" : t.priority === 3 ? "!" : "";
                brief.push(`  - ${prio}${prio ? " " : ""}${t.content}`);
              }
            }
          } else {
            brief.push(`  (Todoist API error: ${todoistRes.status})`);
          }
        } catch {
          brief.push(`  (Failed to fetch Todoist tasks)`);
        }
      } else {
        brief.push(`  Todoist not connected (set TODOIST_API_TOKEN)`);
      }

      brief.push(``);
      brief.push(`${"─".repeat(50)}`);
      brief.push(`Generated at ${new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} UTC`);

      return text(brief.join("\n"));
    } catch (err) {
      return errorResponse(err instanceof Error ? err.message : String(err));
    }
  });
}

// ─────────────────────────────────────────────
// Dashboard Tools (Phase 4 — placeholder)
// ─────────────────────────────────────────────

function registerDashboardTools(server: McpServer): void {
  server.registerTool("get_dashboard_summary", {
    description:
      "Get a full overview of all Petar OS modules: total MRR, active leads, pipeline value, outreach response rate, upcoming deadlines, recent workouts, and financial snapshot. The single tool for a complete status check.",
    inputSchema: {
      sections: z
        .array(z.enum(["crm", "finance", "fitness", "university", "clients", "tasks"]))
        .optional()
        .describe("Which sections to include. Defaults to all."),
    },
  }, async (args) => {
    try {
      const supabase = createAdminClient();
      const sections = args.sections ?? [
        "crm",
        "finance",
        "fitness",
        "university",
        "clients",
        "tasks",
      ];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split("T")[0];
      const monthStart = `${todayStr.slice(0, 7)}-01`;

      // Build parallel queries based on requested sections
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const queries: Record<string, PromiseLike<{ data: any; error: any }>> = {};

      if (sections.includes("crm")) {
        queries.leads = supabase.from("leads").select("id, status, last_contacted_at, next_follow_up");
        queries.outreach = supabase.from("outreach_log").select("id, response_received");
      }
      if (sections.includes("finance")) {
        queries.finance = supabase
          .from("finances")
          .select("type, amount")
          .gte("date", monthStart)
          .lte("date", todayStr);
      }
      if (sections.includes("fitness")) {
        queries.workouts = supabase
          .from("workouts")
          .select("id, date, type")
          .order("date", { ascending: false })
          .limit(30);
      }
      if (sections.includes("university")) {
        queries.deadlines = supabase
          .from("deadlines")
          .select("id, title, due_date, completed, priority")
          .eq("completed", false)
          .order("due_date", { ascending: true });
      }
      if (sections.includes("clients")) {
        queries.clients = supabase.from("clients").select("id, mrr, status");
      }

      const keys = Object.keys(queries);
      const results = await Promise.all(Object.values(queries));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resolved: Record<string, { data: any; error: any }> = {};
      keys.forEach((k, i) => {
        resolved[k] = results[i];
      });

      const summary: string[] = [];
      summary.push(`DASHBOARD SUMMARY`);
      summary.push(`${"─".repeat(40)}`);

      // ─── CRM ───
      if (sections.includes("crm")) {
        const leads = (resolved.leads?.data as Array<{
          id: string;
          status: string;
          last_contacted_at: string | null;
          next_follow_up: string | null;
        }>) ?? [];
        const outreach = (resolved.outreach?.data as Array<{
          id: string;
          response_received: boolean;
        }>) ?? [];

        const activeLeads = leads.filter(
          (l) => !["won", "lost"].includes(l.status)
        );
        const needFollowUp = leads.filter((l) => {
          if (l.status === "won" || l.status === "lost") return false;
          if (l.next_follow_up) return new Date(l.next_follow_up) <= today;
          if (l.last_contacted_at) {
            const daysSince = Math.floor(
              (today.getTime() - new Date(l.last_contacted_at).getTime()) / 86400000
            );
            return daysSince >= 2 && ["contacted", "follow_up"].includes(l.status);
          }
          return false;
        });

        const totalOutreach = outreach.length;
        const responded = outreach.filter((o) => o.response_received).length;
        const responseRate =
          totalOutreach > 0 ? ((responded / totalOutreach) * 100).toFixed(0) : "N/A";

        // Status breakdown
        const statusCounts: Record<string, number> = {};
        for (const l of leads) {
          statusCounts[l.status] = (statusCounts[l.status] ?? 0) + 1;
        }
        const statusStr = Object.entries(statusCounts)
          .map(([s, c]) => `${s}:${c}`)
          .join(", ");

        summary.push(`CRM: ${activeLeads.length} active leads, ${needFollowUp.length} follow-up alerts, ${responseRate}% response rate`);
        summary.push(`  Pipeline: ${statusStr}`);
      }

      // ─── Finance ───
      if (sections.includes("finance")) {
        const records = (resolved.finance?.data as Array<{
          type: string;
          amount: number;
        }>) ?? [];
        const income = records
          .filter((r) => r.type === "income")
          .reduce((sum, r) => sum + Number(r.amount), 0);
        const expenses = records
          .filter((r) => r.type === "expense")
          .reduce((sum, r) => sum + Number(r.amount), 0);
        const net = income - expenses;
        const savingsRate = income > 0 ? ((net / income) * 100).toFixed(1) : "N/A";

        summary.push(`Finance: €${income.toFixed(0)} income, €${expenses.toFixed(0)} expenses, ${savingsRate}% savings rate`);
      }

      // ─── Fitness ───
      if (sections.includes("fitness")) {
        const workouts = (resolved.workouts?.data as Array<{
          id: string;
          date: string;
          type: string;
        }>) ?? [];

        if (workouts.length > 0) {
          // Streak
          let streak = 0;
          const sortedDates = [...new Set(workouts.map((w) => w.date))].sort().reverse();
          const checkDate = new Date(today);
          for (const dateStr of sortedDates) {
            const diff = Math.floor(
              (checkDate.getTime() - new Date(dateStr).getTime()) / 86400000
            );
            if (diff <= 1) {
              streak++;
              checkDate.setTime(new Date(dateStr).getTime());
            } else {
              break;
            }
          }

          // Next PPL
          const lastWorkout = workouts[0];
          const rotation = ["push", "pull", "legs"];
          const nextIndex = (rotation.indexOf(lastWorkout.type) + 1) % rotation.length;
          const nextType = rotation[nextIndex];
          const variant = workouts.length % 2 === 0 ? "A" : "B";

          summary.push(`Fitness: ${streak}-day streak, next PPL: ${nextType.charAt(0).toUpperCase() + nextType.slice(1)} ${variant}`);
        } else {
          summary.push(`Fitness: no workouts logged`);
        }
      }

      // ─── University ───
      if (sections.includes("university")) {
        const deadlines = (resolved.deadlines?.data as Array<{
          id: string;
          title: string;
          due_date: string;
          completed: boolean;
          priority: string;
        }>) ?? [];

        const upcoming = deadlines.filter(
          (d) => new Date(d.due_date) >= today
        );
        const overdue = deadlines.filter(
          (d) => new Date(d.due_date) < today
        );

        summary.push(`University: ${upcoming.length} upcoming deadline${upcoming.length === 1 ? "" : "s"}, ${overdue.length} overdue`);
        if (overdue.length > 0) {
          for (const d of overdue.slice(0, 3)) {
            summary.push(`  !! ${d.title} (due ${d.due_date})`);
          }
        }
      }

      // ─── Clients ───
      if (sections.includes("clients")) {
        const clients = (resolved.clients?.data as Array<{
          id: string;
          mrr: number;
          status: string;
        }>) ?? [];
        const active = clients.filter((c) => c.status === "active");
        const totalMRR = active.reduce((sum, c) => sum + Number(c.mrr), 0);

        summary.push(`Clients: €${totalMRR.toFixed(0)} MRR, ${active.length} active`);
      }

      // ─── Tasks (Todoist) ───
      if (sections.includes("tasks")) {
        const todoistToken = process.env.TODOIST_API_TOKEN;
        if (todoistToken) {
          try {
            const res = await fetch(
              `https://api.todoist.com/rest/v2/tasks?filter=today|overdue`,
              { headers: { Authorization: `Bearer ${todoistToken}` } }
            );
            if (res.ok) {
              const tasks = (await res.json()) as Array<{ content: string }>;
              summary.push(`Tasks: ${tasks.length} due today/overdue`);
            } else {
              summary.push(`Tasks: Todoist API error (${res.status})`);
            }
          } catch {
            summary.push(`Tasks: failed to fetch from Todoist`);
          }
        } else {
          summary.push(`Tasks: Todoist not connected`);
        }
      }

      summary.push(`${"─".repeat(40)}`);
      summary.push(`Updated: ${new Date().toISOString()}`);

      return text(summary.join("\n"));
    } catch (err) {
      return errorResponse(err instanceof Error ? err.message : String(err));
    }
  });

  // ─── analyze_pipeline ───
  server.registerTool("analyze_pipeline", {
    description:
      "Deep analysis of the outreach pipeline: conversion rates per stage, win rate, response rate, average days in each stage, best-performing niches and locations, plus AI-generated recommendations. Use for strategic outreach planning.",
    inputSchema: {
      period_days: z
        .number()
        .int()
        .positive()
        .default(90)
        .describe("Number of days to analyze (default 90)"),
    },
  }, async (args) => {
    try {
      const supabase = createAdminClient();
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - args.period_days);
      const cutoffISO = cutoff.toISOString();

      // Fetch leads and outreach logs in parallel
      const [leadsResult, outreachResult] = await Promise.all([
        supabase.from("leads").select("*"),
        supabase.from("outreach_log").select("*").gte("sent_at", cutoffISO),
      ]);

      if (leadsResult.error) return errorResponse(leadsResult.error.message);
      if (outreachResult.error) return errorResponse(outreachResult.error.message);

      const allLeads = leadsResult.data ?? [];
      const outreachLogs = outreachResult.data ?? [];

      if (allLeads.length === 0) {
        return text("No leads in the pipeline yet. Start adding leads to get analysis.");
      }

      const report: string[] = [];
      report.push(`PIPELINE ANALYSIS (last ${args.period_days} days)`);
      report.push(`${"═".repeat(50)}`);

      // ─── Pipeline funnel ───
      const stages = [
        "new",
        "demo_built",
        "contacted",
        "replied",
        "call_booked",
        "follow_up",
        "won",
        "lost",
      ];
      const stageCounts: Record<string, number> = {};
      for (const s of stages) stageCounts[s] = 0;
      for (const l of allLeads) {
        stageCounts[l.status] = (stageCounts[l.status] ?? 0) + 1;
      }

      report.push(``);
      report.push(`PIPELINE FUNNEL`);
      report.push(`${"─".repeat(40)}`);
      for (const stage of stages) {
        const count = stageCounts[stage] ?? 0;
        const bar = "█".repeat(Math.min(count, 30));
        report.push(`  ${stage.padEnd(14)} ${String(count).padStart(3)} ${bar}`);
      }
      report.push(`  ${"─".repeat(30)}`);
      report.push(`  Total leads: ${allLeads.length}`);

      // ─── Conversion rates between stages ───
      report.push(``);
      report.push(`STAGE CONVERSION RATES`);
      report.push(`${"─".repeat(40)}`);
      // Define progression: each lead at a given stage has passed through prior stages
      const stageOrder = [
        "new",
        "demo_built",
        "contacted",
        "replied",
        "call_booked",
        "won",
      ];
      const stageIndex: Record<string, number> = {};
      stageOrder.forEach((s, i) => (stageIndex[s] = i));
      // follow_up can happen at various points, lost is an exit state
      // Count how many leads reached each stage
      const reachedStage: Record<string, number> = {};
      for (const s of stageOrder) reachedStage[s] = 0;

      for (const lead of allLeads) {
        const idx = stageIndex[lead.status];
        if (idx !== undefined) {
          // This lead reached this stage and all prior stages
          for (let i = 0; i <= idx; i++) {
            reachedStage[stageOrder[i]]++;
          }
        } else if (lead.status === "lost") {
          // Lost leads — figure out the furthest stage they reached
          // Heuristic: if they have outreach logs or contacted timestamp, they at least reached "contacted"
          reachedStage["new"]++;
          if (lead.last_contacted_at) {
            reachedStage["demo_built"]++;
            reachedStage["contacted"]++;
          }
        } else if (lead.status === "follow_up") {
          // follow_up implies at least contacted
          reachedStage["new"]++;
          reachedStage["demo_built"]++;
          reachedStage["contacted"]++;
        }
      }

      for (let i = 1; i < stageOrder.length; i++) {
        const from = stageOrder[i - 1];
        const to = stageOrder[i];
        const fromCount = reachedStage[from];
        const toCount = reachedStage[to];
        const rate = fromCount > 0 ? ((toCount / fromCount) * 100).toFixed(1) : "N/A";
        report.push(`  ${from} → ${to}: ${rate}% (${toCount}/${fromCount})`);
      }

      // ─── Overall metrics ───
      const wonLeads = allLeads.filter((l) => l.status === "won");
      const lostLeads = allLeads.filter((l) => l.status === "lost");
      const totalDecided = wonLeads.length + lostLeads.length;
      const winRate =
        totalDecided > 0
          ? ((wonLeads.length / totalDecided) * 100).toFixed(1)
          : "N/A";

      const totalOutreach = outreachLogs.length;
      const responses = outreachLogs.filter((o) => o.response_received);
      const responseRate =
        totalOutreach > 0
          ? ((responses.length / totalOutreach) * 100).toFixed(1)
          : "N/A";

      report.push(``);
      report.push(`OVERALL METRICS`);
      report.push(`${"─".repeat(40)}`);
      report.push(`  Overall win rate: ${winRate}% (${wonLeads.length} won / ${totalDecided} decided)`);
      report.push(`  Response rate: ${responseRate}% (${responses.length} / ${totalOutreach} outreach actions)`);

      // ─── Average days in stage ───
      report.push(``);
      report.push(`LEAD VELOCITY`);
      report.push(`${"─".repeat(40)}`);
      // Calculate average age per current stage
      const now = Date.now();
      const stageAges: Record<string, number[]> = {};
      for (const lead of allLeads) {
        if (!stageAges[lead.status]) stageAges[lead.status] = [];
        const created = new Date(lead.created_at).getTime();
        const daysInPipeline = Math.floor((now - created) / 86400000);
        stageAges[lead.status].push(daysInPipeline);
      }
      for (const stage of stages) {
        const ages = stageAges[stage];
        if (ages && ages.length > 0) {
          const avg = (ages.reduce((a, b) => a + b, 0) / ages.length).toFixed(0);
          report.push(`  ${stage.padEnd(14)} avg ${avg}d in pipeline (${ages.length} leads)`);
        }
      }

      // ─── Best-performing niches ───
      report.push(``);
      report.push(`PERFORMANCE BY NICHE`);
      report.push(`${"─".repeat(40)}`);
      const nicheStats: Record<
        string,
        { total: number; won: number; replied: number; contacted: number }
      > = {};
      for (const lead of allLeads) {
        const niche = lead.niche ?? "unknown";
        if (!nicheStats[niche]) {
          nicheStats[niche] = { total: 0, won: 0, replied: 0, contacted: 0 };
        }
        nicheStats[niche].total++;
        if (lead.status === "won") nicheStats[niche].won++;
        if (["replied", "call_booked", "won"].includes(lead.status))
          nicheStats[niche].replied++;
        if (
          [
            "contacted",
            "replied",
            "call_booked",
            "follow_up",
            "won",
            "lost",
          ].includes(lead.status)
        )
          nicheStats[niche].contacted++;
      }
      const sortedNiches = Object.entries(nicheStats).sort(
        (a, b) => b[1].total - a[1].total
      );
      for (const [niche, stats] of sortedNiches) {
        const replyRate =
          stats.contacted > 0
            ? ((stats.replied / stats.contacted) * 100).toFixed(0)
            : "N/A";
        const nicheWinRate =
          stats.total > 0
            ? ((stats.won / stats.total) * 100).toFixed(0)
            : "N/A";
        report.push(
          `  ${niche.padEnd(16)} ${stats.total} leads | ${replyRate}% reply rate | ${nicheWinRate}% win rate`
        );
      }

      // ─── Best-performing locations ───
      report.push(``);
      report.push(`PERFORMANCE BY LOCATION`);
      report.push(`${"─".repeat(40)}`);
      const locationStats: Record<
        string,
        { total: number; won: number; replied: number }
      > = {};
      for (const lead of allLeads) {
        const loc = lead.location ?? "unknown";
        if (!locationStats[loc]) {
          locationStats[loc] = { total: 0, won: 0, replied: 0 };
        }
        locationStats[loc].total++;
        if (lead.status === "won") locationStats[loc].won++;
        if (["replied", "call_booked", "won"].includes(lead.status))
          locationStats[loc].replied++;
      }
      const sortedLocations = Object.entries(locationStats).sort(
        (a, b) => b[1].total - a[1].total
      );
      for (const [loc, stats] of sortedLocations.slice(0, 10)) {
        const locWinRate =
          stats.total > 0
            ? ((stats.won / stats.total) * 100).toFixed(0)
            : "0";
        report.push(
          `  ${loc.padEnd(16)} ${stats.total} leads | ${stats.replied} replied | ${locWinRate}% win rate`
        );
      }

      // ─── Recommendations ───
      report.push(``);
      report.push(`RECOMMENDATIONS`);
      report.push(`${"─".repeat(40)}`);
      const recommendations: string[] = [];

      // Recommend best niches
      const bestNiche = sortedNiches.find(
        ([, s]) => s.contacted > 0 && s.replied / s.contacted > 0
      );
      if (bestNiche) {
        const rate = (
          (bestNiche[1].replied / bestNiche[1].contacted) *
          100
        ).toFixed(0);
        recommendations.push(
          `Focus on "${bestNiche[0]}" niche — ${rate}% reply rate with ${bestNiche[1].total} leads`
        );
      }

      // Flag stale leads
      const staleLeads = allLeads.filter((l) => {
        if (["won", "lost"].includes(l.status)) return false;
        const days = Math.floor(
          (now - new Date(l.updated_at ?? l.created_at).getTime()) / 86400000
        );
        return days > 14;
      });
      if (staleLeads.length > 0) {
        recommendations.push(
          `${staleLeads.length} leads haven't been touched in 14+ days — review or close them`
        );
      }

      // Follow-up cadence
      const contactedNoReply = allLeads.filter(
        (l) => l.status === "contacted"
      );
      if (contactedNoReply.length > 5) {
        recommendations.push(
          `${contactedNoReply.length} leads stuck at "contacted" — consider a follow-up sequence or different channel`
        );
      }

      // Low response rate warning
      if (totalOutreach > 10 && Number(responseRate) < 10) {
        recommendations.push(
          `Response rate is only ${responseRate}% — try personalizing messages more or testing different outreach times`
        );
      }

      // Volume recommendation
      const recentLeads = allLeads.filter(
        (l) => new Date(l.created_at) >= cutoff
      );
      if (recentLeads.length < 10) {
        recommendations.push(
          `Only ${recentLeads.length} new leads in ${args.period_days} days — increase prospecting volume`
        );
      }

      // Best location
      const bestLocation = sortedLocations.find(
        ([, s]) => s.total >= 3 && s.replied > 0
      );
      if (bestLocation) {
        recommendations.push(
          `"${bestLocation[0]}" shows strong engagement (${bestLocation[1].replied} replies from ${bestLocation[1].total} leads) — double down there`
        );
      }

      if (recommendations.length === 0) {
        recommendations.push(
          "Not enough data for specific recommendations yet. Keep adding leads and logging outreach."
        );
      }

      for (const rec of recommendations) {
        report.push(`  • ${rec}`);
      }

      report.push(``);
      report.push(`${"═".repeat(50)}`);

      return text(report.join("\n"));
    } catch (err) {
      return errorResponse(err instanceof Error ? err.message : String(err));
    }
  });
}

// ─────────────────────────────────────────────
// Client Management Tools (Phase 3 — placeholder)
// ─────────────────────────────────────────────

function registerClientTools(server: McpServer): void {
  server.registerTool("add_client", {
    description:
      "Add a new Elevera Studio client. Usually created when a lead moves to 'won'. Tracks the live website URL, subscription plan, and MRR contribution.",
    inputSchema: {
      business_name: z.string().describe("Client business name"),
      lead_id: z.string().uuid().optional().describe("Original lead UUID if converted from CRM"),
      site_url: z.string().url().optional().describe("Live website URL"),
      plan: z
        .enum(["basic_79", "standard_99", "custom"])
        .describe("Subscription plan"),
      mrr: z.number().positive().describe("Monthly recurring revenue in EUR"),
      started_at: z.string().describe("Contract start date (ISO 8601 YYYY-MM-DD)"),
      notes: z.string().optional().describe("Client notes"),
    },
  }, async (args) => {
    try {
      const supabase = createAdminClient();
      const userId = await getUserId();

      const { data, error } = await supabase
        .from("clients")
        .insert({
          user_id: userId,
          business_name: args.business_name,
          lead_id: args.lead_id ?? null,
          site_url: args.site_url ?? null,
          plan: args.plan,
          mrr: args.mrr,
          status: "active",
          started_at: args.started_at,
          notes: args.notes ?? null,
        })
        .select()
        .single();

      if (error) return errorResponse(error.message);

      return text(
        `Client added successfully.\n\n` +
        `  ID: ${data.id}\n` +
        `  Business: ${data.business_name}\n` +
        `  Plan: ${data.plan}\n` +
        `  MRR: €${data.mrr}\n` +
        `  Status: ${data.status}\n` +
        `  Started: ${data.started_at}\n` +
        `  Site: ${data.site_url ?? "—"}\n` +
        (data.lead_id ? `  Lead ID: ${data.lead_id}\n` : "") +
        (data.notes ? `  Notes: ${data.notes}` : "")
      );
    } catch (err) {
      return errorResponse(err instanceof Error ? err.message : String(err));
    }
  });

  server.registerTool("update_client", {
    description:
      "Update an existing client's information — plan, MRR, status, site URL, or notes. Use the client ID to identify which client to update.",
    inputSchema: {
      client_id: z.string().uuid().describe("UUID of the client to update"),
      business_name: z.string().optional().describe("Updated business name"),
      site_url: z.string().url().optional().describe("Updated live website URL"),
      plan: z.enum(["basic_79", "standard_99", "custom"]).optional().describe("Updated plan"),
      mrr: z.number().positive().optional().describe("Updated MRR in EUR"),
      status: z.enum(["active", "paused", "churned"]).optional().describe("Updated client status"),
      notes: z.string().optional().describe("Updated client notes"),
    },
  }, async (args) => {
    try {
      const supabase = createAdminClient();
      const { client_id, ...fields } = args;

      // Build update payload — only include fields that were actually provided
      const updates: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined) {
          updates[key] = value;
        }
      }

      if (Object.keys(updates).length === 0) {
        return text("No fields provided to update.");
      }

      const { data, error } = await supabase
        .from("clients")
        .update(updates)
        .eq("id", client_id)
        .select()
        .single();

      if (error) return errorResponse(error.message);

      const changedFields = Object.keys(updates);

      return text(
        `Client updated successfully.\n\n` +
        `  ID: ${data.id}\n` +
        `  Business: ${data.business_name}\n` +
        `  Plan: ${data.plan}\n` +
        `  MRR: €${data.mrr}\n` +
        `  Status: ${data.status}\n` +
        `  Updated fields: ${changedFields.join(", ")}`
      );
    } catch (err) {
      return errorResponse(err instanceof Error ? err.message : String(err));
    }
  });

  server.registerTool("list_clients", {
    description:
      "List active Elevera Studio clients with their site URLs, plans, MRR, and status. Shows total MRR across all active clients. Use for client health overview.",
    inputSchema: {
      status: z
        .enum(["active", "paused", "churned", "all"])
        .default("active")
        .describe("Filter by client status"),
    },
  }, async (args) => {
    try {
      const supabase = createAdminClient();

      let query = supabase
        .from("clients")
        .select("*")
        .order("started_at", { ascending: false });

      if (args.status !== "all") {
        query = query.eq("status", args.status);
      }

      const { data, error } = await query;

      if (error) return errorResponse(error.message);
      if (!data || data.length === 0) {
        return text(`No clients found with status: ${args.status}.`);
      }

      const activeClients = data.filter((c) => c.status === "active");
      const totalMRR = activeClients.reduce((sum, c) => sum + Number(c.mrr), 0);

      const rows = data.map((c, i) => {
        return (
          `${i + 1}. ${c.business_name}\n` +
          `   ID: ${c.id}\n` +
          `   Plan: ${c.plan ?? "—"} | MRR: €${c.mrr} | Status: ${c.status}\n` +
          `   Site: ${c.site_url ?? "—"}\n` +
          `   Started: ${c.started_at ?? "—"}` +
          (c.notes ? `\n   Notes: ${c.notes}` : "")
        );
      });

      const header =
        `Found ${data.length} client${data.length === 1 ? "" : "s"} (filter: ${args.status}):\n` +
        `Total active MRR: €${totalMRR.toFixed(2)}\n`;

      return text(header + "\n" + rows.join("\n\n"));
    } catch (err) {
      return errorResponse(err instanceof Error ? err.message : String(err));
    }
  });
}

// ─────────────────────────────────────────────
// Registration Entrypoint
// ─────────────────────────────────────────────

export function registerAllTools(server: McpServer): void {
  registerCrmTools(server);
  registerFinanceTools(server);
  registerFitnessTools(server);
  registerUniversityTools(server);
  registerTaskTools(server);
  registerDashboardTools(server);
  registerClientTools(server);
}
