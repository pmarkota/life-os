import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { WorkoutType } from "@/types";

// ============================================
// Dashboard Summary — Response Types
// ============================================

interface CrmSummary {
  total_leads: number;
  active_leads: number;
  by_status: Record<string, number>;
  follow_up_alerts: number;
  response_rate: number;
}

interface FinanceSummary {
  total_income: number;
  total_expenses: number;
  net: number;
  savings_rate: number;
}

interface FitnessSummary {
  current_streak: number;
  last_workout_date: string | null;
  next_ppl_day: string;
  todays_calories: number;
  todays_protein: number;
}

interface NextDeadline {
  title: string;
  due_date: string;
  days_remaining: number;
}

interface UniversitySummary {
  upcoming_deadlines: number;
  overdue_deadlines: number;
  next_deadline: NextDeadline | null;
}

interface ClientsSummary {
  total_mrr: number;
  active_clients: number;
}

interface DashboardSummary {
  crm: CrmSummary;
  finance: FinanceSummary;
  fitness: FitnessSummary;
  university: UniversitySummary;
  clients: ClientsSummary;
}

// ============================================
// Row types for Supabase queries
// ============================================

interface LeadRow {
  status: string;
  next_follow_up: string | null;
}

interface FinanceRow {
  type: string;
  amount: number;
}

interface WorkoutDateRow {
  date: string;
  type: string;
}

interface MealRow {
  calories_approx: number | null;
  protein_g: number | null;
}

interface DeadlineRow {
  title: string;
  due_date: string;
  completed: boolean;
}

interface ClientRow {
  mrr: number;
  status: string;
}

// ============================================
// Helpers
// ============================================

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const PPL_ROTATION: WorkoutType[] = ["push", "pull", "legs"];

/**
 * Given the last workout type, return the next one in PPL rotation.
 * Push -> Pull -> Legs -> Push -> ...
 */
function getNextPPLDay(lastType: string | null): string {
  if (!lastType) return "push";
  const idx = PPL_ROTATION.indexOf(lastType as WorkoutType);
  if (idx === -1) return "push";
  return PPL_ROTATION[(idx + 1) % PPL_ROTATION.length];
}

/**
 * Calculate consecutive workout days (streak) from an array
 * of unique date strings sorted descending.
 */
function calculateStreak(uniqueDates: string[]): number {
  if (uniqueDates.length === 0) return 0;

  const today = formatDate(new Date());
  const lastDate = new Date(uniqueDates[0]);
  const todayDate = new Date(today);
  const diffMs = todayDate.getTime() - lastDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // If last workout is more than 1 day ago, streak is broken
  if (diffDays > 1) return 0;

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
  return streak;
}

// ============================================
// Default values for graceful degradation
// ============================================

const DEFAULT_CRM: CrmSummary = {
  total_leads: 0,
  active_leads: 0,
  by_status: {},
  follow_up_alerts: 0,
  response_rate: 0,
};

const DEFAULT_FINANCE: FinanceSummary = {
  total_income: 0,
  total_expenses: 0,
  net: 0,
  savings_rate: 0,
};

const DEFAULT_FITNESS: FitnessSummary = {
  current_streak: 0,
  last_workout_date: null,
  next_ppl_day: "push",
  todays_calories: 0,
  todays_protein: 0,
};

const DEFAULT_UNIVERSITY: UniversitySummary = {
  upcoming_deadlines: 0,
  overdue_deadlines: 0,
  next_deadline: null,
};

const DEFAULT_CLIENTS: ClientsSummary = {
  total_mrr: 0,
  active_clients: 0,
};

// ============================================
// Module fetchers — each catches its own errors
// ============================================

async function fetchCrmSummary(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<CrmSummary> {
  try {
    const { data, error } = await supabase
      .from("leads")
      .select("status, next_follow_up");

    if (error) {
      console.error("Dashboard: CRM query error:", error.message);
      return DEFAULT_CRM;
    }

    const leads = (data ?? []) as LeadRow[];
    const totalLeads = leads.length;

    // Active = not won or lost
    const terminalStatuses = new Set(["won", "lost"]);
    const activeLeads = leads.filter(
      (l) => !terminalStatuses.has(l.status),
    ).length;

    // Count by status
    const byStatus: Record<string, number> = {};
    for (const lead of leads) {
      byStatus[lead.status] = (byStatus[lead.status] || 0) + 1;
    }

    // Follow-up alerts: next_follow_up is in the past and lead is still active
    const now = new Date();
    const followUpAlerts = leads.filter((l) => {
      if (!l.next_follow_up) return false;
      if (terminalStatuses.has(l.status)) return false;
      return new Date(l.next_follow_up) <= now;
    }).length;

    // Response rate: leads that got a response / leads that were contacted
    // "Responded" statuses: replied, call_booked, won
    // "Contacted" pool: contacted, follow_up, replied, call_booked, won, lost
    const respondedStatuses = new Set(["replied", "call_booked", "won"]);
    const contactedPool = new Set([
      "contacted",
      "follow_up",
      "replied",
      "call_booked",
      "won",
      "lost",
    ]);

    const contactedCount = leads.filter((l) =>
      contactedPool.has(l.status),
    ).length;
    const respondedCount = leads.filter((l) =>
      respondedStatuses.has(l.status),
    ).length;

    const responseRate =
      contactedCount > 0
        ? Math.round((respondedCount / contactedCount) * 10000) / 100
        : 0;

    return {
      total_leads: totalLeads,
      active_leads: activeLeads,
      by_status: byStatus,
      follow_up_alerts: followUpAlerts,
      response_rate: responseRate,
    };
  } catch (error) {
    console.error("Dashboard: CRM fetch failed:", error);
    return DEFAULT_CRM;
  }
}

async function fetchFinanceSummary(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<FinanceSummary> {
  try {
    // Current month range
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const dateFrom = `${year}-${month}-01`;
    const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
    const dateTo = `${year}-${month}-${String(lastDay).padStart(2, "0")}`;

    const { data, error } = await supabase
      .from("finances")
      .select("type, amount")
      .gte("date", dateFrom)
      .lte("date", dateTo);

    if (error) {
      console.error("Dashboard: Finance query error:", error.message);
      return DEFAULT_FINANCE;
    }

    const rows = (data ?? []) as FinanceRow[];

    let totalIncome = 0;
    let totalExpenses = 0;

    for (const row of rows) {
      const amount = Number(row.amount) || 0;
      if (row.type === "income") {
        totalIncome += amount;
      } else if (row.type === "expense") {
        totalExpenses += amount;
      }
    }

    const net = Math.round((totalIncome - totalExpenses) * 100) / 100;
    const savingsRate =
      totalIncome > 0
        ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 10000) /
          100
        : 0;

    return {
      total_income: Math.round(totalIncome * 100) / 100,
      total_expenses: Math.round(totalExpenses * 100) / 100,
      net,
      savings_rate: savingsRate,
    };
  } catch (error) {
    console.error("Dashboard: Finance fetch failed:", error);
    return DEFAULT_FINANCE;
  }
}

async function fetchFitnessSummary(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<FitnessSummary> {
  try {
    const today = formatDate(new Date());

    // Fetch workouts (dates + type) and today's meals in parallel
    const [workoutsResult, mealsResult] = await Promise.all([
      supabase
        .from("workouts")
        .select("date, type")
        .order("date", { ascending: false }),
      supabase
        .from("meals")
        .select("calories_approx, protein_g")
        .eq("date", today),
    ]);

    if (workoutsResult.error) {
      console.error(
        "Dashboard: Workouts query error:",
        workoutsResult.error.message,
      );
    }
    if (mealsResult.error) {
      console.error(
        "Dashboard: Meals query error:",
        mealsResult.error.message,
      );
    }

    const workoutRows = (workoutsResult.data ?? []) as WorkoutDateRow[];
    const mealRows = (mealsResult.data ?? []) as MealRow[];

    // Streak calculation
    const uniqueDates = [
      ...new Set(workoutRows.map((w) => w.date)),
    ];
    const currentStreak = calculateStreak(uniqueDates);
    const lastWorkoutDate = uniqueDates.length > 0 ? uniqueDates[0] : null;

    // Next PPL day — based on the most recent workout type
    const lastWorkoutType =
      workoutRows.length > 0 ? workoutRows[0].type : null;
    const nextPplDay = getNextPPLDay(lastWorkoutType);

    // Today's nutrition
    let todaysCalories = 0;
    let todaysProtein = 0;
    for (const meal of mealRows) {
      todaysCalories += meal.calories_approx ?? 0;
      todaysProtein += meal.protein_g ?? 0;
    }

    return {
      current_streak: currentStreak,
      last_workout_date: lastWorkoutDate,
      next_ppl_day: nextPplDay,
      todays_calories: todaysCalories,
      todays_protein: todaysProtein,
    };
  } catch (error) {
    console.error("Dashboard: Fitness fetch failed:", error);
    return DEFAULT_FITNESS;
  }
}

async function fetchUniversitySummary(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<UniversitySummary> {
  try {
    const today = formatDate(new Date());

    const { data, error } = await supabase
      .from("deadlines")
      .select("title, due_date, completed")
      .eq("completed", false)
      .order("due_date", { ascending: true });

    if (error) {
      console.error("Dashboard: Deadlines query error:", error.message);
      return DEFAULT_UNIVERSITY;
    }

    const deadlines = (data ?? []) as DeadlineRow[];

    const overdue = deadlines.filter((d) => d.due_date < today);
    const upcoming = deadlines.filter((d) => d.due_date >= today);

    let nextDeadline: NextDeadline | null = null;
    if (upcoming.length > 0) {
      const next = upcoming[0];
      const dueDate = new Date(next.due_date);
      const todayDate = new Date(today);
      const diffMs = dueDate.getTime() - todayDate.getTime();
      const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      nextDeadline = {
        title: next.title,
        due_date: next.due_date,
        days_remaining: daysRemaining,
      };
    }

    return {
      upcoming_deadlines: upcoming.length,
      overdue_deadlines: overdue.length,
      next_deadline: nextDeadline,
    };
  } catch (error) {
    console.error("Dashboard: University fetch failed:", error);
    return DEFAULT_UNIVERSITY;
  }
}

async function fetchClientsSummary(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<ClientsSummary> {
  try {
    const { data, error } = await supabase
      .from("clients")
      .select("mrr, status")
      .eq("status", "active");

    if (error) {
      console.error("Dashboard: Clients query error:", error.message);
      return DEFAULT_CLIENTS;
    }

    const rows = (data ?? []) as ClientRow[];

    let totalMrr = 0;
    for (const row of rows) {
      totalMrr += Number(row.mrr) || 0;
    }

    return {
      total_mrr: Math.round(totalMrr * 100) / 100,
      active_clients: rows.length,
    };
  } catch (error) {
    console.error("Dashboard: Clients fetch failed:", error);
    return DEFAULT_CLIENTS;
  }
}

// ============================================
// GET /api/dashboard/summary
// ============================================

export async function GET() {
  try {
    const supabase = await createClient();

    // Query all modules in parallel — each handles its own errors
    const [crm, finance, fitness, university, clients] = await Promise.all([
      fetchCrmSummary(supabase),
      fetchFinanceSummary(supabase),
      fetchFitnessSummary(supabase),
      fetchUniversitySummary(supabase),
      fetchClientsSummary(supabase),
    ]);

    const summary: DashboardSummary = {
      crm,
      finance,
      fitness,
      university,
      clients,
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Dashboard summary route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
