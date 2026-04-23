import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/profile";
import { createAdminClient } from "@/lib/supabase/admin";

// POST /api/leads/bulk-assign — assign multiple leads to a sales person (admin only)
// Body: { lead_ids: string[], assigned_to: string | null }
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await request.json()) as {
    lead_ids?: string[];
    assigned_to?: string | null;
  };

  const leadIds = body.lead_ids;
  const assignedTo = body.assigned_to ?? null;

  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    return NextResponse.json(
      { error: "lead_ids must be a non-empty array" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  // Validate assignee if provided — must be a real sales/admin profile
  if (assignedTo) {
    const { data: assignee } = await admin
      .from("profiles")
      .select("id")
      .eq("id", assignedTo)
      .single();
    if (!assignee) {
      return NextResponse.json(
        { error: "assigned_to must be a valid profile id" },
        { status: 400 },
      );
    }
  }

  const { error, count } = await admin
    .from("leads")
    .update({ assigned_to: assignedTo, updated_at: new Date().toISOString() }, { count: "exact" })
    .in("id", leadIds);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, updated: count ?? leadIds.length });
}
