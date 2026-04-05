import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface MonthlyBreakdown {
  month: number;
  income: number;
  expenses: number;
  net: number;
}

interface FinanceSummary {
  total_income: number;
  total_expenses: number;
  net: number;
  savings_rate: number;
  monthly_breakdown: MonthlyBreakdown[];
}

interface FinanceRow {
  type: string;
  amount: number;
  date: string;
}

// GET /api/finance/summary — Monthly/yearly financial summary
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = request.nextUrl;

    const year = searchParams.get("year") || new Date().getFullYear().toString();
    const month = searchParams.get("month");

    // Build date range for the query
    let dateFrom: string;
    let dateTo: string;

    if (month) {
      const monthPadded = month.padStart(2, "0");
      dateFrom = `${year}-${monthPadded}-01`;
      // Calculate last day of month
      const lastDay = new Date(
        parseInt(year),
        parseInt(month),
        0,
      ).getDate();
      dateTo = `${year}-${monthPadded}-${lastDay}`;
    } else {
      dateFrom = `${year}-01-01`;
      dateTo = `${year}-12-31`;
    }

    // Fetch all transactions in the date range
    const { data, error } = await supabase
      .from("finances")
      .select("type, amount, date")
      .gte("date", dateFrom)
      .lte("date", dateTo)
      .order("date", { ascending: true });

    if (error) {
      console.error("Supabase error fetching financial summary:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (data ?? []) as FinanceRow[];

    // Calculate totals
    let totalIncome = 0;
    let totalExpenses = 0;

    // Build monthly breakdown map
    const monthlyMap = new Map<
      number,
      { income: number; expenses: number }
    >();

    for (const row of rows) {
      const rowMonth = new Date(row.date).getMonth() + 1;

      if (!monthlyMap.has(rowMonth)) {
        monthlyMap.set(rowMonth, { income: 0, expenses: 0 });
      }

      const monthData = monthlyMap.get(rowMonth)!;

      if (row.type === "income") {
        totalIncome += Number(row.amount);
        monthData.income += Number(row.amount);
      } else if (row.type === "expense") {
        totalExpenses += Number(row.amount);
        monthData.expenses += Number(row.amount);
      }
    }

    // Build monthly breakdown array
    const monthlyBreakdown: MonthlyBreakdown[] = [];

    if (month) {
      // Single month requested
      const m = parseInt(month);
      const entry = monthlyMap.get(m) || { income: 0, expenses: 0 };
      monthlyBreakdown.push({
        month: m,
        income: Math.round(entry.income * 100) / 100,
        expenses: Math.round(entry.expenses * 100) / 100,
        net: Math.round((entry.income - entry.expenses) * 100) / 100,
      });
    } else {
      // Full year — include all 12 months
      for (let m = 1; m <= 12; m++) {
        const entry = monthlyMap.get(m) || { income: 0, expenses: 0 };
        monthlyBreakdown.push({
          month: m,
          income: Math.round(entry.income * 100) / 100,
          expenses: Math.round(entry.expenses * 100) / 100,
          net: Math.round((entry.income - entry.expenses) * 100) / 100,
        });
      }
    }

    const net = Math.round((totalIncome - totalExpenses) * 100) / 100;
    const savingsRate =
      totalIncome > 0
        ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 10000) / 100
        : 0;

    const summary: FinanceSummary = {
      total_income: Math.round(totalIncome * 100) / 100,
      total_expenses: Math.round(totalExpenses * 100) / 100,
      net,
      savings_rate: savingsRate,
      monthly_breakdown: monthlyBreakdown,
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
