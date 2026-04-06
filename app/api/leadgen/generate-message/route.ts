import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/leadgen/generate-message — Generate personalized outreach message via Claude API
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      business_name,
      city,
      niche,
      rating,
      reviews,
      web_status,
      snippet,
      channel,
      market,
      owner_name,
      feedback,
    } = body as {
      business_name: string;
      city: string;
      niche: string;
      rating: number | null;
      reviews: number | null;
      web_status: string;
      snippet: string | null;
      channel: string;
      market: string;
      owner_name?: string | null;
      feedback?: string;
    };

    const { getSystemPrompt, getLanguage, getFallbackMessage } = await import(
      "@/lib/ai/system-prompts"
    );

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      // Use fallback template (NO_WEB vs BAD_WEB aware)
      return NextResponse.json({
        message: getFallbackMessage(market, web_status, business_name, city),
        source: "fallback",
      });
    }

    const systemPrompt = getSystemPrompt(market);

    // Build user prompt with lead context
    const contextParts: string[] = [
      `Business: ${business_name}`,
      `City: ${city}`,
      `Niche: ${niche}`,
    ];

    if (rating !== null) contextParts.push(`Google Rating: ${rating}`);
    if (reviews !== null) contextParts.push(`Google Reviews: ${reviews}`);
    if (web_status) contextParts.push(`Website Status: ${web_status}`);
    if (snippet) contextParts.push(`Address/Info: ${snippet}`);
    if (channel) contextParts.push(`Channel: ${channel}`);
    if (owner_name) contextParts.push(`Owner Name: ${owner_name}`);
    if (feedback) contextParts.push(`\nFeedback on previous message: ${feedback}`);

    const userPrompt = feedback
      ? `Regenerate the outreach message for this lead, incorporating the feedback:\n\n${contextParts.join("\n")}`
      : `Write a personalized first outreach message for this lead:\n\n${contextParts.join("\n")}`;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 300,
          system: [
            {
              type: "text",
              text: systemPrompt,
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: [{ role: "user", content: userPrompt }],
        }),
      });

      if (!response.ok) {
        // Try fallback model
        const fallbackResponse = await fetch(
          "https://api.anthropic.com/v1/messages",
          {
            method: "POST",
            headers: {
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01",
              "content-type": "application/json",
            },
            body: JSON.stringify({
              model: "claude-3-5-sonnet-20241022",
              max_tokens: 300,
              system: systemPrompt,
              messages: [{ role: "user", content: userPrompt }],
            }),
          },
        );

        if (!fallbackResponse.ok) {
          return NextResponse.json({
            message: getFallbackMessage(market, web_status, business_name, city),
            source: "fallback",
          });
        }

        const fallbackData = await fallbackResponse.json();
        const fallbackMessage =
          fallbackData?.content?.[0]?.text ?? "";
        return NextResponse.json({
          message: fallbackMessage,
          source: "claude-fallback",
        });
      }

      const data = await response.json();
      const message = data?.content?.[0]?.text ?? "";

      return NextResponse.json({ message, source: "claude" });
    } catch {
      // API call failed — use template
      return NextResponse.json({
        message: getFallbackMessage(market, web_status, business_name, city),
        source: "fallback",
      });
    }
  } catch (error) {
    console.error("Generate message error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
