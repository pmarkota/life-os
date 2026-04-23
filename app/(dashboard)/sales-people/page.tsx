"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserCog,
  Plus,
  Pencil,
  Trash2,
  Mail,
  Shield,
  Zap,
  Bot,
  RefreshCw,
  ArrowLeft,
  Users2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Profile } from "@/types";
import { AddSalesPersonModal } from "@/components/sales/add-sales-person-modal";
import { EditSalesPersonModal } from "@/components/sales/edit-sales-person-modal";
import { DeleteSalesPersonDialog } from "@/components/sales/delete-sales-person-dialog";

// ── Animation variants ────────────────────────────

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: 0.1 + i * 0.05, duration: 0.3, ease: "easeOut" as const },
  }),
};

// ── Permission badge helper ───────────────────────

function PermissionBadge({
  label,
  active,
  activeColor,
  icon: Icon,
}: {
  label: string;
  active: boolean;
  activeColor: "green" | "red" | "blue";
  icon: React.ComponentType<{ className?: string }>;
}) {
  const activeStyles = {
    green: {
      bg: "rgba(34,197,94,0.1)",
      color: "#22C55E",
      border: "rgba(34,197,94,0.25)",
    },
    blue: {
      bg: "rgba(14,165,233,0.1)",
      color: "#0EA5E9",
      border: "rgba(14,165,233,0.25)",
    },
    red: {
      bg: "rgba(239,68,68,0.1)",
      color: "#EF4444",
      border: "rgba(239,68,68,0.25)",
    },
  } as const;

  const style = active
    ? {
        backgroundColor: activeStyles[activeColor].bg,
        color: activeStyles[activeColor].color,
        borderColor: activeStyles[activeColor].border,
      }
    : {
        backgroundColor: "transparent",
        color: "#52525B",
        borderColor: "#27272A",
      };

  return (
    <span
      className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={style}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

// ── Main Page ─────────────────────────────────────

export default function SalesPeoplePage() {
  const [me, setMe] = useState<Profile | null>(null);
  const [meLoading, setMeLoading] = useState(true);
  const [meError, setMeError] = useState<string | null>(null);

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [deleting, setDeleting] = useState<Profile | null>(null);

  // ── Fetch current profile first ─────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/me");
        if (!res.ok) {
          if (!cancelled) setMeError("Not signed in");
          return;
        }
        const data: Profile = await res.json();
        if (!cancelled) setMe(data);
      } catch {
        if (!cancelled) setMeError("Failed to load profile");
      } finally {
        if (!cancelled) setMeLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Fetch sales people (only for admin) ──────────
  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sales-people");
      if (!res.ok) throw new Error("Failed to fetch sales people");
      const data: Profile[] = await res.json();
      setProfiles(data);
    } catch {
      toast.error("Failed to load sales people");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (me?.role === "admin") {
      fetchProfiles();
    }
  }, [me, fetchProfiles]);

  // ── Only sales in the list; admins are filtered out ──
  const salesProfiles = useMemo(
    () => profiles.filter((p) => p.role === "sales"),
    [profiles],
  );

  // ── Handlers ────────────────────────────────────

  const handleCreated = useCallback((created: Profile) => {
    setProfiles((prev) => {
      // Replace if id already present (shouldn't be) else append
      const withoutDup = prev.filter((p) => p.id !== created.id);
      return [...withoutDup, created].sort((a, b) =>
        (a.full_name ?? "").localeCompare(b.full_name ?? ""),
      );
    });
  }, []);

  const handleUpdated = useCallback((updated: Profile) => {
    setProfiles((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p)),
    );
  }, []);

  const handleDeleted = useCallback((id: string) => {
    setProfiles((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // ── Unauthorized / loading states ───────────────

  if (meLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-[#71717A]">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  if (meError || !me || me.role !== "admin") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="max-w-md w-full border-[#27272A] bg-[#18181B]">
          <CardContent className="p-8 space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#EF4444]/10">
              <Shield className="h-6 w-6 text-[#EF4444]" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-lg font-bold text-[#FAFAFA] tracking-tight">
                Not authorized
              </h2>
              <p className="text-sm text-[#A1A1AA] leading-relaxed">
                Only the admin can manage sales people. If you think this is a
                mistake, ask Petar to check your role.
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#27272A] bg-[#09090B] px-4 py-2 text-sm font-medium text-[#A1A1AA] transition-colors hover:border-[#3F3F46] hover:text-[#FAFAFA]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Command Center
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Admin view ──────────────────────────────────

  return (
    <div className="flex flex-col gap-6 pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0EA5E9]/10">
            <UserCog className="h-5 w-5 text-[#0EA5E9]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#FAFAFA]">
              Sales People
            </h1>
            <p className="text-sm text-[#71717A] mt-0.5">
              Manage team accounts, permissions, and access.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchProfiles}
            className="h-9 w-9"
            aria-label="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button
            onClick={() => setAddOpen(true)}
            className="gap-2 shrink-0 bg-[#0EA5E9] hover:bg-[#0284C7] text-[#09090B] font-medium"
          >
            <Plus className="h-4 w-4" />
            Add Sales Person
          </Button>
        </div>
      </motion.div>

      {/* Count pill */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-2"
      >
        <div className="inline-flex items-center gap-1.5 rounded-lg border border-[#27272A] bg-[#18181B] px-3 py-1.5">
          <Users2 className="h-3.5 w-3.5 text-[#71717A]" />
          <span className="text-xs font-medium text-[#A1A1AA] tabular-nums">
            {salesProfiles.length}{" "}
            {salesProfiles.length === 1 ? "sales person" : "sales people"}
          </span>
        </div>
      </motion.div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="flex items-center gap-3 text-[#71717A]">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading sales people...</span>
          </div>
        </div>
      ) : salesProfiles.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-dashed border-[#27272A] bg-[#18181B]/50">
            <CardContent className="p-12 flex flex-col items-center text-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0EA5E9]/10">
                <UserCog className="h-6 w-6 text-[#0EA5E9]" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-semibold text-[#FAFAFA]">
                  No sales people yet
                </p>
                <p className="text-sm text-[#71717A] max-w-md">
                  Add your first teammate and pick a permission preset. They&apos;ll
                  sign in with the email and password you create for them.
                </p>
              </div>
              <Button
                onClick={() => setAddOpen(true)}
                className="mt-2 gap-2 bg-[#0EA5E9] hover:bg-[#0284C7] text-[#09090B] font-medium"
              >
                <Plus className="h-4 w-4" />
                Add Sales Person
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {salesProfiles.map((profile, i) => (
              <motion.div
                key={profile.id}
                custom={i}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, scale: 0.95 }}
                layout
              >
                <Card className="border-[#27272A] bg-[#18181B] hover:border-[#3F3F46] transition-colors h-full flex flex-col">
                  <CardContent className="p-5 flex flex-col gap-4 flex-1">
                    {/* Identity */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-bold text-[#FAFAFA] tracking-tight truncate">
                          {profile.full_name ?? "Unnamed"}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Mail className="h-3 w-3 text-[#52525B] shrink-0" />
                          <p className="text-xs text-[#71717A] truncate">
                            {profile.email}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className="shrink-0 border-[#27272A] bg-[#09090B] text-[10px] uppercase tracking-wide text-[#A1A1AA]"
                      >
                        {profile.role}
                      </Badge>
                    </div>

                    {/* Permissions */}
                    <div className="flex flex-wrap gap-1.5">
                      <PermissionBadge
                        label="Lead Gen"
                        active={profile.permissions.can_use_leadgen}
                        activeColor="green"
                        icon={Zap}
                      />
                      <PermissionBadge
                        label="AI Messages"
                        active={profile.permissions.can_generate_messages}
                        activeColor="green"
                        icon={Bot}
                      />
                      <PermissionBadge
                        label="Can Delete"
                        active={profile.permissions.can_delete_lead}
                        activeColor="red"
                        icon={Trash2}
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-auto pt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditing(profile)}
                        className="flex-1 h-9 gap-1.5 border border-[#27272A] bg-[#09090B] text-[#A1A1AA] hover:border-[#3F3F46] hover:bg-[#27272A] hover:text-[#FAFAFA]"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleting(profile)}
                        className="h-9 w-9 p-0 border border-[#27272A] bg-[#09090B] text-[#71717A] hover:border-[#EF4444]/50 hover:bg-[#EF4444]/10 hover:text-[#EF4444]"
                        aria-label={`Delete ${profile.full_name ?? profile.email}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modals */}
      <AddSalesPersonModal
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={handleCreated}
      />
      <EditSalesPersonModal
        open={editing !== null}
        onOpenChange={(next) => {
          if (!next) setEditing(null);
        }}
        profile={editing}
        onUpdated={handleUpdated}
      />
      <DeleteSalesPersonDialog
        open={deleting !== null}
        onOpenChange={(next) => {
          if (!next) setDeleting(null);
        }}
        profile={deleting}
        onDeleted={handleDeleted}
      />
    </div>
  );
}
