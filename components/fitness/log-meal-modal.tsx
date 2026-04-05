"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import type { Meal, MealType, MealSource } from "@/types";

// ─── Options ────────────────────────────────────────

const MEAL_TYPE_OPTIONS: { value: MealType; label: string }[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
];

const MEAL_SOURCE_OPTIONS: { value: MealSource; label: string }[] = [
  { value: "home", label: "Home" },
  { value: "konzum", label: "Konzum" },
  { value: "fast_food", label: "Fast Food" },
  { value: "restaurant", label: "Restaurant" },
];

const MEAL_TYPE_COLORS: Record<MealType, { active: string }> = {
  breakfast: { active: "bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30" },
  lunch: { active: "bg-[#0EA5E9]/15 text-[#0EA5E9] border-[#0EA5E9]/30" },
  dinner: { active: "bg-[#8B5CF6]/15 text-[#8B5CF6] border-[#8B5CF6]/30" },
  snack: { active: "bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30" },
};

// ─── Form State ─────────────────────────────────────

interface FormData {
  date: string;
  meal_type: MealType | "";
  description: string;
  calories_approx: string;
  protein_g: string;
  source: MealSource | "";
}

function todayISO(): string {
  const d = new Date();
  return d.toISOString().split("T")[0];
}

const INITIAL_FORM: FormData = {
  date: todayISO(),
  meal_type: "",
  description: "",
  calories_approx: "",
  protein_g: "",
  source: "",
};

// ─── Props ──────────────────────────────────────────

interface LogMealModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMealCreated: (meal: Meal) => void;
}

// ─── Component ──────────────────────────────────────

export function LogMealModal({
  open,
  onOpenChange,
  onMealCreated,
}: LogMealModalProps) {
  const [form, setForm] = useState<FormData>({ ...INITIAL_FORM, date: todayISO() });
  const [submitting, setSubmitting] = useState(false);

  function updateField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function resetForm() {
    setForm({ ...INITIAL_FORM, date: todayISO() });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.description.trim()) {
      toast.error("Describe what you ate");
      return;
    }

    if (!form.meal_type) {
      toast.error("Select a meal type");
      return;
    }

    setSubmitting(true);

    const payload = {
      date: form.date,
      meal_type: form.meal_type || null,
      description: form.description.trim(),
      calories_approx: form.calories_approx
        ? parseInt(form.calories_approx, 10)
        : null,
      protein_g: form.protein_g ? parseInt(form.protein_g, 10) : null,
      source: form.source || null,
    };

    try {
      const res = await fetch("/api/fitness/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(
          (errBody as { error?: string } | null)?.error ??
            "Failed to log meal"
        );
      }

      const created: Meal = await res.json();
      onMealCreated(created);
      resetForm();
      onOpenChange(false);
      toast.success("Meal logged successfully");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to log meal"
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
                      Log Meal
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
                    {/* Date */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-[#71717A] uppercase tracking-wide">
                        Date
                      </Label>
                      <DatePicker
                        value={form.date || null}
                        onChange={(date) => updateField("date", date ?? todayISO())}
                        placeholder="Select date"
                      />
                    </div>

                    {/* Meal Type */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-[#71717A] uppercase tracking-wide">
                        Meal Type <span className="text-[#EF4444]">*</span>
                      </Label>
                      <div className="grid grid-cols-4 gap-2">
                        {MEAL_TYPE_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => updateField("meal_type", opt.value)}
                            className={`h-9 rounded-lg text-xs font-medium transition-all duration-200 border ${
                              form.meal_type === opt.value
                                ? MEAL_TYPE_COLORS[opt.value].active
                                : "bg-[#09090B] text-[#71717A] border-[#27272A] hover:border-[#3F3F46]"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-[#71717A] uppercase tracking-wide">
                        What did you eat? <span className="text-[#EF4444]">*</span>
                      </Label>
                      <Input
                        value={form.description}
                        onChange={(e) =>
                          updateField("description", e.target.value)
                        }
                        placeholder="e.g. Chicken breast, rice, salad"
                        required
                        className="bg-[#09090B] border-[#27272A] text-[#FAFAFA] placeholder:text-[#71717A] focus-visible:ring-[#0EA5E9] focus-visible:ring-offset-[#18181B]"
                      />
                    </div>

                    {/* Calories + Protein row */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-[#71717A] uppercase tracking-wide">
                          Calories (approx)
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          value={form.calories_approx}
                          onChange={(e) =>
                            updateField("calories_approx", e.target.value)
                          }
                          placeholder="500"
                          className="bg-[#09090B] border-[#27272A] text-[#FAFAFA] placeholder:text-[#71717A] focus-visible:ring-[#0EA5E9] focus-visible:ring-offset-[#18181B] tabular-nums"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-[#71717A] uppercase tracking-wide">
                          Protein (g)
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          value={form.protein_g}
                          onChange={(e) =>
                            updateField("protein_g", e.target.value)
                          }
                          placeholder="40"
                          className="bg-[#09090B] border-[#27272A] text-[#FAFAFA] placeholder:text-[#71717A] focus-visible:ring-[#0EA5E9] focus-visible:ring-offset-[#18181B] tabular-nums"
                        />
                      </div>
                    </div>

                    {/* Source */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-[#71717A] uppercase tracking-wide">
                        Source
                      </Label>
                      <select
                        value={form.source}
                        onChange={(e) =>
                          updateField("source", e.target.value as MealSource | "")
                        }
                        className="flex h-10 w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3 py-2 text-sm text-[#FAFAFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0EA5E9] focus-visible:ring-offset-2 focus-visible:ring-offset-[#18181B] transition-colors duration-200"
                      >
                        <option value="">Select source</option>
                        {MEAL_SOURCE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
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
                        disabled={submitting || !form.description.trim()}
                        className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white"
                      >
                        {submitting ? "Saving..." : "Log Meal"}
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
