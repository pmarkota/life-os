import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface ClientRow {
  plan: string | null;
  mrr: number;
  status: string;
}

interface PlanBreakdown {
  plan: string;
  count: number;
  mrr: number;
}

interface MrrSummary {
  total_mrr: number;
  active_clients: number;
  average_mrr: number;
  by_plan: PlanBreakdown[];
}

// GET /api/clients/mrr — Calculate total MRR from active clients
export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("clients")
      .select("plan, mrr, status")
      .eq("status", "active");

    if (error) {
      console.error("Supabase error fetching MRR:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (data ?? []) as ClientRow[];

    // Calculate totals
    let totalMrr = 0;
    const planMap = new Map<string, { count: number; mrr: number }>();

    for (const row of rows) {
      const mrr = Number(row.mrr) || 0;
      totalMrr += mrr;

      const planKey = row.plan || "unknown";
      const existing = planMap.get(planKey) || { count: 0, mrr: 0 };
      existing.count += 1;
      existing.mrr += mrr;
      planMap.set(planKey, existing);
    }

    const activeClients = rows.length;
    const averageMrr =
      activeClients > 0
        ? Math.round((totalMrr / activeClients) * 100) / 100
        : 0;

    const byPlan: PlanBreakdown[] = Array.from(planMap.entries())
      .map(([plan, data]) => ({
        plan,
        count: data.count,
        mrr: Math.round(data.mrr * 100) / 100,
      }))
      .sort((a, b) => b.mrr - a.mrr);

    const summary: MrrSummary = {
      total_mrr: Math.round(totalMrr * 100) / 100,
      active_clients: activeClients,
      average_mrr: averageMrr,
      by_plan: byPlan,
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
