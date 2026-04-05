"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap,
  Plus,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronLeft,
  ChevronRight,
  X,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Checkbox from "@radix-ui/react-checkbox";
import { toast } from "sonner";
import {
  differenceInDays,
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addMonths,
  subMonths,
  isSameDay,
  isSameMonth,
  isToday,
  startOfWeek,
  endOfWeek,
  formatDistanceToNowStrict,
  isPast,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Deadline, DeadlineType, Priority } from "@/types";

// ─── Constants ─────────────────────────────────────
const GRADUATION_DATE = new Date("2026-06-30");

const TYPE_CONFIG: Record<DeadlineType, { label: string; color: string; bg: string }> = {
  exam: { label: "Exam", color: "#EF4444", bg: "rgba(239,68,68,0.12)" },
  project: { label: "Project", color: "#0EA5E9", bg: "rgba(14,165,233,0.12)" },
  assignment: { label: "Assignment", color: "#22C55E", bg: "rgba(34,197,94,0.12)" },
};

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string }> = {
  low: { label: "Low", color: "#71717A" },
  medium: { label: "Medium", color: "#F59E0B" },
  high: { label: "High", color: "#F97316" },
  critical: { label: "Critical", color: "#EF4444" },
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ─── Helpers ───────────────────────────────────────
function getDaysUntilGraduation(): number {
  return Math.max(0, differenceInDays(GRADUATION_DATE, new Date()));
}

function getCountdownLabel(dueDate: string): { text: string; isOverdue: boolean } {
  const due = new Date(dueDate + "T23:59:59");
  const now = new Date();

  if (isPast(due) && !isToday(due)) {
    const distance = formatDistanceToNowStrict(due, { addSuffix: false });
    return { text: `${distance} overdue`, isOverdue: true };
  }

  if (isToday(due)) {
    return { text: "Due today", isOverdue: false };
  }

  const days = differenceInDays(due, now);
  if (days === 1) return { text: "Tomorrow", isOverdue: false };
  if (days <= 7) return { text: `in ${days} days`, isOverdue: false };
  if (days <= 14) return { text: "in ~2 weeks", isOverdue: false };

  const distance = formatDistanceToNowStrict(due, { addSuffix: true });
  return { text: distance, isOverdue: false };
}

function isOverdue(deadline: Deadline): boolean {
  if (deadline.completed) return false;
  const due = new Date(deadline.due_date + "T23:59:59");
  return isPast(due) && !isToday(due);
}

function isDueThisWeek(deadline: Deadline): boolean {
  if (deadline.completed) return false;
  const due = new Date(deadline.due_date);
  const now = new Date();
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  return due >= now && due <= weekEnd;
}

// ─── Main Component ────────────────────────────────
export default function UniversityPage() {
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<Date | null>(null);

  // ── Fetch deadlines ───────────────────────────────
  const fetchDeadlines = useCallback(async () => {
    try {
      const res = await fetch("/api/university/deadlines?order=asc");
      if (!res.ok) throw new Error("Failed to fetch deadlines");
      const data: Deadline[] = await res.json();
      setDeadlines(data);
    } catch {
      toast.error("Failed to load deadlines");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeadlines();
  }, [fetchDeadlines]);

  // ── Toggle completed ──────────────────────────────
  const toggleCompleted = useCallback(
    async (deadline: Deadline) => {
      const newCompleted = !deadline.completed;

      // Optimistic update
      setDeadlines((prev) =>
        prev.map((d) =>
          d.id === deadline.id ? { ...d, completed: newCompleted } : d,
        ),
      );

      try {
        const res = await fetch(`/api/university/deadlines/${deadline.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ completed: newCompleted }),
        });

        if (!res.ok) throw new Error("Failed to update");

        const updated: Deadline = await res.json();
        setDeadlines((prev) =>
          prev.map((d) => (d.id === deadline.id ? updated : d)),
        );

        toast.success(
          newCompleted
            ? `"${deadline.title}" marked complete`
            : `"${deadline.title}" marked incomplete`,
        );
      } catch {
        // Revert
        setDeadlines((prev) =>
          prev.map((d) =>
            d.id === deadline.id ? { ...d, completed: !newCompleted } : d,
          ),
        );
        toast.error("Failed to update deadline");
      }
    },
    [],
  );

  // ── Delete deadline ───────────────────────────────
  const deleteDeadline = useCallback(
    async (deadline: Deadline) => {
      // Optimistic removal
      setDeadlines((prev) => prev.filter((d) => d.id !== deadline.id));

      try {
        const res = await fetch(`/api/university/deadlines/${deadline.id}`, {
          method: "DELETE",
        });

        if (!res.ok && res.status !== 204) throw new Error("Failed to delete");

        toast.success(`"${deadline.title}" deleted`);
      } catch {
        fetchDeadlines();
        toast.error("Failed to delete deadline");
      }
    },
    [fetchDeadlines],
  );

  // ── Computed lists ────────────────────────────────
  const { upcoming, completed, stats } = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const upcomingList = deadlines
      .filter((d) => !d.completed)
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

    const completedList = deadlines
      .filter((d) => d.completed)
      .sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime());

    const overdueCount = upcomingList.filter((d) => isOverdue(d)).length;
    const dueThisWeekCount = upcomingList.filter((d) => isDueThisWeek(d)).length;
    const completedThisMonth = deadlines.filter((d) => {
      if (!d.completed) return false;
      const dueDate = new Date(d.due_date);
      return dueDate >= monthStart && dueDate <= monthEnd;
    }).length;

    return {
      upcoming: upcomingList,
      completed: completedList,
      stats: {
        totalUpcoming: upcomingList.length,
        dueThisWeek: dueThisWeekCount,
        overdue: overdueCount,
        completedThisMonth,
      },
    };
  }, [deadlines]);

  // ── Calendar data ─────────────────────────────────
  const calendarDays = useMemo(() => {
    const monthStart_ = startOfMonth(calendarMonth);
    const monthEnd_ = endOfMonth(calendarMonth);
    const calStart = startOfWeek(monthStart_, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd_, { weekStartsOn: 1 });

    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [calendarMonth]);

  const deadlinesByDate = useMemo(() => {
    const map = new Map<string, Deadline[]>();
    for (const d of deadlines) {
      const key = d.due_date;
      const existing = map.get(key);
      if (existing) {
        existing.push(d);
      } else {
        map.set(key, [d]);
      }
    }
    return map;
  }, [deadlines]);

  const selectedDayDeadlines = useMemo(() => {
    if (!selectedCalendarDay) return [];
    const key = format(selectedCalendarDay, "yyyy-MM-dd");
    return deadlinesByDate.get(key) || [];
  }, [selectedCalendarDay, deadlinesByDate]);

  // ── Handle new deadline added ─────────────────────
  const handleDeadlineCreated = useCallback((newDeadline: Deadline) => {
    setDeadlines((prev) => [...prev, newDeadline]);
  }, []);

  // ── Days to graduation ────────────────────────────
  const daysLeft = getDaysUntilGraduation();

  // ── Loading skeleton ──────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div className="h-9 w-64 animate-pulse rounded-lg bg-[#18181B]" />
          <div className="h-10 w-36 animate-pulse rounded-lg bg-[#18181B]" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="col-span-2 h-96 animate-pulse rounded-xl bg-[#18181B]" />
          <div className="h-48 animate-pulse rounded-xl bg-[#18181B]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      {/* ─── Header ───────────────────────────────── */}
      <motion.div
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0EA5E9]/10">
            <GraduationCap className="h-6 w-6 text-[#0EA5E9]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#FAFAFA]">
              University Tracker
            </h1>
            <p className="text-sm text-[#A1A1AA]">
              Deadlines, exams, and final year countdown
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Graduation countdown badge */}
          <motion.div
            className="flex items-center gap-2 rounded-lg border border-[#27272A] bg-[#18181B] px-4 py-2"
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <div className="h-2 w-2 rounded-full bg-[#0EA5E9] animate-pulse" />
            <span className="text-sm font-semibold text-[#FAFAFA]">
              {daysLeft}
            </span>
            <span className="text-sm text-[#A1A1AA]">
              days until freedom
            </span>
          </motion.div>

          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Deadline
          </Button>
        </div>
      </motion.div>

      {/* ─── Row 1: Deadlines + Stats ─────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Upcoming Deadlines (2/3) */}
        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="border-[#27272A] bg-[#18181B]">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-base font-semibold text-[#FAFAFA]">
                Upcoming Deadlines
              </CardTitle>
              <button
                onClick={() => setShowCompleted((prev) => !prev)}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-[#A1A1AA] transition-colors hover:bg-[#27272A] hover:text-[#FAFAFA]"
              >
                {showCompleted ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
                {showCompleted ? "Hide" : "Show"} completed ({completed.length})
              </button>
            </CardHeader>
            <CardContent className="space-y-1 px-4 pb-4">
              {upcoming.length === 0 && !showCompleted && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CheckCircle2 className="mb-3 h-10 w-10 text-[#22C55E]/40" />
                  <p className="text-sm font-medium text-[#A1A1AA]">
                    All clear! No upcoming deadlines.
                  </p>
                </div>
              )}

              <AnimatePresence mode="popLayout">
                {upcoming.map((deadline) => (
                  <DeadlineRow
                    key={deadline.id}
                    deadline={deadline}
                    onToggle={toggleCompleted}
                    onDelete={deleteDeadline}
                  />
                ))}
              </AnimatePresence>

              {/* Completed section */}
              <AnimatePresence>
                {showCompleted && completed.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="my-3 flex items-center gap-3">
                      <div className="h-px flex-1 bg-[#27272A]" />
                      <span className="text-xs font-medium text-[#71717A]">
                        Completed
                      </span>
                      <div className="h-px flex-1 bg-[#27272A]" />
                    </div>
                    {completed.map((deadline) => (
                      <DeadlineRow
                        key={deadline.id}
                        deadline={deadline}
                        onToggle={toggleCompleted}
                        onDelete={deleteDeadline}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>

        {/* Right: Quick Stats (1/3) */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card className="border-[#27272A] bg-[#18181B]">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold text-[#FAFAFA]">
                Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <StatItem
                icon={<Calendar className="h-4 w-4" />}
                label="Total Upcoming"
                value={stats.totalUpcoming}
                color="#0EA5E9"
              />
              <StatItem
                icon={<Clock className="h-4 w-4" />}
                label="Due This Week"
                value={stats.dueThisWeek}
                color="#F59E0B"
              />
              <StatItem
                icon={<AlertTriangle className="h-4 w-4" />}
                label="Overdue"
                value={stats.overdue}
                color="#EF4444"
              />
              <StatItem
                icon={<CheckCircle2 className="h-4 w-4" />}
                label="Completed This Month"
                value={stats.completedThisMonth}
                color="#22C55E"
              />

              {/* Graduation progress */}
              <div className="mt-2 rounded-lg border border-[#27272A] bg-[#09090B] p-4">
                <div className="flex items-center justify-between text-xs text-[#A1A1AA]">
                  <span>Graduation Progress</span>
                  <span className="font-semibold text-[#0EA5E9]">
                    {Math.round(
                      ((365 - Math.min(daysLeft, 365)) / 365) * 100,
                    )}
                    %
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#27272A]">
                  <motion.div
                    className="h-full rounded-full bg-[#0EA5E9]"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${Math.round(
                        ((365 - Math.min(daysLeft, 365)) / 365) * 100,
                      )}%`,
                    }}
                    transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
                  />
                </div>
                <p className="mt-2 text-center text-xs text-[#71717A]">
                  June 30, 2026
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ─── Row 2: Calendar ──────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <Card className="border-[#27272A] bg-[#18181B]">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-base font-semibold text-[#FAFAFA]">
              Calendar
            </CardTitle>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCalendarMonth((m) => subMonths(m, 1))}
                className="rounded-md p-1.5 text-[#A1A1AA] transition-colors hover:bg-[#27272A] hover:text-[#FAFAFA]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-[140px] text-center text-sm font-medium text-[#FAFAFA]">
                {format(calendarMonth, "MMMM yyyy")}
              </span>
              <button
                onClick={() => setCalendarMonth((m) => addMonths(m, 1))}
                className="rounded-md p-1.5 text-[#A1A1AA] transition-colors hover:bg-[#27272A] hover:text-[#FAFAFA]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
              {/* Calendar grid */}
              <div>
                {/* Weekday headers */}
                <div className="mb-2 grid grid-cols-7 gap-1">
                  {WEEKDAYS.map((day) => (
                    <div
                      key={day}
                      className="py-2 text-center text-xs font-medium text-[#71717A]"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Day cells */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day) => {
                    const dateKey = format(day, "yyyy-MM-dd");
                    const dayDeadlines = deadlinesByDate.get(dateKey) || [];
                    const inMonth = isSameMonth(day, calendarMonth);
                    const today = isToday(day);
                    const isSelected =
                      selectedCalendarDay && isSameDay(day, selectedCalendarDay);

                    return (
                      <button
                        key={dateKey}
                        onClick={() =>
                          setSelectedCalendarDay(
                            isSelected ? null : day,
                          )
                        }
                        className={`
                          relative flex h-12 flex-col items-center justify-start rounded-lg p-1 text-xs transition-all duration-150
                          ${inMonth ? "text-[#FAFAFA]" : "text-[#3F3F46]"}
                          ${today ? "ring-1 ring-[#0EA5E9]/50" : ""}
                          ${isSelected ? "bg-[#0EA5E9]/15 ring-1 ring-[#0EA5E9]" : "hover:bg-[#27272A]/60"}
                        `}
                      >
                        <span
                          className={`
                            flex h-6 w-6 items-center justify-center rounded-md text-xs font-medium
                            ${today ? "bg-[#0EA5E9] text-white" : ""}
                          `}
                        >
                          {format(day, "d")}
                        </span>
                        {/* Deadline dots */}
                        {dayDeadlines.length > 0 && (
                          <div className="mt-0.5 flex gap-0.5">
                            {dayDeadlines.slice(0, 3).map((dl) => (
                              <div
                                key={dl.id}
                                className="h-1 w-1 rounded-full"
                                style={{
                                  backgroundColor: dl.completed
                                    ? "#71717A"
                                    : PRIORITY_CONFIG[dl.priority].color,
                                }}
                              />
                            ))}
                            {dayDeadlines.length > 3 && (
                              <span className="text-[8px] leading-none text-[#71717A]">
                                +{dayDeadlines.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected day panel */}
              <div className="rounded-lg border border-[#27272A] bg-[#09090B] p-4">
                {selectedCalendarDay ? (
                  <>
                    <h3 className="mb-3 text-sm font-semibold text-[#FAFAFA]">
                      {format(selectedCalendarDay, "EEEE, MMMM d")}
                    </h3>
                    {selectedDayDeadlines.length === 0 ? (
                      <p className="text-xs text-[#71717A]">
                        No deadlines on this day.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {selectedDayDeadlines.map((dl) => (
                          <div
                            key={dl.id}
                            className="flex items-center gap-2 rounded-md border border-[#27272A] bg-[#18181B] px-3 py-2"
                          >
                            <div
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{
                                backgroundColor: dl.completed
                                  ? "#71717A"
                                  : PRIORITY_CONFIG[dl.priority].color,
                              }}
                            />
                            <div className="min-w-0 flex-1">
                              <p
                                className={`truncate text-xs font-medium ${
                                  dl.completed
                                    ? "text-[#71717A] line-through"
                                    : "text-[#FAFAFA]"
                                }`}
                              >
                                {dl.title}
                              </p>
                              {dl.course && (
                                <p className="truncate text-[10px] text-[#71717A]">
                                  {dl.course}
                                </p>
                              )}
                            </div>
                            {dl.type && (
                              <span
                                className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium"
                                style={{
                                  color: TYPE_CONFIG[dl.type].color,
                                  backgroundColor: TYPE_CONFIG[dl.type].bg,
                                }}
                              >
                                {TYPE_CONFIG[dl.type].label}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center py-8 text-center">
                    <Calendar className="mb-2 h-8 w-8 text-[#27272A]" />
                    <p className="text-xs text-[#71717A]">
                      Click a day to see deadlines
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Add Deadline Modal ───────────────────── */}
      <AddDeadlineModal
        open={addOpen}
        onOpenChange={setAddOpen}
        onDeadlineCreated={handleDeadlineCreated}
        existingCourses={[
          ...new Set(
            deadlines
              .map((d) => d.course)
              .filter((c): c is string => c !== null && c !== ""),
          ),
        ]}
      />
    </div>
  );
}

// ─── Deadline Row ──────────────────────────────────
function DeadlineRow({
  deadline,
  onToggle,
  onDelete,
}: {
  deadline: Deadline;
  onToggle: (d: Deadline) => void;
  onDelete: (d: Deadline) => void;
}) {
  const countdown = getCountdownLabel(deadline.due_date);
  const priorityConfig = PRIORITY_CONFIG[deadline.priority];
  const typeConfig = deadline.type ? TYPE_CONFIG[deadline.type] : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
      transition={{ duration: 0.25 }}
      className={`
        group flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors duration-150
        ${
          deadline.completed
            ? "border-[#27272A]/50 bg-[#09090B]/50"
            : "border-[#27272A] bg-[#09090B] hover:border-[#3F3F46]"
        }
      `}
    >
      {/* Checkbox */}
      <Checkbox.Root
        checked={deadline.completed}
        onCheckedChange={() => onToggle(deadline)}
        className={`
          flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all duration-150
          ${
            deadline.completed
              ? "border-[#22C55E] bg-[#22C55E]"
              : "border-[#3F3F46] hover:border-[#A1A1AA]"
          }
        `}
      >
        <Checkbox.Indicator>
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            className="text-white"
          >
            <path
              d="M2 6L5 9L10 3"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Checkbox.Indicator>
      </Checkbox.Root>

      {/* Priority indicator */}
      <div className="relative flex shrink-0 items-center justify-center">
        <div
          className={`h-2 w-2 rounded-full ${
            deadline.priority === "critical" && !deadline.completed
              ? "animate-pulse"
              : ""
          }`}
          style={{
            backgroundColor: deadline.completed
              ? "#3F3F46"
              : priorityConfig.color,
          }}
        />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={`truncate text-sm font-medium ${
              deadline.completed
                ? "text-[#71717A] line-through"
                : "text-[#FAFAFA]"
            }`}
          >
            {deadline.title}
          </span>
          {typeConfig && (
            <span
              className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
              style={{
                color: deadline.completed ? "#71717A" : typeConfig.color,
                backgroundColor: deadline.completed
                  ? "rgba(113,113,122,0.1)"
                  : typeConfig.bg,
              }}
            >
              {typeConfig.label}
            </span>
          )}
        </div>
        {deadline.course && (
          <p
            className={`mt-0.5 truncate text-xs ${
              deadline.completed ? "text-[#3F3F46]" : "text-[#71717A]"
            }`}
          >
            {deadline.course}
          </p>
        )}
      </div>

      {/* Due date + countdown */}
      <div className="hidden shrink-0 text-right sm:block">
        <p
          className={`text-xs font-medium ${
            deadline.completed
              ? "text-[#3F3F46]"
              : countdown.isOverdue
                ? "text-[#EF4444]"
                : "text-[#A1A1AA]"
          }`}
        >
          {deadline.completed
            ? format(new Date(deadline.due_date), "MMM d")
            : countdown.isOverdue
              ? "OVERDUE"
              : countdown.text}
        </p>
        {!deadline.completed && (
          <p className="mt-0.5 text-[10px] text-[#71717A]">
            {format(new Date(deadline.due_date), "MMM d, yyyy")}
          </p>
        )}
      </div>

      {/* Delete button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(deadline);
        }}
        className="shrink-0 rounded-md p-1.5 text-[#3F3F46] opacity-0 transition-all duration-150 hover:bg-[#27272A] hover:text-[#EF4444] group-hover:opacity-100"
        aria-label="Delete deadline"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  );
}

// ─── Stat Item ─────────────────────────────────────
function StatItem({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color}15` }}
        >
          <span style={{ color }}>{icon}</span>
        </div>
        <span className="text-sm text-[#A1A1AA]">{label}</span>
      </div>
      <span className="text-lg font-bold text-[#FAFAFA]">{value}</span>
    </div>
  );
}

// ─── Add Deadline Modal ────────────────────────────
interface AddDeadlineModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeadlineCreated: (deadline: Deadline) => void;
  existingCourses: string[];
}

interface DeadlineFormData {
  title: string;
  type: DeadlineType | "";
  course: string;
  due_date: string;
  priority: Priority;
  notes: string;
}

const INITIAL_FORM: DeadlineFormData = {
  title: "",
  type: "",
  course: "",
  due_date: "",
  priority: "medium",
  notes: "",
};

function AddDeadlineModal({
  open,
  onOpenChange,
  onDeadlineCreated,
  existingCourses,
}: AddDeadlineModalProps) {
  const [form, setForm] = useState<DeadlineFormData>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredCourses = useMemo(() => {
    if (!form.course.trim()) return existingCourses;
    return existingCourses.filter((c) =>
      c.toLowerCase().includes(form.course.toLowerCase()),
    );
  }, [form.course, existingCourses]);

  function updateField<K extends keyof DeadlineFormData>(
    key: K,
    value: DeadlineFormData[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function resetForm() {
    setForm(INITIAL_FORM);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }

    if (!form.due_date) {
      toast.error("Due date is required");
      return;
    }

    setSubmitting(true);

    const payload: Record<string, string | null> = {
      title: form.title.trim(),
      due_date: form.due_date,
      priority: form.priority,
      type: form.type || null,
      course: form.course.trim() || null,
      notes: form.notes.trim() || null,
    };

    try {
      const res = await fetch("/api/university/deadlines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(
          (errBody as { error?: string } | null)?.error ??
            "Failed to create deadline",
        );
      }

      const created: Deadline = await res.json();
      onDeadlineCreated(created);
      resetForm();
      onOpenChange(false);
      toast.success(`"${created.title}" added`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create deadline",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </Dialog.Overlay>

            <Dialog.Content
              asChild
              onPointerDownOutside={() => onOpenChange(false)}
              onEscapeKeyDown={() => onOpenChange(false)}
            >
              <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => onOpenChange(false)}
              >
                <motion.div
                  className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-xl border border-[#27272A] bg-[#18181B] shadow-2xl"
                  initial={{ scale: 0.95, y: 12 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.95, y: 12 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#27272A] bg-[#18181B] px-6 py-4">
                    <Dialog.Title className="text-lg font-bold tracking-tight text-[#FAFAFA]">
                      Add Deadline
                    </Dialog.Title>
                    <Dialog.Close asChild>
                      <button
                        className="rounded-lg p-1.5 text-[#71717A] transition-colors duration-150 hover:bg-[#27272A] hover:text-[#FAFAFA]"
                        aria-label="Close"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </Dialog.Close>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
                    {/* Title */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium uppercase tracking-wide text-[#71717A]">
                        Title <span className="text-[#EF4444]">*</span>
                      </Label>
                      <Input
                        value={form.title}
                        onChange={(e) => updateField("title", e.target.value)}
                        placeholder="e.g. Final Exam - Databases"
                        required
                        className="border-[#27272A] bg-[#09090B] text-[#FAFAFA] placeholder:text-[#71717A] focus-visible:ring-[#0EA5E9] focus-visible:ring-offset-[#18181B]"
                      />
                    </div>

                    {/* Type — 3 buttons */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium uppercase tracking-wide text-[#71717A]">
                        Type
                      </Label>
                      <div className="flex gap-2">
                        {(["exam", "project", "assignment"] as const).map(
                          (t) => {
                            const cfg = TYPE_CONFIG[t];
                            const active = form.type === t;
                            return (
                              <button
                                key={t}
                                type="button"
                                onClick={() =>
                                  updateField("type", active ? "" : t)
                                }
                                className={`
                                  flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition-all duration-150
                                  ${
                                    active
                                      ? "border-transparent"
                                      : "border-[#27272A] text-[#A1A1AA] hover:border-[#3F3F46] hover:text-[#FAFAFA]"
                                  }
                                `}
                                style={
                                  active
                                    ? {
                                        color: cfg.color,
                                        backgroundColor: cfg.bg,
                                      }
                                    : {}
                                }
                              >
                                {cfg.label}
                              </button>
                            );
                          },
                        )}
                      </div>
                    </div>

                    {/* Course */}
                    <div className="relative space-y-1.5">
                      <Label className="text-xs font-medium uppercase tracking-wide text-[#71717A]">
                        Course
                      </Label>
                      <Input
                        value={form.course}
                        onChange={(e) => {
                          updateField("course", e.target.value);
                          setShowSuggestions(true);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={() =>
                          // Delay to allow click on suggestion
                          setTimeout(() => setShowSuggestions(false), 150)
                        }
                        placeholder="e.g. Baze podataka"
                        className="border-[#27272A] bg-[#09090B] text-[#FAFAFA] placeholder:text-[#71717A] focus-visible:ring-[#0EA5E9] focus-visible:ring-offset-[#18181B]"
                      />
                      {/* Course suggestions */}
                      {showSuggestions && filteredCourses.length > 0 && (
                        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-32 overflow-y-auto rounded-lg border border-[#27272A] bg-[#09090B] py-1 shadow-lg">
                          {filteredCourses.map((c) => (
                            <button
                              key={c}
                              type="button"
                              onMouseDown={() => {
                                updateField("course", c);
                                setShowSuggestions(false);
                              }}
                              className="block w-full px-3 py-1.5 text-left text-xs text-[#A1A1AA] transition-colors hover:bg-[#18181B] hover:text-[#FAFAFA]"
                            >
                              {c}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Due date */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium uppercase tracking-wide text-[#71717A]">
                        Due Date <span className="text-[#EF4444]">*</span>
                      </Label>
                      <Input
                        type="date"
                        value={form.due_date}
                        onChange={(e) =>
                          updateField("due_date", e.target.value)
                        }
                        required
                        className="border-[#27272A] bg-[#09090B] text-[#FAFAFA] focus-visible:ring-[#0EA5E9] focus-visible:ring-offset-[#18181B] [color-scheme:dark]"
                      />
                    </div>

                    {/* Priority — 4 buttons */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium uppercase tracking-wide text-[#71717A]">
                        Priority
                      </Label>
                      <div className="flex gap-2">
                        {(
                          ["low", "medium", "high", "critical"] as const
                        ).map((p) => {
                          const cfg = PRIORITY_CONFIG[p];
                          const active = form.priority === p;
                          return (
                            <button
                              key={p}
                              type="button"
                              onClick={() => updateField("priority", p)}
                              className={`
                                flex-1 rounded-lg border px-3 py-2 text-xs font-semibold capitalize transition-all duration-150
                                ${
                                  active
                                    ? "border-transparent"
                                    : "border-[#27272A] text-[#A1A1AA] hover:border-[#3F3F46] hover:text-[#FAFAFA]"
                                }
                              `}
                              style={
                                active
                                  ? {
                                      color: cfg.color,
                                      backgroundColor: `${cfg.color}18`,
                                    }
                                  : {}
                              }
                            >
                              {cfg.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium uppercase tracking-wide text-[#71717A]">
                        Notes
                      </Label>
                      <textarea
                        value={form.notes}
                        onChange={(e) =>
                          updateField("notes", e.target.value)
                        }
                        placeholder="Study resources, topics to cover..."
                        rows={3}
                        className="flex w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3 py-2 text-sm text-[#FAFAFA] placeholder:text-[#71717A] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0EA5E9] focus-visible:ring-offset-2 focus-visible:ring-offset-[#18181B]"
                      />
                    </div>

                    {/* Submit */}
                    <div className="flex justify-end gap-3 border-t border-[#27272A] pt-4">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="text-[#A1A1AA]"
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={submitting}>
                        {submitting ? "Adding..." : "Add Deadline"}
                      </Button>
                    </div>
                  </form>
                </motion.div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
