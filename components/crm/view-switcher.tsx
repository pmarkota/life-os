"use client";

import { motion } from "framer-motion";
import { LayoutGrid, Table2, AlertTriangle, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────
export type CrmView = "board" | "table" | "needs-action" | "won";

interface ViewSwitcherProps {
  currentView: CrmView;
  onViewChange: (view: CrmView) => void;
  leadCounts: Record<CrmView, number>;
}

// ─── View definitions ───────────────────────────────
const VIEWS: { id: CrmView; label: string; icon: typeof LayoutGrid }[] = [
  { id: "board", label: "Board", icon: LayoutGrid },
  { id: "table", label: "Table", icon: Table2 },
  { id: "needs-action", label: "Needs Action", icon: AlertTriangle },
  { id: "won", label: "Won", icon: Trophy },
];

export function ViewSwitcher({
  currentView,
  onViewChange,
  leadCounts,
}: ViewSwitcherProps) {
  return (
    <div className="flex items-center gap-1 border-b border-[#27272A] pb-px">
      {VIEWS.map(({ id, label, icon: Icon }) => {
        const isActive = currentView === id;
        const count = leadCounts[id];

        return (
          <button
            key={id}
            onClick={() => onViewChange(id)}
            className={cn(
              "relative flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors duration-150",
              "rounded-t-md hover:bg-[#1E1E22]",
              isActive ? "text-[#FAFAFA]" : "text-[#71717A] hover:text-[#A1A1AA]",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{label}</span>

            {count > 0 && (
              <span
                className={cn(
                  "ml-0.5 min-w-[18px] rounded-full px-1.5 py-px text-[10px] font-semibold tabular-nums text-center",
                  isActive
                    ? "bg-[#0EA5E9]/15 text-[#0EA5E9]"
                    : "bg-[#27272A] text-[#71717A]",
                )}
              >
                {count}
              </span>
            )}

            {/* Active underline indicator */}
            {isActive && (
              <motion.div
                layoutId="crm-view-underline"
                className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-[#0EA5E9] rounded-full"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
