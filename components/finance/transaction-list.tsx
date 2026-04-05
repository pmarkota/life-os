"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trash2,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Finance, IncomeSource, ExpenseCategory } from "@/types";

// ─── Label + Color Maps ─────────────────────────────

const SOURCE_LABELS: Record<IncomeSource, string> = {
  father_salary: "Father's Salary",
  elevera: "Elevera",
  etsy: "Etsy",
  fleet: "Fleet",
  freelance: "Freelance",
};

const SOURCE_COLORS: Record<IncomeSource, string> = {
  father_salary: "#0EA5E9",
  elevera: "#06B6D4",
  etsy: "#F59E0B",
  fleet: "#8B5CF6",
  freelance: "#22C55E",
};

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  rent: "Rent",
  food: "Food",
  subscriptions: "Subscriptions",
  domains: "Domains",
  transport: "Transport",
  gym: "Gym",
  other: "Other",
};

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  rent: "#EF4444",
  food: "#F59E0B",
  subscriptions: "#8B5CF6",
  domains: "#0EA5E9",
  transport: "#71717A",
  gym: "#22C55E",
  other: "#A1A1AA",
};

// ─── Props ──────────────────────────────────────────

interface TransactionListProps {
  transactions: Finance[];
  onDelete: (id: string) => void;
}

// ─── Component ──────────────────────────────────────

export function TransactionList({
  transactions,
  onDelete,
}: TransactionListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
    setConfirmDeleteId(null);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      setDeletingId(id);
      try {
        const res = await fetch(`/api/finance/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to delete");
        onDelete(id);
        toast.success("Transaction deleted");
      } catch {
        toast.error("Failed to delete transaction");
      } finally {
        setDeletingId(null);
        setConfirmDeleteId(null);
      }
    },
    [onDelete],
  );

  function formatDate(dateStr: string) {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });
  }

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-[#71717A]">
        <p className="text-sm">No transactions yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {transactions.map((tx, i) => {
        const isIncome = tx.type === "income";
        const tagLabel = isIncome
          ? SOURCE_LABELS[tx.source as IncomeSource] ?? tx.source
          : CATEGORY_LABELS[tx.category as ExpenseCategory] ?? tx.category;
        const tagColor = isIncome
          ? SOURCE_COLORS[tx.source as IncomeSource] ?? "#A1A1AA"
          : CATEGORY_COLORS[tx.category as ExpenseCategory] ?? "#A1A1AA";
        const isExpanded = expandedId === tx.id;

        return (
          <motion.div
            key={tx.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03, duration: 0.2 }}
          >
            <div
              onClick={() => toggleExpand(tx.id)}
              className="group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-[#27272A]/40 transition-colors duration-150"
            >
              {/* Icon */}
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${isIncome ? "#22C55E" : "#EF4444"}10` }}
              >
                {isIncome ? (
                  <ArrowUpRight className="h-4 w-4 text-[#22C55E]" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-[#EF4444]" />
                )}
              </div>

              {/* Date */}
              <span className="text-xs text-[#71717A] w-14 shrink-0 tabular-nums">
                {formatDate(tx.date)}
              </span>

              {/* Description */}
              <span className="text-sm text-[#FAFAFA] truncate flex-1 min-w-0">
                {tx.description || (isIncome ? "Income" : "Expense")}
              </span>

              {/* Badge */}
              <Badge
                className="border-0 text-[10px] px-1.5 py-0 font-medium shrink-0 hidden sm:inline-flex"
                style={{
                  backgroundColor: `${tagColor}15`,
                  color: tagColor,
                }}
              >
                {tagLabel}
              </Badge>

              {/* Amount */}
              <span
                className={`text-sm font-semibold tabular-nums shrink-0 ${
                  isIncome ? "text-[#22C55E]" : "text-[#EF4444]"
                }`}
              >
                {isIncome ? "+" : "-"}&euro;{tx.amount.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>

              {/* Expand indicator */}
              {isExpanded ? (
                <ChevronUp className="h-3.5 w-3.5 text-[#71717A] shrink-0" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-[#71717A] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              )}
            </div>

            {/* Expanded details */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden"
                >
                  <div className="pl-14 pr-3 pb-2 flex items-center gap-3">
                    <div className="flex items-center gap-2 flex-1 text-xs text-[#71717A]">
                      {tx.recurring && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-[#27272A] text-[#A1A1AA]">
                          Recurring
                        </Badge>
                      )}
                      {/* Show badge on mobile in expanded view */}
                      <Badge
                        className="border-0 text-[10px] px-1.5 py-0 font-medium sm:hidden"
                        style={{
                          backgroundColor: `${tagColor}15`,
                          color: tagColor,
                        }}
                      >
                        {tagLabel}
                      </Badge>
                    </div>

                    {confirmDeleteId === tx.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#EF4444]">Delete?</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteId(null);
                          }}
                          className="h-7 px-2 text-xs text-[#A1A1AA]"
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(tx.id);
                          }}
                          disabled={deletingId === tx.id}
                          className="h-7 px-2 text-xs"
                        >
                          {deletingId === tx.id ? "..." : "Confirm"}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(tx.id);
                        }}
                        className="h-7 px-2 text-[#71717A] hover:text-[#EF4444]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
