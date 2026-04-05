import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { OutreachLog, OutreachType } from "@/types";

type RouteParams = { params: Promise<{ id: string }> };

const VALID_OUTREACH_TYPES: OutreachType[] = [
  "email",
  "call",
  "demo",
  "follow_up",
];

// GET /api/leads/[id]/outreach — Get outreach log entries for a lead
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("outreach_log")
      .select("*")
      .eq("lead_id", id)
      .order("sent_at", { ascending: false });

    if (error) {
      console.error("Supabase error listing outreach log:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data as OutreachLog[]);
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/leads/[id]/outreach — Log a new outreach entry
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

    // Validate type
    if (!body.type || !VALID_OUTREACH_TYPES.includes(body.type)) {
      return NextResponse.json(
        {
          error: `type is required and must be one of: ${VALID_OUTREACH_TYPES.join(", ")}`,
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

    const insertData: Record<string, unknown> = {
      user_id: user.id,
      lead_id: id,
      type: body.type,
      sent_at: body.sent_at || new Date().toISOString(),
      response_received: body.response_received ?? false,
    };

    if (body.content !== undefined) {
      insertData.content = body.content;
    }

    if (body.response_at !== undefined) {
      insertData.response_at = body.response_at;
    }

    const { data, error } = await supabase
      .from("outreach_log")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Supabase error creating outreach entry:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update the lead's last_contacted_at
    const { error: updateError } = await supabase
      .from("leads")
      .update({
        last_contacted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      console.error("Warning: failed to update lead last_contacted_at:", updateError);
      // Don't fail the request — the outreach entry was created successfully
    }

    return NextResponse.json(data as OutreachLog, { status: 201 });
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
