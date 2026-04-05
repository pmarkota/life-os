"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Lead, LeadNiche, LeadChannel, LeadMarket } from "@/types";

// ---------- constants ----------

const NICHE_OPTIONS: { value: LeadNiche; label: string }[] = [
  { value: "dental", label: "Dental" },
  { value: "frizer", label: "Frizer" },
  { value: "restoran", label: "Restoran" },
  { value: "autoservis", label: "Autoservis" },
  { value: "fizioterapija", label: "Fizioterapija" },
  { value: "wellness", label: "Wellness" },
  { value: "fitness", label: "Fitness" },
  { value: "apartmani", label: "Apartmani" },
  { value: "kozmetika", label: "Kozmetika" },
  { value: "pekara", label: "Pekara" },
  { value: "ostalo", label: "Ostalo" },
];

const CHANNEL_OPTIONS: { value: LeadChannel; label: string }[] = [
  { value: "instagram_dm", label: "Instagram DM" },
  { value: "email", label: "Email" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "telefon", label: "Telefon" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "osobno", label: "Osobno" },
];

const MARKET_OPTIONS: { value: LeadMarket; label: string }[] = [
  { value: "hr", label: "Croatia (HR)" },
  { value: "dach", label: "DACH" },
  { value: "us", label: "US" },
];

// ---------- types ----------

interface FormData {
  business_name: string;
  contact_name: string;
  email: string;
  phone: string;
  website_url: string;
  location: string;
  niche: LeadNiche | "";
  source: string;
  instagram: string;
  channel: LeadChannel | "";
  market: LeadMarket | "";
  first_message: string;
  page_speed: string;
  notes: string;
}

const INITIAL_FORM: FormData = {
  business_name: "",
  contact_name: "",
  email: "",
  phone: "",
  website_url: "",
  location: "",
  niche: "",
  source: "",
  instagram: "",
  channel: "",
  market: "",
  first_message: "",
  page_speed: "",
  notes: "",
};

// ---------- props ----------

interface AddLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeadCreated: (lead: Lead) => void;
}

// ---------- component ----------

export function AddLeadModal({
  open,
  onOpenChange,
  onLeadCreated,
}: AddLeadModalProps) {
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);

  function updateField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function resetForm() {
    setForm(INITIAL_FORM);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.business_name.trim()) {
      toast.error("Business name is required");
      return;
    }

    setSubmitting(true);

    const payload: Record<string, string | number | null> = {
      business_name: form.business_name.trim(),
      contact_name: form.contact_name.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      website_url: form.website_url.trim() || null,
      location: form.location.trim() || null,
      niche: form.niche || null,
      source: form.source.trim() || null,
      instagram: form.instagram.trim() || null,
      channel: form.channel || null,
      market: form.market || null,
      first_message: form.first_message.trim() || null,
      page_speed: form.page_speed ? parseInt(form.page_speed, 10) : null,
      notes: form.notes.trim() || null,
    };

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(
          (errBody as { error?: string } | null)?.error ?? "Failed to create lead"
        );
      }

      const created: Lead = await res.json();
      onLeadCreated(created);
      resetForm();
      onOpenChange(false);
      toast.success(`Lead "${created.business_name}" created`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create lead");
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
                    <Dialog.Title className="text-lg font-bold text-[#FAFAFA] tracking-tight">
                      Add New Lead
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
                  <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                    {/* Business name — required */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-[#71717A] uppercase tracking-wide">
                        Business Name <span className="text-[#EF4444]">*</span>
                      </Label>
                      <Input
                        value={form.business_name}
                        onChange={(e) => updateField("business_name", e.target.value)}
                        placeholder="e.g. Apartmani Sunce"
                        required
                        className="bg-[#09090B] border-[#27272A] text-[#FAFAFA] placeholder:text-[#71717A] focus-visible:ring-[#0EA5E9] focus-visible:ring-offset-[#18181B]"
                      />
                    </div>

                    {/* Two column grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-[#71717A] uppercase tracking-wide">
                          Contact Name
                        </Label>
                        <Input
                          value={form.contact_name}
                          onChange={(e) => updateField("contact_name", e.target.value)}
                          placeholder="Owner name"
                          className="bg-[#09090B] border-[#27272A] text-[#FAFAFA] placeholder:text-[#71717A] focus-visible:ring-[#0EA5E9] focus-visible:ring-offset-[#18181B]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-[#71717A] uppercase tracking-wide">
                          Email
                        </Label>
                        <Input
                          type="email"
                          value={form.email}
                          onChange={(e) => updateField("email", e.target.value)}
                          placeholder="info@business.com"
                          className="bg-[#09090B] border-[#27272A] text-[#FAFAFA] placeholder:text-[#71717A] focus-visible:ring-[#0EA5E9] focus-visible:ring-offset-[#18181B]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-[#71717A] uppercase tracking-wide">
                          Phone
                        </Label>
                        <Input
                          value={form.phone}
                          onChange={(e) => updateField("phone", e.target.value)}
                          placeholder="+385 91 ..."
                          className="bg-[#09090B] border-[#27272A] text-[#FAFAFA] placeholder:text-[#71717A] focus-visible:ring-[#0EA5E9] focus-visible:ring-offset-[#18181B]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-[#71717A] uppercase tracking-wide">
                          Website URL
                        </Label>
                        <Input
                          type="url"
                          value={form.website_url}
                          onChange={(e) => updateField("website_url", e.target.value)}
                          placeholder="https://..."
                          className="bg-[#09090B] border-[#27272A] text-[#FAFAFA] placeholder:text-[#71717A] focus-visible:ring-[#0EA5E9] focus-visible:ring-offset-[#18181B]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-[#71717A] uppercase tracking-wide">
                          Location
                        </Label>
                        <Input
                          value={form.location}
                          onChange={(e) => updateField("location", e.target.value)}
                          placeholder="e.g. Split, Dubrovnik"
                          className="bg-[#09090B] border-[#27272A] text-[#FAFAFA] placeholder:text-[#71717A] focus-visible:ring-[#0EA5E9] focus-visible:ring-offset-[#18181B]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-[#71717A] uppercase tracking-wide">
                          Niche
                        </Label>
                        <select
                          value={form.niche}
                          onChange={(e) => updateField("niche", e.target.value as LeadNiche | "")}
                          className="flex h-10 w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3 py-2 text-sm text-[#FAFAFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0EA5E9] focus-visible:ring-offset-2 focus-visible:ring-offset-[#18181B] transition-colors duration-200"
                        >
                          <option value="">Select niche</option>
                          {NICHE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-[#71717A] uppercase tracking-wide">
                          Instagram
                        </Label>
                        <Input
                          value={form.instagram}
                          onChange={(e) => updateField("instagram", e.target.value)}
                          placeholder="@handle"
                          className="bg-[#09090B] border-[#27272A] text-[#FAFAFA] placeholder:text-[#71717A] focus-visible:ring-[#0EA5E9] focus-visible:ring-offset-[#18181B]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-[#71717A] uppercase tracking-wide">
                          Channel
                        </Label>
                        <select
                          value={form.channel}
                          onChange={(e) => updateField("channel", e.target.value as LeadChannel | "")}
                          className="flex h-10 w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3 py-2 text-sm text-[#FAFAFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0EA5E9] focus-visible:ring-offset-2 focus-visible:ring-offset-[#18181B] transition-colors duration-200"
                        >
                          <option value="">Select channel</option>
                          {CHANNEL_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-[#71717A] uppercase tracking-wide">
                          Market
                        </Label>
                        <select
                          value={form.market}
                          onChange={(e) => updateField("market", e.target.value as LeadMarket | "")}
                          className="flex h-10 w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3 py-2 text-sm text-[#FAFAFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0EA5E9] focus-visible:ring-offset-2 focus-visible:ring-offset-[#18181B] transition-colors duration-200"
                        >
                          <option value="">Select market</option>
                          {MARKET_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-[#71717A] uppercase tracking-wide">
                          Source
                        </Label>
                        <Input
                          value={form.source}
                          onChange={(e) => updateField("source", e.target.value)}
                          placeholder="e.g. leadgen_script, manual, referral"
                          className="bg-[#09090B] border-[#27272A] text-[#FAFAFA] placeholder:text-[#71717A] focus-visible:ring-[#0EA5E9] focus-visible:ring-offset-[#18181B]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-[#71717A] uppercase tracking-wide">
                          Page Speed
                        </Label>
                        <Input
                          type="number"
                          value={form.page_speed}
                          onChange={(e) => updateField("page_speed", e.target.value)}
                          placeholder="e.g. 45"
                          className="bg-[#09090B] border-[#27272A] text-[#FAFAFA] placeholder:text-[#71717A] focus-visible:ring-[#0EA5E9] focus-visible:ring-offset-[#18181B]"
                        />
                      </div>
                    </div>

                    {/* First Message */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-[#71717A] uppercase tracking-wide">
                        First Message
                      </Label>
                      <textarea
                        value={form.first_message}
                        onChange={(e) => updateField("first_message", e.target.value)}
                        placeholder="Initial outreach message..."
                        rows={3}
                        className="flex w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3 py-2 text-sm text-[#FAFAFA] placeholder:text-[#71717A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0EA5E9] focus-visible:ring-offset-2 focus-visible:ring-offset-[#18181B] transition-colors duration-200 resize-none"
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
                        placeholder="Any initial notes about this lead..."
                        rows={3}
                        className="flex w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3 py-2 text-sm text-[#FAFAFA] placeholder:text-[#71717A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0EA5E9] focus-visible:ring-offset-2 focus-visible:ring-offset-[#18181B] transition-colors duration-200 resize-none"
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
                        {submitting ? "Adding..." : "Add Lead"}
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
