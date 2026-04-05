import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Meal } from "@/types";

interface DailySummary {
  date: string;
  total_calories: number;
  total_protein: number;
  meals_count: number;
  meals: Meal[];
}

// GET /api/fitness/meals/daily — Daily meal summary
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = request.nextUrl;

    // Default to today
    const today = new Date();
    const defaultDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const date = searchParams.get("date") || defaultDate;

    const { data, error } = await supabase
      .from("meals")
      .select("*")
      .eq("date", date)
      .order("meal_type", { ascending: true });

    if (error) {
      console.error("Supabase error fetching daily meals:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const meals = (data ?? []) as Meal[];

    let totalCalories = 0;
    let totalProtein = 0;

    for (const meal of meals) {
      if (meal.calories_approx) {
        totalCalories += meal.calories_approx;
      }
      if (meal.protein_g) {
        totalProtein += meal.protein_g;
      }
    }

    const summary: DailySummary = {
      date,
      total_calories: totalCalories,
      total_protein: totalProtein,
      meals_count: meals.length,
      meals,
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
