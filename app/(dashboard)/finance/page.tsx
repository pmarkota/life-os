"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  DollarSign,
  TrendingDown,
  Wallet,
  PiggyBank,
  Plus,
  RefreshCw,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogTransactionModal } from "@/components/finance/log-transaction-modal";
import { TransactionList } from "@/components/finance/transaction-list";
import type { Finance, IncomeSource, ExpenseCategory } from "@/types";

// ─── Constants ──────────────────────────────────────

const MOVE_IN_FUND_TARGET = 5000;

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const SOURCE_COLORS: Record<IncomeSource, string> = {
  father_salary: "#0EA5E9",
  elevera: "#06B6D4",
  etsy: "#F59E0B",
  fleet: "#8B5CF6",
  freelance: "#22C55E",
};

const SOURCE_LABELS: Record<IncomeSource, string> = {
  father_salary: "Father's Salary",
  elevera: "Elevera",
  etsy: "Etsy",
  fleet: "Fleet",
  freelance: "Freelance",
};

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  rent: "#EF4444",
  food: "#F59E0B",
  subscriptions: "#8B5CF6",
  domains: "#0EA5E9",
  transport: "#71717A",
  gym: "#22C55E",
  other: "#A1A1AA",
};

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  rent: "Rent",
  food: "Food",
  subscriptions: "Subscriptions",
  domains: "Domains",
  transport: "Transport",
  gym: "Gym",
  other: "Other",
};

const AVAILABLE_YEARS = [2025, 2026];

// ─── Types ──────────────────────────────────────────

interface MonthlySummary {
  month: number;
  income: number;
  expenses: number;
}

interface FinanceSummary {
  total_income: number;
  total_expenses: number;
  net: number;
  savings_rate: number;
  monthly_breakdown: MonthlySummary[];
}

interface SourceBreakdown {
  source: IncomeSource;
  total: number;
}

// ─── Custom Recharts Tooltip ────────────────────────

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  label?: string;
}

function CustomBarTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[#27272A] bg-[#18181B] px-3 py-2 shadow-xl">
      <p className="text-xs font-medium text-[#FAFAFA] mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="text-xs" style={{ color: entry.color }}>
          {entry.name}: &euro;{entry.value.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      ))}
    </div>
  );
}

function CustomPieTooltip({ active, payload }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div className="rounded-lg border border-[#27272A] bg-[#18181B] px-3 py-2 shadow-xl">
      <p className="text-xs" style={{ color: entry.color }}>
        {entry.name}: &euro;{entry.value.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
    </div>
  );
}

function CustomSavingsRateTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div className="rounded-lg border border-[#27272A] bg-[#18181B] px-3 py-2 shadow-xl">
      <p className="text-xs font-medium text-[#FAFAFA] mb-1">{label}</p>
      <p className="text-xs" style={{ color: entry.color }}>
        Savings Rate: {entry.value.toFixed(1)}%
      </p>
    </div>
  );
}

// ─── Custom Legend ───────────────────────────────────

interface LegendEntry {
  value: string;
  color?: string;
}

function CustomPieLegend({ payload }: { payload?: LegendEntry[] }) {
  if (!payload) return null;
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
      {payload.map((entry) => (
        <div key={entry.value} className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-[11px] text-[#A1A1AA]">{entry.value}</span>
        </div>
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

// ─── Main Component ─────────────────────────────────

export default function FinancePage() {
  const [year, setYear] = useState(2026);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [sourceBreakdown, setSourceBreakdown] = useState<SourceBreakdown[]>([]);
  const [transactions, setTransactions] = useState<Finance[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // ── Fetch all data ──────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, sourceRes, txRes] = await Promise.all([
        fetch(`/api/finance/summary?year=${year}`),
        fetch(`/api/finance/by-source?year=${year}`),
        fetch(`/api/finance?sort=date&order=desc`),
      ]);

      if (!summaryRes.ok || !sourceRes.ok || !txRes.ok) {
        throw new Error("Failed to fetch financial data");
      }

      const [summaryData, sourceData, txData] = await Promise.all([
        summaryRes.json() as Promise<FinanceSummary>,
        sourceRes.json() as Promise<SourceBreakdown[]>,
        txRes.json() as Promise<Finance[]>,
      ]);

      setSummary(summaryData);
      setSourceBreakdown(sourceData);
      setTransactions(txData);
    } catch {
      toast.error("Failed to load financial data");
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Derived data ────────────────────────────────────

  const monthlyChartData = useMemo(() => {
    if (!summary?.monthly_breakdown) return [];
    return summary.monthly_breakdown.map((m) => ({
      name: MONTH_LABELS[m.month - 1],
      Income: m.income,
      Expenses: m.expenses,
    }));
  }, [summary]);

  const pieData = useMemo(() => {
    return sourceBreakdown
      .filter((s) => s.total > 0)
      .map((s) => ({
        name: SOURCE_LABELS[s.source] ?? s.source,
        value: s.total,
        color: SOURCE_COLORS[s.source] ?? "#A1A1AA",
      }));
  }, [sourceBreakdown]);

  const savingsRateData = useMemo(() => {
    if (!summary?.monthly_breakdown) return [];
    return summary.monthly_breakdown.map((m) => ({
      name: MONTH_LABELS[m.month - 1],
      rate: m.income > 0 ? ((m.income - m.expenses) / m.income) * 100 : 0,
    }));
  }, [summary]);

  const expenseByCategory = useMemo(() => {
    const catMap = new Map<ExpenseCategory, number>();
    transactions
      .filter((t) => t.type === "expense" && t.category)
      .forEach((t) => {
        const cat = t.category as ExpenseCategory;
        catMap.set(cat, (catMap.get(cat) ?? 0) + t.amount);
      });

    return Array.from(catMap.entries())
      .map(([category, total]) => ({
        category,
        label: CATEGORY_LABELS[category],
        total,
        color: CATEGORY_COLORS[category],
      }))
      .sort((a, b) => b.total - a.total);
  }, [transactions]);

  const maxCategoryTotal = useMemo(
    () => Math.max(...expenseByCategory.map((c) => c.total), 1),
    [expenseByCategory],
  );

  const recentTransactions = useMemo(
    () => transactions.slice(0, 10),
    [transactions],
  );

  const moveInFundCurrent = summary?.net ?? 0;
  const moveInFundPct = Math.min(
    Math.round((Math.max(moveInFundCurrent, 0) / MOVE_IN_FUND_TARGET) * 100),
    100,
  );

  // ── Handlers ────────────────────────────────────────

  const handleTransactionCreated = useCallback(
    (tx: Finance) => {
      setTransactions((prev) => [tx, ...prev]);
      // Re-fetch summary data for updated KPIs
      fetchData();
    },
    [fetchData],
  );

  const handleTransactionDelete = useCallback(
    (id: string) => {
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      // Re-fetch summary data for updated KPIs
      fetchData();
    },
    [fetchData],
  );

  // ── KPI Cards Config ────────────────────────────────

  const kpis = [
    {
      label: "Total Income",
      value: summary?.total_income ?? 0,
      icon: DollarSign,
      color: "#22C55E",
      bg: "rgba(34,197,94,0.08)",
    },
    {
      label: "Total Expenses",
      value: summary?.total_expenses ?? 0,
      icon: TrendingDown,
      color: "#EF4444",
      bg: "rgba(239,68,68,0.08)",
    },
    {
      label: "Net Savings",
      value: summary?.net ?? 0,
      icon: Wallet,
      color: "#0EA5E9",
      bg: "rgba(14,165,233,0.08)",
    },
    {
      label: "Savings Rate",
      value: summary?.savings_rate ?? 0,
      icon: PiggyBank,
      color: "#8B5CF6",
      bg: "rgba(139,92,246,0.08)",
      isPercentage: true,
    },
  ];

  // ── Render ──────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 pb-8">
      {/* ── Header ───────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#FAFAFA]">
            Financial Dashboard
          </h1>
          <p className="text-sm text-[#71717A] mt-0.5">
            Track income, expenses, and savings at a glance
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Year selector */}
          <div className="flex rounded-lg border border-[#27272A] overflow-hidden">
            {AVAILABLE_YEARS.map((y) => (
              <button
                key={y}
                onClick={() => setYear(y)}
                className={`px-3.5 py-1.5 text-sm font-medium transition-colors duration-150 ${
                  year === y
                    ? "bg-[#0EA5E9]/15 text-[#0EA5E9]"
                    : "text-[#71717A] hover:text-[#A1A1AA] hover:bg-[#27272A]/40"
                }`}
              >
                {y}
              </button>
            ))}
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

          <Button onClick={() => setModalOpen(true)} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" />
            Log Transaction
          </Button>
        </div>
      </motion.div>

      {/* ── Loading state ────────────────────────────── */}
      {loading && !summary ? (
        <div className="flex items-center justify-center py-32">
          <div className="flex items-center gap-3 text-[#71717A]">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading financial data...</span>
          </div>
        </div>
      ) : (
        <>
          {/* ── KPI Cards ──────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((kpi, i) => (
              <motion.div
                key={kpi.label}
                custom={i}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
              >
                <Card className="hover:border-[#3F3F46] transition-colors">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-medium text-[#71717A] uppercase tracking-wide">
                        {kpi.label}
                      </span>
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-lg"
                        style={{ backgroundColor: kpi.bg }}
                      >
                        <kpi.icon
                          className="h-4 w-4"
                          style={{ color: kpi.color }}
                        />
                      </div>
                    </div>
                    <p
                      className="text-2xl font-bold tracking-tight"
                      style={{ color: kpi.color }}
                    >
                      {kpi.isPercentage
                        ? `${kpi.value.toFixed(1)}%`
                        : `\u20AC${(kpi.value as number).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* ── Charts Row ─────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Monthly P&L */}
            <motion.div
              custom={4}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
            >
              <Card className="hover:border-[#3F3F46] transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-[#A1A1AA]">
                    Monthly P&L
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[280px]">
                    {monthlyChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={monthlyChartData}
                          margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                        >
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
                              `\u20AC${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`
                            }
                          />
                          <RechartsTooltip
                            content={<CustomBarTooltip />}
                            cursor={{ fill: "rgba(255,255,255,0.03)" }}
                          />
                          <Bar
                            dataKey="Income"
                            fill="#22C55E"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={32}
                          />
                          <Bar
                            dataKey="Expenses"
                            fill="#EF4444"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={32}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-sm text-[#71717A]">
                        No data for {year}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Income by Source Pie */}
            <motion.div
              custom={5}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
            >
              <Card className="hover:border-[#3F3F46] transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-[#A1A1AA]">
                    Income by Source
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[280px]">
                    {pieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="45%"
                            innerRadius={60}
                            outerRadius={95}
                            paddingAngle={3}
                            dataKey="value"
                            stroke="none"
                          >
                            {pieData.map((entry) => (
                              <Cell
                                key={entry.name}
                                fill={entry.color}
                              />
                            ))}
                          </Pie>
                          <RechartsTooltip content={<CustomPieTooltip />} />
                          <Legend content={<CustomPieLegend />} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-sm text-[#71717A]">
                        No income data for {year}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* ── Savings Rate Trend ──────────────────────── */}
          <motion.div
            custom={5.5}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
          >
            <Card className="hover:border-[#3F3F46] transition-colors">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-[#A1A1AA]">
                  Savings Rate Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  {savingsRateData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={savingsRateData}
                        margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="savingsRateGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#0EA5E9" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#0EA5E9" stopOpacity={0} />
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
                          tickFormatter={(v: number) => `${v}%`}
                          domain={["auto", "auto"]}
                        />
                        <RechartsTooltip
                          content={<CustomSavingsRateTooltip />}
                          cursor={{ stroke: "#27272A", strokeDasharray: "3 3" }}
                        />
                        <Area
                          type="monotone"
                          dataKey="rate"
                          stroke="#0EA5E9"
                          strokeWidth={2}
                          fill="url(#savingsRateGradient)"
                          dot={{ r: 3, fill: "#0EA5E9", stroke: "#09090B", strokeWidth: 2 }}
                          activeDot={{ r: 5, fill: "#0EA5E9", stroke: "#09090B", strokeWidth: 2 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-sm text-[#71717A]">
                      No data for {year}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Expense Breakdown + Recent Transactions ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Expense Breakdown */}
            <motion.div
              custom={6}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
            >
              <Card className="hover:border-[#3F3F46] transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-[#A1A1AA]">
                    Expense Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {expenseByCategory.length > 0 ? (
                    <div className="space-y-3">
                      {expenseByCategory.map((cat, i) => (
                        <motion.div
                          key={cat.category}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.4 + i * 0.05, duration: 0.25 }}
                          className="space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span
                                className="h-2.5 w-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: cat.color }}
                              />
                              <span className="text-sm text-[#FAFAFA]">
                                {cat.label}
                              </span>
                            </div>
                            <span className="text-sm font-medium text-[#A1A1AA] tabular-nums">
                              &euro;{cat.total.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-[#27272A] overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ backgroundColor: cat.color }}
                              initial={{ width: 0 }}
                              animate={{
                                width: `${(cat.total / maxCategoryTotal) * 100}%`,
                              }}
                              transition={{
                                delay: 0.5 + i * 0.05,
                                duration: 0.4,
                                ease: "easeOut",
                              }}
                            />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-12 text-sm text-[#71717A]">
                      No expense data
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Recent Transactions */}
            <motion.div
              custom={7}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
            >
              <Card className="hover:border-[#3F3F46] transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-[#A1A1AA]">
                    Recent Transactions
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3">
                  <TransactionList
                    transactions={recentTransactions}
                    onDelete={handleTransactionDelete}
                  />
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* ── Move-in Fund Tracker ─────────────────── */}
          <motion.div
            custom={8}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
          >
            <Card className="hover:border-[#3F3F46] transition-colors overflow-hidden">
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Left: Info */}
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#0EA5E9]/10">
                      <Target className="h-6 w-6 text-[#0EA5E9]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[#FAFAFA]">
                        Move-in Fund
                      </h3>
                      <p className="text-xs text-[#71717A] mt-0.5">
                        Target: &euro;{MOVE_IN_FUND_TARGET.toLocaleString("de-DE")}{" "}
                        &middot; Saved: &euro;
                        {Math.max(moveInFundCurrent, 0).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  {/* Right: Progress */}
                  <div className="flex items-center gap-4 flex-1 sm:flex-none sm:w-72">
                    <div className="flex-1 h-3 rounded-full bg-[#27272A] overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{
                          background:
                            moveInFundPct >= 100
                              ? "#22C55E"
                              : "linear-gradient(90deg, #0EA5E9, #06B6D4)",
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${moveInFundPct}%` }}
                        transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }}
                      />
                    </div>
                    <span
                      className={`text-sm font-bold tabular-nums shrink-0 ${
                        moveInFundPct >= 100 ? "text-[#22C55E]" : "text-[#0EA5E9]"
                      }`}
                    >
                      {moveInFundPct}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}

      {/* ── Transaction Modal ──────────────────────── */}
      <LogTransactionModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onTransactionCreated={handleTransactionCreated}
      />
    </div>
  );
}
