import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface SourceBreakdown {
  source: string;
  total: number;
  count: number;
}

interface IncomeRow {
  source: string | null;
  amount: number;
}

// GET /api/finance/by-source — Income breakdown by source
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = request.nextUrl;

    const year = searchParams.get("year") || new Date().getFullYear().toString();

    const dateFrom = `${year}-01-01`;
    const dateTo = `${year}-12-31`;

    // Fetch all income records in the date range
    const { data, error } = await supabase
      .from("finances")
      .select("source, amount")
      .eq("type", "income")
      .gte("date", dateFrom)
      .lte("date", dateTo);

    if (error) {
      console.error("Supabase error fetching income by source:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (data ?? []) as IncomeRow[];

    // Aggregate by source
    const sourceMap = new Map<string, { total: number; count: number }>();

    for (const row of rows) {
      const source = row.source || "unknown";

      if (!sourceMap.has(source)) {
        sourceMap.set(source, { total: 0, count: 0 });
      }

      const entry = sourceMap.get(source)!;
      entry.total += Number(row.amount);
      entry.count += 1;
    }

    // Convert to sorted array (highest total first)
    const breakdown: SourceBreakdown[] = Array.from(sourceMap.entries())
      .map(([source, { total, count }]) => ({
        source,
        total: Math.round(total * 100) / 100,
        count,
      }))
      .sort((a, b) => b.total - a.total);

    return NextResponse.json(breakdown);
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
