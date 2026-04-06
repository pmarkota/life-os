"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Target,
  Mail,
  Plus,
  Dumbbell,
  Receipt,
  AlertTriangle,
  Clock,
  Calendar,
  CloudSun,
  ArrowUpRight,
  Activity,
  Flame,
  GraduationCap,
  Minus,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import type { Lead, Deadline } from "@/types";

// ============================================
// Types for API responses
// ============================================

interface MrrData {
  total_mrr: number;
  active_clients: number;
  average_mrr: number;
  by_plan: Array<{ plan: string; count: number; mrr: number }>;
}

interface FinanceSummary {
  total_income: number;
  total_expenses: number;
  net: number;
  savings_rate: number;
  monthly_breakdown: Array<{
    month: number;
    income: number;
    expenses: number;
    net: number;
  }>;
}

interface StreakData {
  current_streak: number;
  last_workout_date: string | null;
}

interface WeatherData {
  temp?: number;
  description?: string;
  icon?: string;
  feels_like?: number;
  humidity?: number;
  error?: string;
}

interface LastWorkoutData {
  type: string;
  date: string;
}

interface DashboardData {
  mrr: MrrData | null;
  leads: Lead[];
  deadlines: Deadline[];
  finance: FinanceSummary | null;
  streak: StreakData | null;
  weather: WeatherData | null;
  lastWorkout: LastWorkoutData | null;
}

interface KpiCardData {
  label: string;
  value: string;
  change: string;
  changeType: "positive" | "negative" | "neutral";
  icon: React.ComponentType<{ className?: string }>;
}

// ============================================
// Constants
// ============================================

const ACTIVE_LEAD_STATUSES = [
  "new",
  "contacted",
  "demo_built",
  "replied",
  "call_booked",
  "follow_up",
];

const RESPONDED_STATUSES = ["replied", "call_booked", "won"];
const OUTREACH_STATUSES = [
  "contacted",
  "follow_up",
  "replied",
  "call_booked",
  "won",
  "lost",
];

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const PPL_ROTATION = [
  "Push A",
  "Pull A",
  "Legs A",
  "Push B",
  "Pull B",
  "Legs B",
] as const;

const PPL_TYPE_ORDER: Record<string, number> = {
  push: 0,
  pull: 1,
  legs: 2,
};

const AVG_DEAL_VALUE = 99;

// ============================================
// Helpers
// ============================================

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getNextPplDay(lastWorkoutType: string | null): string {
  if (!lastWorkoutType) return PPL_ROTATION[0];
  const idx = PPL_TYPE_ORDER[lastWorkoutType];
  if (idx === undefined) return PPL_ROTATION[0];
  // PPL rotation: push->pull->legs->push->pull->legs
  // Each type has A and B variants alternating
  // Simplification: next in cycle after the type
  const nextIdx = (idx + 1) % 3;
  const types = ["Push", "Pull", "Legs"];
  return types[nextIdx];
}

function getDaysOverdue(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));
}

function getDaysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.floor((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatCurrency(amount: number): string {
  if (amount >= 1000) {
    return `\u20AC${amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }
  return `\u20AC${amount}`;
}

// ============================================
// Animation variants
// ============================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  },
};

// ============================================
// Custom Tooltip for Charts
// ============================================

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload) return null;
  return (
    <div className="rounded-lg border border-[#27272A] bg-[#18181B] px-3 py-2 shadow-lg">
      <p className="text-xs text-[#A1A1AA] mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm font-medium" style={{ color: entry.color }}>
          {entry.name}: {typeof entry.value === "number" ? formatCurrency(entry.value) : entry.value}
        </p>
      ))}
    </div>
  );
}

// ============================================
// Skeleton Components
// ============================================

function KpiSkeleton() {
  return (
    <Card className="group relative overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="space-y-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-11 w-11 rounded-xl" />
        </div>
      </CardContent>
    </Card>
  );
}

function ChartSkeleton({ height = "h-[220px]" }: { height?: string }) {
  return (
    <div className={`${height} w-full flex items-center justify-center`}>
      <div className="space-y-2 w-full px-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-[85%]" />
        <Skeleton className="h-4 w-[70%]" />
        <Skeleton className="h-4 w-[90%]" />
        <Skeleton className="h-4 w-[60%]" />
      </div>
    </div>
  );
}

function AlertSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-lg border border-[#27272A] p-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-4 w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// Data Fetching
// ============================================

async function fetchDashboardData(): Promise<DashboardData> {
  const [mrrRes, leadsRes, deadlinesRes, financeRes, streakRes, weatherRes, workoutsRes] =
    await Promise.allSettled([
      fetch("/api/clients/mrr"),
      fetch("/api/leads"),
      fetch("/api/university/deadlines?completed=false"),
      fetch(`/api/finance/summary?year=${new Date().getFullYear()}`),
      fetch("/api/fitness/streak"),
      fetch("/api/weather"),
      fetch("/api/fitness/workouts?order=desc"),
    ]);

  const extractJson = async <T,>(
    result: PromiseSettledResult<Response>,
  ): Promise<T | null> => {
    if (result.status === "rejected") return null;
    try {
      if (!result.value.ok) return null;
      return (await result.value.json()) as T;
    } catch {
      return null;
    }
  };

  const [mrr, leads, deadlines, finance, streak, weather, workouts] = await Promise.all([
    extractJson<MrrData>(mrrRes),
    extractJson<Lead[]>(leadsRes),
    extractJson<Deadline[]>(deadlinesRes),
    extractJson<FinanceSummary>(financeRes),
    extractJson<StreakData>(streakRes),
    extractJson<WeatherData>(weatherRes),
    extractJson<Array<{ type: string; date: string }>>(workoutsRes),
  ]);

  // Extract last workout info
  const lastWorkout =
    workouts && workouts.length > 0
      ? { type: workouts[0].type, date: workouts[0].date }
      : null;

  return {
    mrr,
    leads: leads ?? [],
    deadlines: deadlines ?? [],
    finance,
    streak,
    weather,
    lastWorkout,
  };
}

// ============================================
// Main Component
// ============================================

export default function CommandCenter() {
  const [currentTime, setCurrentTime] = useState<string>("");
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData>({
    mrr: null,
    leads: [],
    deadlines: [],
    finance: null,
    streak: null,
    weather: null,
    lastWorkout: null,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchDashboardData();
      setData(result);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    const updateTime = () => {
      setCurrentTime(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (mounted) {
      loadData();
    }
  }, [mounted, loadData]);

  if (!mounted) return null;

  // ---------- Derived data ----------

  const activeLeads = data.leads.filter((l) =>
    ACTIVE_LEAD_STATUSES.includes(l.status),
  );

  const pipelineValue = activeLeads.length * AVG_DEAL_VALUE;

  const respondedCount = data.leads.filter((l) =>
    RESPONDED_STATUSES.includes(l.status),
  ).length;
  const outreachCount = data.leads.filter((l) =>
    OUTREACH_STATUSES.includes(l.status),
  ).length;
  const responseRate =
    outreachCount > 0 ? Math.round((respondedCount / outreachCount) * 100) : 0;

  // Follow-up alerts: leads where next_follow_up is today or past, not won/lost
  const followUpAlerts = data.leads.filter((lead) => {
    if (!lead.next_follow_up) return false;
    if (lead.status === "won" || lead.status === "lost") return false;
    const daysOverdue = getDaysOverdue(lead.next_follow_up);
    return daysOverdue >= 0;
  }).sort((a, b) => {
    const aOverdue = getDaysOverdue(a.next_follow_up!);
    const bOverdue = getDaysOverdue(b.next_follow_up!);
    return bOverdue - aOverdue;
  });

  // Top leads by score
  const topLeads = data.leads
    .filter((l) => l.lead_score !== null && l.lead_score > 0 && !["won", "lost"].includes(l.status))
    .sort((a, b) => (b.lead_score ?? 0) - (a.lead_score ?? 0))
    .slice(0, 5);

  // Upcoming deadlines: due within 7 days
  const upcomingDeadlines = data.deadlines
    .filter((d) => {
      const daysUntil = getDaysUntil(d.due_date);
      return daysUntil >= 0 && daysUntil <= 7;
    })
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

  // Pipeline funnel data
  const pipelineStages = [
    { name: "New", status: "new", color: "#71717A" },
    { name: "Demo Built", status: "demo_built", color: "#8B5CF6" },
    { name: "Contacted", status: "contacted", color: "#0EA5E9" },
    { name: "Replied", status: "replied", color: "#06B6D4" },
    { name: "Call Booked", status: "call_booked", color: "#22C55E" },
    { name: "Follow-up", status: "follow_up", color: "#F59E0B" },
    { name: "Won", status: "won", color: "#10B981" },
    { name: "Lost", status: "lost", color: "#EF4444" },
  ];

  const pipelineFunnelData = pipelineStages.map((stage) => ({
    name: stage.name,
    count: data.leads.filter((l) => l.status === stage.status).length,
    color: stage.color,
  }));

  // Revenue chart data — always show Jan through current month so lines render
  const currentMonth = new Date().getMonth(); // 0-indexed
  const revenueDisplay = data.finance
    ? data.finance.monthly_breakdown
        .slice(0, currentMonth + 1)
        .map((m) => ({
          month: MONTH_LABELS[m.month - 1],
          income: m.income,
          expenses: m.expenses,
          net: m.net,
        }))
    : [];

  // KPI Cards
  const kpiCards: KpiCardData[] = [
    {
      label: "Total MRR",
      value: data.mrr ? formatCurrency(data.mrr.total_mrr) : "\u2014",
      change: data.mrr
        ? `${data.mrr.active_clients} client${data.mrr.active_clients !== 1 ? "s" : ""}`
        : "\u2014",
      changeType: "neutral" as const,
      icon: DollarSign,
    },
    {
      label: "Active Leads",
      value: loading ? "\u2014" : String(activeLeads.length),
      change: loading
        ? "\u2014"
        : `${data.leads.length} total`,
      changeType: "neutral" as const,
      icon: Users,
    },
    {
      label: "Pipeline Value",
      value: loading ? "\u2014" : formatCurrency(pipelineValue),
      change: loading
        ? "\u2014"
        : `${activeLeads.length} \u00D7 \u20AC${AVG_DEAL_VALUE} avg`,
      changeType: "neutral" as const,
      icon: Target,
    },
    {
      label: "Response Rate",
      value: loading ? "\u2014" : `${responseRate}%`,
      change: loading
        ? "\u2014"
        : `${respondedCount}/${outreachCount} responded`,
      changeType:
        responseRate >= 20
          ? "positive"
          : responseRate > 0
            ? "negative"
            : ("neutral" as const),
      icon: Mail,
    },
  ];

  // Next PPL day from last workout
  const nextPplDay = getNextPplDay(data.lastWorkout?.type ?? null);

  // Weather string
  const weatherStr =
    data.weather && data.weather.temp !== undefined && !data.weather.error
      ? `Zagreb, ${data.weather.temp}\u00B0C${data.weather.description ? ` \u2014 ${data.weather.description}` : ""}`
      : "Zagreb";

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 p-6 md:p-8"
    >
      {/* Header -- Date, Weather, Greeting */}
      <motion.div variants={itemVariants} className="space-y-1">
        <div className="flex items-center gap-3 text-sm text-[#71717A]">
          <Calendar className="h-4 w-4" />
          <span>{formatDate()}</span>
          <span className="text-[#27272A]">|</span>
          <Clock className="h-4 w-4" />
          <span>{currentTime}</span>
          <span className="text-[#27272A]">|</span>
          <CloudSun className="h-4 w-4" />
          <span>{weatherStr}</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          {getGreeting()}, Petar
        </h1>
        <p className="text-[#A1A1AA]">
          Here&apos;s your operational overview for today.
        </p>
      </motion.div>

      {/* KPI Cards */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
          : kpiCards.map((kpi) => {
              const Icon = kpi.icon;
              return (
                <Card
                  key={kpi.label}
                  className="group relative overflow-hidden hover:border-[#3F3F46] transition-all duration-300"
                >
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <p className="text-sm text-[#71717A]">{kpi.label}</p>
                        <p className="text-2xl font-bold tracking-tight">
                          {kpi.value}
                        </p>
                        <div className="flex items-center gap-1">
                          {kpi.changeType === "positive" ? (
                            <TrendingUp className="h-3.5 w-3.5 text-[#22C55E]" />
                          ) : kpi.changeType === "negative" ? (
                            <TrendingDown className="h-3.5 w-3.5 text-[#EF4444]" />
                          ) : (
                            <Minus className="h-3.5 w-3.5 text-[#71717A]" />
                          )}
                          <span
                            className={`text-xs font-medium ${
                              kpi.changeType === "positive"
                                ? "text-[#22C55E]"
                                : kpi.changeType === "negative"
                                  ? "text-[#EF4444]"
                                  : "text-[#71717A]"
                            }`}
                          >
                            {kpi.change}
                          </span>
                        </div>
                      </div>
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0EA5E9]/10 text-[#0EA5E9] group-hover:bg-[#0EA5E9]/15 transition-colors">
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                  </CardContent>
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#0EA5E9]/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </Card>
              );
            })}
      </motion.div>

      {/* Main Grid -- Pipeline Funnel + Follow-up Alerts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Pipeline Funnel */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="hover:border-[#3F3F46] transition-colors">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">
                  Pipeline Funnel
                </CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {data.leads.length} total leads
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <ChartSkeleton />
              ) : data.leads.length === 0 ? (
                <div className="h-[220px] flex items-center justify-center text-sm text-[#71717A]">
                  No leads yet. Add your first lead to see the pipeline.
                </div>
              ) : (
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={pipelineFunnelData}
                      layout="vertical"
                      barCategoryGap={6}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#27272A"
                        horizontal={false}
                      />
                      <XAxis
                        type="number"
                        tick={{ fill: "#71717A", fontSize: 12 }}
                        axisLine={{ stroke: "#27272A" }}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fill: "#A1A1AA", fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                        width={90}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.[0]) return null;
                          return (
                            <div className="rounded-lg border border-[#27272A] bg-[#18181B] px-3 py-2 shadow-lg">
                              <p className="text-xs text-[#A1A1AA] mb-1">{label}</p>
                              <p className="text-sm font-medium text-[#FAFAFA]">
                                {payload[0].value} lead{Number(payload[0].value) !== 1 ? "s" : ""}
                              </p>
                            </div>
                          );
                        }}
                      />
                      <Bar
                        dataKey="count"
                        name="Leads"
                        radius={[0, 4, 4, 0]}
                        maxBarSize={24}
                        fill="#0EA5E9"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Follow-up Alerts */}
        <motion.div variants={itemVariants}>
          <Card className="hover:border-[#3F3F46] transition-colors h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-[#F59E0B]" />
                  Follow-up Alerts
                </CardTitle>
                <Badge variant="warning" className="text-xs">
                  {loading ? "\u2014" : followUpAlerts.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <AlertSkeleton />
              ) : followUpAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#22C55E]/10 mb-3">
                    <TrendingUp className="h-5 w-5 text-[#22C55E]" />
                  </div>
                  <p className="text-sm text-[#A1A1AA]">All caught up</p>
                  <p className="text-xs text-[#71717A] mt-1">No overdue follow-ups</p>
                </div>
              ) : (
                followUpAlerts.slice(0, 5).map((alert) => {
                  const daysOverdue = getDaysOverdue(alert.next_follow_up!);
                  return (
                    <a
                      key={alert.id}
                      href="/crm"
                      className="group flex items-center justify-between rounded-lg border border-[#27272A] bg-[#27272A]/30 p-3 hover:border-[#F59E0B]/30 hover:bg-[#F59E0B]/5 transition-all cursor-pointer no-underline"
                    >
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium text-[#FAFAFA] group-hover:text-[#F59E0B] transition-colors">
                          {alert.business_name}
                        </p>
                        <p className="text-xs text-[#71717A]">
                          {alert.location ?? alert.niche ?? "No location"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#F59E0B] font-medium">
                          {daysOverdue === 0 ? "Today" : `${daysOverdue}d overdue`}
                        </span>
                        <ArrowUpRight className="h-3.5 w-3.5 text-[#71717A] group-hover:text-[#F59E0B] transition-colors" />
                      </div>
                    </a>
                  );
                })
              )}
              {followUpAlerts.length > 5 && (
                <a
                  href="/crm"
                  className="block text-center text-xs text-[#0EA5E9] hover:text-[#38BDF8] transition-colors pt-1"
                >
                  +{followUpAlerts.length - 5} more alerts
                </a>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Second Row -- Revenue Trend + Upcoming Deadlines + Fitness */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Monthly Revenue Trend */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="hover:border-[#3F3F46] transition-colors">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">
                  Revenue Trend
                </CardTitle>
                {data.finance && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#71717A]">
                      YTD Net: {formatCurrency(data.finance.net)}
                    </span>
                    <div
                      className={`flex items-center gap-1 ${data.finance.net >= 0 ? "text-[#22C55E]" : "text-[#EF4444]"}`}
                    >
                      {data.finance.net >= 0 ? (
                        <TrendingUp className="h-3.5 w-3.5" />
                      ) : (
                        <TrendingDown className="h-3.5 w-3.5" />
                      )}
                      <span className="text-xs font-medium">
                        {data.finance.savings_rate}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <ChartSkeleton height="h-[200px]" />
              ) : revenueDisplay.length === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-sm text-[#71717A]">
                  No financial data yet. Log your first income or expense.
                </div>
              ) : (
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueDisplay}>
                      <defs>
                        <linearGradient
                          id="incomeGrad"
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
                          id="expenseGrad"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#EF4444"
                            stopOpacity={0.15}
                          />
                          <stop
                            offset="100%"
                            stopColor="#EF4444"
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
                        dataKey="month"
                        tick={{ fill: "#71717A", fontSize: 12 }}
                        axisLine={{ stroke: "#27272A" }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: "#71717A", fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="income"
                        name="Income"
                        stroke="#0EA5E9"
                        strokeWidth={2}
                        fill="url(#incomeGrad)"
                      />
                      <Area
                        type="monotone"
                        dataKey="expenses"
                        name="Expenses"
                        stroke="#EF4444"
                        strokeWidth={1.5}
                        fill="url(#expenseGrad)"
                        strokeDasharray="4 2"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Sidebar: Deadlines + Fitness */}
        <motion.div variants={itemVariants} className="space-y-6">
          {/* Upcoming Deadlines */}
          <Card className="hover:border-[#3F3F46] transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-[#8B5CF6]" />
                  Upcoming Deadlines
                </CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {loading ? "\u2014" : `${upcomingDeadlines.length} this week`}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="rounded-lg border border-[#27272A] p-3">
                      <Skeleton className="h-4 w-32 mb-1.5" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  ))}
                </div>
              ) : upcomingDeadlines.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <p className="text-sm text-[#A1A1AA]">No deadlines this week</p>
                  <a
                    href="/university"
                    className="text-xs text-[#0EA5E9] hover:text-[#38BDF8] mt-1 transition-colors"
                  >
                    View all deadlines
                  </a>
                </div>
              ) : (
                upcomingDeadlines.slice(0, 4).map((deadline) => {
                  const daysUntil = getDaysUntil(deadline.due_date);
                  const urgencyColor =
                    daysUntil <= 1
                      ? "text-[#EF4444]"
                      : daysUntil <= 3
                        ? "text-[#F59E0B]"
                        : "text-[#A1A1AA]";
                  const urgencyBorder =
                    daysUntil <= 1
                      ? "border-[#EF4444]/30"
                      : daysUntil <= 3
                        ? "border-[#F59E0B]/20"
                        : "border-[#27272A]";
                  return (
                    <a
                      key={deadline.id}
                      href="/university"
                      className={`group block rounded-lg border ${urgencyBorder} bg-[#27272A]/30 p-3 hover:border-[#8B5CF6]/30 hover:bg-[#8B5CF6]/5 transition-all no-underline`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5 flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#FAFAFA] truncate group-hover:text-[#8B5CF6] transition-colors">
                            {deadline.title}
                          </p>
                          <div className="flex items-center gap-2">
                            {deadline.course && (
                              <span className="text-xs text-[#71717A] truncate">
                                {deadline.course}
                              </span>
                            )}
                            {deadline.priority === "critical" || deadline.priority === "high" ? (
                              <Badge
                                variant={deadline.priority === "critical" ? "destructive" : "warning"}
                                className="text-[10px] px-1.5 py-0"
                              >
                                {deadline.priority}
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                        <span className={`text-xs font-medium shrink-0 ml-2 ${urgencyColor}`}>
                          {daysUntil === 0
                            ? "Today"
                            : daysUntil === 1
                              ? "Tomorrow"
                              : `${daysUntil}d`}
                        </span>
                      </div>
                    </a>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Fitness Streak */}
          <Card className="hover:border-[#3F3F46] transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Flame className="h-4 w-4 text-[#F97316]" />
                Fitness
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full rounded-lg" />
                  <Skeleton className="h-8 w-full rounded-lg" />
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Streak */}
                  <div className="flex items-center justify-between rounded-lg border border-[#27272A] bg-[#27272A]/30 p-3">
                    <div className="space-y-0.5">
                      <p className="text-xs text-[#71717A]">Current Streak</p>
                      <p className="text-lg font-bold text-[#FAFAFA]">
                        {data.streak?.current_streak ?? 0}{" "}
                        <span className="text-sm font-normal text-[#71717A]">
                          day{(data.streak?.current_streak ?? 0) !== 1 ? "s" : ""}
                        </span>
                      </p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F97316]/10">
                      <Flame
                        className={`h-5 w-5 ${
                          (data.streak?.current_streak ?? 0) > 0
                            ? "text-[#F97316]"
                            : "text-[#71717A]"
                        }`}
                      />
                    </div>
                  </div>

                  {/* Next PPL Day */}
                  <a
                    href="/fitness"
                    className="group flex items-center justify-between rounded-lg border border-[#27272A] bg-[#27272A]/30 p-3 hover:border-[#F97316]/30 hover:bg-[#F97316]/5 transition-all no-underline"
                  >
                    <div className="space-y-0.5">
                      <p className="text-xs text-[#71717A]">Next Session</p>
                      <p className="text-sm font-medium text-[#FAFAFA] group-hover:text-[#F97316] transition-colors">
                        {nextPplDay} Day
                      </p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-[#71717A] group-hover:text-[#F97316] transition-colors" />
                  </a>

                  {data.streak?.last_workout_date && (
                    <p className="text-[11px] text-[#71717A] text-center">
                      Last workout: {new Date(data.streak.last_workout_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Top Leads by Score */}
      {topLeads.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="hover:border-[#3F3F46] transition-colors">
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold text-[#A1A1AA] mb-3">
                Top Leads
              </h3>
              <div className="space-y-2">
                {topLeads.map((lead) => (
                  <div
                    key={lead.id}
                    onClick={() => (window.location.href = "/crm")}
                    className="flex items-center justify-between rounded-lg border border-[#27272A] bg-[#09090B] px-3 py-2 cursor-pointer hover:border-[#3F3F46] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${
                          (lead.lead_score ?? 0) >= 70
                            ? "bg-[#22C55E]/15 text-[#22C55E]"
                            : (lead.lead_score ?? 0) >= 50
                              ? "bg-[#0EA5E9]/15 text-[#0EA5E9]"
                              : "bg-[#F59E0B]/15 text-[#F59E0B]"
                        }`}
                      >
                        {lead.lead_score}
                      </span>
                      <span className="text-sm text-[#FAFAFA] truncate">
                        {lead.business_name}
                      </span>
                      {lead.location && (
                        <span className="text-xs text-[#71717A] hidden sm:inline">
                          {lead.location}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-[#71717A] shrink-0">
                      {lead.status}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.div variants={itemVariants}>
        <Card className="hover:border-[#3F3F46] transition-colors">
          <CardContent className="p-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-[#71717A] mr-2">
                Quick Actions
              </span>
              <Button
                size="sm"
                className="gap-2"
                onClick={() => (window.location.href = "/crm")}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Lead
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="gap-2"
                onClick={() => (window.location.href = "/fitness")}
              >
                <Dumbbell className="h-3.5 w-3.5" />
                Log Workout
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="gap-2"
                onClick={() => (window.location.href = "/finance")}
              >
                <Receipt className="h-3.5 w-3.5" />
                Log Expense
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="gap-2"
                onClick={() => (window.location.href = "/outreach")}
              >
                <Activity className="h-3.5 w-3.5" />
                Outreach Queue
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => (window.location.href = "/leadgen")}
              >
                <Target className="h-3.5 w-3.5" />
                Find Leads
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
