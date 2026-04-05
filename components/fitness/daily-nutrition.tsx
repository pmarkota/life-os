"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Apple, Loader2, Flame, Beef } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Meal, MealType } from "@/types";

// ─── Constants ──────────────────────────────────────

const CALORIE_TARGET = 2500;
const PROTEIN_TARGET = 180;

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

// ─── Helpers ────────────────────────────────────────

function todayISO(): string {
  const d = new Date();
  return d.toISOString().split("T")[0];
}

// ─── Component ──────────────────────────────────────

export function DailyNutrition() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMeals() {
      try {
        const res = await fetch(
          `/api/fitness/meals/daily?date=${todayISO()}`
        );
        if (!res.ok) throw new Error("Failed to fetch meals");
        const data = await res.json();
        // API returns { date, total_calories, total_protein, meals_count, meals }
        setMeals(Array.isArray(data) ? data : data.meals ?? []);
      } catch {
        toast.error("Failed to load today's nutrition");
      } finally {
        setLoading(false);
      }
    }
    fetchMeals();
  }, []);

  const totalCalories = meals.reduce(
    (sum, m) => sum + (m.calories_approx ?? 0),
    0
  );
  const totalProtein = meals.reduce(
    (sum, m) => sum + (m.protein_g ?? 0),
    0
  );

  const caloriePct = Math.min(
    Math.round((totalCalories / CALORIE_TARGET) * 100),
    100
  );
  const proteinPct = Math.min(
    Math.round((totalProtein / PROTEIN_TARGET) * 100),
    100
  );

  return (
    <Card className="hover:border-[#3F3F46] transition-colors h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#22C55E]/10">
            <Apple className="h-3.5 w-3.5 text-[#22C55E]" />
          </div>
          <CardTitle className="text-sm font-medium text-[#A1A1AA]">
            Today&apos;s Nutrition
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-[#71717A]" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Progress Bars */}
            <div className="space-y-4">
              {/* Calories */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Flame className="h-3.5 w-3.5 text-[#F59E0B]" />
                    <span className="text-xs font-medium text-[#A1A1AA] uppercase tracking-wide">
                      Calories
                    </span>
                  </div>
                  <span className="text-sm font-bold text-[#FAFAFA] tabular-nums">
                    {totalCalories.toLocaleString()}{" "}
                    <span className="text-[#71717A] font-normal">
                      / {CALORIE_TARGET.toLocaleString()}
                    </span>
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-[#27272A] overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      backgroundColor:
                        caloriePct >= 90 ? "#22C55E" : "#F59E0B",
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${caloriePct}%` }}
                    transition={{
                      delay: 0.2,
                      duration: 0.6,
                      ease: "easeOut",
                    }}
                  />
                </div>
              </div>

              {/* Protein */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Beef className="h-3.5 w-3.5 text-[#EF4444]" />
                    <span className="text-xs font-medium text-[#A1A1AA] uppercase tracking-wide">
                      Protein
                    </span>
                  </div>
                  <span className="text-sm font-bold text-[#FAFAFA] tabular-nums">
                    {totalProtein}g{" "}
                    <span className="text-[#71717A] font-normal">
                      / {PROTEIN_TARGET}g
                    </span>
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-[#27272A] overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      backgroundColor:
                        proteinPct >= 90 ? "#22C55E" : "#EF4444",
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${proteinPct}%` }}
                    transition={{
                      delay: 0.3,
                      duration: 0.6,
                      ease: "easeOut",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Meal List */}
            {meals.length > 0 ? (
              <div className="space-y-2 pt-1">
                <p className="text-xs font-medium text-[#71717A] uppercase tracking-wide">
                  Logged Meals
                </p>
                <div className="space-y-1.5">
                  {meals.map((meal, i) => (
                    <motion.div
                      key={meal.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: 0.4 + i * 0.05,
                        duration: 0.2,
                      }}
                      className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-[#09090B]/60 border border-[#27272A]/50"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs text-[#71717A] uppercase shrink-0">
                          {meal.meal_type
                            ? MEAL_TYPE_LABELS[meal.meal_type]
                            : "Meal"}
                        </span>
                        <span className="text-sm text-[#FAFAFA] truncate">
                          {meal.description}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-3">
                        {meal.calories_approx != null && (
                          <span className="text-xs text-[#F59E0B] tabular-nums">
                            {meal.calories_approx} cal
                          </span>
                        )}
                        {meal.protein_g != null && (
                          <span className="text-xs text-[#EF4444] tabular-nums">
                            {meal.protein_g}g
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-6">
                <p className="text-sm text-[#71717A]">
                  No meals logged today
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
