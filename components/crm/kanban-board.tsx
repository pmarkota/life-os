"use client";

import { useCallback, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { KanbanColumn } from "./kanban-column";
import { LeadCard } from "./lead-card";
import type { Lead, LeadStatus } from "@/types";

// ─── Pipeline column order ───────────────────────────
const PIPELINE_COLUMNS: LeadStatus[] = [
  "new",
  "contacted",
  "demo_built",
  "replied",
  "call_booked",
  "follow_up",
  "won",
  "lost",
];

// ─── Props ───────────────────────────────────────────
interface KanbanBoardProps {
  leads: Lead[];
  onLeadMove: (leadId: string, newStatus: LeadStatus) => void;
  onLeadClick: (lead: Lead) => void;
}

export function KanbanBoard({ leads, onLeadMove, onLeadClick }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  // Pointer sensor with distance constraint so clicks don't trigger drags
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  // Group leads by status
  const leadsByStatus = useMemo(() => {
    const grouped: Record<LeadStatus, Lead[]> = {
      new: [],
      demo_built: [],
      contacted: [],
      replied: [],
      call_booked: [],
      follow_up: [],
      won: [],
      lost: [],
    };
    for (const lead of leads) {
      if (grouped[lead.status]) {
        grouped[lead.status].push(lead);
      }
    }
    return grouped;
  }, [leads]);

  // Find active lead for drag overlay
  const activeLead = useMemo(() => {
    if (!activeId) return null;
    return leads.find((l) => l.id === activeId) ?? null;
  }, [activeId, leads]);

  // ── Drag handlers ──────────────────────────────────
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);

      const { active, over } = event;
      if (!over) return;

      const leadId = String(active.id);
      const targetStatus = String(over.id) as LeadStatus;

      // Only fire if dropped on a different column
      const currentLead = leads.find((l) => l.id === leadId);
      if (currentLead && currentLead.status !== targetStatus) {
        // Verify it's a valid status column
        if (PIPELINE_COLUMNS.includes(targetStatus)) {
          onLeadMove(leadId, targetStatus);
        }
      }
    },
    [leads, onLeadMove],
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex gap-3 overflow-x-auto pb-4 h-full min-h-0">
        {PIPELINE_COLUMNS.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            leads={leadsByStatus[status]}
            onLeadClick={onLeadClick}
          />
        ))}
      </div>

      {/* ── Drag overlay (floating card) ────────── */}
      <DragOverlay dropAnimation={null}>
        {activeLead ? (
          <div
            className="w-[280px] rotate-[2deg] scale-105"
            style={{ pointerEvents: "none" }}
          >
            <LeadCard lead={activeLead} isDragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
