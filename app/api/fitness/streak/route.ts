import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface StreakResult {
  current_streak: number;
  last_workout_date: string | null;
}

interface WorkoutDateRow {
  date: string;
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// GET /api/fitness/streak — Calculate consecutive training days
export async function GET() {
  try {
    const supabase = await createClient();

    // Fetch all workout dates, ordered descending
    const { data, error } = await supabase
      .from("workouts")
      .select("date")
      .order("date", { ascending: false });

    if (error) {
      console.error("Supabase error fetching workout dates:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (data ?? []) as WorkoutDateRow[];

    if (rows.length === 0) {
      const result: StreakResult = {
        current_streak: 0,
        last_workout_date: null,
      };
      return NextResponse.json(result);
    }

    // Get unique dates (a day may have multiple workouts)
    const uniqueDates = [...new Set(rows.map((r) => r.date))];

    const today = formatDate(new Date());
    const lastWorkoutDate = uniqueDates[0];

    // If the most recent workout is not today or yesterday, streak is 0
    const lastDate = new Date(lastWorkoutDate);
    const todayDate = new Date(today);
    const diffMs = todayDate.getTime() - lastDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays > 1) {
      const result: StreakResult = {
        current_streak: 0,
        last_workout_date: lastWorkoutDate,
      };
      return NextResponse.json(result);
    }

    // Count consecutive days backwards from the most recent workout
    let streak = 1;
    for (let i = 1; i < uniqueDates.length; i++) {
      const currentDate = new Date(uniqueDates[i - 1]);
      const prevDate = new Date(uniqueDates[i]);
      const gap = Math.floor(
        (currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (gap === 1) {
        streak++;
      } else {
        break;
      }
    }

    const result: StreakResult = {
      current_streak: streak,
      last_workout_date: lastWorkoutDate,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
