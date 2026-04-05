"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { DayPicker } from "react-day-picker";
import { format, parse, isValid } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

// ─── Props ─────────────────────────────────────────

interface DatePickerProps {
  value: string | null;
  onChange: (date: string | null) => void;
  placeholder?: string;
  className?: string;
}

// ─── Component ─────────────────────────────────────

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  className = "",
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse the string value into a Date for DayPicker
  const selectedDate = value ? parseISO(value) : undefined;

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
    (date: Date | undefined) => {
      if (date) {
        onChange(toISODate(date));
      } else {
        onChange(null);
      }
      setOpen(false);
    },
    [onChange],
  );

  const displayValue = selectedDate
    ? format(selectedDate, "MMM d, yyyy")
    : null;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`
          flex items-center gap-2 h-10 w-full rounded-lg border px-3 py-2
          text-sm transition-all duration-200
          bg-[#09090B] border-[#27272A]
          hover:border-[#3F3F46]
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0EA5E9] focus-visible:ring-offset-2 focus-visible:ring-offset-[#18181B]
          ${displayValue ? "text-[#FAFAFA]" : "text-[#71717A]"}
        `}
      >
        <CalendarDays className="h-4 w-4 shrink-0 text-[#52525B]" />
        <span className="flex-1 text-left truncate">
          {displayValue ?? placeholder}
        </span>
      </button>

      {/* Calendar popup */}
      {open && (
        <div
          className="absolute left-0 top-[calc(100%+4px)] z-[100] animate-in fade-in-0 zoom-in-95 duration-150"
          style={{ animationFillMode: "forwards" }}
        >
          <div className="rounded-xl border border-[#27272A] bg-[#18181B] shadow-[0_16px_48px_rgba(0,0,0,0.4)] p-3">
            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={handleSelect}
              defaultMonth={selectedDate ?? new Date()}
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
  // Handle YYYY-MM-DD format
  const d = parse(str.slice(0, 10), "yyyy-MM-dd", new Date());
  return isValid(d) ? d : undefined;
}

function toISODate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

// ─── Calendar classNames (dark theme) ──────────────

const calendarClassNames = {
  root: "rdp-dark",
  months: "flex gap-4",
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
};
