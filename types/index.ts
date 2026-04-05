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

export type LeadMarket = "hr" | "dach" | "us";

export type SubscriptionTier = "basic_79" | "standard_99" | "custom";

export interface Lead {
  id: string;
  user_id: string;
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
  created_at: string;
  updated_at: string;
}

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
