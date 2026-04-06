import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface SerperPlace {
  title: string;
  address: string;
  phone?: string;
  website?: string;
  rating?: number;
  ratingCount?: number;
  cid?: string;
  latitude?: number;
  longitude?: number;
}

interface SerperMapsResponse {
  places?: SerperPlace[];
}

interface CityConfig {
  city: string;
  state?: string;
  count: number;
}

// POST /api/leadgen/search — Search Google Maps for leads
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
      market,
      niche,
      cities,
      min_rating = 4.5,
      min_reviews = 10,
    } = body as {
      market: string;
      niche: string;
      cities: CityConfig[];
      min_rating: number;
      min_reviews: number;
    };

    const serperKey = process.env.SERPER_API_KEY;
    if (!serperKey) {
      return NextResponse.json(
        { error: "SERPER_API_KEY not configured" },
        { status: 500 },
      );
    }

    // Fetch existing leads for deduplication
    const { data: existingLeads } = await supabase
      .from("leads")
      .select("business_name, phone");

    const existingNames = new Set(
      (existingLeads ?? []).map((l) =>
        l.business_name.toLowerCase().replace(/[.\-\s]/g, ""),
      ),
    );
    const existingPhones = new Set(
      (existingLeads ?? [])
        .filter((l) => l.phone)
        .map((l) => (l.phone as string).replace(/[^\d]/g, "")),
    );

    // Import niche queries and helpers dynamically
    const { NICHE_QUERIES, DACH_GL_MAP } = await import("@/lib/leadgen/queries");
    const { cleanBusinessName } = await import("@/lib/leadgen/helpers");
    const queries = NICHE_QUERIES[market]?.[niche] ?? [niche];

    const allResults: Array<{
      business_name: string;
      location: string;
      phone: string | null;
      website_url: string | null;
      rating: number | null;
      reviews: number | null;
      snippet: string | null;
    }> = [];

    const seenPhones = new Set<string>();
    const seenNames = new Set<string>();

    for (const cityConfig of cities) {
      const { city, state, count } = cityConfig;
      const cityLabel = state ? `${city}, ${state}` : city;
      let cityResults = 0;

      // Determine geo targeting params (gl, hl) like Python script
      let gl = "hr";
      let hl = "hr";
      if (market === "dach") {
        gl = DACH_GL_MAP[city.toLowerCase()] ?? "at";
        hl = "de";
      } else if (market === "us") {
        gl = "us";
        hl = "en";
      } else if (market === "uk") {
        gl = "gb";
        hl = "en";
      }

      const location = state ? `${city}, ${state}` : city;

      // Over-fetch: collect up to 4x the requested count to account for
      // leads that get filtered out during website quality checks later.
      // Python does the same — it searches through ALL query variations
      // and only stops when the user reviews results, not at the search stage.
      const fetchTarget = count * 4;

      for (const query of queries) {
        if (cityResults >= fetchTarget) break;
        if (!query) continue;

        const searchQuery = `${query} ${location}`;

        try {
          const response = await fetch("https://google.serper.dev/maps", {
            method: "POST",
            headers: {
              "X-API-KEY": serperKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ q: searchQuery, gl, hl, num: 20 }),
          });

          if (!response.ok) continue;

          const data = (await response.json()) as SerperMapsResponse;
          const places = data.places ?? [];

          for (const place of places) {
            if (cityResults >= fetchTarget) break;

            // Filter by rating
            if (place.rating !== undefined && place.rating < min_rating) continue;

            // Filter by reviews
            if (
              place.ratingCount !== undefined &&
              place.ratingCount < min_reviews
            )
              continue;

            // Dedup by phone (digits only, matching Python)
            const normalizedPhone = place.phone
              ? place.phone.replace(/[^\d]/g, "")
              : null;
            if (normalizedPhone) {
              if (
                seenPhones.has(normalizedPhone) ||
                existingPhones.has(normalizedPhone)
              )
                continue;
              seenPhones.add(normalizedPhone);
            }

            // Dedup by name (remove dots/hyphens/spaces like Python)
            const nameKey = place.title
              .toLowerCase()
              .replace(/[.\-\s]/g, "");
            if (seenNames.has(nameKey) || existingNames.has(nameKey))
              continue;
            seenNames.add(nameKey);

            // Clean business name (remove owner info, addresses, etc.)
            const cleanedName = cleanBusinessName(place.title);

            allResults.push({
              business_name: cleanedName,
              location: cityLabel,
              phone: place.phone ?? null,
              website_url: place.website ?? null,
              rating: place.rating ?? null,
              reviews: place.ratingCount ?? null,
              snippet: place.address ?? null,
            });
            cityResults++;
          }
        } catch {
          // Continue to next query on failure
        }

        // Small delay between Serper queries (like Python: time.sleep(0.3))
        if (queries.length > 1) {
          await new Promise((r) => setTimeout(r, 300));
        }
      }
    }

    const requestedTotal = cities.reduce((sum, c) => sum + c.count, 0);

    return NextResponse.json({
      results: allResults,
      total: allResults.length,
      requested_count: requestedTotal,
      existing_count: existingLeads?.length ?? 0,
    });
  } catch (error) {
    console.error("Leadgen search error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
