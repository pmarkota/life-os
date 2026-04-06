"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Zap,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { LeadStatus } from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BulkEnrichResult {
  lead_id: string;
  business_name: string;
  success: boolean;
  error?: string;
}

interface BulkEnrichResponse {
  message: string;
  total: number;
  success_count: number;
  fail_count: number;
  results: BulkEnrichResult[];
}

// ---------------------------------------------------------------------------
// Status options
// ---------------------------------------------------------------------------

const STATUS_OPTIONS: { value: LeadStatus | "all"; label: string }[] = [
  { value: "new", label: "New" },
  { value: "demo_built", label: "Demo Built" },
  { value: "contacted", label: "Contacted" },
  { value: "replied", label: "Replied" },
  { value: "call_booked", label: "Call Booked" },
  { value: "follow_up", label: "Follow-up" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface BulkEnrichModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

export function BulkEnrichModal({
  open,
  onOpenChange,
  onComplete,
}: BulkEnrichModalProps) {
  const [status, setStatus] = useState<string>("new");
  const [limit, setLimit] = useState(20);
  const [force, setForce] = useState(false);
  const [running, setRunning] = useState(false);
  const [response, setResponse] = useState<BulkEnrichResponse | null>(null);
  const [progress, setProgress] = useState(0);

  function resetState() {
    setStatus("new");
    setLimit(20);
    setForce(false);
    setRunning(false);
    setResponse(null);
    setProgress(0);
  }

  async function handleStart() {
    setRunning(true);
    setResponse(null);
    setProgress(0);

    // Simulate progress since the API does sequential enrichment
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 8;
      });
    }, 2000);

    try {
      const res = await fetch("/api/leads/bulk-enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, limit, force }),
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          (errData as { error?: string }).error ?? "Bulk enrichment failed",
        );
      }

      const data: BulkEnrichResponse = await res.json();
      setResponse(data);

      if (data.success_count > 0) {
        toast.success(data.message);
        onComplete?.();
      } else if (data.total === 0) {
        toast.info("No leads matched the criteria");
      } else {
        toast.warning(data.message);
      }
    } catch (err) {
      clearInterval(progressInterval);
      toast.error(
        err instanceof Error ? err.message : "Bulk enrichment failed",
      );
    } finally {
      setRunning(false);
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(val) => {
        if (!running) {
          onOpenChange(val);
          if (!val) resetState();
        }
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
            <Dialog.Content asChild>
              <motion.div
                className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[#27272A] bg-[#18181B] shadow-2xl"
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 8 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[#27272A] px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0EA5E9]/10">
                      <Zap className="h-4.5 w-4.5 text-[#0EA5E9]" />
                    </div>
                    <div>
                      <Dialog.Title className="text-base font-semibold text-[#FAFAFA]">
                        Bulk Enrich Leads
                      </Dialog.Title>
                      <Dialog.Description className="text-xs text-[#71717A]">
                        Analyze websites and online presence for multiple leads
                      </Dialog.Description>
                    </div>
                  </div>
                  <Dialog.Close asChild>
                    <button
                      className="rounded-lg p-1.5 text-[#71717A] hover:text-[#FAFAFA] hover:bg-[#27272A] transition-colors duration-150 disabled:opacity-50"
                      disabled={running}
                      aria-label="Close"
                    >
                      <X className="h-5 h-5" />
                    </button>
                  </Dialog.Close>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-5">
                  {!response ? (
                    <>
                      {/* Status Select */}
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-[#71717A] uppercase tracking-wide">
                          Lead Status
                        </label>
                        <select
                          value={status}
                          onChange={(e) => setStatus(e.target.value)}
                          disabled={running}
                          className="w-full bg-[#09090B] text-sm text-[#FAFAFA] border border-[#27272A] rounded-lg px-3 py-2.5 outline-none focus:ring-1 focus:ring-[#0EA5E9] transition-colors disabled:opacity-50"
                        >
                          {STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Limit */}
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-[#71717A] uppercase tracking-wide">
                          Max Leads to Enrich
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={50}
                          value={limit}
                          onChange={(e) =>
                            setLimit(
                              Math.min(50, Math.max(1, Number(e.target.value))),
                            )
                          }
                          disabled={running}
                          className="w-full bg-[#09090B] text-sm text-[#FAFAFA] border border-[#27272A] rounded-lg px-3 py-2.5 outline-none focus:ring-1 focus:ring-[#0EA5E9] transition-colors disabled:opacity-50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                        <p className="text-[11px] text-[#52525B]">
                          Each lead takes ~5-15 seconds. Max 50 per batch.
                        </p>
                      </div>

                      {/* Force Re-enrich Toggle */}
                      <label className="flex items-center gap-3 cursor-pointer select-none">
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={force}
                            onChange={(e) => setForce(e.target.checked)}
                            disabled={running}
                            className="sr-only peer"
                          />
                          <div className="h-5 w-9 rounded-full bg-[#27272A] peer-checked:bg-[#0EA5E9] transition-colors peer-disabled:opacity-50" />
                          <div className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-[#52525B] peer-checked:bg-white peer-checked:translate-x-4 transition-all" />
                        </div>
                        <div>
                          <span className="text-sm text-[#FAFAFA]">
                            Force re-enrich
                          </span>
                          <p className="text-[11px] text-[#52525B]">
                            Include leads that have already been enriched
                          </p>
                        </div>
                      </label>

                      {/* Progress bar during enrichment */}
                      {running && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="space-y-2"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[#71717A]">
                              Enriching leads...
                            </span>
                            <span className="text-[#0EA5E9] font-medium">
                              {Math.round(progress)}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-[#27272A] overflow-hidden">
                            <motion.div
                              className="h-full rounded-full bg-[#0EA5E9]"
                              initial={{ width: "0%" }}
                              animate={{ width: `${progress}%` }}
                              transition={{ duration: 0.3 }}
                            />
                          </div>
                          <p className="text-[11px] text-[#52525B] text-center">
                            This may take a few minutes depending on the number
                            of leads...
                          </p>
                        </motion.div>
                      )}
                    </>
                  ) : (
                    /* Results */
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4"
                    >
                      {/* Summary */}
                      <div className="rounded-xl border border-[#27272A] bg-[#09090B]/50 p-4">
                        <div className="flex items-center gap-3 mb-3">
                          {response.fail_count === 0 ? (
                            <CheckCircle2 className="h-5 w-5 text-[#22C55E]" />
                          ) : response.success_count === 0 ? (
                            <XCircle className="h-5 w-5 text-[#EF4444]" />
                          ) : (
                            <AlertTriangle className="h-5 w-5 text-[#F59E0B]" />
                          )}
                          <p className="text-sm font-medium text-[#FAFAFA]">
                            {response.message}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-[#71717A]">
                              Total:
                            </span>
                            <span className="text-sm font-semibold text-[#FAFAFA]">
                              {response.total}
                            </span>
                          </div>
                          <div className="h-3 w-px bg-[#27272A]" />
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-[#71717A]">
                              Success:
                            </span>
                            <span className="text-sm font-semibold text-[#22C55E]">
                              {response.success_count}
                            </span>
                          </div>
                          {response.fail_count > 0 && (
                            <>
                              <div className="h-3 w-px bg-[#27272A]" />
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-[#71717A]">
                                  Failed:
                                </span>
                                <span className="text-sm font-semibold text-[#EF4444]">
                                  {response.fail_count}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Results list */}
                      {response.results.length > 0 && (
                        <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                          {response.results.map((result) => (
                            <div
                              key={result.lead_id}
                              className="flex items-center justify-between rounded-lg border border-[#27272A] bg-[#09090B]/30 px-3 py-2"
                            >
                              <span className="text-sm text-[#FAFAFA] truncate mr-3">
                                {result.business_name}
                              </span>
                              {result.success ? (
                                <Badge
                                  variant="success"
                                  className="text-[10px] shrink-0"
                                >
                                  Enriched
                                </Badge>
                              ) : (
                                <Badge
                                  variant="destructive"
                                  className="text-[10px] shrink-0"
                                >
                                  Failed
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 border-t border-[#27272A] px-6 py-4">
                  {!response ? (
                    <>
                      <Dialog.Close asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={running}
                        >
                          Cancel
                        </Button>
                      </Dialog.Close>
                      <Button
                        size="sm"
                        onClick={handleStart}
                        disabled={running}
                        className="gap-2"
                      >
                        {running ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Enriching...
                          </>
                        ) : (
                          <>
                            <Zap className="h-4 w-4" />
                            Start Enrichment
                          </>
                        )}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setResponse(null);
                          setProgress(0);
                        }}
                      >
                        Enrich More
                      </Button>
                      <Dialog.Close asChild>
                        <Button size="sm" onClick={resetState}>
                          Done
                        </Button>
                      </Dialog.Close>
                    </>
                  )}
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
