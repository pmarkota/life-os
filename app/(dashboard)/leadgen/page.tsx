"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Radar,
  Search,
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  Loader2,
  RefreshCw,
  Trash2,
  Save,
  Copy,
  Globe,
  Phone,
  Mail,
  Star,
  ArrowRight,
  Settings2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

// ─── Types ───────────────────────────────────────
type Market = "hr" | "dach" | "us" | "uk";

interface CityEntry {
  id: string;
  city: string;
  state: string;
  count: number;
}

interface SearchResult {
  business_name: string;
  location: string;
  phone: string | null;
  website_url: string | null;
  email: string | null;
  instagram: string | null;
  facebook: string | null;
  rating: number | null;
  reviews: number | null;
  snippet: string | null;
  web_status: string;
  quality_score: number;
  page_speed: number | null;
  has_ssl: boolean | null;
  is_mobile_responsive: boolean | null;
  tech_stack: string | null;
  channel: string;
  message: string;
  market: Market;
  niche: string;
  owner_name: string | null;
  selected: boolean;
  removed: boolean;
}

type Phase = "configure" | "search" | "review";

// ─── Constants ───────────────────────────────────
const MARKET_CONFIG: {
  id: Market;
  label: string;
  flag: string;
  niches: string[];
}[] = [
  {
    id: "hr",
    label: "Croatia",
    flag: "\u{1F1ED}\u{1F1F7}",
    niches: [
      "frizer",
      "kozmetika",
      "autoservis",
      "dental",
      "fitness",
      "wellness",
      "restoran",
      "apartmani",
      "pekara",
      "fizioterapija",
      "luxury_villa",
      "charter",
      "boutique_hotel",
      "ostalo",
    ],
  },
  {
    id: "dach",
    label: "DACH",
    flag: "\u{1F1E9}\u{1F1EA}\u{1F1E6}\u{1F1F9}\u{1F1E8}\u{1F1ED}",
    niches: [
      "frizer",
      "kozmetika",
      "autoservis",
      "dental",
      "fitness",
      "wellness",
      "restoran",
      "apartmani",
      "pekara",
      "fizioterapija",
      "ostalo",
    ],
  },
  {
    id: "us",
    label: "US",
    flag: "\u{1F1FA}\u{1F1F8}",
    niches: [
      "salon",
      "barbershop",
      "restaurant",
      "dental",
      "fitness",
      "wellness",
      "veterinary",
      "tattoo",
      "photographer",
      "realtor",
      "lawyer",
      "other",
    ],
  },
  {
    id: "uk",
    label: "UK",
    flag: "\u{1F1EC}\u{1F1E7}",
    niches: [
      "salon",
      "barbershop",
      "restaurant",
      "dental",
      "fitness",
      "wellness",
      "veterinary",
      "tattoo",
      "photographer",
      "realtor",
      "lawyer",
      "other",
    ],
  },
];

const WEB_STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  NO_WEB: { bg: "bg-[#EF4444]/15", text: "text-[#EF4444]", label: "No Web" },
  BAD_WEB: { bg: "bg-[#F59E0B]/15", text: "text-[#F59E0B]", label: "Bad Web" },
  MEDIOCRE: { bg: "bg-[#EAB308]/15", text: "text-[#EAB308]", label: "Mediocre" },
  GOOD: { bg: "bg-[#22C55E]/15", text: "text-[#22C55E]", label: "Good" },
};

// ─── Stepper ─────────────────────────────────────
function PhaseIndicator({ current }: { current: Phase }) {
  const phases: { id: Phase; label: string; num: number }[] = [
    { id: "configure", label: "Configure", num: 1 },
    { id: "search", label: "Search", num: 2 },
    { id: "review", label: "Review", num: 3 },
  ];

  const currentIdx = phases.findIndex((p) => p.id === current);

  return (
    <div className="flex items-center justify-center gap-2">
      {phases.map((phase, i) => {
        const isActive = phase.id === current;
        const isCompleted = i < currentIdx;
        return (
          <div key={phase.id} className="flex items-center gap-2">
            <div
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-[#0EA5E9]/15 text-[#0EA5E9]"
                  : isCompleted
                    ? "bg-[#22C55E]/15 text-[#22C55E]"
                    : "bg-[#27272A] text-[#71717A]"
              }`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  isActive
                    ? "bg-[#0EA5E9] text-[#09090B]"
                    : isCompleted
                      ? "bg-[#22C55E] text-[#09090B]"
                      : "bg-[#3F3F46] text-[#71717A]"
                }`}
              >
                {isCompleted ? <Check className="h-3 w-3" /> : phase.num}
              </span>
              <span className="hidden sm:inline">{phase.label}</span>
            </div>
            {i < phases.length - 1 && (
              <ArrowRight className="h-4 w-4 text-[#52525B]" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────
export default function LeadGenPage() {
  // Phase state
  const [phase, setPhase] = useState<Phase>("configure");

  // Config state
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [selectedNiche, setSelectedNiche] = useState<string | null>(null);
  const [cities, setCities] = useState<CityEntry[]>([]);
  const [newCity, setNewCity] = useState("");
  const [newState, setNewState] = useState("");
  const [newCount, setNewCount] = useState(10);
  const [minRating, setMinRating] = useState(4.5);
  const [minReviews, setMinReviews] = useState(10);
  const [skipWebCheck, setSkipWebCheck] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Search state
  const [searching, setSearching] = useState(false);
  const [searchProgress, setSearchProgress] = useState("");
  const [rawResults, setRawResults] = useState<SearchResult[]>([]);
  const abortRef = useRef(false);

  // Review state
  const [results, setResults] = useState<SearchResult[]>([]);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [regeneratingIdx, setRegeneratingIdx] = useState<number | null>(null);

  // ─── Config handlers ─────────────────────────────
  const addCity = useCallback(() => {
    if (!newCity.trim()) return;
    setCities((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        city: newCity.trim(),
        state: newState.trim(),
        count: newCount,
      },
    ]);
    setNewCity("");
    setNewState("");
    setNewCount(10);
  }, [newCity, newState, newCount]);

  const removeCity = useCallback((id: string) => {
    setCities((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const totalLeads = cities.reduce((sum, c) => sum + c.count, 0);

  // ─── Search handler ──────────────────────────────
  const startSearch = useCallback(async () => {
    if (!selectedMarket || !selectedNiche || cities.length === 0) {
      toast.error("Please select market, niche, and add at least one city");
      return;
    }

    setPhase("search");
    setSearching(true);
    setSearchProgress("Searching Google Maps...");
    setRawResults([]);
    abortRef.current = false;

    try {
      // Step 1: Search Google Maps
      const searchRes = await fetch("/api/leadgen/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          market: selectedMarket,
          niche: selectedNiche,
          cities: cities.map((c) => ({
            city: c.city,
            state: c.state || undefined,
            count: c.count,
          })),
          min_rating: minRating,
          min_reviews: minReviews,
        }),
      });

      if (!searchRes.ok) {
        const err = await searchRes.json();
        throw new Error(err.error || "Search failed");
      }

      const searchData = await searchRes.json();
      const rawPlaces = searchData.results as Array<{
        business_name: string;
        location: string;
        phone: string | null;
        website_url: string | null;
        rating: number | null;
        reviews: number | null;
        snippet: string | null;
      }>;

      if (rawPlaces.length === 0) {
        toast.error("No results found. Try different search criteria.");
        setSearching(false);
        setPhase("configure");
        return;
      }

      const requestedCount = searchData.requested_count ?? totalLeads;

      setSearchProgress(
        `Found ${rawPlaces.length} businesses. Checking websites & generating messages...`,
      );

      // Step 2: Process each result — stop once we have enough qualifying leads
      const processed: SearchResult[] = [];
      let qualifyingCount = 0;

      for (let i = 0; i < rawPlaces.length; i++) {
        if (abortRef.current) break;
        // Stop when we have enough qualifying (non-GOOD) leads
        if (qualifyingCount >= requestedCount) break;

        const place = rawPlaces[i];
        setSearchProgress(
          `Checking ${i + 1}/${rawPlaces.length} (${qualifyingCount}/${requestedCount} qualifying): ${place.business_name}...`,
        );

        let webData = {
          web_status: "NO_WEB",
          quality_score: 10,
          page_speed: null as number | null,
          email: null as string | null,
          instagram: null as string | null,
          facebook: null as string | null,
          has_ssl: false,
          is_mobile_responsive: false,
          tech_stack: null as string | null,
        };

        // Check website if URL exists and not skipped
        if (place.website_url && !skipWebCheck) {
          try {
            const webRes = await fetch("/api/leadgen/check-website", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url: place.website_url, market: selectedMarket }),
            });
            if (webRes.ok) {
              webData = await webRes.json();
            }
          } catch {
            // Continue without web data
          }
        }

        // Skip GOOD websites
        if (webData.web_status === "GOOD" && !skipWebCheck) {
          const skipped: SearchResult = {
            ...place,
            email: webData.email,
            instagram: webData.instagram,
            facebook: webData.facebook,
            web_status: "GOOD",
            quality_score: webData.quality_score,
            page_speed: webData.page_speed,
            has_ssl: webData.has_ssl,
            is_mobile_responsive: webData.is_mobile_responsive,
            tech_stack: webData.tech_stack,
            channel: "email",
            message: "",
            market: selectedMarket,
            niche: selectedNiche,
            owner_name: null,
            selected: false,
            removed: true,
          };
          processed.push(skipped);
          setRawResults([...processed]);
          continue;
        }

        // Determine channel
        const channel = determineChannel(
          selectedMarket,
          webData.email ?? place.phone ? "email" : null,
          place.phone,
          webData.instagram,
        );

        // Generate message
        let message = "";
        try {
          const msgRes = await fetch("/api/leadgen/generate-message", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              business_name: place.business_name,
              city: place.location,
              niche: selectedNiche,
              rating: place.rating,
              reviews: place.reviews,
              web_status: webData.web_status,
              snippet: place.snippet,
              channel,
              market: selectedMarket,
            }),
          });
          if (msgRes.ok) {
            const msgData = await msgRes.json();
            message = msgData.message;
          }
        } catch {
          // Use empty message, user can regenerate
        }

        const result: SearchResult = {
          ...place,
          email: webData.email,
          instagram: webData.instagram,
          facebook: webData.facebook,
          web_status: webData.web_status,
          quality_score: webData.quality_score,
          page_speed: webData.page_speed,
          has_ssl: webData.has_ssl,
          is_mobile_responsive: webData.is_mobile_responsive,
          tech_stack: webData.tech_stack,
          channel,
          message,
          market: selectedMarket,
          niche: selectedNiche,
          owner_name: null,
          selected: true,
          removed: false,
        };

        processed.push(result);
        qualifyingCount++;
        setRawResults([...processed]);
      }

      setResults(processed);
      setSearching(false);
      setPhase("review");
      toast.success(`Found ${processed.filter((r) => !r.removed).length} leads ready for review`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Search failed",
      );
      setSearching(false);
      setPhase("configure");
    }
  }, [selectedMarket, selectedNiche, cities, minRating, minReviews, skipWebCheck]);

  // ─── Review handlers ─────────────────────────────
  const toggleSelect = useCallback((idx: number) => {
    setResults((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, selected: !r.selected } : r)),
    );
  }, []);

  const removeResult = useCallback((idx: number) => {
    setResults((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, removed: true } : r)),
    );
  }, []);

  const undoRemove = useCallback((idx: number) => {
    setResults((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, removed: false, selected: true } : r)),
    );
  }, []);

  const updateMessage = useCallback((idx: number, msg: string) => {
    setResults((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, message: msg } : r)),
    );
  }, []);

  const regenerateMessage = useCallback(
    async (idx: number) => {
      const lead = results[idx];
      if (!lead) return;

      setRegeneratingIdx(idx);
      try {
        const res = await fetch("/api/leadgen/generate-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            business_name: lead.business_name,
            city: lead.location,
            niche: lead.niche,
            rating: lead.rating,
            reviews: lead.reviews,
            web_status: lead.web_status,
            snippet: lead.snippet,
            channel: lead.channel,
            market: lead.market,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          updateMessage(idx, data.message);
          toast.success("Message regenerated");
        }
      } catch {
        toast.error("Failed to regenerate message");
      } finally {
        setRegeneratingIdx(null);
      }
    },
    [results, updateMessage],
  );

  const saveLeads = useCallback(
    async (onlySelected: boolean) => {
      const toSave = results.filter(
        (r) => !r.removed && (onlySelected ? r.selected : true),
      );
      if (toSave.length === 0) {
        toast.error("No leads to save");
        return;
      }

      setSaving(true);
      try {
        const res = await fetch("/api/leadgen/save-leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leads: toSave.map((r) => ({
              business_name: r.business_name,
              location: r.location,
              phone: r.phone,
              website_url: r.website_url,
              email: r.email,
              instagram: r.instagram,
              market: r.market,
              niche: r.niche,
              channel: r.channel,
              page_speed: r.page_speed,
              message: r.message,
              rating: r.rating,
              reviews: r.reviews,
              web_status: r.web_status,
              notes: null,
            })),
          }),
        });

        if (res.ok) {
          const data = await res.json();
          toast.success(`${data.success} leads saved to CRM`);
          if (data.failed > 0) {
            toast.error(`${data.failed} leads failed to save`);
          }
        } else {
          toast.error("Failed to save leads");
        }
      } catch {
        toast.error("Failed to save leads");
      } finally {
        setSaving(false);
      }
    },
    [results],
  );

  // ─── Render ──────────────────────────────────────
  const activeResults = results.filter((r) => !r.removed);
  const selectedCount = activeResults.filter((r) => r.selected).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0EA5E9]/10">
              <Radar className="h-5 w-5 text-[#0EA5E9]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#FAFAFA]">
                Lead Generator
              </h1>
              <p className="text-sm text-[#71717A]">
                Search Google Maps, check websites, generate messages
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Phase indicator */}
      <PhaseIndicator current={phase} />

      {/* Phase 1: Configure */}
      <AnimatePresence mode="wait">
        {phase === "configure" && (
          <motion.div
            key="configure"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-8"
          >
            {/* Market selector */}
            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#A1A1AA]">
                Market
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {MARKET_CONFIG.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setSelectedMarket(m.id);
                      setSelectedNiche(null);
                    }}
                    className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                      selectedMarket === m.id
                        ? "border-[#0EA5E9] bg-[#0EA5E9]/10"
                        : "border-[#27272A] bg-[#18181B] hover:border-[#3F3F46]"
                    }`}
                  >
                    <span className="text-2xl">{m.flag}</span>
                    <span
                      className={`text-sm font-medium ${selectedMarket === m.id ? "text-[#0EA5E9]" : "text-[#A1A1AA]"}`}
                    >
                      {m.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Niche selector */}
            {selectedMarket && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#A1A1AA]">
                  Niche
                </h3>
                <div className="flex flex-wrap gap-2">
                  {MARKET_CONFIG.find((m) => m.id === selectedMarket)?.niches.map(
                    (niche) => (
                      <button
                        key={niche}
                        onClick={() => setSelectedNiche(niche)}
                        className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                          selectedNiche === niche
                            ? "bg-[#0EA5E9] text-[#09090B]"
                            : "bg-[#27272A] text-[#A1A1AA] hover:bg-[#3F3F46] hover:text-[#FAFAFA]"
                        }`}
                      >
                        {niche.charAt(0).toUpperCase() +
                          niche.slice(1).replace("_", " ")}
                      </button>
                    ),
                  )}
                </div>
              </motion.div>
            )}

            {/* Cities */}
            {selectedNiche && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#A1A1AA]">
                  Cities
                </h3>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Input
                    placeholder="City name"
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addCity()}
                    className="bg-[#18181B] border-[#27272A] text-[#FAFAFA] placeholder:text-[#52525B]"
                  />
                  {(selectedMarket === "us" || selectedMarket === "uk") && (
                    <Input
                      placeholder="State (e.g. NY)"
                      value={newState}
                      onChange={(e) => setNewState(e.target.value)}
                      className="w-24 bg-[#18181B] border-[#27272A] text-[#FAFAFA] placeholder:text-[#52525B]"
                    />
                  )}
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={newCount}
                    onChange={(e) => setNewCount(Number(e.target.value) || 10)}
                    className="w-20 bg-[#18181B] border-[#27272A] text-[#FAFAFA]"
                  />
                  <Button
                    onClick={addCity}
                    variant="outline"
                    className="border-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#27272A]"
                  >
                    Add
                  </Button>
                </div>

                {/* City list */}
                {cities.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {cities.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between rounded-lg border border-[#27272A] bg-[#18181B] px-4 py-2"
                      >
                        <span className="text-sm text-[#FAFAFA]">
                          {c.city}
                          {c.state ? `, ${c.state}` : ""} — {c.count} leads
                        </span>
                        <button
                          onClick={() => removeCity(c.id)}
                          className="text-[#71717A] hover:text-[#EF4444] transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <p className="text-xs text-[#71717A]">
                      Total: {totalLeads} leads to search
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Advanced settings */}
            <div>
              <button
                onClick={() => setAdvancedOpen((prev) => !prev)}
                className="flex items-center gap-2 text-sm text-[#71717A] hover:text-[#A1A1AA] transition-colors"
              >
                <Settings2 className="h-4 w-4" />
                Advanced Settings
                {advancedOpen ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </button>
              <AnimatePresence>
                {advancedOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-3 space-y-4 overflow-hidden"
                  >
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div>
                        <label className="mb-1 block text-xs text-[#71717A]">
                          Min Rating ({minRating})
                        </label>
                        <input
                          type="range"
                          min={1}
                          max={5}
                          step={0.1}
                          value={minRating}
                          onChange={(e) =>
                            setMinRating(Number(e.target.value))
                          }
                          className="w-full accent-[#0EA5E9]"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-[#71717A]">
                          Min Reviews
                        </label>
                        <Input
                          type="number"
                          min={0}
                          value={minReviews}
                          onChange={(e) =>
                            setMinReviews(Number(e.target.value) || 0)
                          }
                          className="bg-[#18181B] border-[#27272A] text-[#FAFAFA]"
                        />
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center gap-2 text-sm text-[#A1A1AA]">
                          <input
                            type="checkbox"
                            checked={skipWebCheck}
                            onChange={(e) =>
                              setSkipWebCheck(e.target.checked)
                            }
                            className="accent-[#0EA5E9]"
                          />
                          Skip website check
                        </label>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Start button */}
            <Button
              onClick={startSearch}
              disabled={
                !selectedMarket ||
                !selectedNiche ||
                cities.length === 0
              }
              className="w-full bg-[#0EA5E9] text-[#09090B] hover:bg-[#0284C7] disabled:opacity-40 h-12 text-base font-semibold"
            >
              <Search className="mr-2 h-5 w-5" />
              Start Search ({totalLeads} leads)
            </Button>
          </motion.div>
        )}

        {/* Phase 2: Search */}
        {phase === "search" && (
          <motion.div
            key="search"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-6"
          >
            <Card className="border-[#27272A] bg-[#18181B]">
              <CardContent className="p-6">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-[#0EA5E9]" />
                  <p className="text-sm text-[#A1A1AA]">{searchProgress}</p>
                  <div className="h-2 w-full max-w-md overflow-hidden rounded-full bg-[#27272A]">
                    <motion.div
                      className="h-full bg-[#0EA5E9]"
                      animate={{
                        width: searching ? ["0%", "100%"] : "100%",
                      }}
                      transition={{
                        duration: 3,
                        repeat: searching ? Infinity : 0,
                        ease: "easeInOut",
                      }}
                    />
                  </div>
                </div>

                {/* Live results */}
                {rawResults.length > 0 && (
                  <div className="mt-6 space-y-2">
                    <p className="text-xs font-medium text-[#71717A]">
                      Found {rawResults.filter((r) => !r.removed).length} leads
                      ({rawResults.filter((r) => r.removed).length} skipped)
                    </p>
                    <div className="max-h-[300px] space-y-1.5 overflow-y-auto">
                      {rawResults.map((r, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs ${
                            r.removed
                              ? "bg-[#27272A]/50 text-[#52525B]"
                              : "bg-[#27272A] text-[#FAFAFA]"
                          }`}
                        >
                          <span className="truncate">
                            {r.business_name}
                          </span>
                          <div className="flex items-center gap-2">
                            {r.rating && (
                              <span className="flex items-center gap-0.5 text-[#F59E0B]">
                                <Star className="h-3 w-3 fill-current" />
                                {r.rating}
                              </span>
                            )}
                            {r.removed ? (
                              <span className="text-[#52525B]">Skipped</span>
                            ) : (
                              <Check className="h-3 w-3 text-[#22C55E]" />
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  onClick={() => {
                    abortRef.current = true;
                    setSearching(false);
                    if (rawResults.length > 0) {
                      setResults(rawResults);
                      setPhase("review");
                    } else {
                      setPhase("configure");
                    }
                  }}
                  variant="outline"
                  className="mt-4 w-full border-[#27272A] text-[#A1A1AA]"
                >
                  Cancel
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Phase 3: Review */}
        {phase === "review" && (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-6"
          >
            {/* Summary stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                {
                  label: "Ready",
                  value: activeResults.length,
                  color: "#22C55E",
                },
                {
                  label: "Skipped",
                  value: results.filter((r) => r.removed).length,
                  color: "#71717A",
                },
                {
                  label: "Selected",
                  value: selectedCount,
                  color: "#0EA5E9",
                },
                {
                  label: "Total Found",
                  value: results.length,
                  color: "#A1A1AA",
                },
              ].map((stat) => (
                <Card
                  key={stat.label}
                  className="border-[#27272A] bg-[#18181B]"
                >
                  <CardContent className="p-4 text-center">
                    <p
                      className="text-2xl font-bold"
                      style={{ color: stat.color }}
                    >
                      {stat.value}
                    </p>
                    <p className="text-xs text-[#71717A]">{stat.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Back button */}
            <Button
              onClick={() => setPhase("configure")}
              variant="ghost"
              size="sm"
              className="text-[#71717A] hover:text-[#A1A1AA]"
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back to Configure
            </Button>

            {/* Leads table */}
            <div className="space-y-2">
              {results.map((result, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  className={`rounded-xl border border-[#27272A] bg-[#18181B] overflow-hidden transition-opacity ${
                    result.removed ? "opacity-40" : ""
                  }`}
                >
                  {/* Row header */}
                  <div
                    onClick={() =>
                      setExpandedIdx(expandedIdx === idx ? null : idx)
                    }
                    className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-[#1E1E22] transition-colors"
                  >
                    {/* Checkbox */}
                    {!result.removed && (
                      <input
                        type="checkbox"
                        checked={result.selected}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleSelect(idx);
                        }}
                        className="accent-[#0EA5E9] shrink-0"
                      />
                    )}

                    {/* Index */}
                    <span className="w-6 text-xs text-[#52525B] tabular-nums">
                      {idx + 1}
                    </span>

                    {/* Business name */}
                    <span className="flex-1 text-sm font-medium text-[#FAFAFA] truncate">
                      {result.business_name}
                    </span>

                    {/* Location */}
                    <span className="hidden text-xs text-[#71717A] sm:inline">
                      {result.location}
                    </span>

                    {/* Rating */}
                    {result.rating && (
                      <span className="flex items-center gap-0.5 text-xs text-[#F59E0B]">
                        <Star className="h-3 w-3 fill-current" />
                        {result.rating}
                        {result.reviews && (
                          <span className="text-[#71717A]">
                            ({result.reviews})
                          </span>
                        )}
                      </span>
                    )}

                    {/* Web status badge */}
                    {result.web_status && WEB_STATUS_STYLES[result.web_status] && (
                      <Badge
                        className={`border-0 text-[10px] ${WEB_STATUS_STYLES[result.web_status].bg} ${WEB_STATUS_STYLES[result.web_status].text}`}
                      >
                        {WEB_STATUS_STYLES[result.web_status].label}
                      </Badge>
                    )}

                    {/* Channel */}
                    <Badge className="border-0 bg-[#27272A] text-[#A1A1AA] text-[10px]">
                      {result.channel}
                    </Badge>

                    {/* Contact icons */}
                    <div className="flex gap-1">
                      {result.phone && (
                        <Phone className="h-3 w-3 text-[#22C55E]" />
                      )}
                      {result.email && (
                        <Mail className="h-3 w-3 text-[#0EA5E9]" />
                      )}
                      {result.website_url && (
                        <Globe className="h-3 w-3 text-[#A1A1AA]" />
                      )}
                    </div>

                    <ChevronRight
                      className={`h-4 w-4 text-[#52525B] transition-transform ${
                        expandedIdx === idx ? "rotate-90" : ""
                      }`}
                    />
                  </div>

                  {/* Expanded detail */}
                  <AnimatePresence>
                    {expandedIdx === idx && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-t border-[#27272A]"
                      >
                        <div className="space-y-4 p-4">
                          {/* Contact info */}
                          <div className="flex flex-wrap gap-3 text-xs">
                            {result.phone && (
                              <span className="flex items-center gap-1 text-[#A1A1AA]">
                                <Phone className="h-3 w-3" />
                                {result.phone}
                                <CopyBtn text={result.phone} />
                              </span>
                            )}
                            {result.email && (
                              <span className="flex items-center gap-1 text-[#A1A1AA]">
                                <Mail className="h-3 w-3" />
                                {result.email}
                                <CopyBtn text={result.email} />
                              </span>
                            )}
                            {result.instagram && (
                              <span className="text-[#A1A1AA]">
                                IG: {result.instagram}
                              </span>
                            )}
                            {result.page_speed !== null && (
                              <span className="text-[#A1A1AA]">
                                PageSpeed: {result.page_speed}/100
                              </span>
                            )}
                            {result.tech_stack && (
                              <Badge className="border-0 bg-[#27272A] text-[#A1A1AA] text-[10px]">
                                {result.tech_stack}
                              </Badge>
                            )}
                          </div>

                          {/* Message */}
                          <div>
                            <label className="mb-1 block text-xs text-[#71717A]">
                              Message
                            </label>
                            <textarea
                              value={result.message}
                              onChange={(e) =>
                                updateMessage(idx, e.target.value)
                              }
                              rows={4}
                              className="w-full rounded-lg border border-[#27272A] bg-[#09090B] p-3 text-sm text-[#FAFAFA] placeholder:text-[#52525B] focus:border-[#0EA5E9] focus:outline-none resize-none"
                            />
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={regeneratingIdx === idx}
                              onClick={() => regenerateMessage(idx)}
                              className="border-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA]"
                            >
                              {regeneratingIdx === idx ? (
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              ) : (
                                <RefreshCw className="mr-1 h-3 w-3" />
                              )}
                              Regenerate
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                result.message &&
                                navigator.clipboard
                                  .writeText(result.message)
                                  .then(() => toast.success("Copied"))
                              }
                              className="border-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA]"
                            >
                              <Copy className="mr-1 h-3 w-3" />
                              Copy
                            </Button>
                            {result.removed ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => undoRemove(idx)}
                                className="border-[#22C55E]/30 text-[#22C55E]"
                              >
                                Undo
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => removeResult(idx)}
                                className="border-[#EF4444]/30 text-[#EF4444] hover:bg-[#EF4444]/10"
                              >
                                <Trash2 className="mr-1 h-3 w-3" />
                                Remove
                              </Button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>

            {/* Bulk action bar */}
            <div className="sticky bottom-4 flex gap-3 rounded-xl border border-[#27272A] bg-[#18181B]/95 p-4 backdrop-blur-sm shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
              <Button
                onClick={() => saveLeads(true)}
                disabled={saving || selectedCount === 0}
                className="flex-1 bg-[#22C55E] text-[#09090B] hover:bg-[#16A34A]"
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Selected ({selectedCount})
              </Button>
              <Button
                onClick={() => saveLeads(false)}
                disabled={saving || activeResults.length === 0}
                className="flex-1 bg-[#0EA5E9] text-[#09090B] hover:bg-[#0284C7]"
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save All ({activeResults.length})
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Copy button helper ──────────────────────────
function CopyBtn({ text }: { text: string }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text).then(() => toast.success("Copied"));
      }}
      className="text-[#52525B] hover:text-[#A1A1AA] transition-colors"
    >
      <Copy className="h-3 w-3" />
    </button>
  );
}

// ─── Channel determination (client-side) ─────────
function determineChannel(
  market: string,
  email: string | null,
  phone: string | null,
  instagram: string | null,
): string {
  if (market === "hr") {
    if (email) return "email";
    if (phone) return "whatsapp";
    if (instagram) return "instagram_dm";
    return "whatsapp";
  }
  if (email) return "email";
  if (instagram) return "instagram_dm";
  if (phone) return "telefon";
  return "email";
}
