"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { X, Pencil, Shield, Zap, Bot, Pencil as PencilEdit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PERMISSION_PRESETS,
  type PermissionPreset,
  type Profile,
  type ProfilePermissions,
} from "@/types";

interface EditSalesPersonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile | null;
  onUpdated: (profile: Profile) => void;
}

const PRESET_ORDER: PermissionPreset[] = ["viewer", "standard", "senior"];

// Map each permission key to a presentation config (label, icon, color)
type PermissionKey = keyof ProfilePermissions;

const PERMISSION_META: Record<
  PermissionKey,
  {
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  can_use_leadgen: {
    label: "Lead Generator",
    description: "Can run searches in the Lead Generator",
    icon: Zap,
  },
  can_generate_messages: {
    label: "AI Messages",
    description: "Can generate AI cold emails / DMs",
    icon: Bot,
  },
  can_edit_lead: {
    label: "Edit Leads",
    description: "Can edit the leads they are assigned to",
    icon: PencilEdit,
  },
  can_delete_lead: {
    label: "Delete Leads",
    description: "Can permanently delete assigned leads",
    icon: Trash2,
  },
};

function permissionsMatchPreset(
  permissions: ProfilePermissions,
  preset: PermissionPreset,
): boolean {
  const p = PERMISSION_PRESETS[preset].permissions;
  return (
    p.can_use_leadgen === permissions.can_use_leadgen &&
    p.can_generate_messages === permissions.can_generate_messages &&
    p.can_edit_lead === permissions.can_edit_lead &&
    p.can_delete_lead === permissions.can_delete_lead
  );
}

function detectPreset(permissions: ProfilePermissions): PermissionPreset | "" {
  for (const preset of PRESET_ORDER) {
    if (permissionsMatchPreset(permissions, preset)) return preset;
  }
  return "";
}

export function EditSalesPersonModal({
  open,
  onOpenChange,
  profile,
  onUpdated,
}: EditSalesPersonModalProps) {
  const [fullName, setFullName] = useState("");
  const [permissions, setPermissions] = useState<ProfilePermissions>({
    can_use_leadgen: false,
    can_generate_messages: false,
    can_edit_lead: true,
    can_delete_lead: false,
  });
  const [preset, setPreset] = useState<PermissionPreset | "">("");
  const [newPassword, setNewPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Hydrate form whenever the modal is opened with a new profile
  useEffect(() => {
    if (!open || !profile) return;
    setFullName(profile.full_name ?? "");
    setPermissions(profile.permissions);
    setPreset(detectPreset(profile.permissions));
    setNewPassword("");
  }, [open, profile]);

  function applyPreset(next: PermissionPreset) {
    setPreset(next);
    setPermissions(PERMISSION_PRESETS[next].permissions);
  }

  function togglePermission(key: PermissionKey) {
    setPermissions((prev) => {
      const updated: ProfilePermissions = { ...prev, [key]: !prev[key] };
      // If the manual toggle no longer matches the selected preset, mark as custom
      setPreset(detectPreset(updated));
      return updated;
    });
  }

  const passwordError =
    newPassword.length > 0 && newPassword.length < 8
      ? "Password must be at least 8 characters"
      : null;

  const canSubmit =
    !!profile &&
    fullName.trim().length > 0 &&
    (newPassword.length === 0 || newPassword.length >= 8) &&
    !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;

    if (!fullName.trim()) {
      toast.error("Full name is required");
      return;
    }
    if (newPassword.length > 0 && newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setSubmitting(true);
    try {
      const body: {
        full_name: string;
        permissions: ProfilePermissions;
        password?: string;
      } = {
        full_name: fullName.trim(),
        permissions,
      };
      if (newPassword.length >= 8) body.password = newPassword;

      const res = await fetch(`/api/sales-people/${profile.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(
          (errBody as { error?: string } | null)?.error ??
            "Failed to update sales person",
        );
      }

      const updated: Profile = await res.json();
      onUpdated(updated);
      onOpenChange(false);
      toast.success(
        `${updated.full_name ?? updated.email} updated${
          newPassword ? " (password reset)" : ""
        }`,
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update sales person",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && profile && (
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
                  <div className="sticky top-0 z-10 bg-[#18181B] border-b border-[#27272A] px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0EA5E9]/10">
                        <Pencil className="h-4 w-4 text-[#0EA5E9]" />
                      </div>
                      <Dialog.Title className="text-lg font-bold text-[#FAFAFA] tracking-tight">
                        Edit Sales Person
                      </Dialog.Title>
                    </div>
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
                    {/* Full Name */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-[#71717A] uppercase tracking-wide">
                        Full Name <span className="text-[#EF4444]">*</span>
                      </Label>
                      <Input
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        className="bg-[#09090B] border-[#27272A] text-[#FAFAFA] placeholder:text-[#71717A] focus-visible:ring-[#0EA5E9] focus-visible:ring-offset-[#18181B]"
                      />
                    </div>

                    {/* Email — read-only */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-[#71717A] uppercase tracking-wide">
                        Email
                      </Label>
                      <Input
                        type="email"
                        value={profile.email}
                        disabled
                        readOnly
                        className="bg-[#09090B]/60 border-[#27272A] text-[#71717A] cursor-not-allowed"
                      />
                      <p className="text-xs text-[#52525B]">
                        Email cannot be changed.
                      </p>
                    </div>

                    {/* Preset */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-[#71717A] uppercase tracking-wide">
                        Permission Preset
                      </Label>
                      <select
                        value={preset}
                        onChange={(e) => {
                          const next = e.target.value as PermissionPreset | "";
                          if (next === "") return;
                          applyPreset(next);
                        }}
                        className="flex h-10 w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3 py-2 text-sm text-[#FAFAFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0EA5E9] focus-visible:ring-offset-2 focus-visible:ring-offset-[#18181B] transition-colors duration-200"
                      >
                        {preset === "" && (
                          <option value="">Custom (manual toggles)</option>
                        )}
                        {PRESET_ORDER.map((key) => (
                          <option key={key} value={key}>
                            {PERMISSION_PRESETS[key].label}
                          </option>
                        ))}
                      </select>
                      {preset !== "" && (
                        <p className="text-xs text-[#71717A] leading-relaxed">
                          {PERMISSION_PRESETS[preset].description}
                        </p>
                      )}
                      {preset === "" && (
                        <p className="text-xs text-[#F59E0B] leading-relaxed">
                          Custom — these permissions don&apos;t match any preset.
                        </p>
                      )}
                    </div>

                    {/* Permissions toggles */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Shield className="h-3.5 w-3.5 text-[#71717A]" />
                        <Label className="text-xs font-medium text-[#71717A] uppercase tracking-wide">
                          Permissions
                        </Label>
                      </div>
                      <div className="space-y-2">
                        {(Object.keys(PERMISSION_META) as PermissionKey[]).map(
                          (key) => {
                            const meta = PERMISSION_META[key];
                            const Icon = meta.icon;
                            const active = permissions[key];
                            return (
                              <button
                                key={key}
                                type="button"
                                onClick={() => togglePermission(key)}
                                className={`w-full flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition-colors duration-150 ${
                                  active
                                    ? "border-[#0EA5E9]/40 bg-[#0EA5E9]/5"
                                    : "border-[#27272A] bg-[#09090B] hover:border-[#3F3F46]"
                                }`}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div
                                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                                      active
                                        ? "bg-[#0EA5E9]/15"
                                        : "bg-[#18181B]"
                                    }`}
                                  >
                                    <Icon
                                      className={`h-4 w-4 ${
                                        active
                                          ? "text-[#0EA5E9]"
                                          : "text-[#52525B]"
                                      }`}
                                    />
                                  </div>
                                  <div className="min-w-0 text-left">
                                    <p
                                      className={`text-sm font-medium ${
                                        active
                                          ? "text-[#FAFAFA]"
                                          : "text-[#A1A1AA]"
                                      }`}
                                    >
                                      {meta.label}
                                    </p>
                                    <p className="text-xs text-[#71717A] truncate">
                                      {meta.description}
                                    </p>
                                  </div>
                                </div>
                                {/* Toggle pill */}
                                <div
                                  className={`relative flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 ${
                                    active ? "bg-[#0EA5E9]" : "bg-[#27272A]"
                                  }`}
                                  aria-hidden
                                >
                                  <motion.div
                                    layout
                                    transition={{
                                      type: "spring",
                                      stiffness: 500,
                                      damping: 30,
                                    }}
                                    className={`absolute h-4 w-4 rounded-full bg-white shadow ${
                                      active ? "right-0.5" : "left-0.5"
                                    }`}
                                  />
                                </div>
                              </button>
                            );
                          },
                        )}
                      </div>
                    </div>

                    {/* Reset password */}
                    <div className="space-y-1.5 pt-1">
                      <Label className="text-xs font-medium text-[#71717A] uppercase tracking-wide">
                        Reset Password (optional)
                      </Label>
                      <Input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Leave blank to keep current"
                        className="bg-[#09090B] border-[#27272A] text-[#FAFAFA] placeholder:text-[#71717A] focus-visible:ring-[#0EA5E9] focus-visible:ring-offset-[#18181B]"
                      />
                      {passwordError ? (
                        <p className="text-xs text-[#EF4444]">{passwordError}</p>
                      ) : (
                        <p className="text-xs text-[#52525B]">
                          Only filled in if you want to change it. Must be ≥ 8
                          characters.
                        </p>
                      )}
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
                        disabled={!canSubmit}
                        className="bg-[#0EA5E9] hover:bg-[#0284C7] text-[#09090B] font-medium"
                      >
                        {submitting ? "Saving..." : "Save Changes"}
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
