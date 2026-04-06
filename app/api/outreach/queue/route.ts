import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type {
  Lead,
  LeadMarket,
  LeadNiche,
  OutreachPriority,
} from "@/types";

// ─── Niche pain points ────────────────────────────────
const NICHE_PAIN_POINTS: Record<string, { hr: string; en: string }> = {
  apartmani: {
    hr: "Svaku rezervaciju plaćate Bookingu proviziju — a mogli biste imati direktne goste",
    en: "You're paying Booking.com commission on every reservation — you could have direct bookings instead",
  },
  frizer: {
    hr: "Propuštate klijentice koje upravo sad traže salon u {location} na Googleu",
    en: "You're losing clients searching for a salon in {location} right now",
  },
  kozmetika: {
    hr: "Svaki dan gubite rezervacije jer se klijentice ne mogu online naručiti kod Vas",
    en: "Every day you're losing bookings because clients can't book online",
  },
  dental: {
    hr: "Propuštate pacijente koji upravo sad traže stomatologa u {location}",
    en: "You're missing patients searching for a dentist in {location} right now",
  },
  restoran: {
    hr: "Propuštate goste koji traže restoran u {location} na Googleu",
    en: "You're losing diners searching for a restaurant in {location}",
  },
  autoservis: {
    hr: "Svaki dan Vam prolaze klijenti jer ne mogu vidjeti koje usluge nudite online",
    en: "Every day customers pass you by because they can't see your services online",
  },
  fitness: {
    hr: "Potencijalni članovi odlaze kod konkurencije jer ne mogu vidjeti Vaše programe online",
    en: "Potential members go to competitors because they can't find your programs online",
  },
  wellness: {
    hr: "Propuštate klijente koji traže wellness u {location}",
    en: "You're missing clients searching for wellness in {location}",
  },
  fizioterapija: {
    hr: "Propuštate pacijente koji traže fizioterapeuta u {location}",
    en: "You're missing patients searching for a physiotherapist in {location}",
  },
  pekara: {
    hr: "Propuštate narudžbe jer ljudi ne mogu vidjeti Vašu ponudu online",
    en: "You're losing orders because people can't see your offerings online",
  },
};

const DEFAULT_PAIN_POINT = {
  hr: "Svaki dan propuštate klijente koji Vas ne mogu pronaći online",
  en: "Every day you're losing customers who can't find you online",
};

// ─── Message templates by follow_up_count ─────────────
function getMessageTemplate(
  followUpCount: number,
  lang: "hr" | "en",
): string {
  const templates: Record<number, { hr: string; en: string }> = {
    0: {
      hr: "Dobar dan! Vidio sam {business_name} u {location} — {niche_pain_point}. Napravio sam Vam web za primjer, javite se! Petar, Elevera Studio",
      en: "Hi! I came across {business_name} in {location} — {niche_pain_point}. I've built you a sample website, get in touch! Petar, Elevera Studio",
    },
    1: {
      hr: "Bok! Samo kratki podsjetnik — stranica za {business_name} je spremna. Javite se kad imate minutu! Petar, Elevera Studio",
      en: "Hi! Quick reminder — the sample website for {business_name} is ready. Get in touch when you have a moment! Petar, Elevera Studio",
    },
    2: {
      hr: "Poštovani! Provjeravam jeste li stigli pogledati stranicu za {business_name}? Mogu prilagoditi sve prema Vašim željama. Petar, Elevera Studio",
      en: "Hi! Just checking if you had a chance to look at the sample site for {business_name}? I can customize everything to your needs. Petar, Elevera Studio",
    },
    3: {
      hr: "Bok! Zadnji put se javljam — ako Vas zanima stranica za {business_name}, tu sam. Ako ne, nema problema! Sretno s poslom! Petar, Elevera Studio",
      en: "Hi! Last time reaching out — if you're interested in the website for {business_name}, I'm here. If not, no worries! Best of luck! Petar, Elevera Studio",
    },
  };

  const idx = Math.min(followUpCount, 3);
  return templates[idx][lang];
}

// ─── Helpers ──────────────────────────────────────────
function isHrMarket(market: LeadMarket | null): boolean {
  return market === "hr" || market === null;
}

function getLang(market: LeadMarket | null): "hr" | "en" {
  return isHrMarket(market) ? "hr" : "en";
}

function getNichePainPoint(
  niche: LeadNiche | null,
  location: string | null,
  lang: "hr" | "en",
): string {
  const key = niche ?? "";
  const raw =
    NICHE_PAIN_POINTS[key]?.[lang] ?? DEFAULT_PAIN_POINT[lang];
  return raw.replace("{location}", location ?? "vašem gradu");
}

function buildMessage(lead: Lead): string {
  const followUpCount = lead.follow_up_count ?? 0;
  const lang = getLang(lead.market);
  const template = getMessageTemplate(followUpCount, lang);
  const painPoint = getNichePainPoint(lead.niche, lead.location, lang);

  return template
    .replace("{business_name}", lead.business_name)
    .replace("{location}", lead.location ?? (lang === "hr" ? "vašem gradu" : "your area"))
    .replace("{niche_pain_point}", painPoint);
}

function getDefaultChannel(lead: Lead): string {
  if (lead.channel) return lead.channel;
  return isHrMarket(lead.market) ? "whatsapp" : "email";
}

function categorizeLead(
  lead: Lead,
  now: Date,
): OutreachPriority | null {
  const status = lead.status;

  // Skip won/lost
  if (status === "won" || status === "lost") return null;

  // Skip leads that exceeded max follow-ups
  const maxFollowUps = lead.max_follow_ups ?? 4;
  if ((lead.follow_up_count ?? 0) >= maxFollowUps) return null;

  const lastContacted = lead.last_contacted_at
    ? new Date(lead.last_contacted_at)
    : null;
  const nextFollowUp = lead.next_follow_up
    ? new Date(lead.next_follow_up)
    : null;

  const hoursSinceContact = lastContacted
    ? (now.getTime() - lastContacted.getTime()) / (1000 * 60 * 60)
    : Infinity;

  const createdAt = new Date(lead.created_at);
  const hoursSinceCreation =
    (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

  // HOT: replied/demo_built/call_booked AND no outreach in last 48h
  if (
    ["replied", "demo_built", "call_booked"].includes(status) &&
    hoursSinceContact > 48
  ) {
    return "hot";
  }

  // FOLLOW_UP: next_follow_up <= today OR (last_contacted > 72h ago AND status = contacted)
  if (nextFollowUp && nextFollowUp <= now) {
    return "follow_up";
  }
  if (status === "contacted" && hoursSinceContact > 72) {
    return "follow_up";
  }

  // NURTURE: status = follow_up, next_follow_up within 3 days
  if (status === "follow_up" && nextFollowUp) {
    const daysUntilFollowUp =
      (nextFollowUp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (daysUntilFollowUp <= 3 && daysUntilFollowUp > 0) {
      return "nurture";
    }
  }

  // FIRST_CONTACT: status = new, created > 24h ago, never contacted
  if (
    status === "new" &&
    hoursSinceCreation > 24 &&
    !lastContacted
  ) {
    return "first_contact";
  }

  return null;
}

// ─── GET /api/outreach/queue ──────────────────────────
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = request.nextUrl;

    let query = supabase
      .from("outreach_queue")
      .select("*, lead:leads(*)");

    // Filter by date
    const date = searchParams.get("date");
    if (date) {
      query = query.eq("scheduled_for", date);
    }

    // Filter by priority
    const priority = searchParams.get("priority");
    if (priority) {
      const priorities = priority.split(",").map((p) => p.trim());
      query = query.in("priority", priorities);
    }

    // Filter by status
    const status = searchParams.get("status");
    if (status) {
      const statuses = status.split(",").map((s) => s.trim());
      query = query.in("status", statuses);
    }

    query = query.order("priority", { ascending: true });
    query = query.order("generated_at", { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error("Supabase error listing outreach queue:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Map the joined lead data to match our type structure
    const items = (data ?? []).map((item: Record<string, unknown>) => ({
      ...item,
      lead: item.lead ?? undefined,
    }));

    return NextResponse.json(items);
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ─── POST /api/outreach/queue — Generate today's queue ─
export async function POST() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    // Check if queue already generated for today — delete old pending items to regenerate
    const { error: deleteError } = await supabase
      .from("outreach_queue")
      .delete()
      .eq("scheduled_for", todayStr)
      .in("status", ["pending"]);

    if (deleteError) {
      console.error("Error clearing old queue items:", deleteError);
      // Continue anyway — we'll try to insert new ones
    }

    // Query all leads NOT in won or lost
    const { data: leads, error: leadsError } = await supabase
      .from("leads")
      .select("*")
      .not("status", "in", '("won","lost")');

    if (leadsError) {
      console.error("Supabase error fetching leads:", leadsError);
      return NextResponse.json(
        { error: leadsError.message },
        { status: 500 },
      );
    }

    if (!leads || leads.length === 0) {
      return NextResponse.json({
        message: "No active leads found",
        generated: 0,
        breakdown: { hot: 0, follow_up: 0, nurture: 0, first_contact: 0 },
      });
    }

    // Categorize leads into priority buckets
    const buckets: Record<OutreachPriority, Lead[]> = {
      hot: [],
      follow_up: [],
      nurture: [],
      first_contact: [],
    };

    for (const lead of leads as Lead[]) {
      const priority = categorizeLead(lead, now);
      if (priority) {
        buckets[priority].push(lead);
      }
    }

    // Sort within each bucket by lead_score DESC (nulls last)
    const sortByScore = (a: Lead, b: Lead) =>
      (b.lead_score ?? 0) - (a.lead_score ?? 0);

    for (const key of Object.keys(buckets) as OutreachPriority[]) {
      buckets[key].sort(sortByScore);
    }

    // Build queue items
    const queueItems: Array<Record<string, unknown>> = [];
    const priorityOrder: OutreachPriority[] = [
      "hot",
      "follow_up",
      "nurture",
      "first_contact",
    ];

    for (const priority of priorityOrder) {
      for (const lead of buckets[priority]) {
        const message = buildMessage(lead);
        const channel = getDefaultChannel(lead);

        queueItems.push({
          user_id: user.id,
          lead_id: lead.id,
          channel,
          message,
          priority,
          scheduled_for: todayStr,
          status: "pending",
          generated_at: now.toISOString(),
        });
      }
    }

    if (queueItems.length === 0) {
      return NextResponse.json({
        message: "No leads need outreach today",
        generated: 0,
        breakdown: { hot: 0, follow_up: 0, nurture: 0, first_contact: 0 },
      });
    }

    // Insert all queue items
    const { data: inserted, error: insertError } = await supabase
      .from("outreach_queue")
      .insert(queueItems)
      .select("*, lead:leads(*)");

    if (insertError) {
      console.error("Supabase error inserting queue items:", insertError);
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 },
      );
    }

    const breakdown = {
      hot: buckets.hot.length,
      follow_up: buckets.follow_up.length,
      nurture: buckets.nurture.length,
      first_contact: buckets.first_contact.length,
    };

    return NextResponse.json(
      {
        message: `Generated ${queueItems.length} outreach items`,
        generated: queueItems.length,
        breakdown,
        items: (inserted ?? []).map((item: Record<string, unknown>) => ({
          ...item,
          lead: item.lead ?? undefined,
        })),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
