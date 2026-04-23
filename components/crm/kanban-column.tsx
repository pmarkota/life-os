"use client";

import { useDroppable, useDraggable } from "@dnd-kit/core";
import { AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { LeadCard } from "./lead-card";
import type { Lead, LeadStatus, Profile } from "@/types";

// ─── Status config ───────────────────────────────────
const STATUS_CONFIG: Record<LeadStatus, { label: string; color: string }> = {
  new: { label: "New", color: "#0EA5E9" },
  demo_built: { label: "Demo Built", color: "#8B5CF6" },
  contacted: { label: "Contacted", color: "#3B82F6" },
  replied: { label: "Replied", color: "#F59E0B" },
  call_booked: { label: "Call Booked", color: "#06B6D4" },
  follow_up: { label: "Follow-up", color: "#F97316" },
  won: { label: "Won", color: "#22C55E" },
  lost: { label: "Lost", color: "#EF4444" },
};

// ─── Draggable wrapper ───────────────────────────────
interface DraggableLeadProps {
  lead: Lead;
  onLeadClick: (lead: Lead) => void;
  salesPeople?: Profile[];
}

function DraggableLead({ lead, onLeadClick, salesPeople }: DraggableLeadProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: lead.id,
    data: { lead },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ opacity: isDragging ? 0.4 : 1 }}
    >
      <LeadCard
        lead={lead}
        isDragging={isDragging}
        salesPeople={salesPeople}
        onClick={() => {
          if (!isDragging) onLeadClick(lead);
        }}
      />
    </div>
  );
}

// ─── Column props ────────────────────────────────────
interface KanbanColumnProps {
  status: LeadStatus;
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  salesPeople?: Profile[];
}

export function KanbanColumn({ status, leads, onLeadClick, salesPeople }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const config = STATUS_CONFIG[status];

  return (
    <div
      className={cn(
        "flex h-full w-[280px] shrink-0 flex-col rounded-xl border transition-colors duration-150",
        isOver
          ? "border-[color:var(--col-color)] bg-[color:var(--col-color-bg)]"
          : "border-[#27272A] bg-[#09090B]",
      )}
      style={
        {
          "--col-color": config.color,
          "--col-color-bg": `${config.color}08`,
        } as React.CSSProperties
      }
    >
      {/* ── Column header ─────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-3 border-b border-[#27272A]">
        <span
          className="h-2 w-2 rounded-full shrink-0"
          style={{ backgroundColor: config.color }}
        />
        <span className="text-xs font-semibold text-[#FAFAFA] tracking-wide uppercase">
          {config.label}
        </span>
        <span className="ml-auto text-[10px] font-medium text-[#71717A] tabular-nums bg-[#27272A] rounded-md px-1.5 py-0.5">
          {leads.length}
        </span>
      </div>

      {/* ── Scrollable card area ──────────────────── */}
      <div
        ref={setNodeRef}
        className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[120px]"
      >
        <AnimatePresence mode="popLayout">
          {leads.length > 0 ? (
            leads.map((lead) => (
              <DraggableLead
                key={lead.id}
                lead={lead}
                onLeadClick={onLeadClick}
                salesPeople={salesPeople}
              />
            ))
          ) : (
            <div className="flex items-center justify-center h-20">
              <span className="text-xs text-[#71717A] select-none">
                No leads
              </span>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
