"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Dumbbell,
  Plus,
  Apple,
  RefreshCw,
  Flame,
  Calendar,
  Clock,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogWorkoutModal } from "@/components/fitness/log-workout-modal";
import { LogMealModal } from "@/components/fitness/log-meal-modal";
import { PRBoard } from "@/components/fitness/pr-board";
import { DailyNutrition } from "@/components/fitness/daily-nutrition";
import type { Workout, WorkoutType } from "@/types";

// ─── Constants ──────────────────────────────────────

const WORKOUT_TYPE_LABELS: Record<WorkoutType, string> = {
  push: "Push",
  pull: "Pull",
  legs: "Legs",
};

const WORKOUT_TYPE_COLORS: Record<WorkoutType, string> = {
  push: "#0EA5E9",
  pull: "#8B5CF6",
  legs: "#22C55E",
};

const WORKOUT_TYPE_BG: Record<WorkoutType, string> = {
  push: "bg-[#0EA5E9]/15 text-[#0EA5E9] border-[#0EA5E9]/30",
  pull: "bg-[#8B5CF6]/15 text-[#8B5CF6] border-[#8B5CF6]/30",
  legs: "bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30",
};

const PPL_CYCLE: WorkoutType[] = ["push", "pull", "legs"];

// ─── Types ──────────────────────────────────────────

interface VolumeWeek {
  week: string;
  push: number;
  pull: number;
  legs: number;
}

interface StreakData {
  current_streak: number;
  longest_streak: number;
}

// ─── Custom Tooltip ─────────────────────────────────

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  label?: string;
}

function CustomVolumeTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[#27272A] bg-[#18181B] px-3 py-2 shadow-xl">
      <p className="text-xs font-medium text-[#FAFAFA] mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="text-xs" style={{ color: entry.color }}>
          {entry.name}: {entry.value.toLocaleString()} kg
        </p>
      ))}
    </div>
  );
}

// ─── Animation Variants ─────────────────────────────

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.35, ease: "easeOut" as const },
  }),
};

// ─── Helpers ────────────────────────────────────────

function getNextPPLDay(
  lastType: WorkoutType | null,
  workoutCount: number
): { type: WorkoutType; variant: "A" | "B" } {
  if (!lastType) {
    return { type: "push", variant: "A" };
  }

  const currentIdx = PPL_CYCLE.indexOf(lastType);
  const nextIdx = (currentIdx + 1) % PPL_CYCLE.length;
  const nextType = PPL_CYCLE[nextIdx];

  // A/B variant: every 3 workouts (one full PPL cycle) toggles
  // If count is even full cycles so far, next is A; odd = B
  const fullCycles = Math.floor(workoutCount / 3);
  const variant: "A" | "B" = fullCycles % 2 === 0 ? "A" : "B";

  return { type: nextType, variant };
}

function formatDateFull(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

// ─── Main Component ─────────────────────────────────

export default function FitnessPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [volumeData, setVolumeData] = useState<VolumeWeek[]>([]);
  const [streak, setStreak] = useState<StreakData>({
    current_streak: 0,
    longest_streak: 0,
  });
  const [loading, setLoading] = useState(true);
  const [workoutModalOpen, setWorkoutModalOpen] = useState(false);
  const [mealModalOpen, setMealModalOpen] = useState(false);

  // ── Fetch all data ──────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [workoutsRes, volumeRes, streakRes] = await Promise.all([
        fetch("/api/fitness/workouts"),
        fetch("/api/fitness/volume?weeks=8"),
        fetch("/api/fitness/streak"),
      ]);

      if (!workoutsRes.ok || !volumeRes.ok || !streakRes.ok) {
        throw new Error("Failed to fetch fitness data");
      }

      const [workoutsData, volumeDataRes, streakData] = await Promise.all([
        workoutsRes.json() as Promise<Workout[]>,
        volumeRes.json() as Promise<VolumeWeek[]>,
        streakRes.json() as Promise<StreakData>,
      ]);

      setWorkouts(workoutsData);
      setVolumeData(volumeDataRes);
      setStreak(streakData);
    } catch {
      toast.error("Failed to load fitness data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Derived data ────────────────────────────────────

  const recentWorkouts = useMemo(
    () => workouts.slice(0, 5),
    [workouts]
  );

  const lastWorkout = workouts.length > 0 ? workouts[0] : null;

  const nextPPL = useMemo(() => {
    return getNextPPLDay(
      lastWorkout?.type ?? null,
      workouts.length
    );
  }, [lastWorkout, workouts.length]);

  const volumeChartData = useMemo(() => {
    return volumeData.map((w) => ({
      name: w.week,
      Push: w.push,
      Pull: w.pull,
      Legs: w.legs,
    }));
  }, [volumeData]);

  // ── Handlers ────────────────────────────────────────

  const handleWorkoutCreated = useCallback(
    (workout: Workout) => {
      setWorkouts((prev) => [workout, ...prev]);
      fetchData();
    },
    [fetchData]
  );

  const handleMealCreated = useCallback(() => {
    // Meals are handled by DailyNutrition component internally
    // just trigger a notification-level refresh
  }, []);

  // ── Render ──────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 pb-8">
      {/* ── Header ───────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#0EA5E9]/10">
            <Dumbbell className="h-6 w-6 text-[#0EA5E9]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#FAFAFA]">
              Fitness Hub
            </h1>
            <p className="text-sm text-[#71717A] mt-0.5">
              Track workouts, nutrition, and personal records
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* PPL Rotation Indicator */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#27272A] bg-[#18181B]">
            <span className="text-xs text-[#71717A] uppercase tracking-wide">
              Next:
            </span>
            <Badge
              className={`${WORKOUT_TYPE_BG[nextPPL.type]} border text-xs font-bold`}
            >
              {WORKOUT_TYPE_LABELS[nextPPL.type]} {nextPPL.variant}
            </Badge>
          </div>

          {/* Streak */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#27272A] bg-[#18181B]">
            <Flame className="h-4 w-4 text-[#F59E0B]" />
            <span className="text-sm font-bold text-[#FAFAFA] tabular-nums">
              {streak.current_streak}
            </span>
            <span className="text-xs text-[#71717A]">day streak</span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => fetchData()}
            className="h-9 w-9"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </motion.div>

      {/* ── Loading state ────────────────────────────── */}
      {loading && workouts.length === 0 ? (
        <div className="flex items-center justify-center py-32">
          <div className="flex items-center gap-3 text-[#71717A]">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading fitness data...</span>
          </div>
        </div>
      ) : (
        <>
          {/* ── Row 1: Quick Actions ─────────────────── */}
          <motion.div
            custom={0}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <button
              onClick={() => setWorkoutModalOpen(true)}
              className="group flex items-center gap-4 p-5 rounded-xl border border-[#27272A] bg-[#18181B] hover:border-[#0EA5E9]/40 hover:bg-[#0EA5E9]/5 transition-all duration-200"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#0EA5E9]/10 group-hover:bg-[#0EA5E9]/20 transition-colors duration-200">
                <Plus className="h-5 w-5 text-[#0EA5E9]" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-[#FAFAFA]">
                  Log Workout
                </p>
                <p className="text-xs text-[#71717A] mt-0.5">
                  Record exercises, sets, reps, and PRs
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-[#27272A] group-hover:text-[#0EA5E9] ml-auto transition-colors duration-200" />
            </button>

            <button
              onClick={() => setMealModalOpen(true)}
              className="group flex items-center gap-4 p-5 rounded-xl border border-[#27272A] bg-[#18181B] hover:border-[#22C55E]/40 hover:bg-[#22C55E]/5 transition-all duration-200"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#22C55E]/10 group-hover:bg-[#22C55E]/20 transition-colors duration-200">
                <Apple className="h-5 w-5 text-[#22C55E]" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-[#FAFAFA]">
                  Log Meal
                </p>
                <p className="text-xs text-[#71717A] mt-0.5">
                  Track calories, protein, and meal source
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-[#27272A] group-hover:text-[#22C55E] ml-auto transition-colors duration-200" />
            </button>
          </motion.div>

          {/* ── Row 2: PR Board + Daily Nutrition ────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <motion.div
              custom={1}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
            >
              <PRBoard />
            </motion.div>
            <motion.div
              custom={2}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
            >
              <DailyNutrition />
            </motion.div>
          </div>

          {/* ── Row 3: Volume Trend Chart ────────────── */}
          <motion.div
            custom={3}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
          >
            <Card className="hover:border-[#3F3F46] transition-colors">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-[#A1A1AA]">
                  Weekly Volume Trend (kg)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {volumeChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={volumeChartData}
                        margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient
                            id="pushGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#0EA5E9"
                              stopOpacity={0.25}
                            />
                            <stop
                              offset="100%"
                              stopColor="#0EA5E9"
                              stopOpacity={0}
                            />
                          </linearGradient>
                          <linearGradient
                            id="pullGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#8B5CF6"
                              stopOpacity={0.25}
                            />
                            <stop
                              offset="100%"
                              stopColor="#8B5CF6"
                              stopOpacity={0}
                            />
                          </linearGradient>
                          <linearGradient
                            id="legsGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#22C55E"
                              stopOpacity={0.25}
                            />
                            <stop
                              offset="100%"
                              stopColor="#22C55E"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#27272A"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 11, fill: "#71717A" }}
                          axisLine={{ stroke: "#27272A" }}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: "#71717A" }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(v: number) =>
                            v >= 1000
                              ? `${(v / 1000).toFixed(0)}k`
                              : `${v}`
                          }
                        />
                        <RechartsTooltip
                          content={<CustomVolumeTooltip />}
                          cursor={{
                            stroke: "#27272A",
                            strokeDasharray: "3 3",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="Push"
                          stroke="#0EA5E9"
                          strokeWidth={2}
                          fill="url(#pushGradient)"
                          dot={{
                            r: 3,
                            fill: "#0EA5E9",
                            stroke: "#09090B",
                            strokeWidth: 2,
                          }}
                          activeDot={{
                            r: 5,
                            fill: "#0EA5E9",
                            stroke: "#09090B",
                            strokeWidth: 2,
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="Pull"
                          stroke="#8B5CF6"
                          strokeWidth={2}
                          fill="url(#pullGradient)"
                          dot={{
                            r: 3,
                            fill: "#8B5CF6",
                            stroke: "#09090B",
                            strokeWidth: 2,
                          }}
                          activeDot={{
                            r: 5,
                            fill: "#8B5CF6",
                            stroke: "#09090B",
                            strokeWidth: 2,
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="Legs"
                          stroke="#22C55E"
                          strokeWidth={2}
                          fill="url(#legsGradient)"
                          dot={{
                            r: 3,
                            fill: "#22C55E",
                            stroke: "#09090B",
                            strokeWidth: 2,
                          }}
                          activeDot={{
                            r: 5,
                            fill: "#22C55E",
                            stroke: "#09090B",
                            strokeWidth: 2,
                          }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-sm text-[#71717A]">
                      No volume data yet — log some workouts
                    </div>
                  )}
                </div>
                {/* Legend */}
                {volumeChartData.length > 0 && (
                  <div className="flex items-center justify-center gap-6 mt-3">
                    {(["push", "pull", "legs"] as WorkoutType[]).map(
                      (type) => (
                        <div
                          key={type}
                          className="flex items-center gap-1.5"
                        >
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{
                              backgroundColor: WORKOUT_TYPE_COLORS[type],
                            }}
                          />
                          <span className="text-[11px] text-[#A1A1AA]">
                            {WORKOUT_TYPE_LABELS[type]}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Row 4: Recent Workouts ────────────────── */}
          <motion.div
            custom={4}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
          >
            <Card className="hover:border-[#3F3F46] transition-colors">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-[#A1A1AA]">
                  Recent Workouts
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentWorkouts.length > 0 ? (
                  <div className="space-y-2">
                    {recentWorkouts.map((workout, i) => (
                      <motion.div
                        key={workout.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          delay: 0.3 + i * 0.05,
                          duration: 0.25,
                        }}
                        className="flex items-center gap-4 p-3.5 rounded-lg border border-[#27272A]/50 bg-[#09090B]/40 hover:border-[#27272A] transition-colors duration-150"
                      >
                        {/* Type badge */}
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                          style={{
                            backgroundColor: `${WORKOUT_TYPE_COLORS[workout.type]}15`,
                          }}
                        >
                          <Dumbbell
                            className="h-4.5 w-4.5"
                            style={{
                              color: WORKOUT_TYPE_COLORS[workout.type],
                            }}
                          />
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-[#FAFAFA]">
                              {WORKOUT_TYPE_LABELS[workout.type]}
                            </span>
                            <Badge
                              className={`${WORKOUT_TYPE_BG[workout.type]} border text-[10px] px-1.5 py-0`}
                            >
                              {workout.exercises.length} exercises
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="flex items-center gap-1 text-xs text-[#71717A]">
                              <Calendar className="h-3 w-3" />
                              {formatDateFull(workout.date)}
                            </span>
                            {workout.duration_minutes && (
                              <span className="flex items-center gap-1 text-xs text-[#71717A]">
                                <Clock className="h-3 w-3" />
                                {workout.duration_minutes} min
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Exercise summary */}
                        <div className="hidden sm:flex items-center gap-1.5 flex-wrap justify-end max-w-[200px]">
                          {workout.exercises.slice(0, 3).map((ex, j) => (
                            <span
                              key={j}
                              className="text-[11px] text-[#71717A] bg-[#27272A]/40 px-1.5 py-0.5 rounded"
                            >
                              {ex.name}
                            </span>
                          ))}
                          {workout.exercises.length > 3 && (
                            <span className="text-[11px] text-[#71717A]">
                              +{workout.exercises.length - 3}
                            </span>
                          )}
                        </div>

                        {/* Total volume */}
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-[#FAFAFA] tabular-nums">
                            {workout.exercises
                              .reduce(
                                (sum, ex) =>
                                  sum + ex.sets * ex.reps * ex.weight_kg,
                                0
                              )
                              .toLocaleString()}{" "}
                            <span className="text-xs font-normal text-[#71717A]">
                              kg
                            </span>
                          </p>
                          <p className="text-[10px] text-[#71717A] uppercase tracking-wide">
                            volume
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 gap-2">
                    <Dumbbell className="h-8 w-8 text-[#27272A]" />
                    <p className="text-sm text-[#71717A]">
                      No workouts logged yet — start training!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}

      {/* ── Modals ───────────────────────────────────── */}
      <LogWorkoutModal
        open={workoutModalOpen}
        onOpenChange={setWorkoutModalOpen}
        onWorkoutCreated={handleWorkoutCreated}
      />
      <LogMealModal
        open={mealModalOpen}
        onOpenChange={setMealModalOpen}
        onMealCreated={handleMealCreated}
      />
    </div>
  );
}
