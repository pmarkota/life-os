"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { X, UserCog } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PERMISSION_PRESETS,
  type PermissionPreset,
  type Profile,
} from "@/types";

interface AddSalesPersonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (profile: Profile) => void;
}

interface FormState {
  full_name: string;
  email: string;
  password: string;
  preset: PermissionPreset;
}

const INITIAL_FORM: FormState = {
  full_name: "",
  email: "",
  password: "",
  preset: "standard",
};

const PRESET_ORDER: PermissionPreset[] = ["viewer", "standard", "senior"];

export function AddSalesPersonModal({
  open,
  onOpenChange,
  onCreated,
}: AddSalesPersonModalProps) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function resetForm() {
    setForm(INITIAL_FORM);
  }

  const passwordError =
    form.password.length > 0 && form.password.length < 8
      ? "Password must be at least 8 characters"
      : null;

  const canSubmit =
    form.full_name.trim().length > 0 &&
    form.email.trim().length > 0 &&
    form.password.length >= 8 &&
    !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.full_name.trim()) {
      toast.error("Full name is required");
      return;
    }
    if (!form.email.trim()) {
      toast.error("Email is required");
      return;
    }
    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/sales-people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
          full_name: form.full_name.trim(),
          preset: form.preset,
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(
          (errBody as { error?: string } | null)?.error ??
            "Failed to create sales person",
        );
      }

      const created: Profile = await res.json();
      onCreated(created);
      resetForm();
      onOpenChange(false);
      toast.success(
        `Sales person "${created.full_name ?? created.email}" created`,
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create sales person",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const selectedPreset = PERMISSION_PRESETS[form.preset];

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) resetForm();
        onOpenChange(next);
      }}
    >
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
                  className="relative w-full max-w-md max-h-[85vh] overflow-y-auto rounded-xl border border-[#27272A] bg-[#18181B] shadow-2xl"
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
                        <UserCog className="h-4 w-4 text-[#0EA5E9]" />
                      </div>
                      <Dialog.Title className="text-lg font-bold text-[#FAFAFA] tracking-tight">
                        Add Sales Person
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
                  <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                    {/* Full Name */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-[#71717A] uppercase tracking-wide">
                        Full Name <span className="text-[#EF4444]">*</span>
                      </Label>
                      <Input
                        value={form.full_name}
                        onChange={(e) => updateField("full_name", e.target.value)}
                        placeholder="e.g. Ivan Horvat"
                        required
                        className="bg-[#09090B] border-[#27272A] text-[#FAFAFA] placeholder:text-[#71717A] focus-visible:ring-[#0EA5E9] focus-visible:ring-offset-[#18181B]"
                      />
                    </div>

                    {/* Email */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-[#71717A] uppercase tracking-wide">
                        Email <span className="text-[#EF4444]">*</span>
                      </Label>
                      <Input
                        type="email"
                        value={form.email}
                        onChange={(e) => updateField("email", e.target.value)}
                        placeholder="name@example.com"
                        required
                        className="bg-[#09090B] border-[#27272A] text-[#FAFAFA] placeholder:text-[#71717A] focus-visible:ring-[#0EA5E9] focus-visible:ring-offset-[#18181B]"
                      />
                    </div>

                    {/* Password */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-[#71717A] uppercase tracking-wide">
                        Password <span className="text-[#EF4444]">*</span>
                      </Label>
                      <Input
                        type="password"
                        value={form.password}
                        onChange={(e) => updateField("password", e.target.value)}
                        placeholder="At least 8 characters"
                        required
                        minLength={8}
                        className="bg-[#09090B] border-[#27272A] text-[#FAFAFA] placeholder:text-[#71717A] focus-visible:ring-[#0EA5E9] focus-visible:ring-offset-[#18181B]"
                      />
                      {passwordError ? (
                        <p className="text-xs text-[#EF4444]">{passwordError}</p>
                      ) : (
                        <p className="text-xs text-[#52525B]">
                          Share this password with the new sales person.
                        </p>
                      )}
                    </div>

                    {/* Preset */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-[#71717A] uppercase tracking-wide">
                        Permission Preset
                      </Label>
                      <select
                        value={form.preset}
                        onChange={(e) =>
                          updateField("preset", e.target.value as PermissionPreset)
                        }
                        className="flex h-10 w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3 py-2 text-sm text-[#FAFAFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0EA5E9] focus-visible:ring-offset-2 focus-visible:ring-offset-[#18181B] transition-colors duration-200"
                      >
                        {PRESET_ORDER.map((key) => (
                          <option key={key} value={key}>
                            {PERMISSION_PRESETS[key].label}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-[#71717A] leading-relaxed">
                        {selectedPreset.description}
                      </p>
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
                        {submitting ? "Creating..." : "Create Sales Person"}
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
