import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Exercise, WorkoutType } from "@/types";

interface WeekVolume {
  week_start: string;
  push_tonnage: number;
  pull_tonnage: number;
  legs_tonnage: number;
  total: number;
}

interface WorkoutRow {
  date: string;
  type: WorkoutType;
  exercises: Exercise[];
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  // Adjust: Sunday (0) becomes 6, Mon=0, Tue=1, etc.
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// GET /api/fitness/volume — Weekly tonnage trends
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = request.nextUrl;

    const weeks = parseInt(searchParams.get("weeks") || "8", 10);
    const weeksCount = Math.max(1, Math.min(weeks, 52));

    // Calculate the start date (N weeks ago from today's Monday)
    const today = new Date();
    const currentMonday = getMonday(today);
    const startDate = new Date(currentMonday);
    startDate.setDate(startDate.getDate() - (weeksCount - 1) * 7);

    const { data, error } = await supabase
      .from("workouts")
      .select("date, type, exercises")
      .gte("date", formatDate(startDate))
      .order("date", { ascending: true });

    if (error) {
      console.error("Supabase error fetching volume data:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (data ?? []) as WorkoutRow[];

    // Group by week and workout type
    const weekMap = new Map<
      string,
      { push: number; pull: number; legs: number }
    >();

    // Pre-populate all weeks so we get zeros for missing weeks
    for (let i = 0; i < weeksCount; i++) {
      const weekStart = new Date(startDate);
      weekStart.setDate(weekStart.getDate() + i * 7);
      const key = formatDate(weekStart);
      weekMap.set(key, { push: 0, pull: 0, legs: 0 });
    }

    for (const workout of rows) {
      const workoutDate = new Date(workout.date);
      const monday = getMonday(workoutDate);
      const weekKey = formatDate(monday);

      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, { push: 0, pull: 0, legs: 0 });
      }

      const weekData = weekMap.get(weekKey)!;
      const exercises = workout.exercises ?? [];

      // Calculate tonnage: sets x reps x weight
      let tonnage = 0;
      for (const exercise of exercises) {
        tonnage += exercise.sets * exercise.reps * exercise.weight_kg;
      }

      weekData[workout.type] += tonnage;
    }

    // Convert to sorted array
    const volume: WeekVolume[] = Array.from(weekMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([weekStart, data]) => ({
        week_start: weekStart,
        push_tonnage: Math.round(data.push),
        pull_tonnage: Math.round(data.pull),
        legs_tonnage: Math.round(data.legs),
        total: Math.round(data.push + data.pull + data.legs),
      }));

    return NextResponse.json(volume);
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
