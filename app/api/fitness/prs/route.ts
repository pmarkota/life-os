import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Exercise, WorkoutType } from "@/types";

interface PRRecord {
  exercise_name: string;
  weight_kg: number;
  date: string;
  workout_type: WorkoutType;
}

interface WorkoutRow {
  date: string;
  type: WorkoutType;
  exercises: Exercise[];
}

// GET /api/fitness/prs — Get all personal records
export async function GET() {
  try {
    const supabase = await createClient();

    // Fetch all workouts — PRs are stored as is_pr flags on exercises
    const { data, error } = await supabase
      .from("workouts")
      .select("date, type, exercises")
      .order("date", { ascending: false });

    if (error) {
      console.error("Supabase error fetching workouts for PRs:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (data ?? []) as WorkoutRow[];

    // Extract exercises where is_pr = true
    const prs: PRRecord[] = [];

    for (const workout of rows) {
      const exercises = workout.exercises ?? [];

      for (const exercise of exercises) {
        if (exercise.is_pr) {
          prs.push({
            exercise_name: exercise.name,
            weight_kg: exercise.weight_kg,
            date: workout.date,
            workout_type: workout.type,
          });
        }
      }
    }

    // Sort by weight descending
    prs.sort((a, b) => b.weight_kg - a.weight_kg);

    return NextResponse.json(prs);
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
