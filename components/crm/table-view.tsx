"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Mail,
  Phone,
  Camera,
  MessageCircle,
  Globe,
  User,
  UserCircle,
  Users,
  Download,
  ArrowRightLeft,
  X,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Lead, LeadStatus, LeadNiche, LeadChannel, LeadMarket, Profile } from "@/types";

// ─── Status config ──────────────────────────────────
const STATUS_CONFIG: Record<LeadStatus, { label: string; color: string }> = {
  new: { label: "New", color: "#0EA5E9" },
  demo_built: { label: "Demo Built", color: "#8B5CF6" },
  contacted: { label: "Contacted", color: "#A78BFA" },
  replied: { label: "Replied", color: "#06B6D4" },
  call_booked: { label: "Call Booked", color: "#F59E0B" },
  follow_up: { label: "Follow-up", color: "#FB923C" },
  won: { label: "Won", color: "#22C55E" },
  lost: { label: "Lost", color: "#EF4444" },
};

// ─── Niche config ───────────────────────────────────
const NICHE_CONFIG: Record<LeadNiche, { label: string; color: string }> = {
  dental: { label: "Dental", color: "#0EA5E9" },
  frizer: { label: "Frizer", color: "#EC4899" },
  restoran: { label: "Restoran", color: "#F59E0B" },
  autoservis: { label: "Autoservis", color: "#71717A" },
  fizioterapija: { label: "Fizioterapija", color: "#10B981" },
  wellness: { label: "Wellness", color: "#06B6D4" },
  fitness: { label: "Fitness", color: "#EF4444" },
  apartmani: { label: "Apartmani", color: "#A855F7" },
  kozmetika: { label: "Kozmetika", color: "#F472B6" },
  pekara: { label: "Pekara", color: "#FB923C" },
  ostalo: { label: "Ostalo", color: "#71717A" },
};

// ─── Market config ──────────────────────────────────
const MARKET_CONFIG: Record<LeadMarket, { label: string; color: string }> = {
  hr: { label: "HR", color: "#22C55E" },
  dach: { label: "DACH", color: "#0EA5E9" },
  us: { label: "US", color: "#FB923C" },
  uk: { label: "UK", color: "#8B5CF6" },
};

// ─── Channel config ─────────────────────────────────
const CHANNEL_CONFIG: Record<LeadChannel, { label: string; icon: typeof Mail }> = {
  instagram_dm: { label: "Instagram", icon: Camera },
  email: { label: "Email", icon: Mail },
  linkedin: { label: "LinkedIn", icon: Globe },
  telefon: { label: "Telefon", icon: Phone },
  whatsapp: { label: "WhatsApp", icon: MessageCircle },
  osobno: { label: "Osobno", icon: User },
};

// ─── Column definitions ─────────────────────────────
type SortField =
  | "business_name"
  | "status"
  | "niche"
  | "location"
  | "market"
  | "channel"
  | "email"
  | "phone"
  | "instagram"
  | "first_contact"
  | "last_contacted_at"
  | "next_follow_up"
  | "page_speed"
  | "notes"
  | "assigned_to";

interface Column {
  key: SortField;
  label: string;
  width: string;
  sticky?: boolean;
}

const COLUMNS: Column[] = [
  { key: "business_name", label: "Business Name", width: "min-w-[200px]", sticky: true },
  { key: "status", label: "Status", width: "min-w-[130px]" },
  { key: "assigned_to", label: "Assigned", width: "min-w-[160px]" },
  { key: "niche", label: "Niche", width: "min-w-[120px]" },
  { key: "location", label: "Location", width: "min-w-[120px]" },
  { key: "market", label: "Market", width: "min-w-[80px]" },
  { key: "channel", label: "Channel", width: "min-w-[120px]" },
  { key: "email", label: "Email", width: "min-w-[200px]" },
  { key: "phone", label: "Phone", width: "min-w-[140px]" },
  { key: "instagram", label: "Instagram", width: "min-w-[150px]" },
  { key: "first_contact", label: "First Contact", width: "min-w-[120px]" },
  { key: "last_contacted_at", label: "Last Contact", width: "min-w-[120px]" },
  { key: "next_follow_up", label: "Follow-up", width: "min-w-[120px]" },
  { key: "page_speed", label: "Page Speed", width: "min-w-[100px]" },
  { key: "notes", label: "Notes", width: "min-w-[200px]" },
];

// ─── Helpers ────────────────────────────────────────
function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getLeadValue(lead: Lead, field: SortField): string | number | null {
  switch (field) {
    case "business_name":
      return lead.business_name;
    case "status":
      return lead.status;
    case "niche":
      return lead.niche;
    case "location":
      return lead.location;
    case "market":
      return lead.market;
    case "channel":
      return lead.channel;
    case "email":
      return lead.email;
    case "phone":
      return lead.phone;
    case "instagram":
      return lead.instagram;
    case "first_contact":
      return lead.first_contact;
    case "last_contacted_at":
      return lead.last_contacted_at;
    case "next_follow_up":
      return lead.next_follow_up;
    case "page_speed":
      return lead.page_speed;
    case "notes":
      return lead.notes;
    case "assigned_to":
      return lead.assigned_to;
    default:
      return null;
  }
}

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ─── Props ──────────────────────────────────────────
interface TableViewProps {
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  onLeadUpdate: (lead: Lead) => void;
  onBulkMove?: (leadIds: string[], newStatus: LeadStatus) => Promise<void>;
  profile?: Profile | null;
  salesPeople?: Profile[];
  onBulkAssignComplete?: () => void;
}

// ─── CSV Export helper ─────────────────────────────
function exportLeadsCsv(leads: Lead[]) {
  const headers = [
    "Business Name",
    "Status",
    "Niche",
    "Location",
    "Market",
    "Channel",
    "Email",
    "Phone",
    "Instagram",
    "First Contact",
    "Last Contact",
    "Follow-up",
    "Page Speed",
    "Notes",
  ];

  const escCsv = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined) return "";
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = leads.map((l) => [
    escCsv(l.business_name),
    escCsv(l.status),
    escCsv(l.niche),
    escCsv(l.location),
    escCsv(l.market),
    escCsv(l.channel),
    escCsv(l.email),
    escCsv(l.phone),
    escCsv(l.instagram),
    escCsv(l.first_contact),
    escCsv(l.last_contacted_at),
    escCsv(l.next_follow_up),
    escCsv(l.page_speed),
    escCsv(l.notes),
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const today = new Date().toISOString().split("T")[0];
  anchor.href = url;
  anchor.download = `leads-export-${today}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

// ─── Component ──────────────────────────────────────
export function TableView({
  leads,
  onLeadClick,
  onLeadUpdate,
  onBulkMove,
  profile,
  salesPeople,
  onBulkAssignComplete,
}: TableViewProps) {
  const [sortField, setSortField] = useState<SortField>("business_name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [moveDropdownOpen, setMoveDropdownOpen] = useState(false);
  const [bulkMoving, setBulkMoving] = useState(false);
  const [assignDropdownOpen, setAssignDropdownOpen] = useState(false);
  const [bulkAssigning, setBulkAssigning] = useState(false);
  const moveDropdownRef = useRef<HTMLDivElement>(null);
  const assignDropdownRef = useRef<HTMLDivElement>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const isAdmin = profile?.role === "admin";

  // Sales people plus admins — all assignable
  const assignableUsers = useMemo(() => {
    if (!salesPeople) return [];
    return salesPeople.filter((p) => p.role === "sales" || p.role === "admin");
  }, [salesPeople]);

  // Toggle sort column
  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDir("asc");
      }
    },
    [sortField],
  );

  // Sorted leads (must be before selection handlers that reference it)
  const sortedLeads = useMemo(() => {
    return [...leads].sort((a, b) => {
      const aVal = getLeadValue(a, sortField);
      const bVal = getLeadValue(b, sortField);

      // Nulls always go to end
      if (aVal === null && bVal === null) return 0;
      if (aVal === null) return 1;
      if (bVal === null) return -1;

      let comparison = 0;
      if (typeof aVal === "number" && typeof bVal === "number") {
        comparison = aVal - bVal;
      } else {
        comparison = String(aVal).localeCompare(String(bVal));
      }

      return sortDir === "asc" ? comparison : -comparison;
    });
  }, [leads, sortField, sortDir]);

  // ── Selection handlers ───────────────────────────
  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === sortedLeads.length) return new Set();
      return new Set(sortedLeads.map((l) => l.id));
    });
  }, [sortedLeads]);

  const toggleSelectOne = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setLastSelectedIndex(null);
    setMoveDropdownOpen(false);
  }, []);

  // ── Advanced selection: Shift+Click range, Ctrl/Cmd+Click toggle ──
  const handleRowSelect = useCallback(
    (index: number, event: React.MouseEvent) => {
      if (event.shiftKey && lastSelectedIndex !== null) {
        // Range select: select all between lastSelectedIndex and current
        const start = Math.min(lastSelectedIndex, index);
        const end = Math.max(lastSelectedIndex, index);
        const rangeIds = sortedLeads.slice(start, end + 1).map((l) => l.id);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          rangeIds.forEach((id) => next.add(id));
          return next;
        });
      } else if (event.metaKey || event.ctrlKey) {
        // Toggle single without clearing others
        toggleSelectOne(sortedLeads[index].id);
      } else {
        // Normal click: select only this one
        setSelectedIds(new Set([sortedLeads[index].id]));
      }
      setLastSelectedIndex(index);
    },
    [lastSelectedIndex, sortedLeads, toggleSelectOne],
  );

  // ── Ctrl/Cmd+A to select all visible leads ──
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "a") {
        // Only intercept if no input/textarea is focused
        const activeEl = document.activeElement;
        const isInputFocused =
          activeEl instanceof HTMLInputElement ||
          activeEl instanceof HTMLTextAreaElement ||
          (activeEl instanceof HTMLElement && activeEl.isContentEditable);

        if (!isInputFocused) {
          e.preventDefault();
          setSelectedIds(new Set(sortedLeads.map((l) => l.id)));
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [sortedLeads]);

  const handleBulkMove = useCallback(
    async (status: LeadStatus) => {
      if (!onBulkMove || selectedIds.size === 0) return;
      setBulkMoving(true);
      setMoveDropdownOpen(false);
      try {
        await onBulkMove(Array.from(selectedIds), status);
        clearSelection();
      } finally {
        setBulkMoving(false);
      }
    },
    [onBulkMove, selectedIds, clearSelection],
  );

  const handleBulkAssign = useCallback(
    async (assignedTo: string | null) => {
      if (!isAdmin || selectedIds.size === 0) return;
      setBulkAssigning(true);
      setAssignDropdownOpen(false);
      const ids = Array.from(selectedIds);
      try {
        const res = await fetch("/api/leads/bulk-assign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lead_ids: ids, assigned_to: assignedTo }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error ?? "Failed to assign leads");
        }
        toast.success(
          `Assigned ${ids.length} lead${ids.length !== 1 ? "s" : ""}`,
        );
        clearSelection();
        onBulkAssignComplete?.();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to assign leads");
      } finally {
        setBulkAssigning(false);
      }
    },
    [isAdmin, selectedIds, clearSelection, onBulkAssignComplete],
  );

  const handleExportCsv = useCallback(() => {
    const selected = leads.filter((l) => selectedIds.has(l.id));
    exportLeadsCsv(selected);
  }, [leads, selectedIds]);

  const isAllSelected = sortedLeads.length > 0 && selectedIds.size === sortedLeads.length;
  const hasSelection = selectedIds.size > 0;

  // Sort icon for header
  const SortIcon = useCallback(
    ({ field }: { field: SortField }) => {
      if (sortField !== field) {
        return <ArrowUpDown className="h-3 w-3 text-[#3F3F46] opacity-0 group-hover/header:opacity-100 transition-opacity" />;
      }
      return sortDir === "asc" ? (
        <ArrowUp className="h-3 w-3 text-[#0EA5E9]" />
      ) : (
        <ArrowDown className="h-3 w-3 text-[#0EA5E9]" />
      );
    },
    [sortField, sortDir],
  );

  if (leads.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-[#71717A]">No leads to display</p>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div ref={tableContainerRef} className="h-full overflow-auto rounded-lg border border-[#27272A] bg-[#09090B]">
        <table className="w-full border-collapse text-sm">
          {/* ── Header ───────────────────────────────── */}
          <thead className="sticky top-0 z-20">
            <tr className="bg-[#18181B] border-b border-[#27272A]">
              {/* Checkbox column */}
              <th className="sticky left-0 z-30 bg-[#18181B] w-10 min-w-[40px] px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={toggleSelectAll}
                  className="h-3.5 w-3.5 rounded border-[#3F3F46] bg-[#09090B] text-[#0EA5E9] accent-[#0EA5E9] cursor-pointer"
                  aria-label="Select all leads"
                />
              </th>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={cn(
                    "group/header cursor-pointer select-none text-left px-3 py-2.5 text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider whitespace-nowrap",
                    "hover:text-[#FAFAFA] hover:bg-[#1E1E22] transition-colors duration-100",
                    col.width,
                    col.sticky &&
                      "sticky left-10 z-30 bg-[#18181B] after:absolute after:right-0 after:top-0 after:bottom-0 after:w-px after:bg-[#27272A]",
                    sortField === col.key && "text-[#FAFAFA]",
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{col.label}</span>
                    <SortIcon field={col.key} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* ── Body ─────────────────────────────────── */}
          <tbody>
            <AnimatePresence initial={false}>
              {sortedLeads.map((lead, index) => (
                <motion.tr
                  key={lead.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15, delay: Math.min(index * 0.02, 0.3) }}
                  onClick={() => onLeadClick(lead)}
                  className={cn(
                    "cursor-pointer border-b border-[#27272A]/50 transition-colors duration-100",
                    index % 2 === 0 ? "bg-[#09090B]" : "bg-[#0D0D0F]",
                    "hover:bg-[#1E1E22]",
                  )}
                >
                  {/* Checkbox */}
                  <td
                    className={cn(
                      "sticky left-0 z-10 w-10 min-w-[40px] px-3 py-2",
                      index % 2 === 0 ? "bg-[#09090B]" : "bg-[#0D0D0F]",
                      "group-hover:bg-[#1E1E22]",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(lead.id)}
                      onChange={() => {
                        // Handled by onClick for modifier key support
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRowSelect(index, e as unknown as React.MouseEvent);
                      }}
                      className="h-3.5 w-3.5 rounded border-[#3F3F46] bg-[#09090B] text-[#0EA5E9] accent-[#0EA5E9] cursor-pointer"
                      aria-label={`Select ${lead.business_name}`}
                    />
                  </td>

                  {/* Business Name (sticky) */}
                  <td
                    className={cn(
                      "sticky left-10 z-10 px-3 py-2 font-medium text-[#FAFAFA] whitespace-nowrap",
                      "after:absolute after:right-0 after:top-0 after:bottom-0 after:w-px after:bg-[#27272A]/50",
                      index % 2 === 0 ? "bg-[#09090B]" : "bg-[#0D0D0F]",
                      // Inherit hover from parent row via group
                      "group-hover:bg-[#1E1E22]",
                    )}
                  >
                    <span className="block max-w-[200px] truncate">
                      {lead.business_name}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-3 py-2">
                    <StatusBadge status={lead.status} />
                  </td>

                  {/* Assigned */}
                  <td className="px-3 py-2">
                    <AssigneeChip
                      assignedTo={lead.assigned_to}
                      salesPeople={salesPeople}
                    />
                  </td>

                  {/* Niche */}
                  <td className="px-3 py-2">
                    <NicheBadge niche={lead.niche} />
                  </td>

                  {/* Location */}
                  <td className="px-3 py-2 text-[#A1A1AA] whitespace-nowrap">
                    {lead.location || <EmptyCell />}
                  </td>

                  {/* Market */}
                  <td className="px-3 py-2">
                    <MarketBadge market={lead.market} />
                  </td>

                  {/* Channel */}
                  <td className="px-3 py-2">
                    <ChannelCell channel={lead.channel} />
                  </td>

                  {/* Email */}
                  <td className="px-3 py-2">
                    {lead.email ? (
                      <a
                        href={`mailto:${lead.email}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[#0EA5E9] hover:text-[#38BDF8] hover:underline underline-offset-2 transition-colors truncate block max-w-[200px]"
                      >
                        {lead.email}
                      </a>
                    ) : (
                      <EmptyCell />
                    )}
                  </td>

                  {/* Phone */}
                  <td className="px-3 py-2">
                    {lead.phone ? (
                      <a
                        href={`tel:${lead.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors whitespace-nowrap"
                      >
                        {lead.phone}
                      </a>
                    ) : (
                      <EmptyCell />
                    )}
                  </td>

                  {/* Instagram */}
                  <td className="px-3 py-2">
                    {lead.instagram ? (
                      <a
                        href={
                          lead.instagram.startsWith("http")
                            ? lead.instagram
                            : `https://instagram.com/${lead.instagram.replace(/^@/, "")}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[#E879A8] hover:text-[#F472B6] hover:underline underline-offset-2 transition-colors truncate block max-w-[150px]"
                      >
                        {lead.instagram.startsWith("http")
                          ? lead.instagram.replace(/^https?:\/\/(www\.)?instagram\.com\//, "@")
                          : lead.instagram.startsWith("@")
                            ? lead.instagram
                            : `@${lead.instagram}`}
                      </a>
                    ) : (
                      <EmptyCell />
                    )}
                  </td>

                  {/* First Contact */}
                  <td className="px-3 py-2 text-[#A1A1AA] whitespace-nowrap text-xs">
                    {lead.first_contact ? formatDate(lead.first_contact) : <EmptyCell />}
                  </td>

                  {/* Last Contacted */}
                  <td className="px-3 py-2 text-[#A1A1AA] whitespace-nowrap text-xs">
                    {lead.last_contacted_at ? formatDate(lead.last_contacted_at) : <EmptyCell />}
                  </td>

                  {/* Follow-up */}
                  <td className="px-3 py-2 whitespace-nowrap text-xs">
                    {lead.next_follow_up ? (
                      <FollowUpDate dateStr={lead.next_follow_up} />
                    ) : (
                      <EmptyCell />
                    )}
                  </td>

                  {/* Page Speed */}
                  <td className="px-3 py-2">
                    {lead.page_speed !== null && lead.page_speed !== undefined ? (
                      <PageSpeedBadge score={lead.page_speed} />
                    ) : (
                      <EmptyCell />
                    )}
                  </td>

                  {/* Notes */}
                  <td className="px-3 py-2">
                    {lead.notes ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="block max-w-[200px] truncate text-[#71717A] text-xs">
                            {lead.notes}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent
                          side="left"
                          className="max-w-xs bg-[#1E1E22] border border-[#27272A] text-[#FAFAFA] text-xs leading-relaxed"
                        >
                          {lead.notes}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <EmptyCell />
                    )}
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
      {/* ── Floating Bulk Action Bar ─────────────────── */}
      <AnimatePresence>
        {hasSelection && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-xl border border-[#27272A] bg-[#18181B]/90 backdrop-blur-md px-5 py-3 shadow-2xl"
          >
            <span className="text-sm font-medium text-[#FAFAFA] whitespace-nowrap">
              {selectedIds.size} lead{selectedIds.size !== 1 ? "s" : ""} selected
            </span>

            <div className="h-5 w-px bg-[#27272A]" />

            {/* Move to Stage dropdown */}
            <div className="relative" ref={moveDropdownRef}>
              <button
                onClick={() => setMoveDropdownOpen((prev) => !prev)}
                disabled={bulkMoving}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  "bg-[#0EA5E9]/15 text-[#0EA5E9] hover:bg-[#0EA5E9]/25",
                  bulkMoving && "opacity-50 cursor-not-allowed",
                )}
              >
                <ArrowRightLeft className="h-3.5 w-3.5" />
                Move to Stage
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", moveDropdownOpen && "rotate-180")} />
              </button>

              <AnimatePresence>
                {moveDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.95 }}
                    transition={{ duration: 0.12 }}
                    className="absolute bottom-full mb-2 left-0 w-48 rounded-lg border border-[#27272A] bg-[#18181B] py-1 shadow-2xl"
                  >
                    {(Object.entries(STATUS_CONFIG) as [LeadStatus, { label: string; color: string }][]).map(
                      ([status, cfg]) => (
                        <button
                          key={status}
                          onClick={() => handleBulkMove(status)}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left transition-colors hover:bg-[#27272A]/60"
                        >
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: cfg.color }}
                          />
                          <span className="text-[#FAFAFA]">{cfg.label}</span>
                        </button>
                      ),
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Bulk Assign (admin only) */}
            {isAdmin && (
              <div className="relative" ref={assignDropdownRef}>
                <button
                  onClick={() => setAssignDropdownOpen((prev) => !prev)}
                  disabled={bulkAssigning}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                    "bg-[#8B5CF6]/15 text-[#8B5CF6] hover:bg-[#8B5CF6]/25",
                    bulkAssigning && "opacity-50 cursor-not-allowed",
                  )}
                >
                  <Users className="h-3.5 w-3.5" />
                  Bulk Assign
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 transition-transform",
                      assignDropdownOpen && "rotate-180",
                    )}
                  />
                </button>

                <AnimatePresence>
                  {assignDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 4, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.95 }}
                      transition={{ duration: 0.12 }}
                      className="absolute bottom-full mb-2 left-0 w-56 rounded-lg border border-[#27272A] bg-[#18181B] py-1 shadow-2xl max-h-80 overflow-y-auto"
                    >
                      <button
                        onClick={() => handleBulkAssign(null)}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left transition-colors hover:bg-[#27272A]/60"
                      >
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: "#71717A" }}
                        />
                        <span className="text-[#A1A1AA]">Unassigned</span>
                      </button>
                      {assignableUsers.length > 0 && (
                        <div className="my-1 h-px bg-[#27272A]" />
                      )}
                      {assignableUsers.map((person) => {
                        const name = person.full_name ?? person.email ?? "User";
                        return (
                          <button
                            key={person.id}
                            onClick={() => handleBulkAssign(person.id)}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left transition-colors hover:bg-[#27272A]/60"
                          >
                            <span
                              className="h-2 w-2 rounded-full shrink-0"
                              style={{ backgroundColor: "#0EA5E9" }}
                            />
                            <span className="flex items-center justify-center h-5 w-5 rounded-full bg-[#0EA5E9]/20 text-[10px] font-semibold text-[#0EA5E9] shrink-0">
                              {getInitials(name)}
                            </span>
                            <span className="text-[#FAFAFA] truncate flex-1">
                              {name}
                            </span>
                            {person.role === "admin" && (
                              <span className="shrink-0 rounded-md bg-[#F59E0B]/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#F59E0B]">
                                Admin
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Export CSV */}
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors bg-[#22C55E]/15 text-[#22C55E] hover:bg-[#22C55E]/25"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>

            <div className="h-5 w-px bg-[#27272A]" />

            {/* Deselect All */}
            <button
              onClick={clearSelection}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-[#A1A1AA] transition-colors hover:text-[#FAFAFA] hover:bg-[#27272A]/60"
            >
              <X className="h-3.5 w-3.5" />
              Deselect
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </TooltipProvider>
  );
}

// ─── Sub-components ─────────────────────────────────

function EmptyCell() {
  return <span className="text-[#3F3F46] select-none">&mdash;</span>;
}

function StatusBadge({ status }: { status: LeadStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <Badge
      className="border-0 px-2 py-0.5 text-[11px] font-medium whitespace-nowrap"
      style={{
        backgroundColor: `${cfg.color}15`,
        color: cfg.color,
      }}
    >
      {cfg.label}
    </Badge>
  );
}

function NicheBadge({ niche }: { niche: LeadNiche | null }) {
  if (!niche) return <EmptyCell />;
  const cfg = NICHE_CONFIG[niche];
  return (
    <Badge
      className="border-0 px-2 py-0.5 text-[11px] font-medium whitespace-nowrap"
      style={{
        backgroundColor: `${cfg.color}15`,
        color: cfg.color,
      }}
    >
      {cfg.label}
    </Badge>
  );
}

function MarketBadge({ market }: { market: LeadMarket | null }) {
  if (!market) return <EmptyCell />;
  const cfg = MARKET_CONFIG[market];
  return (
    <Badge
      className="border-0 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap"
      style={{
        backgroundColor: `${cfg.color}15`,
        color: cfg.color,
      }}
    >
      {cfg.label}
    </Badge>
  );
}

function ChannelCell({ channel }: { channel: LeadChannel | null }) {
  if (!channel) return <EmptyCell />;
  const cfg = CHANNEL_CONFIG[channel];
  const Icon = cfg.icon;
  return (
    <div className="flex items-center gap-1.5 text-[#A1A1AA] whitespace-nowrap">
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="text-xs">{cfg.label}</span>
    </div>
  );
}

function FollowUpDate({ dateStr }: { dateStr: string }) {
  const date = new Date(dateStr);
  const now = new Date();
  const isOverdue = date < now;
  const isToday = date.toDateString() === now.toDateString();

  return (
    <span
      className={cn(
        "text-xs font-medium",
        isOverdue && !isToday && "text-[#EF4444]",
        isToday && "text-[#F59E0B]",
        !isOverdue && !isToday && "text-[#A1A1AA]",
      )}
    >
      {formatDate(dateStr)}
    </span>
  );
}

function AssigneeChip({
  assignedTo,
  salesPeople,
}: {
  assignedTo: string | null;
  salesPeople?: Profile[];
}) {
  const assignee =
    assignedTo && salesPeople
      ? salesPeople.find((p) => p.id === assignedTo) ?? null
      : null;

  if (!assignee) {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full bg-[#27272A] px-2 py-0.5 text-[11px] font-medium text-[#71717A]"
        title="Unassigned"
      >
        <span
          className="h-1.5 w-1.5 rounded-full shrink-0"
          style={{ backgroundColor: "#71717A" }}
        />
        <UserCircle className="h-3 w-3" />
        <span>Unassigned</span>
      </span>
    );
  }

  const name = assignee.full_name ?? assignee.email ?? "User";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full bg-[#27272A] px-2 py-0.5 text-[11px] font-medium text-[#FAFAFA]"
      title={`Assigned to ${name}${assignee.role === "admin" ? " (admin)" : ""}`}
    >
      <span
        className="h-1.5 w-1.5 rounded-full shrink-0"
        style={{ backgroundColor: "#0EA5E9" }}
      />
      <span className="flex items-center justify-center h-4 w-4 rounded-full bg-[#0EA5E9]/20 text-[9px] font-semibold text-[#0EA5E9] shrink-0">
        {getInitials(name)}
      </span>
      <span className="max-w-[100px] truncate">{name}</span>
    </span>
  );
}

function PageSpeedBadge({ score }: { score: number }) {
  let color: string;
  if (score >= 90) {
    color = "#22C55E";
  } else if (score >= 50) {
    color = "#F59E0B";
  } else {
    color = "#EF4444";
  }

  return (
    <span
      className="text-xs font-semibold tabular-nums"
      style={{ color }}
    >
      {score}
    </span>
  );
}
