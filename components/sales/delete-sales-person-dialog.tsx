"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/types";

interface DeleteSalesPersonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile | null;
  onDeleted: (profileId: string) => void;
}

export function DeleteSalesPersonDialog({
  open,
  onOpenChange,
  profile,
  onDeleted,
}: DeleteSalesPersonDialogProps) {
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    if (!profile) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/sales-people/${profile.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(
          (errBody as { error?: string } | null)?.error ??
            "Failed to delete sales person",
        );
      }
      onDeleted(profile.id);
      onOpenChange(false);
      toast.success(
        `${profile.full_name ?? profile.email} removed. Their leads are now unassigned.`,
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete sales person",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const displayName = profile?.full_name ?? profile?.email ?? "this user";

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
              onPointerDownOutside={() =>
                !submitting && onOpenChange(false)
              }
              onEscapeKeyDown={() => !submitting && onOpenChange(false)}
            >
              <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => !submitting && onOpenChange(false)}
              >
                <motion.div
                  className="relative w-full max-w-sm rounded-xl border border-[#27272A] bg-[#18181B] shadow-2xl"
                  initial={{ scale: 0.95, y: 12 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.95, y: 12 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-[#27272A] px-5 py-4">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EF4444]/10">
                        <AlertTriangle className="h-4 w-4 text-[#EF4444]" />
                      </div>
                      <Dialog.Title className="text-base font-bold text-[#FAFAFA] tracking-tight">
                        Delete Sales Person
                      </Dialog.Title>
                    </div>
                    <Dialog.Close asChild>
                      <button
                        className="rounded-lg p-1.5 text-[#71717A] hover:text-[#FAFAFA] hover:bg-[#27272A] transition-colors duration-150 disabled:opacity-50"
                        aria-label="Close"
                        disabled={submitting}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </Dialog.Close>
                  </div>

                  {/* Body */}
                  <div className="px-5 py-5 space-y-3">
                    <Dialog.Description className="text-sm text-[#A1A1AA] leading-relaxed">
                      Delete{" "}
                      <span className="font-semibold text-[#FAFAFA]">
                        {displayName}
                      </span>
                      ? This permanently removes their account. All leads they
                      were assigned to will become unassigned (you can reassign
                      them in CRM).
                    </Dialog.Description>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-end gap-3 border-t border-[#27272A] px-5 py-3">
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
                      type="button"
                      onClick={handleConfirm}
                      disabled={submitting}
                      className="bg-[#EF4444] hover:bg-[#DC2626] text-white gap-1.5"
                    >
                      <Trash2 className="h-4 w-4" />
                      {submitting ? "Deleting..." : "Delete"}
                    </Button>
                  </div>
                </motion.div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
