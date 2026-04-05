"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import type {
  Finance,
  FinanceType,
  IncomeSource,
  ExpenseCategory,
} from "@/types";

// ─── Options ────────────────────────────────────────

const SOURCE_OPTIONS: { value: IncomeSource; label: string }[] = [
  { value: "father_salary", label: "Father's Salary" },
  { value: "elevera", label: "Elevera" },
  { value: "etsy", label: "Etsy" },
  { value: "fleet", label: "Fleet" },
  { value: "freelance", label: "Freelance" },
];

const CATEGORY_OPTIONS: { value: ExpenseCategory; label: string }[] = [
  { value: "rent", label: "Rent" },
  { value: "food", label: "Food" },
  { value: "subscriptions", label: "Subscriptions" },
  { value: "domains", label: "Domains" },
  { value: "transport", label: "Transport" },
  { value: "gym", label: "Gym" },
  { value: "other", label: "Other" },
];

// ─── Form State ─────────────────────────────────────

interface FormData {
  type: FinanceType;
  amount: string;
  source: IncomeSource | "";
  category: ExpenseCategory | "";
  description: string;
  date: string;
  recurring: boolean;
}

function todayISO(): string {
  const d = new Date();
  return d.toISOString().split("T")[0];
}

const INITIAL_FORM: FormData = {
  type: "income",
  amount: "",
  source: "",
  category: "",
  description: "",
  date: todayISO(),
  recurring: false,
};

// ─── Props ──────────────────────────────────────────

interface LogTransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTransactionCreated: (tx: Finance) => void;
}

// ─── Component ──────────────────────────────────────

export function LogTransactionModal({
  open,
  onOpenChange,
  onTransactionCreated,
}: LogTransactionModalProps) {
  const [form, setForm] = useState<FormData>({ ...INITIAL_FORM, date: todayISO() });
  const [submitting, setSubmitting] = useState(false);

  function updateField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function resetForm() {
    setForm({ ...INITIAL_FORM, date: todayISO() });
  }

  function handleTypeSwitch(type: FinanceType) {
    setForm((prev) => ({
      ...prev,
      type,
      source: "",
      category: "",
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    if (form.type === "income" && !form.source) {
      toast.error("Select an income source");
      return;
    }

    if (form.type === "expense" && !form.category) {
      toast.error("Select an expense category");
      return;
    }

    setSubmitting(true);

    const payload = {
      type: form.type,
      amount,
      source: form.type === "income" ? form.source || null : null,
      category: form.type === "expense" ? form.category || null : null,
      description: form.description.trim() || null,
      date: form.date,
      recurring: form.recurring,
    };

    try {
      const res = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(
          (errBody as { error?: string } | null)?.error ??
            "Failed to log transaction",
        );
      }

      const created: Finance = await res.json();
      onTransactionCreated(created);
      resetForm();
      onOpenChange(false);
      toast.success(
        `${form.type === "income" ? "Income" : "Expense"} of \u20AC${amount.toFixed(2)} logged`,
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to log transaction",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const isIncome = form.type === "income";

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
                      Log Transaction
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
                    {/* Type Toggle */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-[#71717A] uppercase tracking-wide">
                        Type
                      </Label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleTypeSwitch("income")}
                          className={`flex-1 h-10 rounded-lg text-sm font-medium transition-all duration-200 ${
                            isIncome
                              ? "bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30"
                              : "bg-[#09090B] text-[#71717A] border border-[#27272A] hover:border-[#3F3F46]"
                          }`}
                        >
                          Income
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTypeSwitch("expense")}
                          className={`flex-1 h-10 rounded-lg text-sm font-medium transition-all duration-200 ${
                            !isIncome
                              ? "bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30"
                              : "bg-[#09090B] text-[#71717A] border border-[#27272A] hover:border-[#3F3F46]"
                          }`}
                        >
                          Expense
                        </button>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-[#71717A] uppercase tracking-wide">
                        Amount (EUR) <span className="text-[#EF4444]">*</span>
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#71717A]">
                          &euro;
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={form.amount}
                          onChange={(e) => updateField("amount", e.target.value)}
                          placeholder="0.00"
                          required
                          className="pl-8 bg-[#09090B] border-[#27272A] text-[#FAFAFA] placeholder:text-[#71717A] focus-visible:ring-[#0EA5E9] focus-visible:ring-offset-[#18181B] tabular-nums"
                        />
                      </div>
                    </div>

                    {/* Source (Income) / Category (Expense) */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-[#71717A] uppercase tracking-wide">
                        {isIncome ? "Source" : "Category"}{" "}
                        <span className="text-[#EF4444]">*</span>
                      </Label>
                      <select
                        value={isIncome ? form.source : form.category}
                        onChange={(e) =>
                          isIncome
                            ? updateField("source", e.target.value as IncomeSource | "")
                            : updateField("category", e.target.value as ExpenseCategory | "")
                        }
                        className="flex h-10 w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3 py-2 text-sm text-[#FAFAFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0EA5E9] focus-visible:ring-offset-2 focus-visible:ring-offset-[#18181B] transition-colors duration-200"
                      >
                        <option value="">
                          {isIncome ? "Select source" : "Select category"}
                        </option>
                        {(isIncome ? SOURCE_OPTIONS : CATEGORY_OPTIONS).map(
                          (opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ),
                        )}
                      </select>
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-[#71717A] uppercase tracking-wide">
                        Description
                      </Label>
                      <Input
                        value={form.description}
                        onChange={(e) =>
                          updateField("description", e.target.value)
                        }
                        placeholder={
                          isIncome
                            ? "e.g. March salary, Etsy sale"
                            : "e.g. Grocery run, Netflix"
                        }
                        className="bg-[#09090B] border-[#27272A] text-[#FAFAFA] placeholder:text-[#71717A] focus-visible:ring-[#0EA5E9] focus-visible:ring-offset-[#18181B]"
                      />
                    </div>

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

                    {/* Recurring toggle */}
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => updateField("recurring", !form.recurring)}
                        className={`relative h-5 w-9 rounded-full transition-colors duration-200 ${
                          form.recurring
                            ? "bg-[#0EA5E9]"
                            : "bg-[#27272A]"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform duration-200 flex items-center justify-center ${
                            form.recurring ? "translate-x-4" : "translate-x-0"
                          }`}
                        >
                          {form.recurring && (
                            <Check className="h-2.5 w-2.5 text-[#0EA5E9]" />
                          )}
                        </span>
                      </button>
                      <Label className="text-sm text-[#A1A1AA] cursor-pointer" onClick={() => updateField("recurring", !form.recurring)}>
                        Monthly recurring
                      </Label>
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
                        disabled={submitting || !form.amount}
                        className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white"
                      >
                        {submitting ? "Saving..." : "Log Transaction"}
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
