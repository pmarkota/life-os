PETAR OS
Life & Work Command Center
Product Requirements Document
v1.0 — April 2026

Full-Stack Next.js Dashboard + MCP Server
Petar Markota — Elevera Studio

1. Project Overview
Petar OS is a full-stack personal dashboard that unifies work operations (Elevera Studio, Fleet by Elevera, freelancing), personal life management (fitness, finances, university), and AI-powered automation into a single Next.js application. The critical differentiator is a built-in MCP (Model Context Protocol) server that exposes every feature to Claude, enabling natural-language control over the entire system.

Owner: Petar Markota (petar.markota@gmail.com)
Stack: Next.js 15 (App Router), TypeScript, Supabase (PostgreSQL + Auth), Tailwind CSS, shadcn/ui
Deployment: Vercel (dashboard) + MCP server endpoint
Timeline: 4 phases, ~4-6 weeks total

2. System Architecture
2.1 High-Level Architecture
The application consists of three layers:
Frontend Layer: Next.js App Router with React Server Components, Tailwind CSS, shadcn/ui components, and Recharts for data visualization
API Layer: Next.js API routes (Route Handlers) serving both the dashboard UI and the MCP server protocol
Data Layer: Supabase PostgreSQL for persistence, with Row Level Security (RLS) for single-user protection

2.2 MCP Server Architecture
The MCP server is the core innovation. It exposes the entire dashboard as a set of tools that Claude can call through the MCP protocol. This means Petar can say things like:
"Add Apartmani Sunce from Split as a new lead with email info@sunce.hr"
"Move all leads that haven't responded in 7 days to Follow-up status"
"Log today's workout: bench 5x5 at 120kg, squat 4x8 at 100kg"
"What's my total Elevera revenue this month?"
"Generate a cold email for Villa Adriatic in Dubrovnik"
"Show me my outreach conversion rate for the last 30 days"

2.3 MCP Tools Specification
Each MCP tool maps to a dashboard feature. The server exposes the following tool categories:

Tool Category
Tool Name
Description
Leads/CRM
create_lead
Add a new lead with name, email, niche, location, website URL, notes
Leads/CRM
update_lead
Update lead status, notes, or any field
Leads/CRM
move_lead
Move lead to a pipeline stage (new/contacted/follow_up/demo/closed/lost)
Leads/CRM
list_leads
Query leads with filters (status, niche, date range, location)
Leads/CRM
generate_cold_email
Generate personalized cold email using lead context + ROI argument
Leads/CRM
get_outreach_stats
Conversion rates, response rates, pipeline velocity
Finance
log_income
Record income (source: father, elevera, etsy, fleet)
Finance
log_expense
Record expense with category
Finance
get_financial_summary
Monthly/yearly P&L, runway, savings rate
Finance
get_revenue_by_source
Breakdown by income source
Fitness
log_workout
Log exercises with sets, reps, weight
Fitness
log_meal
Log meal with approximate calories
Fitness
get_fitness_stats
PR history, volume trends, calorie tracking
Fitness
get_ppl_schedule
Current PPL day in rotation
University
add_deadline
Add exam/project deadline
University
get_deadlines
List upcoming deadlines with countdown
Tasks
sync_todoist
Pull tasks from Todoist API
Tasks
get_daily_brief
Morning brief: today's tasks, follow-ups, deadlines, weather
Dashboard
get_dashboard_summary
Full overview of all modules
Clients
add_client
Add Elevera client with site URL, plan, status
Clients
update_client
Update client information
Clients
list_clients
List active clients with MRR


3. Database Schema (Supabase)
All tables live in Supabase PostgreSQL with RLS enabled. Single-user app so RLS is simple (user_id = auth.uid()).

3.1 leads
Column
Type
Description
id
uuid (PK)
Auto-generated
business_name
text NOT NULL
e.g. "Apartmani ANITA"
contact_name
text
Owner/manager name
email
text
Primary contact email
phone
text
Phone number
website_url
text
Current website URL
location
text
City/region (e.g. "Pula")
niche
text
apartment/salon/villa/charter/hotel/vet/tattoo/realtor
status
text NOT NULL
new/contacted/follow_up/demo_scheduled/closed_won/closed_lost
demo_site_url
text
Vercel demo site link
subscription_tier
text
basic_79/standard_99/custom
notes
text
Free-form notes
last_contacted_at
timestamptz
Last email/call date
next_follow_up
timestamptz
Scheduled follow-up
source
text
How found: leadgen_script/manual/referral
created_at
timestamptz
Auto
updated_at
timestamptz
Auto


3.2 email_templates
Column
Type
Description
id
uuid (PK)
Auto-generated
name
text NOT NULL
Template name (e.g. "apartment_initial")
subject
text
Email subject template
body
text
Email body with {{placeholders}}
niche
text
Which niche this template targets
language
text
hr/en
created_at
timestamptz
Auto


3.3 outreach_log
Column
Type
Description
id
uuid (PK)
Auto-generated
lead_id
uuid FK
Reference to leads table
type
text
email/call/demo/follow_up
content
text
Email content or call notes
sent_at
timestamptz
When sent/made
response_received
boolean
Did they respond?
response_at
timestamptz
When they responded


3.4 clients
Column
Type
Description
id
uuid (PK)
Auto-generated
lead_id
uuid FK
Original lead reference
business_name
text NOT NULL
Client business name
site_url
text
Live website URL
plan
text
basic_79/standard_99/custom
mrr
numeric
Monthly recurring revenue in EUR
status
text
active/paused/churned
started_at
date
Contract start date
notes
text
Client notes


3.5 finances
Column
Type
Description
id
uuid (PK)
Auto-generated
type
text NOT NULL
income/expense
amount
numeric NOT NULL
Amount in EUR
source
text
father_salary/elevera/etsy/fleet/freelance
category
text
For expenses: rent/food/subscriptions/domains/transport/gym/other
description
text
Free text description
date
date NOT NULL
Transaction date
recurring
boolean
Is this monthly recurring?


3.6 workouts
Column
Type
Description
id
uuid (PK)
Auto-generated
date
date NOT NULL
Workout date
type
text NOT NULL
push/pull/legs
exercises
jsonb NOT NULL
[{name, sets, reps, weight_kg, is_pr}]
duration_minutes
integer
Total workout duration
notes
text
How it felt, energy level


3.7 meals
Column
Type
Description
id
uuid (PK)
Auto-generated
date
date NOT NULL
Meal date
meal_type
text
breakfast/lunch/dinner/snack
description
text NOT NULL
What was eaten
calories_approx
integer
Approximate calories
protein_g
integer
Approximate protein in grams
source
text
konzum/fast_food/home/restaurant


3.8 deadlines
Column
Type
Description
id
uuid (PK)
Auto-generated
title
text NOT NULL
Exam/project name
type
text
exam/project/assignment
course
text
Course name at Algebra
due_date
date NOT NULL
Deadline date
completed
boolean DEFAULT false
Is it done?
priority
text
low/medium/high/critical
notes
text
Study notes, resources


4. Dashboard Pages & UI

4.1 Command Center (Home)
The landing page when opening Petar OS. Shows a morning-brief style overview:
Today's date, weather in Zagreb, motivational or status line
KPI cards: Total MRR, Active Leads, Pipeline Value, Outreach Response Rate
Today's Tasks (pulled from Todoist API + local deadlines)
Follow-up Alerts: leads that need attention (no response 48h+)
Quick Actions: "Add Lead", "Log Workout", "Log Expense" buttons
Mini charts: weekly outreach volume, monthly revenue trend

4.2 Outreach CRM
Kanban-style pipeline board with drag-and-drop columns:
Columns: New → Contacted → Follow-up → Demo Scheduled → Closed Won → Closed Lost
Each card shows: business name, location, niche badge, days since last contact
Click card to open detail modal: full info, outreach log timeline, generate email button
Generate Email: calls Claude API with lead context, outputs personalized cold email using the ROI argument template
Bulk actions: select multiple leads, move to stage, export CSV
Filters: by niche, location, status, date range
Stats bar: conversion funnel visualization

4.3 Financial Dashboard
Complete financial overview for planning the apartment move with Nika:
Monthly P&L chart (income vs expenses stacked bar)
Income breakdown: Father's company, Elevera clients, Etsy, Fleet
Expense categories: rent (future), food, subscriptions, domains, transport, gym
Savings rate percentage and trend
"Move-in Fund" tracker: target amount vs current saved
Recurring expenses list with monthly total
Quick log form: amount, type, source/category, date

4.4 Fitness Hub
Training and nutrition tracker optimized for PPL 6x/week:
PPL Rotation indicator: which day is today (Push A / Pull A / Legs A / Push B / Pull B / Legs B)
Quick-log workout form: select exercises from presets, enter sets/reps/weight
PR Board: best lifts with date achieved (bench 140kg, etc.)
Volume chart: weekly tonnage trend per muscle group
Meal log: quick entry with calorie/protein estimates for Konzum/fast food meals
Daily calorie/protein summary bar
Streak counter: consecutive training days

4.5 University Tracker
Final year countdown and deadline management:
"Days to Graduation" countdown
Upcoming deadlines list sorted by urgency with color coding
Course checklist: what's completed, what's remaining
Quick-add deadline form
Calendar view of exam/project dates

4.6 Client Management
Active Elevera Studio clients overview:
Client cards with site URL, plan, MRR, status
Total MRR calculator
Client health indicators (last site update, any pending tasks)
Quick notes per client

5. MCP Server Implementation

5.1 Protocol
The MCP server implements the Model Context Protocol specification, exposing tools via a Streamable HTTP transport. The server runs as a Next.js API route at /api/mcp.

5.2 Transport
For Claude.ai integration, the MCP server uses Streamable HTTP transport (the modern standard). The endpoint accepts POST requests with JSON-RPC messages and returns SSE streams for responses.

5.3 Authentication
The MCP server uses a simple bearer token authentication. A PETAR_OS_MCP_TOKEN environment variable is set on Vercel, and every MCP request must include this token in the Authorization header. Since this is a single-user application, this is sufficient security.

5.4 Tool Registration
Each tool is defined with a name, description, and JSON Schema for input parameters. The MCP server routes incoming tool calls to the appropriate Supabase query or API call. Example tool definition:

Tool: create_lead
Description: "Create a new lead in the Elevera Studio CRM pipeline"
Params: business_name (required), email, phone, website_url, location, niche, notes, demo_site_url
Returns: the created lead object with ID

5.5 AI-Powered Tools
Some tools invoke the Claude API internally for generation:
generate_cold_email: Takes lead data, constructs a prompt with the ROI argument ("one direct booking pays for the whole year of our service"), niche-specific angle, and Croatian language preference. Returns ready-to-send email.
get_daily_brief: Aggregates data from all modules, formats into a natural-language morning briefing.
analyze_pipeline: AI analysis of outreach effectiveness with recommendations.

6. External Integrations

Service
Purpose
Method
Todoist API
Sync tasks from 4 projects (Elevera Studio, Fakultet, Osobno, Tatin posao)
REST API with existing PAT
OpenWeather API
Zagreb weather for morning brief
Free tier REST API
Claude API (Anthropic)
Cold email generation, daily brief, pipeline analysis
Direct API call from MCP tools
Supabase
Primary database and auth
Supabase JS client
Vercel
Hosting and deployment
Git push deploy


Note: Apify integration (TikTok/Instagram scraping) and YouTube Data API are optional additions if social media tracking becomes relevant. Not included in MVP to keep scope manageable.

7. Build Phases

Phase 1: Foundation (Week 1)
Set up the project skeleton and core infrastructure:
Initialize Next.js 15 project with TypeScript, Tailwind, shadcn/ui
Set up Supabase project with all tables and RLS policies
Build auth flow (simple magic link or password, single user)
Create the app shell: sidebar navigation, layout, dark theme
Build the Command Center page with static placeholder data
Set up the MCP server endpoint at /api/mcp with basic tool registration

Phase 2: CRM + Finance (Week 2)
Build the two most valuable modules:
Outreach CRM with Kanban board (drag-and-drop with dnd-kit)
Lead detail modal with outreach log timeline
Cold email generation (Claude API integration)
Financial dashboard with charts (Recharts)
Income/expense logging forms
Wire up all CRM and finance MCP tools

Phase 3: Life Modules (Week 3)
Add personal life tracking:
Fitness hub with workout logging and PR tracking
Meal logging with calorie estimates
University deadline tracker
Client management page
Wire up fitness, university, and client MCP tools

Phase 4: Intelligence Layer (Week 4)
Make the dashboard intelligent:
Morning brief generation (aggregates all modules)
Todoist API sync integration
Follow-up alert system
Pipeline analytics with AI recommendations
Command Center with live KPIs from all modules
Full MCP server testing and Claude.ai connector setup

8. Project Folder Structure

petar-os/
app/ — Next.js App Router pages
  (dashboard)/ — Main layout with sidebar
  page.tsx — Command Center
  crm/ — Outreach CRM page
  finance/ — Financial dashboard
  fitness/ — Fitness hub
  university/ — Deadline tracker
  clients/ — Client management
  api/ — API routes
    mcp/ — MCP server endpoint
    leads/ — CRUD for leads
    finance/ — CRUD for finances
    ...etc
components/ — Shared UI components
lib/ — Utilities, Supabase client, MCP server logic
  mcp/ — MCP tool definitions and handlers
  supabase/ — Client + types
  ai/ — Claude API integration
types/ — TypeScript interfaces

9. Design Direction

The dashboard should feel like a personal command center, not a corporate SaaS tool. Design principles:
Dark theme by default (matches developer preference and reduces eye strain for daily use)
Minimal, functional aesthetic — information-dense but not cluttered
Accent color: electric blue or teal on dark backgrounds
Typography: clean sans-serif (Geist or similar modern font)
Cards with subtle borders, no heavy shadows
Micro-interactions on hover/click for satisfying UX
Responsive: must work on laptop (primary) and phone (secondary for quick logs)

10. CLAUDE.md Notes

When building with Claude Code, include these instructions in the project's CLAUDE.md:
Use shadcn/ui components as base, customize with Tailwind
No generic AI aesthetics — follow the design system strictly
Use Supabase JS client, never raw SQL in frontend code
MCP tools must have comprehensive descriptions for Claude to understand context
All forms should have optimistic UI updates
Error handling: toast notifications with shadcn Sonner
TypeScript strict mode — no 'any' types

11. Success Metrics

The dashboard is successful when:
Petar opens it as the first tab every morning instead of checking 5 different apps
Cold emails can be generated and sent in under 60 seconds per lead
Financial overview answers "can we afford the apartment?" at a glance
Claude can perform any dashboard action via MCP without opening the browser
Workout and meal logging takes under 30 seconds each
Zero missed university deadlines

End of document.
