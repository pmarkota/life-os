import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Deadline, DeadlineType, Priority } from "@/types";

const VALID_TYPES: DeadlineType[] = ["exam", "project", "assignment"];
const VALID_PRIORITIES: Priority[] = ["low", "medium", "high", "critical"];

// GET /api/university/deadlines — List deadlines with optional filters
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = request.nextUrl;

    let query = supabase.from("deadlines").select("*");

    // Filter by completed status
    const completed = searchParams.get("completed");
    if (completed === "true") {
      query = query.eq("completed", true);
    } else if (completed === "false") {
      query = query.eq("completed", false);
    }

    // Filter by type
    const type = searchParams.get("type");
    if (type && VALID_TYPES.includes(type as DeadlineType)) {
      query = query.eq("type", type);
    }

    // Filter by priority
    const priority = searchParams.get("priority");
    if (priority && VALID_PRIORITIES.includes(priority as Priority)) {
      query = query.eq("priority", priority);
    }

    // Filter by course (partial match, case insensitive)
    const course = searchParams.get("course");
    if (course) {
      query = query.ilike("course", `%${course}%`);
    }

    // Default sort: due_date ascending (soonest first)
    const sort = searchParams.get("sort") || "due_date";
    const order = searchParams.get("order") || "asc";
    query = query.order(sort, { ascending: order === "asc" });

    const { data, error } = await query;

    if (error) {
      console.error("Supabase error listing deadlines:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data as Deadline[]);
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/university/deadlines — Create a new deadline
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.title || typeof body.title !== "string" || body.title.trim() === "") {
      return NextResponse.json(
        { error: "title is required" },
        { status: 400 },
      );
    }

    if (!body.due_date || typeof body.due_date !== "string") {
      return NextResponse.json(
        { error: "due_date is required (YYYY-MM-DD format)" },
        { status: 400 },
      );
    }

    // Validate type if provided
    if (body.type && !VALID_TYPES.includes(body.type)) {
      return NextResponse.json(
        { error: "type must be 'exam', 'project', or 'assignment'" },
        { status: 400 },
      );
    }

    // Validate priority if provided
    if (body.priority && !VALID_PRIORITIES.includes(body.priority)) {
      return NextResponse.json(
        { error: "priority must be 'low', 'medium', 'high', or 'critical'" },
        { status: 400 },
      );
    }

    const insertData: Record<string, unknown> = {
      user_id: user.id,
      title: body.title.trim(),
      due_date: body.due_date,
      completed: false,
      priority: body.priority || "medium",
    };

    // Optional fields
    const optionalFields = ["type", "course", "notes"] as const;

    for (const field of optionalFields) {
      if (body[field] !== undefined && body[field] !== null) {
        insertData[field] = typeof body[field] === "string" ? body[field].trim() : body[field];
      }
    }

    const { data, error } = await supabase
      .from("deadlines")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Supabase error creating deadline:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data as Deadline, { status: 201 });
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
