"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Building2,
  Plus,
  RefreshCw,
  ExternalLink,
  Trash2,
  X,
  Users,
  DollarSign,
  TrendingUp,
  Pencil,
  Check,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { Client, ClientStatus, SubscriptionTier } from "@/types";

// ─── Constants ──────────────────────────────────────

const PLAN_CONFIG: Record<
  SubscriptionTier,
  { label: string; color: string; bg: string; border: string; defaultMrr: number }
> = {
  basic_79: {
    label: "Basic \u20AC79",
    color: "#38BDF8",
    bg: "rgba(56,189,248,0.12)",
    border: "rgba(56,189,248,0.25)",
    defaultMrr: 79,
  },
  standard_99: {
    label: "Standard \u20AC99",
    color: "#A78BFA",
    bg: "rgba(167,139,250,0.12)",
    border: "rgba(167,139,250,0.25)",
    defaultMrr: 99,
  },
  custom: {
    label: "Custom",
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.25)",
    defaultMrr: 0,
  },
};

const STATUS_CONFIG: Record<
  ClientStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  active: {
    label: "Active",
    color: "#22C55E",
    bg: "rgba(34,197,94,0.12)",
    border: "rgba(34,197,94,0.25)",
  },
  paused: {
    label: "Paused",
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.25)",
  },
  churned: {
    label: "Churned",
    color: "#EF4444",
    bg: "rgba(239,68,68,0.12)",
    border: "rgba(239,68,68,0.25)",
  },
};

const STATUS_CYCLE: ClientStatus[] = ["active", "paused", "churned"];

// ─── Helpers ────────────────────────────────────────

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "\u2014";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
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

const gridItemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: 0.15 + i * 0.05, duration: 0.35, ease: "easeOut" as const },
  }),
};

// ─── Types ──────────────────────────────────────────

interface MrrSummary {
  total_mrr: number;
  active_clients: number;
  average_mrr: number;
  by_plan: { plan: string; count: number; mrr: number }[];
}

interface AddClientForm {
  business_name: string;
  site_url: string;
  plan: SubscriptionTier;
  mrr: string;
  status: ClientStatus;
  started_at: string;
  lead_id: string;
  notes: string;
}

const INITIAL_FORM: AddClientForm = {
  business_name: "",
  site_url: "",
  plan: "basic_79",
  mrr: "79",
  status: "active",
  started_at: todayISO(),
  lead_id: "",
  notes: "",
};

// ─── Main Component ─────────────────────────────────

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [mrrData, setMrrData] = useState<MrrSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ClientStatus | "all">("all");

  // Inline editing state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [editingNotesValue, setEditingNotesValue] = useState("");
  const [editingMrrId, setEditingMrrId] = useState<string | null>(null);
  const [editingMrrValue, setEditingMrrValue] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // ── Fetch all data ──────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [clientsRes, mrrRes] = await Promise.all([
        fetch("/api/clients?sort=business_name&order=asc"),
        fetch("/api/clients/mrr"),
      ]);

      if (!clientsRes.ok || !mrrRes.ok) {
        throw new Error("Failed to fetch client data");
      }

      const [clientsData, mrrSummary] = await Promise.all([
        clientsRes.json() as Promise<Client[]>,
        mrrRes.json() as Promise<MrrSummary>,
      ]);

      setClients(clientsData);
      setMrrData(mrrSummary);
    } catch {
      toast.error("Failed to load client data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Filtered clients ────────────────────────────────

  const filteredClients = useMemo(() => {
    if (statusFilter === "all") return clients;
    return clients.filter((c) => c.status === statusFilter);
  }, [clients, statusFilter]);

  // ── Handlers ────────────────────────────────────────

  const handleStatusToggle = useCallback(
    async (client: Client) => {
      const currentIdx = STATUS_CYCLE.indexOf(client.status);
      const nextStatus = STATUS_CYCLE[(currentIdx + 1) % STATUS_CYCLE.length];

      // Optimistic update
      setClients((prev) =>
        prev.map((c) => (c.id === client.id ? { ...c, status: nextStatus } : c)),
      );

      try {
        const res = await fetch(`/api/clients/${client.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: nextStatus }),
        });

        if (!res.ok) throw new Error("Failed to update status");

        const updated: Client = await res.json();
        setClients((prev) =>
          prev.map((c) => (c.id === client.id ? updated : c)),
        );
        // Refresh MRR since status change affects active count
        const mrrRes = await fetch("/api/clients/mrr");
        if (mrrRes.ok) setMrrData(await mrrRes.json());

        toast.success(
          `${client.business_name} set to ${STATUS_CONFIG[nextStatus].label}`,
        );
      } catch {
        // Revert optimistic update
        setClients((prev) =>
          prev.map((c) =>
            c.id === client.id ? { ...c, status: client.status } : c,
          ),
        );
        toast.error("Failed to update status");
      }
    },
    [],
  );

  const handleMrrSave = useCallback(
    async (client: Client) => {
      const newMrr = parseFloat(editingMrrValue);
      if (isNaN(newMrr) || newMrr < 0) {
        toast.error("Enter a valid MRR amount");
        return;
      }

      setEditingMrrId(null);

      // Optimistic update
      setClients((prev) =>
        prev.map((c) => (c.id === client.id ? { ...c, mrr: newMrr } : c)),
      );

      try {
        const res = await fetch(`/api/clients/${client.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mrr: newMrr }),
        });

        if (!res.ok) throw new Error("Failed to update MRR");

        const updated: Client = await res.json();
        setClients((prev) =>
          prev.map((c) => (c.id === client.id ? updated : c)),
        );
        // Refresh MRR summary
        const mrrRes = await fetch("/api/clients/mrr");
        if (mrrRes.ok) setMrrData(await mrrRes.json());

        toast.success(
          `MRR updated to \u20AC${newMrr.toFixed(2)} for ${client.business_name}`,
        );
      } catch {
        setClients((prev) =>
          prev.map((c) =>
            c.id === client.id ? { ...c, mrr: client.mrr } : c,
          ),
        );
        toast.error("Failed to update MRR");
      }
    },
    [editingMrrValue],
  );

  const handleNotesSave = useCallback(
    async (client: Client) => {
      const newNotes = editingNotesValue.trim() || null;
      setEditingNotesId(null);

      // Optimistic update
      setClients((prev) =>
        prev.map((c) =>
          c.id === client.id ? { ...c, notes: newNotes } : c,
        ),
      );

      try {
        const res = await fetch(`/api/clients/${client.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: newNotes }),
        });

        if (!res.ok) throw new Error("Failed to update notes");

        const updated: Client = await res.json();
        setClients((prev) =>
          prev.map((c) => (c.id === client.id ? updated : c)),
        );
        toast.success("Notes updated");
      } catch {
        setClients((prev) =>
          prev.map((c) =>
            c.id === client.id ? { ...c, notes: client.notes } : c,
          ),
        );
        toast.error("Failed to update notes");
      }
    },
    [editingNotesValue],
  );

  const handleDelete = useCallback(
    async (client: Client) => {
      setDeleteConfirmId(null);

      // Optimistic removal
      setClients((prev) => prev.filter((c) => c.id !== client.id));

      try {
        const res = await fetch(`/api/clients/${client.id}`, {
          method: "DELETE",
        });

        if (!res.ok && res.status !== 204)
          throw new Error("Failed to delete client");

        // Refresh MRR
        const mrrRes = await fetch("/api/clients/mrr");
        if (mrrRes.ok) setMrrData(await mrrRes.json());

        toast.success(`${client.business_name} deleted`);
      } catch {
        // Revert
        fetchData();
        toast.error("Failed to delete client");
      }
    },
    [fetchData],
  );

  // ── KPI Cards ───────────────────────────────────────

  const kpis = [
    {
      label: "Active Clients",
      value: mrrData?.active_clients ?? 0,
      format: (v: number) => v.toString(),
      icon: Users,
      color: "#0EA5E9",
      bg: "rgba(14,165,233,0.08)",
    },
    {
      label: "Total MRR",
      value: mrrData?.total_mrr ?? 0,
      format: (v: number) =>
        `\u20AC${v.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: "#22C55E",
      bg: "rgba(34,197,94,0.08)",
    },
    {
      label: "Avg MRR / Client",
      value: mrrData?.average_mrr ?? 0,
      format: (v: number) =>
        `\u20AC${v.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: TrendingUp,
      color: "#A78BFA",
      bg: "rgba(167,139,250,0.08)",
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
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#FAFAFA]">
              Client Management
            </h1>
            <p className="text-sm text-[#71717A] mt-0.5">
              Active clients and revenue overview
            </p>
          </div>
          {mrrData && mrrData.total_mrr > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="hidden sm:flex items-center gap-1.5 rounded-lg px-3 py-1.5"
              style={{
                backgroundColor: "rgba(34,197,94,0.1)",
                border: "1px solid rgba(34,197,94,0.2)",
              }}
            >
              <DollarSign className="h-4 w-4 text-[#22C55E]" />
              <span className="text-sm font-bold text-[#22C55E] tabular-nums">
                {"\u20AC"}
                {mrrData.total_mrr.toLocaleString("de-DE", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}{" "}
                MRR
              </span>
            </motion.div>
          )}
        </div>
        <div className="flex items-center gap-3">
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
            Add Client
          </Button>
        </div>
      </motion.div>

      {/* ── Loading ───────────────────────────────────── */}
      {loading && !mrrData ? (
        <div className="flex items-center justify-center py-32">
          <div className="flex items-center gap-3 text-[#71717A]">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading clients...</span>
          </div>
        </div>
      ) : (
        <>
          {/* ── KPI Cards ──────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                      className="text-2xl font-bold tracking-tight tabular-nums"
                      style={{ color: kpi.color }}
                    >
                      {kpi.format(kpi.value)}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* ── Status Filter ──────────────────────────── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-2"
          >
            {(["all", "active", "paused", "churned"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  statusFilter === s
                    ? s === "all"
                      ? "bg-[#0EA5E9]/15 text-[#0EA5E9] border border-[#0EA5E9]/30"
                      : `border text-[${STATUS_CONFIG[s].color}]`
                    : "text-[#71717A] border border-[#27272A] hover:border-[#3F3F46] hover:text-[#A1A1AA]"
                }`}
                style={
                  statusFilter === s && s !== "all"
                    ? {
                        backgroundColor: STATUS_CONFIG[s].bg,
                        color: STATUS_CONFIG[s].color,
                        borderColor: STATUS_CONFIG[s].border,
                      }
                    : undefined
                }
              >
                {s === "all"
                  ? `All (${clients.length})`
                  : `${STATUS_CONFIG[s].label} (${clients.filter((c) => c.status === s).length})`}
              </button>
            ))}
          </motion.div>

          {/* ── Client Cards Grid ──────────────────────── */}
          {filteredClients.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {filteredClients.map((client, i) => {
                  const planCfg = client.plan
                    ? PLAN_CONFIG[client.plan]
                    : null;
                  const statusCfg = STATUS_CONFIG[client.status];
                  const isExpanded = expandedId === client.id;
                  const isEditingMrr = editingMrrId === client.id;
                  const isEditingNotes = editingNotesId === client.id;
                  const isConfirmingDelete = deleteConfirmId === client.id;

                  return (
                    <motion.div
                      key={client.id}
                      custom={i}
                      variants={gridItemVariants}
                      initial="hidden"
                      animate="visible"
                      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                      layout
                    >
                      <Card className="hover:border-[#3F3F46] transition-colors group relative overflow-hidden">
                        <CardContent className="p-5">
                          {/* Top row: name + status */}
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Building2 className="h-4 w-4 text-[#A1A1AA] shrink-0" />
                                <h3 className="text-sm font-bold text-[#FAFAFA] truncate">
                                  {client.business_name}
                                </h3>
                              </div>
                              {client.site_url && (
                                <a
                                  href={
                                    client.site_url.startsWith("http")
                                      ? client.site_url
                                      : `https://${client.site_url}`
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-[#0EA5E9] hover:text-[#38BDF8] transition-colors truncate max-w-full"
                                >
                                  <ExternalLink className="h-3 w-3 shrink-0" />
                                  <span className="truncate">
                                    {client.site_url.replace(
                                      /^https?:\/\//,
                                      "",
                                    )}
                                  </span>
                                </a>
                              )}
                            </div>
                            <button
                              onClick={() => handleStatusToggle(client)}
                              className="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider transition-all duration-200 hover:brightness-125 cursor-pointer"
                              style={{
                                backgroundColor: statusCfg.bg,
                                color: statusCfg.color,
                                border: `1px solid ${statusCfg.border}`,
                              }}
                              title="Click to change status"
                            >
                              {statusCfg.label}
                            </button>
                          </div>

                          {/* Plan + MRR row */}
                          <div className="flex items-center justify-between mb-3">
                            {planCfg ? (
                              <span
                                className="rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                                style={{
                                  backgroundColor: planCfg.bg,
                                  color: planCfg.color,
                                  border: `1px solid ${planCfg.border}`,
                                }}
                              >
                                {planCfg.label}
                              </span>
                            ) : (
                              <span className="text-[10px] text-[#71717A]">
                                No plan
                              </span>
                            )}

                            {/* MRR — click to edit inline */}
                            {isEditingMrr ? (
                              <div className="flex items-center gap-1">
                                <span className="text-sm text-[#71717A]">
                                  {"\u20AC"}
                                </span>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={editingMrrValue}
                                  onChange={(e) =>
                                    setEditingMrrValue(e.target.value)
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleMrrSave(client);
                                    if (e.key === "Escape")
                                      setEditingMrrId(null);
                                  }}
                                  autoFocus
                                  className="w-20 h-7 rounded-md border border-[#0EA5E9]/40 bg-[#09090B] px-2 text-sm font-bold text-[#22C55E] tabular-nums focus:outline-none focus:border-[#0EA5E9]"
                                />
                                <button
                                  onClick={() => handleMrrSave(client)}
                                  className="p-0.5 rounded text-[#22C55E] hover:bg-[#22C55E]/10 transition-colors"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => setEditingMrrId(null)}
                                  className="p-0.5 rounded text-[#71717A] hover:bg-[#27272A] transition-colors"
                                >
                                  <XIcon className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingMrrId(client.id);
                                  setEditingMrrValue(client.mrr.toString());
                                }}
                                className="group/mrr flex items-center gap-1 cursor-pointer"
                                title="Click to edit MRR"
                              >
                                <span className="text-lg font-bold text-[#22C55E] tabular-nums">
                                  {"\u20AC"}
                                  {client.mrr.toLocaleString("de-DE", {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0,
                                  })}
                                </span>
                                <Pencil className="h-3 w-3 text-[#71717A] opacity-0 group-hover/mrr:opacity-100 transition-opacity" />
                              </button>
                            )}
                          </div>

                          {/* Meta row: started date */}
                          <div className="flex items-center justify-between text-[11px] text-[#71717A]">
                            <span>
                              Since {formatDate(client.started_at)}
                            </span>
                            <span className="text-[#52525B]">/mo</span>
                          </div>

                          {/* Notes preview — click to expand */}
                          {client.notes && !isExpanded && (
                            <button
                              onClick={() => setExpandedId(client.id)}
                              className="mt-3 w-full text-left text-xs text-[#71717A] line-clamp-1 hover:text-[#A1A1AA] transition-colors cursor-pointer"
                            >
                              {client.notes}
                            </button>
                          )}

                          {/* Expanded section */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2, ease: "easeInOut" }}
                                className="overflow-hidden"
                              >
                                <div className="pt-3 mt-3 border-t border-[#27272A]">
                                  {/* Notes — editable */}
                                  <div className="mb-3">
                                    <div className="flex items-center justify-between mb-1.5">
                                      <span className="text-[10px] font-medium text-[#71717A] uppercase tracking-wider">
                                        Notes
                                      </span>
                                      {!isEditingNotes && (
                                        <button
                                          onClick={() => {
                                            setEditingNotesId(client.id);
                                            setEditingNotesValue(
                                              client.notes || "",
                                            );
                                          }}
                                          className="text-[10px] text-[#0EA5E9] hover:text-[#38BDF8] transition-colors"
                                        >
                                          Edit
                                        </button>
                                      )}
                                    </div>
                                    {isEditingNotes ? (
                                      <div className="space-y-2">
                                        <textarea
                                          value={editingNotesValue}
                                          onChange={(e) =>
                                            setEditingNotesValue(e.target.value)
                                          }
                                          onBlur={() => handleNotesSave(client)}
                                          onKeyDown={(e) => {
                                            if (
                                              e.key === "Escape"
                                            ) {
                                              setEditingNotesId(null);
                                            }
                                          }}
                                          autoFocus
                                          rows={3}
                                          className="w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3 py-2 text-xs text-[#FAFAFA] placeholder:text-[#71717A] focus:outline-none focus:border-[#0EA5E9] resize-none transition-colors"
                                          placeholder="Add notes..."
                                        />
                                        <div className="flex justify-end gap-2">
                                          <button
                                            onClick={() =>
                                              setEditingNotesId(null)
                                            }
                                            className="text-[10px] text-[#71717A] hover:text-[#A1A1AA] transition-colors"
                                          >
                                            Cancel
                                          </button>
                                          <button
                                            onClick={() =>
                                              handleNotesSave(client)
                                            }
                                            className="text-[10px] text-[#0EA5E9] hover:text-[#38BDF8] transition-colors"
                                          >
                                            Save
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <p className="text-xs text-[#A1A1AA] leading-relaxed whitespace-pre-wrap">
                                        {client.notes || "No notes yet."}
                                      </p>
                                    )}
                                  </div>

                                  {/* Actions row */}
                                  <div className="flex items-center justify-between">
                                    <button
                                      onClick={() => setExpandedId(null)}
                                      className="text-[10px] text-[#71717A] hover:text-[#A1A1AA] transition-colors"
                                    >
                                      Collapse
                                    </button>

                                    {isConfirmingDelete ? (
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-[#EF4444]">
                                          Delete?
                                        </span>
                                        <button
                                          onClick={() =>
                                            handleDelete(client)
                                          }
                                          className="text-[10px] font-medium text-[#EF4444] hover:text-[#F87171] transition-colors"
                                        >
                                          Yes
                                        </button>
                                        <button
                                          onClick={() =>
                                            setDeleteConfirmId(null)
                                          }
                                          className="text-[10px] text-[#71717A] hover:text-[#A1A1AA] transition-colors"
                                        >
                                          No
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() =>
                                          setDeleteConfirmId(client.id)
                                        }
                                        className="p-1 rounded text-[#71717A] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-all"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col items-center justify-center py-20 gap-4"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0EA5E9]/10">
                <Building2 className="h-7 w-7 text-[#0EA5E9]" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-[#FAFAFA]">
                  {statusFilter !== "all"
                    ? `No ${statusFilter} clients`
                    : "No clients yet"}
                </p>
                <p className="text-xs text-[#71717A] mt-1">
                  {statusFilter !== "all"
                    ? "Try a different filter or add a client."
                    : "Add your first client to start tracking MRR."}
                </p>
              </div>
              {statusFilter === "all" && (
                <Button
                  onClick={() => setModalOpen(true)}
                  size="sm"
                  className="gap-2 mt-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Client
                </Button>
              )}
            </motion.div>
          )}

          {/* ── MRR by Plan Breakdown ──────────────────── */}
          {mrrData &&
            mrrData.by_plan.length > 0 && (
              <motion.div
                custom={10}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
              >
                <Card className="hover:border-[#3F3F46] transition-colors">
                  <CardContent className="p-5">
                    <h3 className="text-xs font-medium text-[#71717A] uppercase tracking-wide mb-4">
                      MRR Breakdown by Plan
                    </h3>
                    <div className="space-y-3">
                      {mrrData.by_plan.map((item, i) => {
                        const planCfg =
                          PLAN_CONFIG[item.plan as SubscriptionTier] || {
                            label: item.plan,
                            color: "#A1A1AA",
                            bg: "rgba(161,161,170,0.12)",
                            border: "rgba(161,161,170,0.25)",
                          };
                        const percentage =
                          mrrData.total_mrr > 0
                            ? (item.mrr / mrrData.total_mrr) * 100
                            : 0;

                        return (
                          <motion.div
                            key={item.plan}
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{
                              delay: 0.4 + i * 0.05,
                              duration: 0.25,
                            }}
                            className="space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span
                                  className="h-2.5 w-2.5 rounded-full shrink-0"
                                  style={{
                                    backgroundColor: planCfg.color,
                                  }}
                                />
                                <span className="text-sm text-[#FAFAFA]">
                                  {planCfg.label}
                                </span>
                                <span className="text-[10px] text-[#71717A]">
                                  ({item.count}{" "}
                                  {item.count === 1
                                    ? "client"
                                    : "clients"}
                                  )
                                </span>
                              </div>
                              <span className="text-sm font-medium text-[#A1A1AA] tabular-nums">
                                {"\u20AC"}
                                {item.mrr.toLocaleString("de-DE", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-[#27272A] overflow-hidden">
                              <motion.div
                                className="h-full rounded-full"
                                style={{
                                  backgroundColor: planCfg.color,
                                }}
                                initial={{ width: 0 }}
                                animate={{
                                  width: `${percentage}%`,
                                }}
                                transition={{
                                  delay: 0.5 + i * 0.05,
                                  duration: 0.4,
                                  ease: "easeOut",
                                }}
                              />
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
        </>
      )}

      {/* ── Add Client Modal ─────────────────────────── */}
      <AddClientModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onClientCreated={(client) => {
          setClients((prev) =>
            [...prev, client].sort((a, b) =>
              a.business_name.localeCompare(b.business_name),
            ),
          );
          fetchData(); // Refresh MRR
        }}
      />
    </div>
  );
}

// ─── Add Client Modal ───────────────────────────────

interface AddClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientCreated: (client: Client) => void;
}

function AddClientModal({
  open,
  onOpenChange,
  onClientCreated,
}: AddClientModalProps) {
  const [form, setForm] = useState<AddClientForm>({
    ...INITIAL_FORM,
    started_at: todayISO(),
  });
  const [submitting, setSubmitting] = useState(false);

  function updateField<K extends keyof AddClientForm>(
    key: K,
    value: AddClientForm[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handlePlanChange(plan: SubscriptionTier) {
    const defaultMrr = PLAN_CONFIG[plan].defaultMrr;
    setForm((prev) => ({
      ...prev,
      plan,
      mrr: plan === "custom" ? prev.mrr : defaultMrr.toString(),
    }));
  }

  function resetForm() {
    setForm({ ...INITIAL_FORM, started_at: todayISO() });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.business_name.trim()) {
      toast.error("Business name is required");
      return;
    }

    const mrr = parseFloat(form.mrr) || 0;

    setSubmitting(true);

    const payload: Record<string, unknown> = {
      business_name: form.business_name.trim(),
      plan: form.plan,
      mrr,
      status: form.status,
      started_at: form.started_at || null,
    };

    if (form.site_url.trim()) payload.site_url = form.site_url.trim();
    if (form.lead_id.trim()) payload.lead_id = form.lead_id.trim();
    if (form.notes.trim()) payload.notes = form.notes.trim();

    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(
          (errBody as { error?: string } | null)?.error ??
            "Failed to add client",
        );
      }

      const created: Client = await res.json();
      onClientCreated(created);
      resetForm();
      onOpenChange(false);
      toast.success(`${created.business_name} added as client`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to add client",
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

            <Dialog.Content asChild>
              <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <motion.div
                  className="relative w-full max-w-md max-h-[85vh] overflow-y-auto rounded-xl border border-[#27272A] bg-[#18181B] shadow-2xl"
                  initial={{ scale: 0.95, y: 12 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.95, y: 12 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="sticky top-0 z-10 bg-[#18181B] border-b border-[#27272A] px-6 py-4 flex items-center justify-between">
                    <Dialog.Title className="text-lg font-bold text-[#FAFAFA] tracking-tight">
                      Add Client
                    </Dialog.Title>
                    <Dialog.Close asChild>
                      <button
                        className="rounded-lg p-1.5 text-[#71717A] hover:text-[#FAFAFA] hover:bg-[#27272A] transition-colors duration-150"
                        aria-label="Close"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </Dialog.Close>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
                    {/* Business Name */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-[#71717A] uppercase tracking-wide">
                        Business Name{" "}
                        <span className="text-[#EF4444]">*</span>
                      </Label>
                      <Input
                        value={form.business_name}
                        onChange={(e) =>
                          updateField("business_name", e.target.value)
                        }
                        placeholder="e.g. Apartmani ANITA"
                        required
                        className="bg-[#09090B] border-[#27272A] text-[#FAFAFA] placeholder:text-[#71717A] focus-visible:ring-[#0EA5E9] focus-visible:ring-offset-[#18181B]"
                      />
                    </div>

                    {/* Site URL */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-[#71717A] uppercase tracking-wide">
                        Site URL
                      </Label>
                      <Input
                        value={form.site_url}
                        onChange={(e) =>
                          updateField("site_url", e.target.value)
                        }
                        placeholder="e.g. apartmani-anita.vercel.app"
                        className="bg-[#09090B] border-[#27272A] text-[#FAFAFA] placeholder:text-[#71717A] focus-visible:ring-[#0EA5E9] focus-visible:ring-offset-[#18181B]"
                      />
                    </div>

                    {/* Plan */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-[#71717A] uppercase tracking-wide">
                        Plan
                      </Label>
                      <div className="grid grid-cols-3 gap-2">
                        {(
                          Object.entries(PLAN_CONFIG) as [
                            SubscriptionTier,
                            (typeof PLAN_CONFIG)[SubscriptionTier],
                          ][]
                        ).map(([key, cfg]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => handlePlanChange(key)}
                            className="h-10 rounded-lg text-xs font-medium transition-all duration-200"
                            style={
                              form.plan === key
                                ? {
                                    backgroundColor: cfg.bg,
                                    color: cfg.color,
                                    border: `1px solid ${cfg.border}`,
                                  }
                                : {
                                    backgroundColor: "#09090B",
                                    color: "#71717A",
                                    border: "1px solid #27272A",
                                  }
                            }
                          >
                            {cfg.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* MRR */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-[#71717A] uppercase tracking-wide">
                        MRR (EUR)
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#71717A]">
                          {"\u20AC"}
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={form.mrr}
                          onChange={(e) => updateField("mrr", e.target.value)}
                          placeholder="0.00"
                          className="pl-8 bg-[#09090B] border-[#27272A] text-[#FAFAFA] placeholder:text-[#71717A] focus-visible:ring-[#0EA5E9] focus-visible:ring-offset-[#18181B] tabular-nums"
                        />
                      </div>
                    </div>

                    {/* Status */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-[#71717A] uppercase tracking-wide">
                        Status
                      </Label>
                      <div className="grid grid-cols-3 gap-2">
                        {(
                          Object.entries(STATUS_CONFIG) as [
                            ClientStatus,
                            (typeof STATUS_CONFIG)[ClientStatus],
                          ][]
                        ).map(([key, cfg]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => updateField("status", key)}
                            className="h-10 rounded-lg text-xs font-medium transition-all duration-200"
                            style={
                              form.status === key
                                ? {
                                    backgroundColor: cfg.bg,
                                    color: cfg.color,
                                    border: `1px solid ${cfg.border}`,
                                  }
                                : {
                                    backgroundColor: "#09090B",
                                    color: "#71717A",
                                    border: "1px solid #27272A",
                                  }
                            }
                          >
                            {cfg.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Start Date */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-[#71717A] uppercase tracking-wide">
                        Start Date
                      </Label>
                      <Input
                        type="date"
                        value={form.started_at}
                        onChange={(e) =>
                          updateField("started_at", e.target.value)
                        }
                        className="bg-[#09090B] border-[#27272A] text-[#FAFAFA] focus-visible:ring-[#0EA5E9] focus-visible:ring-offset-[#18181B] [color-scheme:dark]"
                      />
                    </div>

                    {/* Lead ID */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-[#71717A] uppercase tracking-wide">
                        Link to Lead (optional)
                      </Label>
                      <Input
                        value={form.lead_id}
                        onChange={(e) =>
                          updateField("lead_id", e.target.value)
                        }
                        placeholder="Lead UUID (optional)"
                        className="bg-[#09090B] border-[#27272A] text-[#FAFAFA] placeholder:text-[#71717A] focus-visible:ring-[#0EA5E9] focus-visible:ring-offset-[#18181B] font-mono text-xs"
                      />
                    </div>

                    {/* Notes */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-[#71717A] uppercase tracking-wide">
                        Notes
                      </Label>
                      <textarea
                        value={form.notes}
                        onChange={(e) => updateField("notes", e.target.value)}
                        placeholder="Any notes about this client..."
                        rows={3}
                        className="flex w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3 py-2 text-sm text-[#FAFAFA] placeholder:text-[#71717A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0EA5E9] focus-visible:ring-offset-2 focus-visible:ring-offset-[#18181B] resize-none transition-colors duration-200"
                      />
                    </div>

                    {/* Submit */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        disabled={submitting}
                        className="text-[#A1A1AA]"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={submitting || !form.business_name.trim()}
                        className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white"
                      >
                        {submitting ? "Adding..." : "Add Client"}
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
