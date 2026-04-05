# PETAR OS — Ultra-Detailed Feature Checklist

> Every item maps directly to the PRD in CLAUDE.md. Nothing added, nothing skipped.
> Mark items `[x]` as they are completed.

---

## PHASE 1: Foundation (Week 1)

### 1.1 Project Initialization
- [x] Initialize Next.js 15 project with App Router
- [x] Configure TypeScript (strict mode, no `any` types)
- [x] Install and configure Tailwind CSS
- [x] Install and configure shadcn/ui
- [x] Install Recharts for data visualization
- [x] Install Framer Motion for micro-interactions
- [x] Set up folder structure:
  - [x] `app/` — App Router pages
  - [x] `app/(dashboard)/` — Main layout group with sidebar
  - [x] `app/(dashboard)/page.tsx` — Command Center
  - [x] `app/(dashboard)/crm/` — Outreach CRM page
  - [x] `app/(dashboard)/finance/` — Financial dashboard
  - [x] `app/(dashboard)/fitness/` — Fitness hub
  - [x] `app/(dashboard)/university/` — Deadline tracker
  - [x] `app/(dashboard)/clients/` — Client management
  - [x] `app/api/mcp/` — MCP server endpoint
  - [x] `app/api/leads/` — Leads CRUD routes
  - [x] `app/api/finance/` — Finance CRUD routes
  - [x] `app/api/fitness/` — Fitness CRUD routes
  - [x] `app/api/university/` — University CRUD routes
  - [x] `app/api/clients/` — Clients CRUD routes
  - [x] `components/ui/` — Reusable primitives (Button, Card, etc.)
  - [ ] `components/sections/` — Page sections (created as needed in Phase 2+)
  - [x] `components/layout/` — Sidebar
  - [x] `lib/mcp/` — MCP tool definitions and handlers
  - [x] `lib/supabase/` — Supabase client + types
  - [x] `lib/ai/` — Claude API integration
  - [x] `lib/utils.ts` — Utility functions
  - [x] `types/` — TypeScript interfaces
  - [x] `design/tokens.ts` — Design tokens file

### 1.2 Design System & Tokens
- [x] Create `design/tokens.ts` with:
  - [x] `colors.primary` — electric blue (#0EA5E9)
  - [x] `colors.secondary` — teal (#06B6D4)
  - [x] `colors.background` — dark (#09090B)
  - [x] `colors.surface` — card bg (#18181B)
  - [x] `colors.text` — soft white (#FAFAFA)
  - [x] `colors.textMuted` — muted (#71717A)
  - [x] `colors.border` — subtle (#27272A)
  - [x] `fonts.heading` — Geist Sans
  - [x] `fonts.body` — Geist Sans
  - [x] `spacing.sectionY` — `py-24 md:py-32`
  - [x] `spacing.containerX` — `px-6 md:px-12 lg:px-24`
  - [x] `spacing.maxWidth` — `max-w-6xl`
  - [x] `radius.sm`, `radius.md`, `radius.lg`
  - [x] `shadows.subtle`, `shadows.medium`
- [x] Configure Tailwind theme to use design tokens
- [x] Set up Geist font (or chosen sans-serif)
- [x] Dark theme as default (no light mode toggle needed)

### 1.3 Supabase Setup
- [x] Create Supabase project
- [x] Configure Supabase JS client in `lib/supabase/`
- [x] Generate TypeScript types from Supabase schema
- [x] Enable Row Level Security (RLS) on all tables
- [x] Configure RLS policies (single user: `user_id = auth.uid()`)
- [x] Create database tables:

#### Table: `leads`
- [x] `id` — uuid PK, auto-generated
- [x] `business_name` — text NOT NULL
- [x] `contact_name` — text
- [x] `email` — text
- [x] `phone` — text
- [x] `website_url` — text
- [x] `location` — text
- [x] `niche` — text (apartment/salon/villa/charter/hotel/vet/tattoo/realtor)
- [x] `status` — text NOT NULL (new/contacted/follow_up/demo_scheduled/closed_won/closed_lost)
- [x] `demo_site_url` — text
- [x] `subscription_tier` — text (basic_79/standard_99/custom)
- [x] `notes` — text
- [x] `last_contacted_at` — timestamptz
- [x] `next_follow_up` — timestamptz
- [x] `source` — text (leadgen_script/manual/referral)
- [x] `created_at` — timestamptz, auto
- [x] `updated_at` — timestamptz, auto

#### Table: `email_templates`
- [x] `id` — uuid PK, auto-generated
- [x] `name` — text NOT NULL
- [x] `subject` — text
- [x] `body` — text (with `{{placeholders}}`)
- [x] `niche` — text
- [x] `language` — text (hr/en)
- [x] `created_at` — timestamptz, auto

#### Table: `outreach_log`
- [x] `id` — uuid PK, auto-generated
- [x] `lead_id` — uuid FK → leads
- [x] `type` — text (email/call/demo/follow_up)
- [x] `content` — text
- [x] `sent_at` — timestamptz
- [x] `response_received` — boolean
- [x] `response_at` — timestamptz

#### Table: `clients`
- [x] `id` — uuid PK, auto-generated
- [x] `lead_id` — uuid FK → leads
- [x] `business_name` — text NOT NULL
- [x] `site_url` — text
- [x] `plan` — text (basic_79/standard_99/custom)
- [x] `mrr` — numeric
- [x] `status` — text (active/paused/churned)
- [x] `started_at` — date
- [x] `notes` — text

#### Table: `finances`
- [x] `id` — uuid PK, auto-generated
- [x] `type` — text NOT NULL (income/expense)
- [x] `amount` — numeric NOT NULL
- [x] `source` — text (father_salary/elevera/etsy/fleet/freelance)
- [x] `category` — text (rent/food/subscriptions/domains/transport/gym/other)
- [x] `description` — text
- [x] `date` — date NOT NULL
- [x] `recurring` — boolean

#### Table: `workouts`
- [x] `id` — uuid PK, auto-generated
- [x] `date` — date NOT NULL
- [x] `type` — text NOT NULL (push/pull/legs)
- [x] `exercises` — jsonb NOT NULL (`[{name, sets, reps, weight_kg, is_pr}]`)
- [x] `duration_minutes` — integer
- [x] `notes` — text

#### Table: `meals`
- [x] `id` — uuid PK, auto-generated
- [x] `date` — date NOT NULL
- [x] `meal_type` — text (breakfast/lunch/dinner/snack)
- [x] `description` — text NOT NULL
- [x] `calories_approx` — integer
- [x] `protein_g` — integer
- [x] `source` — text (konzum/fast_food/home/restaurant)

#### Table: `deadlines`
- [x] `id` — uuid PK, auto-generated
- [x] `title` — text NOT NULL
- [x] `type` — text (exam/project/assignment)
- [x] `course` — text
- [x] `due_date` — date NOT NULL
- [x] `completed` — boolean DEFAULT false
- [x] `priority` — text (low/medium/high/critical)
- [x] `notes` — text

### 1.4 Authentication
- [x] Build auth flow (magic link or password)
- [x] Single-user login screen
- [x] Auth middleware to protect all dashboard routes
- [x] Supabase Auth integration
- [x] Session management

### 1.5 App Shell & Layout
- [x] Dashboard layout with sidebar navigation
- [x] Sidebar with links to all pages:
  - [x] Command Center (home)
  - [x] Outreach CRM
  - [x] Finance
  - [x] Fitness
  - [x] University
  - [x] Clients
- [x] Active page indicator in sidebar
- [x] Dark theme applied globally
- [x] Minimal, functional aesthetic — information-dense but not cluttered
- [x] Cards with subtle borders, no heavy shadows
- [x] Responsive layout: laptop (primary) + phone (secondary)
- [x] Micro-interactions on hover/click (Framer Motion)
- [x] Error handling: toast notifications with shadcn Sonner

### 1.6 Command Center (Static Placeholder)
- [x] Today's date display
- [x] Weather placeholder for Zagreb
- [x] Motivational or status line
- [x] KPI cards (static/placeholder data):
  - [x] Total MRR
  - [x] Active Leads
  - [x] Pipeline Value
  - [x] Outreach Response Rate
- [x] Today's Tasks section (placeholder)
- [x] Follow-up Alerts section (placeholder)
- [x] Quick Action buttons:
  - [x] "Add Lead"
  - [x] "Log Workout"
  - [x] "Log Expense"
- [x] Mini charts (placeholder):
  - [x] Weekly outreach volume
  - [x] Monthly revenue trend

### 1.7 MCP Server Foundation
- [x] Set up MCP server endpoint at `/api/mcp`
- [x] Implement Streamable HTTP transport
- [x] Accept POST requests with JSON-RPC messages
- [x] Return SSE streams for responses
- [x] Bearer token authentication (`PETAR_OS_MCP_TOKEN` env var)
- [x] Authorization header validation on every request
- [x] Basic tool registration framework
- [x] Tool definition structure: name, description, JSON Schema for input params
- [x] Routing layer: incoming tool calls → appropriate handler

---

## PHASE 2: CRM + Finance (Week 2)

### 2.1 Outreach CRM — Kanban Board
- [x] Kanban-style pipeline board
- [x] Drag-and-drop functionality (dnd-kit)
- [x] 6 columns:
  - [x] New
  - [x] Contacted
  - [x] Follow-up
  - [x] Demo Scheduled
  - [x] Closed Won
  - [x] Closed Lost
- [x] Lead cards on board showing:
  - [x] Business name
  - [x] Location
  - [x] Niche badge
  - [x] Days since last contact
- [x] Drag lead card between columns to update status
- [x] Optimistic UI updates on drag

### 2.2 Outreach CRM — Lead Detail Modal
- [x] Click card to open detail modal
- [x] Full lead information display:
  - [x] Business name, contact name
  - [x] Email, phone
  - [x] Website URL (clickable link)
  - [x] Location, niche
  - [x] Status, subscription tier
  - [x] Demo site URL
  - [x] Source
  - [x] Notes
  - [x] Last contacted date
  - [x] Next follow-up date
- [x] Outreach log timeline:
  - [x] Chronological list of all outreach (emails, calls, demos, follow-ups)
  - [x] Each entry shows: type, content, sent date, response status
- [ ] "Generate Email" button in modal (skipped — handled via MCP)
- [x] Edit lead fields inline or via form
- [x] Delete lead with confirmation

### 2.3 Outreach CRM — Cold Email Generation
- [ ] ~~Claude API integration in `lib/ai/`~~ (not needed — handled via MCP)
- [ ] ~~Generate Email button calls Claude API~~ (skipped per user request)
- [ ] Prompt includes:
  - [ ] Lead context (business name, niche, location, website URL)
  - [ ] ROI argument: "one direct booking pays for the whole year of our service"
  - [ ] Niche-specific angle
  - [ ] Croatian language preference
- [ ] Display generated email in modal for review
- [ ] Copy-to-clipboard button for generated email
- [ ] Log generated email to `outreach_log`

### 2.4 Outreach CRM — Bulk Actions & Filters
- [x] Select multiple lead cards (checkbox)
- [x] Bulk move to stage
- [x] Bulk export to CSV
- [x] Filter leads by:
  - [x] Niche
  - [x] Location (via search)
  - [x] Status
  - [x] Date range
  - [x] Market
  - [x] Channel
  - [x] Follow-up only toggle
- [x] Stats bar at top:
  - [x] Conversion funnel visualization
  - [x] Lead count per stage

### 2.5 Outreach CRM — API Routes
- [x] `POST /api/leads` — Create lead
- [x] `GET /api/leads` — List leads with query filters
- [x] `GET /api/leads/[id]` — Get single lead
- [x] `PATCH /api/leads/[id]` — Update lead
- [x] `DELETE /api/leads/[id]` — Delete lead
- [x] `POST /api/leads/[id]/outreach` — Log outreach entry
- [x] `GET /api/leads/[id]/outreach` — Get outreach log for lead
- [ ] `POST /api/leads/generate-email` — Generate cold email via Claude API (handled via MCP)

### 2.6 Financial Dashboard — Charts & Overview
- [x] Monthly P&L chart (Recharts stacked bar: income vs expenses)
- [x] Income breakdown by source:
  - [x] Father's company
  - [x] Elevera clients
  - [x] Etsy
  - [x] Fleet
- [x] Expense categories breakdown:
  - [x] Rent (future)
  - [x] Food
  - [x] Subscriptions
  - [x] Domains
  - [x] Transport
  - [x] Gym
  - [x] Other
- [x] Savings rate percentage display
- [x] Savings rate trend chart
- [x] "Move-in Fund" tracker:
  - [x] Target amount input/display
  - [x] Current saved amount (calculated)
  - [x] Progress bar / visualization
- [x] Recurring expenses list with monthly total

### 2.7 Financial Dashboard — Logging Forms
- [x] Quick log form with fields:
  - [x] Amount (EUR)
  - [x] Type toggle: Income / Expense
  - [x] Source (for income): father_salary / elevera / etsy / fleet / freelance
  - [x] Category (for expenses): rent / food / subscriptions / domains / transport / gym / other
  - [x] Description (free text)
  - [x] Date picker
  - [x] Recurring toggle (boolean)
- [x] Optimistic UI updates on form submit
- [x] Toast notification on success/error

### 2.8 Financial Dashboard — API Routes
- [x] `POST /api/finance` — Log income or expense
- [x] `GET /api/finance` — List transactions with filters
- [x] `GET /api/finance/summary` — Monthly/yearly P&L, savings rate
- [x] `GET /api/finance/by-source` — Revenue breakdown by source
- [x] `PATCH /api/finance/[id]` — Update transaction
- [x] `DELETE /api/finance/[id]` — Delete transaction

### 2.9 CRM MCP Tools
- [x] `create_lead` — Add new lead (business_name required + optional fields)
- [x] `update_lead` — Update any lead field by ID
- [x] `move_lead` — Move lead to pipeline stage
- [x] `list_leads` — Query leads with filters (status, niche, market, location)
- [x] `generate_cold_email` — Returns lead context for Claude to compose email
- [x] `get_outreach_stats` — Return conversion rates, response rates, pipeline velocity

### 2.10 Finance MCP Tools
- [x] `log_income` — Record income (source: father/elevera/etsy/fleet/freelance)
- [x] `log_expense` — Record expense with category
- [x] `get_financial_summary` — Monthly/yearly P&L, runway, savings rate
- [x] `get_revenue_by_source` — Breakdown by income source

---

## PHASE 3: Life Modules (Week 3)

### 3.1 Fitness Hub — Workout Logging
- [x] PPL Rotation indicator:
  - [x] Display current day in rotation (Push A / Pull A / Legs A / Push B / Pull B / Legs B)
  - [x] Calculate based on workout history
- [x] Quick-log workout form:
  - [x] Date picker (defaults to today)
  - [x] Workout type selector: Push / Pull / Legs
  - [x] Exercise selector from presets (per workout type)
  - [x] For each exercise: sets, reps, weight_kg inputs
  - [x] PR checkbox per exercise
  - [x] Duration (minutes) input
  - [x] Notes field (how it felt, energy level)
  - [x] Add/remove exercise rows dynamically
- [x] Optimistic UI on submit
- [x] Toast notification on success

### 3.2 Fitness Hub — PR Board
- [x] Best lifts display with:
  - [x] Exercise name
  - [x] Weight (kg)
  - [x] Date achieved
- [x] Auto-calculated from workout history (exercises with `is_pr = true`)
- [x] Highlight recent PRs

### 3.3 Fitness Hub — Volume & Trends
- [x] Volume chart (Recharts):
  - [x] Weekly tonnage trend per muscle group
  - [x] Push / Pull / Legs breakdown
- [x] Streak counter: consecutive training days

### 3.4 Fitness Hub — Meal Logging
- [x] Quick meal entry form:
  - [x] Date (defaults to today)
  - [x] Meal type: breakfast / lunch / dinner / snack
  - [x] Description (what was eaten)
  - [x] Approximate calories
  - [x] Approximate protein (grams)
  - [x] Source: konzum / fast_food / home / restaurant
- [x] Daily calorie/protein summary bar:
  - [x] Total calories consumed today
  - [x] Total protein consumed today
  - [x] Visual progress bar against targets

### 3.5 Fitness Hub — API Routes
- [x] `POST /api/fitness/workouts` — Log workout
- [x] `GET /api/fitness/workouts` — List workouts with filters
- [x] `GET /api/fitness/prs` — Get all PRs
- [x] `GET /api/fitness/volume` — Get volume trends
- [x] `GET /api/fitness/streak` — Get current streak
- [x] `POST /api/fitness/meals` — Log meal
- [x] `GET /api/fitness/meals` — List meals with filters
- [x] `GET /api/fitness/meals/daily` — Get daily calorie/protein summary

### 3.6 University Tracker
- [x] "Days to Graduation" countdown display
- [x] Upcoming deadlines list:
  - [x] Sorted by urgency (due_date ascending)
  - [x] Color coding by priority (low/medium/high/critical)
  - [x] Countdown days remaining per deadline
  - [x] Completed status toggle
- [x] Course checklist:
  - [x] List of courses
  - [x] Completed vs remaining indicators
- [x] Quick-add deadline form:
  - [x] Title
  - [x] Type: exam / project / assignment
  - [x] Course name
  - [x] Due date
  - [x] Priority: low / medium / high / critical
  - [x] Notes
- [x] Calendar view of exam/project dates
- [x] Optimistic UI on form actions

### 3.7 University Tracker — API Routes
- [x] `POST /api/university/deadlines` — Add deadline
- [x] `GET /api/university/deadlines` — List deadlines with filters
- [x] `PATCH /api/university/deadlines/[id]` — Update deadline (mark complete, edit)
- [x] `DELETE /api/university/deadlines/[id]` — Delete deadline

### 3.8 Client Management Page
- [x] Client cards displaying:
  - [x] Business name
  - [x] Site URL (clickable)
  - [x] Plan (basic_79 / standard_99 / custom)
  - [x] MRR amount (EUR)
  - [x] Status (active / paused / churned)
  - [x] Started date
- [x] Total MRR calculator (sum of all active clients)
- [x] Client health indicators:
  - [x] Last site update
  - [x] Pending tasks (if any)
- [x] Quick notes per client (editable inline)
- [x] Add client form:
  - [x] Business name
  - [x] Site URL
  - [x] Plan
  - [x] MRR
  - [x] Status
  - [x] Start date
  - [x] Link to original lead (lead_id FK)
  - [x] Notes

### 3.9 Client Management — API Routes
- [x] `POST /api/clients` — Add client
- [x] `GET /api/clients` — List clients
- [x] `GET /api/clients/[id]` — Get single client
- [x] `PATCH /api/clients/[id]` — Update client
- [x] `DELETE /api/clients/[id]` — Delete client
- [x] `GET /api/clients/mrr` — Calculate total MRR

### 3.10 Fitness MCP Tools
- [x] `log_workout` — Log exercises with sets, reps, weight
- [x] `log_meal` — Log meal with approximate calories
- [x] `get_fitness_stats` — PR history, volume trends, calorie tracking
- [x] `get_ppl_schedule` — Current PPL day in rotation

### 3.11 University MCP Tools
- [x] `add_deadline` — Add exam/project deadline
- [x] `get_deadlines` — List upcoming deadlines with countdown

### 3.12 Client MCP Tools
- [x] `add_client` — Add Elevera client with site URL, plan, status
- [x] `update_client` — Update client information
- [x] `list_clients` — List active clients with MRR

---

## PHASE 4: Intelligence Layer (Week 4)

### 4.1 Morning Brief Generation
- [x] `get_daily_brief` MCP tool implementation
- [x] Aggregates data from ALL modules:
  - [x] Today's tasks from Todoist
  - [x] Upcoming deadlines
  - [x] Leads needing follow-up
  - [x] Today's workout type (PPL rotation)
  - [x] Financial snapshot
  - [x] Weather in Zagreb
- [x] Claude API formats data into natural-language morning briefing
- [x] Display morning brief on Command Center page

### 4.2 Todoist API Integration
- [x] `sync_todoist` MCP tool
- [x] REST API integration using existing PAT (Personal Access Token)
- [x] Sync tasks from 4 Todoist projects:
  - [x] Elevera Studio
  - [x] Fakultet
  - [x] Osobno
  - [x] Tatin posao
- [x] Display synced tasks on Command Center
- [x] API route: `GET /api/todoist/sync`

### 4.3 OpenWeather API Integration
- [x] Fetch current weather for Zagreb
- [x] Free tier REST API integration
- [x] Display on Command Center (today's date + weather)
- [x] Include in morning brief

### 4.4 Follow-up Alert System
- [x] Query leads with overdue follow-up dates
- [x] Display alerts on Command Center
- [x] Count of leads needing attention
- [x] Click alert to navigate to lead in CRM
- [x] Visual urgency indicators

### 4.5 Pipeline Analytics with AI
- [x] `analyze_pipeline` MCP tool
- [x] Analyzes outreach effectiveness from real data
- [x] Returns recommendations for improving conversion
- [x] Stats calculated:
  - [x] Conversion rates per stage
  - [x] Response rates
  - [x] Pipeline velocity
  - [x] Best-performing niches
  - [x] Best-performing locations

### 4.6 Command Center — Live KPIs
- [x] Replace all placeholder data with live Supabase queries
- [x] KPI cards with real data:
  - [x] Total MRR — sum from active clients
  - [x] Active Leads — count of leads not in won/lost
  - [x] Pipeline Value — estimated value of active pipeline
  - [x] Outreach Response Rate — calculated from lead statuses
- [x] Today's Tasks — from Todoist sync + local deadlines
- [x] Follow-up Alerts — leads needing attention (overdue follow-up)
- [x] Mini charts with real data:
  - [x] Weekly outreach volume (Recharts)
  - [x] Monthly revenue trend (Recharts)
- [x] Quick Action buttons wired to actual pages

### 4.7 Dashboard Summary MCP Tool
- [x] `get_dashboard_summary` — Full overview of all modules
- [x] Returns aggregated data from:
  - [x] Leads/CRM stats
  - [x] Financial summary
  - [x] Fitness stats
  - [x] Upcoming deadlines
  - [x] Client MRR
  - [x] Follow-up alerts

### 4.8 Full MCP Server Testing
- [x] All 23 MCP tools wired to real Supabase:
  - [x] `create_lead`
  - [x] `update_lead`
  - [x] `move_lead`
  - [x] `list_leads`
  - [x] `generate_cold_email`
  - [x] `get_outreach_stats`
  - [x] `log_income`
  - [x] `log_expense`
  - [x] `get_financial_summary`
  - [x] `get_revenue_by_source`
  - [x] `log_workout`
  - [x] `log_meal`
  - [x] `get_fitness_stats`
  - [x] `get_ppl_schedule`
  - [x] `add_deadline`
  - [x] `get_deadlines`
  - [x] `sync_todoist`
  - [x] `get_daily_brief`
  - [x] `get_dashboard_summary`
  - [x] `add_client`
  - [x] `update_client`
  - [x] `list_clients`
  - [x] `analyze_pipeline`
- [x] Bearer token auth works correctly
- [x] Streamable HTTP transport with Web Standards API
- [x] JSON-RPC message format compliance

### 4.9 Claude.ai Connector Setup
- [ ] Configure MCP server URL for Claude.ai integration (requires Vercel deployment)
- [ ] Set `PETAR_OS_MCP_TOKEN` on Vercel environment variables
- [x] All tools callable via natural language
- [ ] Test example prompts from PRD (requires deployment)

---

## CROSS-CUTTING: Design & UX Quality

### Responsiveness
- [ ] Test all pages at 375px (iPhone SE)
- [ ] Test all pages at 768px (iPad)
- [ ] Test all pages at 1440px (Desktop)
- [ ] Fix any layout issues at each breakpoint
- [ ] Mobile: usable for quick logs (workout, meal, expense)
- [ ] Laptop: primary experience, information-dense layout

### Polish Pass
- [ ] Hover states on ALL interactive elements
- [ ] Entrance animations (fade-up on scroll — Framer Motion / Intersection Observer)
- [ ] Color contrast WCAG AA minimum on all text
- [ ] All text readable and properly sized
- [ ] Typographic hierarchy with clear size jumps
- [ ] Real whitespace — sections breathe (`py-24` minimum)
- [ ] No generic AI aesthetics — unique, handcrafted feel
- [ ] No default Tailwind blue (#3B82F6) anywhere
- [ ] Accent color: electric blue or teal consistently applied
- [ ] Cards with subtle borders, no heavy drop shadows
- [ ] Toast notifications (Sonner) for all form actions
- [ ] Optimistic UI updates on all forms
- [ ] Loading states / skeletons for async data

### Deployment
- [ ] Configure Vercel project
- [ ] Set all environment variables on Vercel:
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `PETAR_OS_MCP_TOKEN`
  - [ ] `ANTHROPIC_API_KEY`
  - [ ] `TODOIST_API_TOKEN`
  - [ ] `OPENWEATHER_API_KEY`
- [ ] Git push deploy pipeline working
- [ ] Production build passes with no errors
- [ ] TypeScript strict mode — zero type errors

---

## SUCCESS CRITERIA (from PRD)
- [ ] Petar opens it as first tab every morning
- [ ] Cold emails generated in under 60 seconds per lead
- [ ] Financial overview answers "can we afford the apartment?" at a glance
- [ ] Claude can perform any dashboard action via MCP without opening browser
- [ ] Workout and meal logging takes under 30 seconds each
- [ ] Zero missed university deadlines

---

**Total items: ~230+**
**Phases: 4**
**Timeline: 4-6 weeks**
