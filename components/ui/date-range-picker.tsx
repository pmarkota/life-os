"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import { format, parse, isValid } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";

// ─── Props ─────────────────────────────────────────

interface DateRangePickerProps {
  from: string | null;
  to: string | null;
  onChange: (from: string | null, to: string | null) => void;
  placeholder?: string;
  className?: string;
}

// ─── Component ─────────────────────────────────────

export function DateRangePicker({
  from,
  to,
  onChange,
  placeholder = "Select range",
  className = "",
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fromDate = from ? parseISO(from) : undefined;
  const toDate = to ? parseISO(to) : undefined;

  const selected: DateRange | undefined =
    fromDate || toDate ? { from: fromDate, to: toDate } : undefined;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const handleSelect = useCallback(
    (range: DateRange | undefined) => {
      const newFrom = range?.from ? toISODate(range.from) : null;
      const newTo = range?.to ? toISODate(range.to) : null;
      onChange(newFrom, newTo);
    },
    [onChange],
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange(null, null);
    },
    [onChange],
  );

  const hasValue = fromDate || toDate;
  const displayValue = formatRange(fromDate, toDate);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`
          flex items-center gap-2 h-9 w-full rounded-lg border px-3 py-1.5
          text-sm transition-all duration-200
          bg-[#09090B] border-[#27272A]
          hover:border-[#3F3F46]
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0EA5E9] focus-visible:ring-offset-2 focus-visible:ring-offset-[#18181B]
          ${hasValue ? "text-[#FAFAFA]" : "text-[#71717A]"}
        `}
      >
        <CalendarDays className="h-3.5 w-3.5 shrink-0 text-[#52525B]" />
        <span className="flex-1 text-left truncate text-xs">
          {displayValue ?? placeholder}
        </span>
        {hasValue && (
          <span
            role="button"
            tabIndex={0}
            onClick={handleClear}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleClear(e as unknown as React.MouseEvent);
              }
            }}
            className="shrink-0 p-0.5 rounded hover:bg-[#27272A] text-[#52525B] hover:text-[#A1A1AA] transition-colors duration-150"
          >
            <X className="h-3 w-3" />
          </span>
        )}
      </button>

      {/* Calendar popup */}
      {open && (
        <div
          className="absolute left-0 top-[calc(100%+4px)] z-[100] animate-in fade-in-0 zoom-in-95 duration-150"
          style={{ animationFillMode: "forwards" }}
        >
          <div className="rounded-xl border border-[#27272A] bg-[#18181B] shadow-[0_16px_48px_rgba(0,0,0,0.4)] p-3">
            <DayPicker
              mode="range"
              selected={selected}
              onSelect={handleSelect}
              defaultMonth={fromDate ?? new Date()}
              numberOfMonths={2}
              weekStartsOn={1}
              classNames={calendarClassNames}
              modifiersClassNames={modifiersClassNames}
              components={{
                Chevron: ({ orientation }) =>
                  orientation === "left" ? (
                    <ChevronLeft className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  ),
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────

function parseISO(str: string): Date | undefined {
  const d = parse(str.slice(0, 10), "yyyy-MM-dd", new Date());
  return isValid(d) ? d : undefined;
}

function toISODate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function formatRange(
  from: Date | undefined,
  to: Date | undefined,
): string | null {
  if (!from && !to) return null;
  const fmt = (d: Date) => format(d, "MMM d, yyyy");
  if (from && to) return `${fmt(from)} \u2014 ${fmt(to)}`;
  if (from) return `${fmt(from)} \u2014 ...`;
  if (to) return `... \u2014 ${fmt(to)}`;
  return null;
}

// ─── Calendar classNames (dark theme) ──────────────

const calendarClassNames = {
  root: "rdp-dark",
  months: "flex gap-6",
  month: "space-y-3",
  month_caption: "flex justify-center relative items-center h-8",
  caption_label: "text-sm font-semibold text-[#FAFAFA]",
  nav: "flex items-center justify-between absolute inset-x-0",
  button_previous:
    "inline-flex items-center justify-center h-7 w-7 rounded-md text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#27272A] transition-colors duration-150",
  button_next:
    "inline-flex items-center justify-center h-7 w-7 rounded-md text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#27272A] transition-colors duration-150",
  month_grid: "border-collapse",
  weekdays: "",
  weekday:
    "text-[11px] font-medium text-[#52525B] uppercase tracking-wider w-9 pb-2 text-center",
  week: "",
  day: "text-center p-0",
  day_button: `
    inline-flex items-center justify-center h-9 w-9 rounded-lg text-sm font-normal
    text-[#A1A1AA] transition-all duration-150
    hover:bg-[#27272A] hover:text-[#FAFAFA]
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0EA5E9]
    aria-disabled:opacity-30 aria-disabled:pointer-events-none
  `,
  outside: "text-[#3F3F46]",
  disabled: "text-[#27272A] pointer-events-none",
  hidden: "invisible",
};

const modifiersClassNames = {
  today:
    "!text-[#0EA5E9] font-semibold ring-1 ring-[#0EA5E9]/40 rounded-lg",
  selected:
    "!bg-[#0EA5E9] !text-white font-semibold rounded-lg hover:!bg-[#0EA5E9]",
  range_start:
    "!bg-[#0EA5E9] !text-white font-semibold rounded-lg",
  range_end:
    "!bg-[#0EA5E9] !text-white font-semibold rounded-lg",
  range_middle:
    "!bg-[#0EA5E9]/15 !text-[#0EA5E9] rounded-none",
};
