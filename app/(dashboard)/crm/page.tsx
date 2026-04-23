"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Search,
  Filter,
  Users,
  TrendingUp,
  ArrowRight,
  RefreshCw,
  X,
  Zap,
  UserCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { KanbanBoard } from "@/components/crm/kanban-board";
import { TableView } from "@/components/crm/table-view";
import { ViewSwitcher, type CrmView } from "@/components/crm/view-switcher";
import { LeadDetailModal } from "@/components/crm/lead-detail-modal";
import { AddLeadModal } from "@/components/crm/add-lead-modal";
import { BulkEnrichModal } from "@/components/crm/bulk-enrich-modal";
import { ScoredView } from "@/components/crm/scored-view";
import type { Lead, LeadStatus, LeadNiche, LeadChannel, LeadMarket, Profile } from "@/types";

// ─── Status config (updated statuses) ───────────────
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

// ─── Updated niche options ──────────────────────────
const NICHE_OPTIONS: LeadNiche[] = [
  "dental",
  "frizer",
  "restoran",
  "autoservis",
  "fizioterapija",
  "wellness",
  "fitness",
  "apartmani",
  "kozmetika",
  "pekara",
  "ostalo",
];

// ─── Niche display labels ───────────────────────────
const NICHE_LABELS: Record<LeadNiche, string> = {
  dental: "Dental",
  frizer: "Frizer",
  restoran: "Restoran",
  autoservis: "Autoservis",
  fizioterapija: "Fizioterapija",
  wellness: "Wellness",
  fitness: "Fitness",
  apartmani: "Apartmani",
  kozmetika: "Kozmetika",
  pekara: "Pekara",
  ostalo: "Ostalo",
};

// ─── Channel options ───────────────────────────────
const CHANNEL_OPTIONS: LeadChannel[] = [
  "whatsapp",
  "email",
  "instagram_dm",
  "telefon",
  "linkedin",
  "osobno",
];

const CHANNEL_LABELS: Record<LeadChannel, string> = {
  whatsapp: "WhatsApp",
  email: "Email",
  instagram_dm: "Instagram DM",
  telefon: "Telefon",
  linkedin: "LinkedIn",
  osobno: "Osobno",
};

// ─── Market options ────────────────────────────────
const MARKET_OPTIONS: LeadMarket[] = ["hr", "dach", "us", "uk"];

const MARKET_LABELS: Record<LeadMarket, string> = {
  hr: "HR",
  dach: "DACH",
  us: "US",
  uk: "UK",
};

// ─── Status options for filter ─────────────────────
const STATUS_OPTIONS: LeadStatus[] = [
  "new",
  "demo_built",
  "contacted",
  "replied",
  "call_booked",
  "follow_up",
  "won",
  "lost",
];

// ─── Helpers ────────────────────────────────────────
// Matches Notion formula: if(empty(Follow-up datum), "", if(now() >= Follow-up datum, "⚠️ DA", ""))
// Then filtered by: Treba follow-up IS "⚠️ DA" AND Status IS NOT "Lost"
function isNeedsAction(lead: Lead): boolean {
  if (lead.status === "lost") return false;
  if (!lead.next_follow_up) return false; // No follow-up date → not shown
  const followUpDate = new Date(lead.next_follow_up);
  return followUpDate <= new Date(); // Follow-up date is today or past → "⚠️ DA"
}

// ─── Assigned-to filter value: null = "All", "unassigned" = unassigned, or profile id ─
type AssignedFilter = null | "unassigned" | string;

export default function CrmPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [nicheFilter, setNicheFilter] = useState<LeadNiche | "">("");
  const [statusFilter, setStatusFilter] = useState<Set<LeadStatus>>(new Set());
  const [marketFilter, setMarketFilter] = useState<Set<LeadMarket>>(new Set());
  const [channelFilter, setChannelFilter] = useState<Set<LeadChannel>>(new Set());
  const [hasFollowUpOnly, setHasFollowUpOnly] = useState(false);
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [currentView, setCurrentView] = useState<CrmView>("board");

  // Multi-user state
  const [profile, setProfile] = useState<Profile | null>(null);
  const [salesPeople, setSalesPeople] = useState<Profile[]>([]);
  const [assignedFilter, setAssignedFilter] = useState<AssignedFilter>(null);

  // Modal state
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [bulkEnrichOpen, setBulkEnrichOpen] = useState(false);

  // ── Fetch leads ──────────────────────────────────
  const fetchLeads = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (assignedFilter !== null) params.set("assigned_to", assignedFilter);

      const res = await fetch(`/api/leads?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch leads");
      const data: Lead[] = await res.json();
      setLeads(data);
    } catch {
      toast.error("Failed to load leads");
    } finally {
      setLoading(false);
    }
  }, [search, assignedFilter]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // ── Fetch current user profile & sales people ────
  useEffect(() => {
    let cancelled = false;
    async function loadUsers() {
      try {
        const [meRes, peopleRes] = await Promise.all([
          fetch("/api/me"),
          fetch("/api/sales-people"),
        ]);
        if (!cancelled && meRes.ok) {
          const me = (await meRes.json()) as Profile;
          setProfile(me);
        }
        if (!cancelled && peopleRes.ok) {
          const people = (await peopleRes.json()) as Profile[];
          setSalesPeople(people);
        }
      } catch {
        // Silently ignore — auth layers handle redirect
      }
    }
    loadUsers();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Check if any advanced filter is active ────────
  const hasActiveFilters =
    nicheFilter !== "" ||
    statusFilter.size > 0 ||
    marketFilter.size > 0 ||
    channelFilter.size > 0 ||
    hasFollowUpOnly ||
    dateFrom !== null ||
    dateTo !== null ||
    assignedFilter !== null;

  const clearAllFilters = useCallback(() => {
    setNicheFilter("");
    setStatusFilter(new Set());
    setMarketFilter(new Set());
    setChannelFilter(new Set());
    setHasFollowUpOnly(false);
    setDateFrom(null);
    setDateTo(null);
    setAssignedFilter(null);
  }, []);

  // ── Toggle helpers for multi-select filters ──────
  const toggleStatusFilter = useCallback((status: LeadStatus) => {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  }, []);

  const toggleMarketFilter = useCallback((market: LeadMarket) => {
    setMarketFilter((prev) => {
      const next = new Set(prev);
      if (next.has(market)) {
        next.delete(market);
      } else {
        next.add(market);
      }
      return next;
    });
  }, []);

  const toggleChannelFilter = useCallback((channel: LeadChannel) => {
    setChannelFilter((prev) => {
      const next = new Set(prev);
      if (next.has(channel)) {
        next.delete(channel);
      } else {
        next.add(channel);
      }
      return next;
    });
  }, []);

  // ── Apply client-side filters ───────────────────
  const clientFilteredLeads = useMemo(() => {
    let result = leads;

    if (statusFilter.size > 0) {
      result = result.filter((l) => statusFilter.has(l.status));
    }

    if (nicheFilter !== "") {
      result = result.filter((l) => l.niche === nicheFilter);
    }

    if (marketFilter.size > 0) {
      result = result.filter((l) => l.market !== null && marketFilter.has(l.market));
    }

    if (channelFilter.size > 0) {
      result = result.filter((l) => l.channel !== null && channelFilter.has(l.channel));
    }

    if (hasFollowUpOnly) {
      result = result.filter((l) => l.next_follow_up !== null);
    }

    if (dateFrom) {
      result = result.filter((l) => {
        const d = l.first_contact ?? l.created_at;
        return d >= dateFrom;
      });
    }

    if (dateTo) {
      result = result.filter((l) => {
        const d = (l.first_contact ?? l.created_at).slice(0, 10);
        return d <= dateTo;
      });
    }

    return result;
  }, [leads, statusFilter, nicheFilter, marketFilter, channelFilter, hasFollowUpOnly, dateFrom, dateTo]);

  // ── Filtered leads for each view ─────────────────
  const filteredLeads = useMemo(() => {
    return {
      all: clientFilteredLeads,
      needsAction: clientFilteredLeads.filter(isNeedsAction),
      won: clientFilteredLeads.filter((l) => l.status === "won"),
    };
  }, [clientFilteredLeads]);

  // ── View lead counts ─────────────────────────────
  const leadCounts: Record<CrmView, number> = useMemo(
    () => ({
      board: clientFilteredLeads.length,
      table: clientFilteredLeads.length,
      "needs-action": filteredLeads.needsAction.length,
      won: filteredLeads.won.length,
      scored: clientFilteredLeads.filter((l) => l.lead_score !== null && l.lead_score > 0).length,
    }),
    [clientFilteredLeads, filteredLeads],
  );

  // ── Leads to display in current view ─────────────
  const viewLeads = useMemo(() => {
    switch (currentView) {
      case "needs-action":
        return filteredLeads.needsAction;
      case "won":
        return filteredLeads.won;
      default:
        return filteredLeads.all;
    }
  }, [currentView, filteredLeads]);

  // ── Lead move (drag-and-drop) ────────────────────
  const handleLeadMove = useCallback(
    async (leadId: string, newStatus: LeadStatus) => {
      // Optimistic update
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l)),
      );

      try {
        const res = await fetch(`/api/leads/${leadId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });

        if (!res.ok) throw new Error("Failed to update lead");

        const updated: Lead = await res.json();
        setLeads((prev) => prev.map((l) => (l.id === leadId ? updated : l)));

        toast.success(
          `Moved to ${STATUS_CONFIG[newStatus].label}`,
        );
      } catch {
        // Revert on error
        fetchLeads();
        toast.error("Failed to move lead");
      }
    },
    [fetchLeads],
  );

  // ── Lead click → open detail modal ───────────────
  const handleLeadClick = useCallback((lead: Lead) => {
    setSelectedLead(lead);
    setDetailOpen(true);
  }, []);

  // ── Lead update from modal / table ───────────────
  const handleLeadUpdate = useCallback((updatedLead: Lead) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === updatedLead.id ? updatedLead : l)),
    );
    setSelectedLead(updatedLead);
  }, []);

  // ── Lead delete from modal ───────────────────────
  const handleLeadDelete = useCallback((leadId: string) => {
    setLeads((prev) => prev.filter((l) => l.id !== leadId));
    setDetailOpen(false);
    setSelectedLead(null);
  }, []);

  // ── Bulk move leads ──────────────────────────────
  const handleBulkMove = useCallback(
    async (leadIds: string[], newStatus: LeadStatus) => {
      // Optimistic update
      setLeads((prev) =>
        prev.map((l) =>
          leadIds.includes(l.id) ? { ...l, status: newStatus } : l,
        ),
      );

      try {
        const results = await Promise.all(
          leadIds.map((id) =>
            fetch(`/api/leads/${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: newStatus }),
            }),
          ),
        );

        const failed = results.filter((r) => !r.ok);
        if (failed.length > 0) {
          throw new Error(`Failed to update ${failed.length} lead(s)`);
        }

        // Update with server responses
        const updatedLeads: Lead[] = await Promise.all(
          results.map((r) => r.json() as Promise<Lead>),
        );

        setLeads((prev) =>
          prev.map((l) => {
            const updated = updatedLeads.find((u) => u.id === l.id);
            return updated ?? l;
          }),
        );

        toast.success(
          `Moved ${leadIds.length} lead${leadIds.length !== 1 ? "s" : ""} to ${STATUS_CONFIG[newStatus].label}`,
        );
      } catch {
        // Revert on error
        fetchLeads();
        toast.error("Failed to move some leads");
      }
    },
    [fetchLeads],
  );

  // ── New lead created ─────────────────────────────
  const handleLeadCreated = useCallback((newLead: Lead) => {
    setLeads((prev) => [newLead, ...prev]);
    setAddOpen(false);
  }, []);

  // ── Stats ────────────────────────────────────────
  const stats = {
    total: leads.length,
    active: leads.filter(
      (l) => !["won", "lost"].includes(l.status),
    ).length,
    won: leads.filter((l) => l.status === "won").length,
    conversionRate:
      leads.length > 0
        ? Math.round(
            (leads.filter((l) => l.status === "won").length /
              leads.length) *
              100,
          )
        : 0,
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] space-y-4">
      {/* ── Header ──────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Outreach CRM</h1>
          <p className="text-sm text-[#71717A]">
            Manage your Elevera Studio lead pipeline
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            onClick={() => setBulkEnrichOpen(true)}
            className="gap-2"
          >
            <Zap className="h-4 w-4" />
            Bulk Enrich
          </Button>
          <Button onClick={() => setAddOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Lead
          </Button>
        </div>
      </motion.div>

      {/* ── Stats Bar ───────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <Card className="hover:border-[#3F3F46] transition-colors">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-6 flex-wrap">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-[#71717A]" />
                <span className="text-sm text-[#A1A1AA]">Total:</span>
                <span className="text-sm font-semibold">{stats.total}</span>
              </div>
              <div className="h-4 w-px bg-[#27272A]" />
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[#0EA5E9]" />
                <span className="text-sm text-[#A1A1AA]">Active:</span>
                <span className="text-sm font-semibold text-[#0EA5E9]">
                  {stats.active}
                </span>
              </div>
              <div className="h-4 w-px bg-[#27272A]" />
              <div className="flex items-center gap-2">
                <span className="text-sm text-[#A1A1AA]">Won:</span>
                <span className="text-sm font-semibold text-[#22C55E]">
                  {stats.won}
                </span>
              </div>
              <div className="h-4 w-px bg-[#27272A]" />
              <div className="flex items-center gap-2">
                <span className="text-sm text-[#A1A1AA]">Conversion:</span>
                <span className="text-sm font-semibold">{stats.conversionRate}%</span>
              </div>

              {/* ── Funnel mini-viz ─────────────────── */}
              <div className="ml-auto hidden lg:flex items-center gap-1">
                {(
                  Object.entries(STATUS_CONFIG) as [LeadStatus, { label: string; color: string }][]
                ).map(([status, cfg], i) => {
                  const count = leads.filter((l) => l.status === status).length;
                  return (
                    <div key={status} className="flex items-center gap-1">
                      <Badge
                        className="border-0 text-[10px] px-1.5 py-0 font-medium"
                        style={{
                          backgroundColor: `${cfg.color}15`,
                          color: cfg.color,
                        }}
                      >
                        {count}
                      </Badge>
                      {i < Object.keys(STATUS_CONFIG).length - 1 && (
                        <ArrowRight className="h-3 w-3 text-[#3F3F46]" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── View Switcher ───────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
      >
        <ViewSwitcher
          currentView={currentView}
          onViewChange={setCurrentView}
          leadCounts={leadCounts}
        />
      </motion.div>

      {/* ── Search & Filters ────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-2"
      >
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#71717A]" />
          <Input
            placeholder="Search leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 bg-[#18181B] border-[#27272A]"
          />
        </div>

        <Button
          variant={showFilters ? "secondary" : "outline"}
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-1.5"
        >
          <Filter className="h-3.5 w-3.5" />
          Filters
          {hasActiveFilters && (
            <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-[#0EA5E9]" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setLoading(true);
            fetchLeads();
          }}
          className="h-9 w-9"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </motion.div>

      {/* ── Advanced filter panel ─────────────────────── */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-3 rounded-lg border border-[#27272A] bg-[#18181B]/50 p-4"
        >
          {/* Status filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-[#71717A] w-14 shrink-0">Status:</span>
            <Badge
              className={`cursor-pointer text-xs ${
                statusFilter.size === 0
                  ? "bg-[#0EA5E9]/15 text-[#0EA5E9] border-[#0EA5E9]/30"
                  : "bg-transparent text-[#A1A1AA] border-[#27272A] hover:border-[#3F3F46]"
              }`}
              onClick={() => setStatusFilter(new Set())}
            >
              All
            </Badge>
            {STATUS_OPTIONS.map((s) => (
              <Badge
                key={s}
                className={`cursor-pointer text-xs ${
                  statusFilter.has(s)
                    ? "border-[#0EA5E9]/30"
                    : "bg-transparent text-[#A1A1AA] border-[#27272A] hover:border-[#3F3F46]"
                }`}
                style={
                  statusFilter.has(s)
                    ? {
                        backgroundColor: `${STATUS_CONFIG[s].color}15`,
                        color: STATUS_CONFIG[s].color,
                        borderColor: `${STATUS_CONFIG[s].color}30`,
                      }
                    : undefined
                }
                onClick={() => toggleStatusFilter(s)}
              >
                {STATUS_CONFIG[s].label}
              </Badge>
            ))}
          </div>

          {/* Niche filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-[#71717A] w-14 shrink-0">Niche:</span>
            <Badge
              className={`cursor-pointer text-xs ${
                nicheFilter === ""
                  ? "bg-[#0EA5E9]/15 text-[#0EA5E9] border-[#0EA5E9]/30"
                  : "bg-transparent text-[#A1A1AA] border-[#27272A] hover:border-[#3F3F46]"
              }`}
              onClick={() => setNicheFilter("")}
            >
              All
            </Badge>
            {NICHE_OPTIONS.map((n) => (
              <Badge
                key={n}
                className={`cursor-pointer text-xs ${
                  nicheFilter === n
                    ? "bg-[#0EA5E9]/15 text-[#0EA5E9] border-[#0EA5E9]/30"
                    : "bg-transparent text-[#A1A1AA] border-[#27272A] hover:border-[#3F3F46]"
                }`}
                onClick={() => setNicheFilter(n === nicheFilter ? "" : n)}
              >
                {NICHE_LABELS[n]}
              </Badge>
            ))}
          </div>

          {/* Market filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-[#71717A] w-14 shrink-0">Market:</span>
            <Badge
              className={`cursor-pointer text-xs ${
                marketFilter.size === 0
                  ? "bg-[#0EA5E9]/15 text-[#0EA5E9] border-[#0EA5E9]/30"
                  : "bg-transparent text-[#A1A1AA] border-[#27272A] hover:border-[#3F3F46]"
              }`}
              onClick={() => setMarketFilter(new Set())}
            >
              All
            </Badge>
            {MARKET_OPTIONS.map((m) => (
              <Badge
                key={m}
                className={`cursor-pointer text-xs ${
                  marketFilter.has(m)
                    ? "bg-[#0EA5E9]/15 text-[#0EA5E9] border-[#0EA5E9]/30"
                    : "bg-transparent text-[#A1A1AA] border-[#27272A] hover:border-[#3F3F46]"
                }`}
                onClick={() => toggleMarketFilter(m)}
              >
                {MARKET_LABELS[m]}
              </Badge>
            ))}
          </div>

          {/* Channel filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-[#71717A] w-14 shrink-0">Channel:</span>
            <Badge
              className={`cursor-pointer text-xs ${
                channelFilter.size === 0
                  ? "bg-[#0EA5E9]/15 text-[#0EA5E9] border-[#0EA5E9]/30"
                  : "bg-transparent text-[#A1A1AA] border-[#27272A] hover:border-[#3F3F46]"
              }`}
              onClick={() => setChannelFilter(new Set())}
            >
              All
            </Badge>
            {CHANNEL_OPTIONS.map((c) => (
              <Badge
                key={c}
                className={`cursor-pointer text-xs ${
                  channelFilter.has(c)
                    ? "bg-[#0EA5E9]/15 text-[#0EA5E9] border-[#0EA5E9]/30"
                    : "bg-transparent text-[#A1A1AA] border-[#27272A] hover:border-[#3F3F46]"
                }`}
                onClick={() => toggleChannelFilter(c)}
              >
                {CHANNEL_LABELS[c]}
              </Badge>
            ))}
          </div>

          {/* Assigned-to filter (admin only) */}
          {profile?.role === "admin" && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-[#71717A] w-14 shrink-0">Assigned:</span>
              <Badge
                className={`cursor-pointer text-xs ${
                  assignedFilter === null
                    ? "bg-[#0EA5E9]/15 text-[#0EA5E9] border-[#0EA5E9]/30"
                    : "bg-transparent text-[#A1A1AA] border-[#27272A] hover:border-[#3F3F46]"
                }`}
                onClick={() => setAssignedFilter(null)}
              >
                All
              </Badge>
              <Badge
                className={`cursor-pointer text-xs ${
                  assignedFilter === "unassigned"
                    ? "bg-[#0EA5E9]/15 text-[#0EA5E9] border-[#0EA5E9]/30"
                    : "bg-transparent text-[#A1A1AA] border-[#27272A] hover:border-[#3F3F46]"
                }`}
                onClick={() => setAssignedFilter("unassigned")}
              >
                <UserCircle className="h-3 w-3 mr-1" />
                Unassigned
              </Badge>
              {salesPeople
                .filter((p) => p.role === "sales" || p.role === "admin")
                .map((p) => {
                  const label = p.full_name ?? p.email ?? "User";
                  const active = assignedFilter === p.id;
                  return (
                    <Badge
                      key={p.id}
                      className={`cursor-pointer text-xs gap-1 ${
                        active
                          ? "bg-[#0EA5E9]/15 text-[#0EA5E9] border-[#0EA5E9]/30"
                          : "bg-transparent text-[#A1A1AA] border-[#27272A] hover:border-[#3F3F46]"
                      }`}
                      onClick={() => setAssignedFilter(active ? null : p.id)}
                    >
                      <span className="truncate max-w-[140px]">{label}</span>
                      {p.role === "admin" && (
                        <span className="shrink-0 rounded bg-[#F59E0B]/20 px-1 text-[9px] font-semibold uppercase text-[#F59E0B]">
                          Admin
                        </span>
                      )}
                    </Badge>
                  );
                })}
            </div>
          )}

          {/* Date range filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-[#71717A] w-14 shrink-0">First Contact:</span>
            <DateRangePicker
              from={dateFrom}
              to={dateTo}
              onChange={(from, to) => {
                setDateFrom(from);
                setDateTo(to);
              }}
              placeholder="Any date"
              className="w-80"
            />
          </div>

          {/* Bottom row: has follow-up toggle + clear all */}
          <div className="flex items-center gap-4 pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hasFollowUpOnly}
                onChange={(e) => setHasFollowUpOnly(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-[#3F3F46] bg-[#09090B] text-[#0EA5E9] accent-[#0EA5E9] cursor-pointer"
              />
              <span className="text-xs text-[#A1A1AA]">Only with follow-up date</span>
            </label>

            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="ml-auto flex items-center gap-1 text-xs text-[#EF4444] hover:text-[#F87171] transition-colors"
              >
                <X className="h-3 w-3" />
                Clear all filters
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* ── Main Content Area ───────────────────────── */}
      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex items-center gap-3 text-[#71717A]">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading pipeline...</span>
            </div>
          </div>
        ) : currentView === "board" ? (
          <KanbanBoard
            leads={viewLeads}
            onLeadMove={handleLeadMove}
            onLeadClick={handleLeadClick}
            salesPeople={salesPeople}
          />
        ) : currentView === "scored" ? (
          <ScoredView
            leads={clientFilteredLeads}
            onSelectLead={handleLeadClick}
          />
        ) : (
          <TableView
            leads={viewLeads}
            onLeadClick={handleLeadClick}
            onLeadUpdate={handleLeadUpdate}
            onBulkMove={handleBulkMove}
            profile={profile}
            salesPeople={salesPeople}
            onBulkAssignComplete={fetchLeads}
          />
        )}
      </div>

      {/* ── Modals ──────────────────────────────────── */}
      <LeadDetailModal
        lead={selectedLead}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onLeadUpdate={handleLeadUpdate}
        onLeadDelete={handleLeadDelete}
        profile={profile}
        salesPeople={salesPeople}
      />

      <AddLeadModal
        open={addOpen}
        onOpenChange={setAddOpen}
        onLeadCreated={handleLeadCreated}
      />

      <BulkEnrichModal
        open={bulkEnrichOpen}
        onOpenChange={setBulkEnrichOpen}
        onComplete={() => {
          fetchLeads();
        }}
      />
    </div>
  );
}
