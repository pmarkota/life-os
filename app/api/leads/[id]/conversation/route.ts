import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type {
  ConversationChannel,
  ConversationDirection,
  ConversationSentiment,
  ConversationEntry,
  OutreachType,
} from "@/types";

type RouteParams = { params: Promise<{ id: string }> };

const VALID_CHANNELS: ConversationChannel[] = [
  "whatsapp",
  "email",
  "instagram_dm",
  "telefon",
  "linkedin",
  "osobno",
];

const VALID_DIRECTIONS: ConversationDirection[] = ["outbound", "inbound"];

const VALID_SENTIMENTS: ConversationSentiment[] = [
  "positive",
  "neutral",
  "negative",
  "no_response",
];

function mapChannelToType(channel: ConversationChannel): OutreachType {
  if (channel === "telefon") return "call";
  if (channel === "email") return "email";
  return "follow_up";
}

// GET /api/leads/[id]/conversation — Chronological conversation thread
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("outreach_log")
      .select("*")
      .eq("lead_id", id)
      .order("sent_at", { ascending: true });

    if (error) {
      console.error("Supabase error listing conversation:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data as ConversationEntry[]);
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/leads/[id]/conversation — Log a new conversation entry
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate channel
    if (!body.channel || !VALID_CHANNELS.includes(body.channel)) {
      return NextResponse.json(
        {
          error: `channel is required and must be one of: ${VALID_CHANNELS.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Validate direction
    if (!body.direction || !VALID_DIRECTIONS.includes(body.direction)) {
      return NextResponse.json(
        {
          error: `direction is required and must be one of: ${VALID_DIRECTIONS.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Validate sentiment if provided
    if (body.sentiment && !VALID_SENTIMENTS.includes(body.sentiment)) {
      return NextResponse.json(
        {
          error: `sentiment must be one of: ${VALID_SENTIMENTS.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Verify the lead exists
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id")
      .eq("id", id)
      .single();

    if (leadError || !lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const channel = body.channel as ConversationChannel;
    const direction = body.direction as ConversationDirection;
    const sentiment = (body.sentiment as ConversationSentiment) || null;
    const now = new Date().toISOString();

    // Determine follow_up_number for outbound messages
    let followUpNumber: number | null = null;
    if (direction === "outbound") {
      const { count, error: countError } = await supabase
        .from("outreach_log")
        .select("*", { count: "exact", head: true })
        .eq("lead_id", id)
        .eq("direction", "outbound");

      if (!countError && count !== null) {
        followUpNumber = count + 1;
      }
    }

    const insertData: Record<string, unknown> = {
      user_id: user.id,
      lead_id: id,
      type: mapChannelToType(channel),
      channel,
      direction,
      content: body.content || null,
      subject: body.subject || null,
      sentiment,
      follow_up_number: followUpNumber,
      sent_at: body.date || now,
      response_received: direction === "inbound",
      response_at: direction === "inbound" ? (body.date || now) : null,
    };

    const { data, error } = await supabase
      .from("outreach_log")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Supabase error creating conversation entry:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Side effects based on direction
    if (direction === "outbound") {
      // Update lead's last_contacted_at
      const { error: updateError } = await supabase
        .from("leads")
        .update({
          last_contacted_at: now,
          updated_at: now,
        })
        .eq("id", id);

      if (updateError) {
        console.error(
          "Warning: failed to update lead last_contacted_at:",
          updateError,
        );
      }
    }

    // Build response with suggestion flag
    const suggestUpgrade =
      direction === "inbound" && sentiment === "positive";

    return NextResponse.json(
      {
        ...(data as ConversationEntry),
        suggest_upgrade: suggestUpgrade,
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
