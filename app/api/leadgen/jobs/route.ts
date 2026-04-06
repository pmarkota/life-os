import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { inngest } from "@/lib/inngest/client";

// POST /api/leadgen/jobs — Start a new leadgen job
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = await request.json();

    // Create job record in DB
    const { data: job, error } = await supabase
      .from("leadgen_jobs")
      .insert({
        user_id: user.id,
        status: "pending",
        config,
        progress: {
          searched: 0,
          checked: 0,
          qualifying: 0,
          skipped: 0,
          target: config.cities.reduce(
            (s: number, c: { count: number }) => s + c.count,
            0,
          ),
        },
        results: [],
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Trigger Inngest function
    await inngest.send({
      name: "leadgen/job.start",
      data: {
        job_id: job.id,
        user_id: user.id,
        config,
      },
    });

    return NextResponse.json({ job_id: job.id }, { status: 201 });
  } catch (error) {
    console.error("Create job error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// GET /api/leadgen/jobs — List user's jobs (most recent first)
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("leadgen_jobs")
      .select("id, status, config, progress, created_at, completed_at, error")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("List jobs error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
