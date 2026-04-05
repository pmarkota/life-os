"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ─── Types ──────────────────────────────────────────

interface PersonalRecord {
  exercise: string;
  weight_kg: number;
  date: string;
}

// ─── Component ──────────────────────────────────────

export function PRBoard() {
  const [prs, setPrs] = useState<PersonalRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPRs() {
      try {
        const res = await fetch("/api/fitness/prs");
        if (!res.ok) throw new Error("Failed to fetch PRs");
        const data: PersonalRecord[] = await res.json();
        setPrs(data);
      } catch {
        toast.error("Failed to load personal records");
      } finally {
        setLoading(false);
      }
    }
    fetchPRs();
  }, []);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  function isRecent(dateStr: string): boolean {
    return new Date(dateStr) >= sevenDaysAgo;
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <Card className="hover:border-[#3F3F46] transition-colors h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F59E0B]/10">
            <Trophy className="h-3.5 w-3.5 text-[#F59E0B]" />
          </div>
          <CardTitle className="text-sm font-medium text-[#A1A1AA]">
            PR Board
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-[#71717A]" />
          </div>
        ) : prs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <Trophy className="h-8 w-8 text-[#27272A]" />
            <p className="text-sm text-[#71717A] text-center">
              No PRs yet — log your first workout!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#27272A]">
                  <th className="pb-2.5 text-left text-xs font-medium text-[#71717A] uppercase tracking-wide">
                    Exercise
                  </th>
                  <th className="pb-2.5 text-right text-xs font-medium text-[#71717A] uppercase tracking-wide">
                    Weight
                  </th>
                  <th className="pb-2.5 text-right text-xs font-medium text-[#71717A] uppercase tracking-wide">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {prs.map((pr, i) => (
                  <motion.tr
                    key={`${pr.exercise}-${pr.date}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      delay: i * 0.04,
                      duration: 0.25,
                      ease: "easeOut",
                    }}
                    className="border-b border-[#27272A]/50 last:border-0"
                  >
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-[#FAFAFA] font-medium">
                          {pr.exercise}
                        </span>
                        {isRecent(pr.date) && (
                          <Badge className="bg-[#22C55E]/15 text-[#22C55E] border-none text-[10px] px-1.5 py-0">
                            NEW
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 text-right">
                      <span className="text-sm font-bold text-[#F59E0B] tabular-nums">
                        {pr.weight_kg} kg
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      <span className="text-xs text-[#71717A] tabular-nums">
                        {formatDate(pr.date)}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
