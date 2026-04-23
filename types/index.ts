// ============================================
// Petar OS — TypeScript Interfaces
// ============================================

// --- Leads / CRM ---
export type LeadStatus =
  | "new"
  | "demo_built"
  | "contacted"
  | "replied"
  | "call_booked"
  | "follow_up"
  | "won"
  | "lost";

export type LeadNiche =
  | "dental"
  | "frizer"
  | "restoran"
  | "autoservis"
  | "fizioterapija"
  | "wellness"
  | "fitness"
  | "apartmani"
  | "kozmetika"
  | "pekara"
  | "ostalo";

export type LeadChannel =
  | "instagram_dm"
  | "email"
  | "linkedin"
  | "telefon"
  | "whatsapp"
  | "osobno";

export type LeadMarket = "hr" | "dach" | "us" | "uk";

export type SubscriptionTier = "basic_79" | "standard_99" | "custom";

export interface Lead {
  id: string;
  user_id: string;
  assigned_to: string | null;
  business_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website_url: string | null;
  location: string | null;
  niche: LeadNiche | null;
  status: LeadStatus;
  demo_site_url: string | null;
  subscription_tier: SubscriptionTier | null;
  notes: string | null;
  last_contacted_at: string | null;
  next_follow_up: string | null;
  source: string | null;
  instagram: string | null;
  channel: LeadChannel | null;
  market: LeadMarket | null;
  first_message: string | null;
  first_contact: string | null;
  page_speed: number | null;
  lead_score: number | null;
  follow_up_count: number;
  max_follow_ups: number;
  last_enriched_at: string | null;
  created_at: string;
  updated_at: string;
}

// --- Profiles / Sales People ---
export type UserRole = "admin" | "sales";

export interface ProfilePermissions {
  can_use_leadgen: boolean;
  can_generate_messages: boolean;
  can_edit_lead: boolean;
  can_delete_lead: boolean;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  permissions: ProfilePermissions;
  created_at: string;
  updated_at: string;
}

// Preset templates shown in the Sales People UI
export type PermissionPreset = "viewer" | "standard" | "senior";

export const PERMISSION_PRESETS: Record<PermissionPreset, {
  label: string;
  description: string;
  permissions: ProfilePermissions;
}> = {
  viewer: {
    label: "Viewer",
    description: "Can only see their assigned leads. Cannot use Lead Generator or generate AI messages.",
    permissions: {
      can_use_leadgen: false,
      can_generate_messages: false,
      can_edit_lead: true,
      can_delete_lead: false,
    },
  },
  standard: {
    label: "Standard",
    description: "Can edit assigned leads and generate AI messages. No Lead Generator access.",
    permissions: {
      can_use_leadgen: false,
      can_generate_messages: true,
      can_edit_lead: true,
      can_delete_lead: false,
    },
  },
  senior: {
    label: "Senior",
    description: "Full access: Lead Generator, AI messages, edit, and delete assigned leads.",
    permissions: {
      can_use_leadgen: true,
      can_generate_messages: true,
      can_edit_lead: true,
      can_delete_lead: true,
    },
  },
};

// --- Email Templates ---
export interface EmailTemplate {
  id: string;
  user_id: string;
  name: string;
  subject: string | null;
  body: string | null;
  niche: string | null;
  language: string;
  created_at: string;
}

// --- Outreach Log ---
export type OutreachType = "email" | "call" | "demo" | "follow_up";

export interface OutreachLog {
  id: string;
  user_id: string;
  lead_id: string;
  type: OutreachType;
  content: string | null;
  sent_at: string;
  response_received: boolean;
  response_at: string | null;
}

// --- Clients ---
export type ClientStatus = "active" | "paused" | "churned";

export interface Client {
  id: string;
  user_id: string;
  lead_id: string | null;
  business_name: string;
  site_url: string | null;
  plan: SubscriptionTier | null;
  mrr: number;
  status: ClientStatus;
  started_at: string | null;
  notes: string | null;
}

// --- Finances ---
export type FinanceType = "income" | "expense";
export type IncomeSource =
  | "father_salary"
  | "elevera"
  | "etsy"
  | "fleet"
  | "freelance";
export type ExpenseCategory =
  | "rent"
  | "food"
  | "subscriptions"
  | "domains"
  | "transport"
  | "gym"
  | "other";

export interface Finance {
  id: string;
  user_id: string;
  type: FinanceType;
  amount: number;
  source: IncomeSource | null;
  category: ExpenseCategory | null;
  description: string | null;
  date: string;
  recurring: boolean;
}

// --- Workouts ---
export type WorkoutType = "push" | "pull" | "legs";

export interface Exercise {
  name: string;
  sets: number;
  reps: number;
  weight_kg: number;
  is_pr: boolean;
}

export interface Workout {
  id: string;
  user_id: string;
  date: string;
  type: WorkoutType;
  exercises: Exercise[];
  duration_minutes: number | null;
  notes: string | null;
}

// --- Meals ---
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type MealSource = "konzum" | "fast_food" | "home" | "restaurant";

export interface Meal {
  id: string;
  user_id: string;
  date: string;
  meal_type: MealType | null;
  description: string;
  calories_approx: number | null;
  protein_g: number | null;
  source: MealSource | null;
}

// --- Deadlines ---
export type DeadlineType = "exam" | "project" | "assignment";
export type Priority = "low" | "medium" | "high" | "critical";

export interface Deadline {
  id: string;
  user_id: string;
  title: string;
  type: DeadlineType | null;
  course: string | null;
  due_date: string;
  completed: boolean;
  priority: Priority;
  notes: string | null;
}

// --- Outreach Queue (Feature 1) ---
export type OutreachPriority = "hot" | "follow_up" | "nurture" | "first_contact";
export type OutreachQueueStatus = "pending" | "approved" | "sent" | "skipped";

export interface OutreachQueueItem {
  id: string;
  user_id: string;
  lead_id: string;
  channel: string;
  message: string;
  priority: OutreachPriority;
  scheduled_for: string;
  status: OutreachQueueStatus;
  generated_at: string;
  sent_at: string | null;
  notes: string | null;
  // Joined lead data
  lead?: Lead;
}

// --- Lead Enrichment (Feature 2) ---
export interface LeadEnrichment {
  id: string;
  lead_id: string;
  page_speed_mobile: number | null;
  page_speed_desktop: number | null;
  has_ssl: boolean | null;
  is_mobile_responsive: boolean | null;
  tech_stack: string | null;
  google_rating: number | null;
  google_reviews_count: number | null;
  instagram_followers: number | null;
  website_last_modified: string | null;
  enrichment_summary: string | null;
  enriched_at: string;
  raw_data: Record<string, unknown> | null;
}

// --- Conversation Tracker (Feature 3) ---
export type ConversationChannel = "whatsapp" | "email" | "instagram_dm" | "telefon" | "linkedin" | "osobno";
export type ConversationDirection = "outbound" | "inbound";
export type ConversationSentiment = "positive" | "neutral" | "negative" | "no_response";

export interface ConversationEntry {
  id: string;
  user_id: string;
  lead_id: string;
  type: OutreachType;
  content: string | null;
  sent_at: string;
  response_received: boolean;
  response_at: string | null;
  channel: ConversationChannel | null;
  direction: ConversationDirection;
  subject: string | null;
  sentiment: ConversationSentiment | null;
  follow_up_number: number | null;
}

// --- Lead Scores (Feature 4) ---
export type ScoreRecommendation = "pursue" | "nurture" | "drop" | "close_now";

export interface LeadScore {
  id: string;
  lead_id: string;
  total_score: number;
  engagement_score: number;
  business_score: number;
  timing_score: number;
  negative_score: number;
  recommendation: ScoreRecommendation | null;
  recommendation_reason: string | null;
  similar_won_leads: Array<{ id: string; business_name: string; niche: string }> | null;
  scored_at: string;
}

// --- Lead Generator (Feature 5) ---
export type LeadgenMarket = "hr" | "dach" | "us" | "uk";
export type WebStatus = "NO_WEB" | "BAD_WEB" | "MEDIOCRE" | "GOOD";

export interface LeadgenResult {
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
  web_status: WebStatus;
  quality_score: number;
  page_speed: number | null;
  has_ssl: boolean | null;
  is_mobile_responsive: boolean | null;
  tech_stack: string | null;
  channel: string;
  message: string;
  market: LeadgenMarket;
  niche: string;
  owner_name: string | null;
  selected: boolean;
}

// --- Leadgen Jobs (Inngest) ---
export type LeadgenJobStatus = "pending" | "searching" | "processing" | "completed" | "failed" | "cancelled";

export interface LeadgenJobProgress {
  searched: number;
  checked: number;
  qualifying: number;
  skipped: number;
  target: number;
}

export interface LeadgenJob {
  id: string;
  user_id: string;
  status: LeadgenJobStatus;
  config: Record<string, unknown>;
  progress: LeadgenJobProgress;
  results: LeadgenResult[];
  error: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

// --- Dashboard ---
export interface KPICard {
  label: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon?: string;
}

export interface QuickAction {
  label: string;
  href: string;
  icon: string;
}
