# PETAR OS — Complete Application Documentation

**Version:** 0.1.0
**Stack:** Next.js 15 (App Router), TypeScript, Supabase, Tailwind CSS, shadcn/ui, Recharts, Framer Motion
**Deployment:** Vercel (dashboard) + MCP server endpoint
**Last Updated:** 2026-04-05

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Configuration & Dependencies](#3-configuration--dependencies)
4. [Design System](#4-design-system)
5. [Authentication & Middleware](#5-authentication--middleware)
6. [Pages & Routes](#6-pages--routes)
   - 6.1 [Login Page](#61-login-page)
   - 6.2 [Dashboard Layout (Sidebar)](#62-dashboard-layout-sidebar)
   - 6.3 [Command Center (Home)](#63-command-center-home)
   - 6.4 [Outreach CRM](#64-outreach-crm)
   - 6.5 [Financial Dashboard](#65-financial-dashboard)
   - 6.6 [Fitness Hub](#66-fitness-hub)
   - 6.7 [Clients & Subscriptions](#67-clients--subscriptions)
   - 6.8 [University / Academic Calendar](#68-university--academic-calendar)
7. [Components](#7-components)
   - 7.1 [UI Primitives (shadcn/ui)](#71-ui-primitives-shadcnui)
   - 7.2 [Layout Components](#72-layout-components)
   - 7.3 [CRM Components](#73-crm-components)
   - 7.4 [Finance Components](#74-finance-components)
   - 7.5 [Fitness Components](#75-fitness-components)
8. [API Routes (REST)](#8-api-routes-rest)
   - 8.1 [Leads API](#81-leads-api)
   - 8.2 [Finance API](#82-finance-api)
   - 8.3 [Fitness API](#83-fitness-api)
   - 8.4 [Clients API](#84-clients-api)
   - 8.5 [University API](#85-university-api)
   - 8.6 [Dashboard API](#86-dashboard-api)
   - 8.7 [Third-Party Integration Routes](#87-third-party-integration-routes)
9. [MCP Server & Tools](#9-mcp-server--tools)
   - 9.1 [Server Architecture](#91-server-architecture)
   - 9.2 [CRM Tools](#92-crm-tools)
   - 9.3 [Finance Tools](#93-finance-tools)
   - 9.4 [Fitness Tools](#94-fitness-tools)
   - 9.5 [University Tools](#95-university-tools)
   - 9.6 [Task Tools](#96-task-tools)
   - 9.7 [Dashboard Tools](#97-dashboard-tools)
   - 9.8 [Client Tools](#98-client-tools)
10. [TypeScript Types](#10-typescript-types)
11. [Utility Libraries](#11-utility-libraries)
12. [Scripts & Data Import](#12-scripts--data-import)
13. [Database Tables & API Coverage Matrix](#13-database-tables--api-coverage-matrix)

---

## 1. Project Overview

Petar OS is a full-stack personal dashboard that unifies work operations (Elevera Studio, Fleet by Elevera, freelancing), personal life management (fitness, finances, university), and AI-powered automation into a single Next.js application. The critical differentiator is a built-in MCP (Model Context Protocol) server that exposes every feature to Claude, enabling natural-language control over the entire system.

**Owner:** Petar Markota (petar.markota@gmail.com)
**Agency:** Elevera Studio (eleverastudio.com)

---

## 2. Architecture

### 2.1 Three-Layer Architecture

```
Frontend Layer (Next.js App Router)
  - React Server Components + Client Components
  - Tailwind CSS + shadcn/ui
  - Recharts for data visualization
  - Framer Motion for animations
  - @dnd-kit for drag-and-drop
        |
        v
API Layer (Next.js Route Handlers)
  - REST endpoints at /api/*
  - MCP server at /api/mcp
  - Session-based auth via Supabase SSR cookies
  - Bearer token auth for MCP
        |
        v
Data Layer (Supabase PostgreSQL)
  - 8 database tables
  - Row Level Security (user_id = auth.uid())
  - Service role client for MCP (bypasses RLS)
```

### 2.2 Authentication Flow

```
Browser Request
    |
    v
middleware.ts (Next.js Middleware)
    |
    v
updateSession() (lib/supabase/middleware.ts)
    |-- Refreshes session cookies
    |-- Unauthenticated + dashboard route --> redirect /login
    |-- Authenticated + /login route --> redirect /
    |-- API routes --> pass through (no redirect)
    |
    v
Page / API Route
```

### 2.3 MCP Architecture

```
Claude (via MCP protocol)
    |
    v
POST /api/mcp (Bearer token auth)
    |
    v
createMcpServer() (lib/mcp/server.ts)
    |
    v
registerAllTools() (lib/mcp/tools/index.ts)
    |-- 7 tool groups, 23 tools total
    |-- Uses createAdminClient() (service role, bypasses RLS)
    |-- getUserId() resolves single user from Supabase Auth
    |
    v
Supabase PostgreSQL (direct queries)
```

---

## 3. Configuration & Dependencies

### 3.1 package.json

| Category | Package | Version | Purpose |
|----------|---------|---------|---------|
| **Framework** | next | 16.2.2 | App Router, SSR, API routes |
| | react / react-dom | 19.2.4 | UI rendering |
| **Database** | @supabase/supabase-js | ^2.101.1 | Supabase client |
| | @supabase/ssr | ^0.10.0 | Server-side session management |
| **UI** | tailwindcss | ^4 | Utility-first CSS |
| | @radix-ui/* | various | Accessible UI primitives (dialog, dropdown-menu, label, scroll-area, select, separator, slot, tabs, tooltip, avatar, checkbox) |
| | class-variance-authority | ^0.7.1 | Variant-based component styling |
| | clsx | ^2.1.1 | Conditional className joining |
| | tailwind-merge | ^3.5.0 | Smart Tailwind class merging |
| | sonner | ^2.0.7 | Toast notifications |
| | lucide-react | ^1.7.0 | Icon library |
| | framer-motion | ^12.38.0 | Animations |
| **Charts** | recharts | ^3.8.1 | Bar, area, pie charts |
| **Dates** | date-fns | ^4.1.0 | Date utilities |
| | react-day-picker | ^9.14.0 | Calendar date picker |
| **Drag & Drop** | @dnd-kit/core | ^6.3.1 | Drag-and-drop framework |
| | @dnd-kit/sortable | ^10.0.0 | Sortable lists |
| | @dnd-kit/utilities | ^3.2.2 | DnD utilities |
| **MCP** | @modelcontextprotocol/sdk | ^1.29.0 | MCP server implementation |
| **Validation** | zod | ^4.3.6 | Schema validation |
| **TypeScript** | typescript | ^6.0.2 | Type checking |

### 3.2 tsconfig.json

- **Target:** ES2017
- **Module:** esnext with bundler resolution
- **Strict mode:** enabled
- **Path aliases:** `@/*` maps to `./*`
- **React Compiler:** enabled via babel-plugin-react-compiler
- **Incremental compilation:** enabled

### 3.3 next.config.mjs

```js
{ reactCompiler: true }
```

Enables the React Compiler for automatic optimization of React components.

### 3.4 .mcp.json

Configures the Supabase MCP server for Claude Code integration:
- **Server:** Supabase-petaros
- **Type:** HTTP
- **URL:** `https://mcp.supabase.com/mcp?project_ref=ommmjmhhwaegxlklayic`
- **Auth:** Bearer token (Supabase MCP token)

---

## 4. Design System

### 4.1 Design Tokens (`design/tokens.ts`)

#### Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#0EA5E9` | Electric blue accent — buttons, links, active states |
| `primaryHover` | `#0284C7` | Primary hover state |
| `primaryMuted` | `rgba(14, 165, 233, 0.15)` | Subtle primary backgrounds |
| `secondary` | `#06B6D4` | Teal — secondary actions |
| `secondaryHover` | `#0891B2` | Secondary hover state |
| `background` | `#09090B` | Page background (near black) |
| `surface` | `#18181B` | Card/section background |
| `surfaceHover` | `#27272A` | Hover state for surfaces |
| `elevated` | `#1E1E22` | Slightly lighter surface |
| `text` | `#FAFAFA` | Primary text (soft white) |
| `textSecondary` | `#A1A1AA` | Secondary text |
| `textMuted` | `#71717A` | Muted/tertiary text |
| `textInverse` | `#09090B` | Text on primary buttons |
| `border` | `#27272A` | Subtle card borders |
| `borderHover` | `#3F3F46` | Hover borders |
| `borderActive` | `#0EA5E9` | Active/focus borders |
| `success` | `#22C55E` | Green — positive states |
| `warning` | `#F59E0B` | Amber — warning states |
| `error` | `#EF4444` | Red — error/destructive |
| `info` | `#0EA5E9` | Informational |

#### CRM Pipeline Status Colors

| Status | Color | Hex |
|--------|-------|-----|
| New | Blue | `#0EA5E9` |
| Contacted | Purple | `#8B5CF6` |
| Follow-up | Amber | `#F59E0B` |
| Demo | Cyan | `#06B6D4` |
| Won | Green | `#22C55E` |
| Lost | Red | `#EF4444` |

#### Fonts

| Token | Value |
|-------|-------|
| `heading` | `var(--font-geist-sans)` (Geist Sans) |
| `body` | `var(--font-geist-sans)` (Geist Sans) |
| `mono` | `var(--font-geist-mono)` (Geist Mono) |

#### Spacing

| Token | Value |
|-------|-------|
| `sectionY` | `py-24 md:py-32` |
| `containerX` | `px-6 md:px-12 lg:px-24` |
| `maxWidth` | `max-w-6xl` |

#### Radius

| Token | Value |
|-------|-------|
| `sm` | `rounded-md` |
| `md` | `rounded-xl` |
| `lg` | `rounded-2xl` |

#### Shadows

| Token | Value |
|-------|-------|
| `subtle` | `shadow-[0_2px_8px_rgba(0,0,0,0.2)]` |
| `medium` | `shadow-[0_8px_30px_rgba(0,0,0,0.3)]` |

### 4.2 Global CSS (`app/globals.css`)

Dark theme via CSS custom properties:
- Background: `#09090B`, Foreground: `#FAFAFA`
- Card: `#18181B`, Primary: `#0EA5E9`
- Custom scrollbar styling (dark with hover)
- Login-specific animations: `login-fade-in`, `login-pulse`, `login-spinner`, `login-glow`

---

## 5. Authentication & Middleware

### 5.1 Middleware (`middleware.ts`)

Intercepts all requests except static assets. Delegates to `updateSession()` from `lib/supabase/middleware.ts`.

**Matcher pattern:** `/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)`

### 5.2 Session Management (`lib/supabase/middleware.ts`)

- Creates SSR Supabase client with cookie handlers
- Refreshes auth sessions on every request
- **Protected routes:** All non-API, non-login routes require authentication
- **Redirect logic:**
  - Unauthenticated user on dashboard → redirect to `/login`
  - Authenticated user on `/login` → redirect to `/`
  - API routes → pass through without redirect

### 5.3 Login Actions (`app/login/actions.ts`)

Server actions for authentication:

| Action | Behavior |
|--------|----------|
| `login(formData)` | Validates email + password, calls `supabase.auth.signInWithPassword()`, redirects to `/` on success |
| `signup(formData)` | Validates email + password (>= 6 chars), calls `supabase.auth.signUp()`, redirects to `/` on success |

### 5.4 Auth Callback (`app/auth/callback/route.ts`)

OAuth callback handler:
- Extracts `code` and `next` from URL params
- Exchanges code for session via `supabase.auth.exchangeCodeForSession()`
- Handles local vs production redirect URLs
- Falls back to `/login?error=auth_callback_failed` on failure

### 5.5 Supabase Clients

| Client | File | Key | Purpose |
|--------|------|-----|---------|
| Browser | `lib/supabase/client.ts` | Anon key | Client-side operations |
| Server | `lib/supabase/server.ts` | Anon key + cookies | Server components, API routes |
| Admin | `lib/supabase/admin.ts` | Service role key | MCP tools only (bypasses RLS) |

---

## 6. Pages & Routes

### 6.1 Login Page

**Route:** `/login`
**File:** `app/login/page.tsx`
**Type:** Client component (`"use client"`)

**Visual Layout:**
- Ambient background glow (blue-tinted blur effect)
- Semi-transparent card with backdrop blur
- Header:
  - Animated system indicator (blinking blue dot + "System Online" text)
  - Title: "PETAR **OS**" (OS in blue with glow animation)
  - Subtitle: "Life & Work Command Center"
- Form:
  - Email input (placeholder: petar.markota@gmail.com)
  - Password input (bullet placeholders)
  - Error display (red border/background)
  - "Sign In" button (primary blue, spinner when pending)
  - "Create Account" button (outline variant, spinner when pending)
- Footer: Gradient divider + "Elevera Studio" text

**State:** Uses `useActionState` hook with server actions for login/signup states and pending indicators.

---

### 6.2 Dashboard Layout (Sidebar)

**Route Group:** `(dashboard)` — applies to all authenticated pages
**File:** `app/(dashboard)/layout.tsx`
**Type:** Client component

**Structure:**
- Flex container (full screen height, dark background)
- Left: `<Sidebar />` component
- Right: Main content area with responsive padding (`px-6 py-6 / md:px-8 md:py-8 / lg:px-12 lg:py-10`)
- Overlays: Sonner toaster (dark theme, top-right), Tooltip provider

**Sidebar Component** (`components/layout/sidebar.tsx`):

| Feature | Detail |
|---------|--------|
| **Desktop** | Fixed sidebar with animated collapse (spring physics: 300ms, 30 damping) |
| **Mobile** | Hamburger menu + slide-in overlay with backdrop blur |
| **Background** | `#141416` |
| **Logo** | Terminal icon with cyan glow + "PETAR OS" with text shadow |
| **Active indicator** | Left-edge bar with shared layout animation (layoutId) |

**Navigation Items:**

| Icon | Label | Route |
|------|-------|-------|
| LayoutDashboard | Command Center | `/` |
| Users | Outreach CRM | `/crm` |
| DollarSign | Finance | `/finance` |
| Dumbbell | Fitness | `/fitness` |
| GraduationCap | University | `/university` |
| Building2 | Clients | `/clients` |

**Auth:** Sign-out button at sidebar bottom calls `supabase.auth.signOut()` and redirects to `/login`.

---

### 6.3 Command Center (Home)

**Route:** `/`
**File:** `app/(dashboard)/page.tsx`
**Type:** Client component

The landing page after login. Morning-brief style executive summary.

#### Sections

**1. Header**
- Title: "Dashboard"
- Subtitle: "Your personal command center"
- Refresh button + "Last updated" timestamp

**2. KPI Cards** (4-column responsive grid)

| Card | Data | Icon | Visual |
|------|------|------|--------|
| MRR | Monthly recurring revenue (EUR) | DollarSign | Trend arrow |
| Total Leads | Count of all leads | Users | Status indicator |
| Active Leads | Non-closed leads count | Activity | Color badge |
| Conversion Rate | Won / total decided (%) | TrendingUp | Percentage |

**3. CRM Pipeline Section**
- Lead counts by status: New, Contacted, Demo, Replied, Call Booked, Follow-up, Won, Lost
- Color-coded badges per status
- "View Pipeline" quick action link to `/crm`

**4. Finance Section**
- Monthly income/expense bar chart (Recharts)
- Savings rate percentage
- "Log Expense" quick action button

**5. Fitness Section**
- Current training streak (flame icon + day count)
- Next PPL day indicator (Push A/B, Pull A/B, Legs A/B)
- "Log Workout" quick action button

**6. Upcoming Deadlines Section**
- Up to 5 upcoming university deadlines
- Priority badge coloring (low/medium/high/critical)
- Countdown to graduation (Jun 30, 2026)

**7. Quick Actions Row**
- Add Lead, Log Workout, Log Expense, View Pipeline

#### Data Fetching (parallel API calls)

| Endpoint | Data |
|----------|------|
| `/api/clients/mrr` | Monthly recurring revenue |
| `/api/leads` | All leads |
| `/api/finance/summary?year=2026` | Financial data |
| `/api/fitness/streak` | Workout streak |
| `/api/finance?sort=date` | Transactions |
| `/api/university/deadlines` | Academic deadlines |
| `/api/weather` | Zagreb weather (optional) |
| `/api/fitness/workouts` | Recent workouts |

---

### 6.4 Outreach CRM

**Route:** `/crm`
**File:** `app/(dashboard)/crm/page.tsx`
**Type:** Client component

Full-featured lead pipeline and outreach management system.

#### Sections

**1. Header**
- Title: "Outreach CRM"
- Subtitle: "Manage your Elevera Studio lead pipeline"
- "Add Lead" button (opens AddLeadModal)

**2. Stats Bar**
- Total leads count
- Active leads count (blue)
- Won leads count (green)
- Conversion rate (%)
- Funnel visualization: Status badges with arrow flow (New -> Demo -> Contacted -> Replied -> Call -> Follow -> Won -> Lost)

**3. View Switcher** (4 tabs with animated active indicator)

| Tab | Icon | Description |
|-----|------|-------------|
| Board | Kanban | Drag-and-drop Kanban columns |
| Table | Grid | Sortable, selectable data table |
| Needs Action | AlertCircle | Leads with overdue follow-ups |
| Won | Trophy | Successfully closed deals |

Each tab shows its lead count as a badge.

**4. Search & Filters**
- Search input (business name search)
- Filters toggle button (shows/hides advanced panel)
- Refresh button

**5. Advanced Filter Panel** (collapsible)

| Filter | Type | Options |
|--------|------|---------|
| Status | Multi-select badges | New, Demo Built, Contacted, Replied, Call Booked, Follow-up, Won, Lost |
| Niche | Single select | Dental, Frizer, Restoran, Autoservis, Fizioterapija, Wellness, Fitness, Apartmani, Kozmetika, Pekara, Ostalo |
| Market | Multi-select | HR, DACH, US |
| Channel | Multi-select | WhatsApp, Email, Instagram DM, Telefon, LinkedIn, Osobno |
| Date Range | Date pickers | First Contact from/to |
| Follow-up Only | Checkbox | Only show leads with follow-up dates |
| Clear All | Button | Resets all filters |

**6. Main Content**

**Board View (KanbanBoard):**
- 8 columns: New, Demo Built, Contacted, Replied, Call Booked, Follow-up, Won, Lost
- Drag-and-drop cards between columns (dnd-kit with PointerSensor, 8px activation distance)
- Each card shows: business name, location (MapPin icon), niche badge, days since contact
- Floating drag overlay: card rotated 2deg, scaled 1.05x
- Drop zone highlighting with dynamic CSS

**Table View (TableView):**
- 14 columns: Business name, Status, Niche, Location, Market, Channel, Email, Phone, Instagram, First Contact, Last Contact, Follow-up, Page Speed, Notes
- Click-to-sort headers (toggle asc/desc)
- Multi-select: Ctrl/Cmd+Click, Shift+Click range, Ctrl+A
- Bulk actions: Move to stage, Export CSV, Clear selection
- Floating action bar at bottom-center for bulk operations
- Sticky first column (business name) and checkbox column
- Color-coded badges for all categorical fields

**Needs Action View:** Filtered to leads overdue on follow-up and not lost

**Won View:** Filtered to leads with status "won"

**7. Modals**

**AddLeadModal:**
- Fields: Business name (required), Contact name, Email, Phone, Website URL, Location, Niche (11 options), Instagram, Channel (6 options), Market (3 options), Source, Page Speed, First Message, Notes
- Two-column grid layout
- POST to `/api/leads`
- Toast on success, form reset

**LeadDetailModal:**
- Inline editing: Click any field to edit (text, email, phone, URL, instagram)
- Status selector dropdown
- Niche selector dropdown
- Date pickers: first_contact, last_contacted_at, next_follow_up
- Market/Channel/Tier dropdowns
- Outreach logging: Add email/call/demo/follow-up entries with date
- Outreach log history timeline (color-coded by type)
- Copy buttons for email, phone, instagram, website
- Delete button with confirmation
- PATCH `/api/leads/:id` for field updates
- POST `/api/leads/:id/outreach` for outreach logs

#### Lead Data Structure

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Auto-generated |
| `business_name` | string | Required |
| `contact_name` | string | Nullable |
| `email` | string | Nullable |
| `phone` | string | Nullable |
| `website_url` | string | Nullable |
| `location` | string | City/region |
| `niche` | enum | 11 business types |
| `status` | enum | 8 pipeline stages |
| `demo_site_url` | string | Vercel demo link |
| `subscription_tier` | enum | basic_79 / standard_99 / custom |
| `notes` | string | Nullable |
| `last_contacted_at` | timestamp | Last outreach date |
| `next_follow_up` | timestamp | Scheduled follow-up |
| `source` | string | How found |
| `instagram` | string | IG handle |
| `channel` | enum | 6 communication channels |
| `market` | enum | hr / dach / us |
| `first_message` | string | Initial outreach content |
| `first_contact` | date | First contact date |
| `page_speed` | integer | PageSpeed score (0-100) |

---

### 6.5 Financial Dashboard

**Route:** `/finance`
**File:** `app/(dashboard)/finance/page.tsx`
**Type:** Client component

#### Sections

**1. Header**
- Title: "Financial Dashboard"
- Year selector: 2025/2026 toggle buttons
- Refresh button
- "Log Transaction" button (opens LogTransactionModal)

**2. KPI Cards** (4-column grid)

| Card | Icon | Color | Format |
|------|------|-------|--------|
| Total Income | DollarSign | Green | EUR |
| Total Expenses | TrendingDown | Red | EUR |
| Net Savings | Wallet | Blue | EUR |
| Savings Rate | PiggyBank | Purple | % |

**3. Charts Row**

| Chart | Type | Library | Description |
|-------|------|---------|-------------|
| Monthly P&L | Stacked BarChart | Recharts | Income vs Expenses by month |
| Income by Source | Donut PieChart | Recharts | Father's Salary, Elevera, Etsy, Fleet, Freelance |
| Savings Rate Trend | AreaChart | Recharts | Monthly savings rate % with gradient fill |

All charts use custom dark-themed tooltips with EUR formatting and German locale.

**4. Bottom Row**

**Expense Breakdown:**
- Category breakdown with horizontal progress bars
- Categories: Rent, Food, Subscriptions, Domains, Transport, Gym, Other

**Recent Transactions (TransactionList):**
- 10 most recent transactions
- Expandable rows: click to see details
- Income/Expense icons with color coding (green/red)
- Date, type, amount, category/source, recurring badge
- Two-step delete with confirmation
- Staggered entrance animations

**5. Move-in Fund Tracker**
- Target: EUR 5,000
- Progress bar (blue-cyan gradient, green when complete)
- Current amount and percentage display

**6. LogTransactionModal**

| Field | Options |
|-------|---------|
| Type | Income / Expense (toggle buttons) |
| Amount | Number input (EUR) |
| Source (income) | Father's Salary, Elevera, Etsy, Fleet, Freelance |
| Category (expense) | Rent, Food, Subscriptions, Domains, Transport, Gym, Other |
| Description | Free text |
| Date | DatePicker |
| Recurring | Toggle switch |

#### Data Fetching

| Endpoint | Data |
|----------|------|
| `/api/finance/summary?year={year}` | Monthly breakdown, totals, savings rate |
| `/api/finance/by-source?year={year}` | Income breakdown by source |
| `/api/finance?sort=date&order=desc` | All transactions |

---

### 6.6 Fitness Hub

**Route:** `/fitness`
**File:** `app/(dashboard)/fitness/page.tsx`
**Type:** Client component

#### Sections

**1. Header**
- Icon: Dumbbell
- Title: "Fitness Hub"
- Subtitle: "Track workouts, nutrition, and personal records"
- PPL rotation indicator badge (e.g., "Next: Push A")
- Streak counter (flame icon + day count)
- Refresh button

**2. Quick Actions** (2-column grid)

| Action | Icon | Description | Modal |
|--------|------|-------------|-------|
| Log Workout | Dumbbell | Record exercises with sets/reps/weight | LogWorkoutModal |
| Log Meal | Apple | Track calories and macros | LogMealModal |

Hover effects with color changes.

**3. Row 2: Dual Column**
- Left: **PRBoard** — Personal records table
- Right: **DailyNutrition** — Today's calorie/protein progress

**4. Volume Trend Chart**
- Title: "Weekly Volume Trend (kg)"
- Recharts AreaChart with 3 stacked gradient areas:
  - Push: `#0EA5E9` (blue)
  - Pull: `#8B5CF6` (purple)
  - Legs: `#22C55E` (green)
- X-axis: Week labels, Y-axis: Volume in kg
- Custom tooltip per workout type

**5. Recent Workouts**
- List of 5 most recent workouts:
  - Workout type badge (color-coded)
  - Exercise count badge
  - Date formatted (e.g., "Mon, 5 Apr")
  - Duration in minutes
  - Exercise names (first 3, "+X more" if additional)
  - Total volume calculation (sum of sets x reps x weight)
- Empty state: "No workouts logged yet — start training!"

#### PPL Rotation Logic

The `getNextPPLDay()` helper calculates the next workout:
- Cycle: Push -> Pull -> Legs -> repeat
- A/B variants alternate every full cycle (3 workouts)
- Even total = A variant next, odd = B variant next

#### Modals

**LogWorkoutModal:**

| Field | Detail |
|-------|--------|
| Date | DatePicker |
| Type | Push / Pull / Legs (button group) |
| Exercises | Dynamic list with add/remove |
| Per Exercise | Name (dropdown from 7 presets per type + custom), Sets, Reps, Weight (kg), PR checkbox |
| Duration | Minutes (optional) |
| Notes | Textarea (optional) |

Exercise Presets:
- **Push:** Bench Press, Incline DB Press, Overhead Press, Dips, Cable Fly, Lateral Raise, Tricep Pushdown
- **Pull:** Deadlift, Barbell Row, Pull-ups, Cable Row, Face Pull, Bicep Curl, Hammer Curl
- **Legs:** Squat, Leg Press, Romanian Deadlift, Leg Curl, Leg Extension, Calf Raise, Walking Lunge

**LogMealModal:**

| Field | Detail |
|-------|--------|
| Date | DatePicker |
| Meal Type | Breakfast / Lunch / Dinner / Snack (4 buttons) |
| Description | Required text |
| Calories | Approximate (optional) |
| Protein | Grams (optional) |
| Source | Home, Konzum, Fast Food, Restaurant |

#### Sub-Components

**PRBoard** (`components/fitness/pr-board.tsx`):
- Fetches from `/api/fitness/prs`
- Table: Exercise name, Weight (kg), Date
- Badge showing PRs from last 7 days
- Trophy icon, staggered row animations

**DailyNutrition** (`components/fitness/daily-nutrition.tsx`):
- Fetches from `/api/fitness/meals/daily?date={today}`
- Targets: 2,500 cal, 180g protein (hardcoded)
- Animated progress bars with color transitions (orange < 90%, green >= 90%)
- Meal list with calorie/protein per meal
- Icons: Flame for calories, Beef for protein

#### Data Fetching

| Endpoint | Data |
|----------|------|
| `/api/fitness/workouts` | All workouts with exercises |
| `/api/fitness/volume?weeks=8` | Weekly volume breakdown |
| `/api/fitness/streak` | Current and longest streak |

---

### 6.7 Clients & Subscriptions

**Route:** `/clients`
**File:** `app/(dashboard)/clients/page.tsx`
**Type:** Client component

#### Sections

**1. Header**
- Title: "Clients & Subscriptions"
- Subtitle: "Track active subscriptions and MRR"
- "Add Client" button

**2. MRR Summary** (3-column grid)

| Card | Value |
|------|-------|
| Total MRR | EUR formatted |
| Active Clients | Count |
| Average MRR | EUR per client |

**3. Plan Breakdown**
- Horizontal bar chart by plan distribution
- Plans: Basic EUR 79, Standard EUR 99, Custom

**4. Client Cards/List**

Per client:
- Business name
- Website URL (clickable link)
- Plan badge: Basic (cyan `#38BDF8`), Standard (purple `#A78BFA`), Custom (amber `#F59E0B`)
- MRR (EUR formatted)
- Status badge: Active (green `#22C55E`), Paused (amber `#F59E0B`), Churned (red `#EF4444`)
- Start date
- Edit button (opens detail modal)
- Delete button (with confirmation)

**5. Add Client Modal**

| Field | Detail |
|-------|--------|
| Business Name | Required |
| Website URL | Optional |
| Plan | Buttons: Basic EUR 79, Standard EUR 99, Custom |
| MRR | EUR input (auto-populated from plan, editable for custom) |
| Status | Buttons: Active, Paused, Churned |
| Start Date | DatePicker (defaults to today) |
| Link to Lead | Optional lead UUID |
| Notes | Textarea |

#### Data Fetching

| Endpoint | Method | Data |
|----------|--------|------|
| `/api/clients` | GET | All clients |
| `/api/clients` | POST | Create client |
| `/api/clients/{id}` | PATCH | Update client |
| `/api/clients/{id}` | DELETE | Delete client |
| `/api/clients/mrr` | GET | MRR summary |

---

### 6.8 University / Academic Calendar

**Route:** `/university`
**File:** `app/(dashboard)/university/page.tsx`
**Type:** Client component

#### Sections

**1. Header**
- Title: "Academic Calendar"
- Graduation countdown: "X days until graduation (Jun 30, 2026)"
- "Add Deadline" button

**2. Toggle: Show Completed**
- Checkbox to show/hide completed deadlines (strikethrough when shown)

**3. Mini Calendar** (left sidebar on desktop)
- Month navigation (prev/next arrows)
- Day grid highlighting:
  - Today (distinct style)
  - Dates with deadlines (colored dots)
  - Selected day (outline)
- Click day to filter deadlines for that date

**4. Deadlines List** (main area)
- Grouped by priority: Critical, High, Medium, Low

Per deadline card:
- Type badge: Exam (red `#EF4444`), Project (blue `#0EA5E9`), Assignment (green `#22C55E`)
- Title
- Priority badge: Low (gray `#71717A`), Medium (amber `#F59E0B`), High (orange `#F97316`), Critical (red `#EF4444`)
- Due date countdown: "Today", "Tomorrow", "in 3 days", "in ~2 weeks", "overdue by X days"
- Checkbox to toggle complete/incomplete
- Course/subject tags
- Notes preview
- Edit button
- Delete button

**5. Add Deadline Modal**

| Field | Detail |
|-------|--------|
| Title | Required |
| Course/Subject | Optional |
| Type | Buttons: Exam, Project, Assignment |
| Due Date | DatePicker (required) |
| Priority | Buttons: Low, Medium, High, Critical |
| Notes | Textarea |

#### Helper Functions

| Function | Purpose |
|----------|---------|
| `getDaysUntilGraduation()` | Days to Jun 30, 2026 |
| `getCountdownLabel()` | Format relative due date |
| `isOverdue()` | Check if past due and not completed |
| `isDueThisWeek()` | Check if in upcoming week |

#### Data Fetching

| Endpoint | Method | Data |
|----------|--------|------|
| `/api/university/deadlines?order=asc` | GET | All deadlines |
| `/api/university/deadlines` | POST | Create deadline |
| `/api/university/deadlines/{id}` | PATCH | Update (completion, etc.) |
| `/api/university/deadlines/{id}` | DELETE | Delete |

---

## 7. Components

### 7.1 UI Primitives (shadcn/ui)

All in `components/ui/`. Built on Radix UI primitives with Tailwind styling.

| Component | File | Props/Variants | Description |
|-----------|------|----------------|-------------|
| **Button** | `button.tsx` | `variant`: default, destructive, outline, secondary, ghost, link; `size`: default, sm, lg, icon; `asChild` | CVA-styled button with transitions, focus rings, active states |
| **Input** | `input.tsx` | Standard input props | Dark bg (`#09090B`), cyan focus ring, file input styling |
| **Card** | `card.tsx` | Sub-components: Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter | Container with border, background, transitions |
| **Badge** | `badge.tsx` | `variant`: default, secondary, destructive, outline, success, warning | Inline flex with semi-transparent backgrounds |
| **Label** | `label.tsx` | Radix LabelPrimitive | Small text, medium weight, disabled peer opacity |
| **Separator** | `separator.tsx` | `orientation`: horizontal, vertical; `decorative` | Radix separator with dynamic sizing |
| **Skeleton** | `skeleton.tsx` | Standard div props | Dark gray (`#27272A`) with pulse animation |
| **Tooltip** | `tooltip.tsx` | TooltipProvider, Tooltip, TooltipTrigger, TooltipContent | Portal-rendered with fade-in zoom animations |
| **ScrollArea** | `scroll-area.tsx` | ScrollArea + ScrollBar | Dark scrollbar, rounded thumb, horizontal/vertical |
| **DatePicker** | `date-picker.tsx` | `value`, `onChange`, `placeholder` | Button trigger + react-day-picker calendar popup, ISO date handling |
| **DateRangePicker** | `date-range-picker.tsx` | `from`, `to`, `onChange`, `placeholder` | Two-month calendar, range selection, clear button |

### 7.2 Layout Components

**Sidebar** (`components/layout/sidebar.tsx`) — Documented in [Section 6.2](#62-dashboard-layout-sidebar).

### 7.3 CRM Components

All in `components/crm/`.

| Component | File | Key Props | Description |
|-----------|------|-----------|-------------|
| **LeadCard** | `lead-card.tsx` | `lead: Lead`, `isDragging?`, `onClick?` | Draggable card with 3px left border (status color), business name, location (MapPin), niche badge, days-since-contact |
| **ViewSwitcher** | `view-switcher.tsx` | `currentView`, `onViewChange`, `leadCounts` | Tab buttons with animated active underline (layoutId), icon + label + count per view |
| **KanbanBoard** | `kanban-board.tsx` | `leads`, `onLeadMove`, `onLeadClick` | dnd-kit DndContext with PointerSensor (8px activation), 8 columns, DragOverlay with rotated/scaled card |
| **KanbanColumn** | `kanban-column.tsx` | `status`, `leads`, `onLeadClick` | Droppable container (280px wide, min-h 120px), color-coded header, lead count badge, empty state, drop zone highlighting |
| **TableView** | `table-view.tsx` | `leads`, `onLeadClick`, `onLeadUpdate`, `onBulkMove?` | 14-column sortable table, multi-select (Ctrl/Shift), bulk actions (move, CSV export), sticky columns, floating action bar |
| **AddLeadModal** | `add-lead-modal.tsx` | `open`, `onOpenChange`, `onLeadCreated` | Radix Dialog with full lead creation form, two-column grid, POST to `/api/leads` |
| **LeadDetailModal** | `lead-detail-modal.tsx` | `lead`, `open`, `onOpenChange`, `onLeadUpdate`, `onLeadDelete` | Full detail view with inline editing, status/niche selectors, date pickers, outreach logging with timeline, copy buttons, delete |

### 7.4 Finance Components

All in `components/finance/`.

| Component | File | Key Props | Description |
|-----------|------|-----------|-------------|
| **TransactionList** | `transaction-list.tsx` | `transactions: Finance[]`, `onDelete` | Expandable transaction rows, income/expense icons, color-coded sources/categories, two-step delete, staggered animations |
| **LogTransactionModal** | `log-transaction-modal.tsx` | `open`, `onOpenChange`, `onTransactionCreated` | Income/Expense toggle, amount, dynamic source/category dropdown, date picker, recurring switch, POST to `/api/finance` |

### 7.5 Fitness Components

All in `components/fitness/`.

| Component | File | Key Props | Description |
|-----------|------|-----------|-------------|
| **LogWorkoutModal** | `log-workout-modal.tsx` | `open`, `onOpenChange`, `onWorkoutCreated` | Date, type (Push/Pull/Legs), dynamic exercise list with presets (7 per type), sets/reps/weight inputs, PR checkbox, duration, notes |
| **LogMealModal** | `log-meal-modal.tsx` | `open`, `onOpenChange`, `onMealCreated` | Date, meal type (4 options), description, calories, protein, source dropdown |
| **PRBoard** | `pr-board.tsx` | None (self-fetching) | Fetches `/api/fitness/prs`, displays table of exercise name / weight / date, recent PR badge, staggered row animations |
| **DailyNutrition** | `daily-nutrition.tsx` | None (self-fetching) | Fetches `/api/fitness/meals/daily`, animated progress bars (2500 cal / 180g protein targets), meal list, color transitions |

---

## 8. API Routes (REST)

All routes use Supabase SSR client for session-based auth. Located under `app/api/`.

### 8.1 Leads API

#### `GET /api/leads`

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `status` | comma-separated | Filter by pipeline stage(s) |
| `niche` | comma-separated | Filter by business niche(s) |
| `channel` | comma-separated | Filter by channel(s) |
| `market` | comma-separated | Filter by market(s) |
| `location` | string | Partial match (case-insensitive) |
| `search` | string | Partial business name match |
| `sort` | string | Sort field (default: `created_at`) |
| `order` | `asc` / `desc` | Sort order (default: `desc`) |

**Response:** `Lead[]`

#### `POST /api/leads`

**Body:** `{ business_name (required), contact_name?, email?, phone?, website_url?, location?, niche?, notes?, demo_site_url?, source?, instagram?, channel?, market?, first_message?, first_contact?, page_speed?, subscription_tier?, next_follow_up? }`

**Defaults:** `status: "new"`, `source: "manual"` if not provided

**Response:** Created `Lead` (201)

#### `GET /api/leads/[id]`

**Response:** `Lead` or 404

#### `PATCH /api/leads/[id]`

**Body:** Any lead fields (except `id`, `user_id`, `created_at`)
**Side effect:** Sets `updated_at` to current timestamp

**Response:** Updated `Lead`

#### `DELETE /api/leads/[id]`

**Response:** 204 No Content

#### `GET /api/leads/[id]/outreach`

**Response:** `OutreachLog[]` ordered by `sent_at` DESC

#### `POST /api/leads/[id]/outreach`

**Body:** `{ type (required: email/call/demo/follow_up), content?, sent_at?, response_at?, response_received? }`
**Side effect:** Updates lead's `last_contacted_at`

**Response:** Created `OutreachLog` (201)

---

### 8.2 Finance API

#### `GET /api/finance`

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `type` | string | `income` or `expense` |
| `source` | comma-separated | Income source filter |
| `category` | comma-separated | Expense category filter |
| `from` | date string | Range start |
| `to` | date string | Range end |
| `recurring` | `true`/`false` | Recurring filter |
| `sort` | string | Sort field (default: `date`) |
| `order` | `asc`/`desc` | Sort order (default: `desc`) |

**Response:** `Finance[]`

#### `POST /api/finance`

**Body:** `{ type (required), amount (required, > 0), date (required), source?, category?, description?, recurring? }`

**Response:** Created `Finance` (201)

#### `GET /api/finance/[id]` | `PATCH /api/finance/[id]` | `DELETE /api/finance/[id]`

Standard CRUD. Protected fields: `id`, `user_id`.

#### `GET /api/finance/summary`

**Query:** `year` (default: current), `month` (optional)

**Response:**
```json
{
  "total_income": number,
  "total_expenses": number,
  "net": number,
  "savings_rate": number,
  "monthly_breakdown": [{ "month": number, "income": number, "expenses": number, "net": number }]
}
```

#### `GET /api/finance/by-source`

**Query:** `year` (default: current)

**Response:** `[{ "source": string, "total": number, "count": number }]` sorted by total DESC

---

### 8.3 Fitness API

#### `GET /api/fitness/workouts`

**Query:** `type`, `from`, `to`, `sort` (default: `date`), `order` (default: `desc`)

**Response:** `Workout[]`

#### `POST /api/fitness/workouts`

**Body:** `{ type (required), date (required), exercises? (array), duration_minutes?, notes? }`

**Response:** Created `Workout` (201)

#### `GET/PATCH/DELETE /api/fitness/workouts/[id]`

Standard CRUD. Exercises validated as array with `name` required per exercise.

#### `GET /api/fitness/meals`

**Query:** `date` (exact match), `meal_type`, `from`, `to`, `sort`, `order`

#### `POST /api/fitness/meals`

**Body:** `{ description (required), date (required), meal_type?, calories_approx?, protein_g?, source? }`

#### `GET/PATCH/DELETE /api/fitness/meals/[id]`

Standard CRUD.

#### `GET /api/fitness/meals/daily`

**Query:** `date` (default: today)

**Response:**
```json
{
  "date": string,
  "total_calories": number,
  "total_protein": number,
  "meals_count": number,
  "meals": Meal[]
}
```

#### `GET /api/fitness/prs`

**Response:** `[{ "exercise_name": string, "weight_kg": number, "date": string, "workout_type": string }]` sorted by weight DESC

#### `GET /api/fitness/streak`

**Response:** `{ "current_streak": number, "last_workout_date": string | null }`

Streak = 0 if last workout > 1 day ago.

#### `GET /api/fitness/volume`

**Query:** `weeks` (default: 8, max: 52)

**Response:** `[{ "week_start": string, "push_tonnage": number, "pull_tonnage": number, "legs_tonnage": number, "total": number }]`

Tonnage = sum of (sets x reps x weight) per exercise.

---

### 8.4 Clients API

#### `GET /api/clients`

**Query:** `status` (comma-separated), `plan` (comma-separated), `search`, `sort` (default: `business_name`), `order` (default: `asc`)

#### `POST /api/clients`

**Body:** `{ business_name (required), status?, mrr?, site_url?, plan?, started_at?, lead_id?, notes? }`

**Defaults:** `status: "active"`, `mrr: 0`

#### `GET/PATCH/DELETE /api/clients/[id]`

Standard CRUD. Validation: MRR non-negative, status must be active/paused/churned, plan must be basic_79/standard_99/custom or null.

#### `GET /api/clients/mrr`

**Response:**
```json
{
  "total_mrr": number,
  "active_clients": number,
  "average_mrr": number,
  "by_plan": [{ "plan": string, "count": number, "mrr": number }]
}
```

---

### 8.5 University API

#### `GET /api/university/deadlines`

**Query:** `completed` (true/false/omit), `type`, `priority`, `course` (partial match), `sort` (default: `due_date`), `order` (default: `asc`)

#### `POST /api/university/deadlines`

**Body:** `{ title (required), due_date (required), type?, priority? (default: "medium"), course?, notes? }`

#### `GET/PATCH/DELETE /api/university/deadlines/[id]`

Standard CRUD.

---

### 8.6 Dashboard API

#### `GET /api/dashboard/summary`

Aggregates all modules. Each section catches errors independently (graceful degradation).

**Response:**
```json
{
  "crm": { "total_leads", "active_leads", "by_status", "follow_up_alerts", "response_rate" },
  "finance": { "total_income", "total_expenses", "net", "savings_rate" },
  "fitness": { "current_streak", "last_workout_date", "next_ppl_day", "todays_calories", "todays_protein" },
  "university": { "upcoming_deadlines", "overdue_deadlines", "next_deadline" },
  "clients": { "total_mrr", "active_clients" }
}
```

---

### 8.7 Third-Party Integration Routes

#### `GET /api/weather`

- **External API:** Open-Meteo (free, no auth)
- **Location:** Zagreb (45.815N, 15.9819E)
- **Response:** `{ temp, description, icon, feels_like, humidity }`
- **Caching:** In-memory, 30-minute TTL
- **WMO Codes:** Full mapping (0=Clear sky, 3=Overcast, 61=Slight rain, 95=Thunderstorm, etc.)

#### `GET /api/todoist/sync`

- **External API:** Todoist REST v2 (requires `TODOIST_API_TOKEN` env var)
- **Target Projects:** Elevera Studio, Fakultet, Osobno, Tatin posao
- **Priority Mapping:** Todoist 4=urgent, 3=high, 2=medium, 1=normal
- **Sorting:** By priority (urgent first), then due date (soonest first)
- **Response:** `{ tasks: [{ id, content, description, due_date, priority, project_name, is_completed }] }`

---

## 9. MCP Server & Tools

### 9.1 Server Architecture

**Endpoint:** `POST /api/mcp`
**File:** `app/api/mcp/route.ts`
**Protocol:** JSON-RPC 2.0 over Streamable HTTP (SSE responses)
**Transport:** `WebStandardStreamableHTTPServerTransport`

**Authentication:**
- Bearer token via `Authorization: Bearer {token}` header
- Token: `PETAR_OS_MCP_TOKEN` environment variable
- Returns 401 JSON-RPC error if invalid/missing

**Server Factory** (`lib/mcp/server.ts`):
- Name: `"petar-os"`, Version: `"1.0.0"`
- Stateless mode (new server + transport per request, required for serverless Vercel)
- Calls `registerAllTools(server)` to register all 23 tools

**User Resolution:**
- `getUserId()` fetches authenticated user from Supabase Auth admin
- Cached per request to avoid redundant lookups
- Uses `createAdminClient()` (service role key) to bypass RLS

### 9.2 CRM Tools

#### `create_lead`

Create a new lead in the Elevera Studio CRM pipeline.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `business_name` | string | Yes | Business name |
| `contact_name` | string | No | Owner/manager name |
| `email` | email | No | Contact email |
| `phone` | string | No | Phone number |
| `website_url` | url | No | Current website |
| `location` | string | No | City/region |
| `niche` | enum | No | dental, frizer, restoran, autoservis, fizioterapija, wellness, fitness, apartmani, kozmetika, pekara, ostalo |
| `notes` | string | No | Free-form notes |
| `demo_site_url` | url | No | Demo site link |
| `source` | string | No | How lead was found |
| `instagram` | string | No | Instagram handle |
| `channel` | enum | No | instagram_dm, email, linkedin, telefon, whatsapp, osobno |
| `market` | enum | No | hr, dach, us |
| `first_message` | string | No | First outreach message |
| `first_contact` | date | No | First contact date (ISO 8601) |
| `page_speed` | integer | No | PageSpeed score (0-100) |

Sets `status: "new"`, `source: "manual"` if not provided.

#### `update_lead`

Update existing lead fields. Takes `lead_id` (UUID, required) plus any optional lead fields. Only updates provided fields. Sets `updated_at` automatically.

#### `move_lead`

Move lead to a pipeline stage. Takes `lead_id` and `status` (enum: new, demo_built, contacted, replied, call_booked, follow_up, won, lost). Returns previous and new stage.

#### `list_leads`

Query leads with filters: `status`, `niche`, `channel`, `market`, `location` (partial match), `date_from`, `date_to`, `limit`. Returns list sorted by `created_at` DESC.

#### `generate_cold_email`

Generate personalized cold email for a lead.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `lead_id` | UUID | required | Lead to email |
| `language` | enum | `"hr"` | hr or en |
| `tone` | enum | `"friendly"` | formal, friendly, direct |
| `include_demo_link` | boolean | `false` | Include demo site link |

**Built-in niche angles:**
- **Dental:** Patients search for dentists online, book directly
- **Frizer:** Online booking reduces no-shows
- **Restoran:** Guests check menus/reviews, make reservations
- **Autoservis:** Vehicle owners search locally
- **Fizioterapija:** Patients research providers online
- **Wellness:** Premium online experience expected
- **Fitness:** Members search online for gyms
- **Apartmani:** Direct bookings save 15-20% commission vs Booking.com
- **Kozmetika:** Portfolio website + online booking drives conversions
- **Pekara:** Mobile-friendly for local customers

**Side effects:** Creates `outreach_log` entry, updates lead's `last_contacted_at`.

**ROI argument:** One direct booking pays for the whole year of service at EUR 79-99/month.

#### `get_outreach_stats`

Performance statistics for the last N days (default: 30).

Returns: Pipeline status counts, total outreach attempts, response rate %, outreach breakdown by type (email/call/demo/follow_up), win rate %, new leads count, average days in pipeline.

### 9.3 Finance Tools

#### `log_income`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `amount` | number (positive) | Yes | Amount in EUR |
| `source` | enum | Yes | father_salary, elevera, etsy, fleet, freelance |
| `date` | date (ISO) | Yes | Transaction date |
| `description` | string | No | Description |
| `recurring` | boolean | No | Monthly recurring (default: false) |

#### `log_expense`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `amount` | number (positive) | Yes | Amount in EUR |
| `category` | enum | Yes | rent, food, subscriptions, domains, transport, gym, other |
| `date` | date (ISO) | Yes | Transaction date |
| `description` | string | No | What the expense was for |
| `recurring` | boolean | No | Monthly recurring (default: false) |

#### `get_financial_summary`

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `period` | enum | `"month"` | month or year |
| `month` | integer | — | Specific month (1-12) |
| `year` | integer | — | Specific year |

Returns: Total income, expenses, net, savings rate, income by source breakdown, expenses by category breakdown, recurring monthly obligations, transaction counts.

#### `get_revenue_by_source`

Income breakdown by source for current/specified year. Returns array of sources with total and count.

### 9.4 Fitness Tools

#### `log_workout`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `date` | date (ISO) | Yes | Workout date |
| `type` | enum | Yes | push, pull, legs |
| `exercises` | array | Yes | `[{ name, sets, reps, weight_kg, is_pr }]` |
| `duration_minutes` | integer | No | Total duration |
| `notes` | string | No | How it felt, energy level |

#### `log_meal`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `date` | date (ISO) | Yes | Meal date |
| `meal_type` | enum | Yes | breakfast, lunch, dinner, snack |
| `description` | string | Yes | What was eaten |
| `calories_approx` | integer | No | Calorie count |
| `protein_g` | integer | No | Protein in grams |
| `source` | enum | No | home, konzum, fast_food, restaurant |

#### `get_fitness_stats`

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `period_days` | integer | 30 | Look back period |
| `include_prs` | boolean | true | Include PR history |
| `include_nutrition` | boolean | true | Include calorie/protein stats |

Returns: Workout counts by type, current streak, PRs, weekly volume per muscle group, today's nutrition.

#### `get_ppl_schedule`

Returns current PPL day in rotation based on workout history. Shows full rotation: Push A -> Pull A -> Legs A -> Push B -> Pull B -> Legs B.

### 9.5 University Tools

#### `add_deadline`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `title` | string | Yes | Exam or project name |
| `type` | enum | Yes | exam, project, assignment |
| `course` | string | No | Course name at Algebra |
| `due_date` | date (ISO) | Yes | Deadline date |
| `priority` | enum | No | low, medium (default), high, critical |
| `notes` | string | No | Study notes, resources |

#### `get_deadlines`

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `include_completed` | boolean | false | Include completed deadlines |
| `course` | string | — | Filter by course name |
| `limit` | integer | — | Max deadlines to return |

Returns list sorted by urgency with countdown indicators, overdue flags.

### 9.6 Task Tools

#### `sync_todoist`

Pull tasks from Todoist API across 4 projects.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `project` | enum | `"all"` | elevera_studio, fakultet, osobno, tatin_posao, all |

**External API:** Todoist REST v2 (requires `TODOIST_API_TOKEN`)

Returns: Normalized task list with content, due date, priority (urgent/high/medium/normal), project name.

#### `get_daily_brief`

Morning briefing aggregating all modules.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `date` | date (ISO) | today | Brief date |
| `include_weather` | boolean | true | Include Zagreb weather |

**Sections:**
1. **Weather:** Zagreb temperature and condition (via Open-Meteo)
2. **Business:** Active clients + MRR, active leads, follow-up alerts, response rate
3. **Finances:** Current month income, expenses, net, savings rate
4. **Fitness:** Last workout type/date, streak, next PPL day, today's nutrition
5. **University:** Upcoming deadlines (7 days), overdue count, next deadline
6. **Tasks:** Todoist tasks due today/overdue

### 9.7 Dashboard Tools

#### `get_dashboard_summary`

Full overview of all modules.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `sections` | array | all | crm, finance, fitness, university, clients, tasks |

Returns comprehensive summary with KPIs from each selected section.

#### `analyze_pipeline`

Deep pipeline analysis.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `period_days` | integer | 90 | Analysis period |

**Returns:**
- Pipeline funnel visualization (ASCII bar chart)
- Stage conversion rates (% progression)
- Overall win rate and response rate
- Lead velocity (avg days per stage)
- Niche performance (reply rate, win rate per niche)
- Location performance (top 10 locations)
- AI-generated recommendations:
  - Focus on best-performing niches
  - Review stale leads (14+ days)
  - Address stuck "contacted" leads
  - Improve response rate if < 10%
  - Increase prospecting if < 10 leads in period
  - Double down on high-engagement locations

### 9.8 Client Tools

#### `add_client`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `business_name` | string | Yes | Client business name |
| `lead_id` | UUID | No | Original lead reference |
| `site_url` | url | No | Live website URL |
| `plan` | enum | Yes | basic_79, standard_99, custom |
| `mrr` | number (positive) | Yes | Monthly recurring revenue (EUR) |
| `started_at` | date (ISO) | Yes | Contract start date |
| `notes` | string | No | Client notes |

Sets `status: "active"` by default.

#### `update_client`

Takes `client_id` (required) plus optional: business_name, site_url, plan, mrr, status (active/paused/churned), notes.

#### `list_clients`

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `status` | enum | `"active"` | active, paused, churned, all |

Returns client list with total MRR summary.

---

## 10. TypeScript Types

All types defined in `types/index.ts`.

### CRM Types

```typescript
type LeadStatus = "new" | "demo_built" | "contacted" | "replied" | "call_booked" | "follow_up" | "won" | "lost"
type LeadNiche = "dental" | "frizer" | "restoran" | "autoservis" | "fizioterapija" | "wellness" | "fitness" | "apartmani" | "kozmetika" | "pekara" | "ostalo"
type LeadChannel = "instagram_dm" | "email" | "linkedin" | "telefon" | "whatsapp" | "osobno"
type LeadMarket = "hr" | "dach" | "us"
type SubscriptionTier = "basic_79" | "standard_99" | "custom"

interface Lead {
  id: string                          // UUID
  user_id: string                     // FK to auth.users
  business_name: string               // Required
  contact_name: string | null
  email: string | null
  phone: string | null
  website_url: string | null
  location: string | null
  niche: LeadNiche | null
  status: LeadStatus
  demo_site_url: string | null
  subscription_tier: SubscriptionTier | null
  notes: string | null
  last_contacted_at: string | null    // ISO timestamp
  next_follow_up: string | null       // ISO timestamp
  source: string | null
  instagram: string | null
  channel: LeadChannel | null
  market: LeadMarket | null
  first_message: string | null
  first_contact: string | null        // ISO date
  page_speed: number | null           // 0-100
  created_at: string                  // ISO timestamp
  updated_at: string                  // ISO timestamp
}
```

### Outreach Types

```typescript
type OutreachType = "email" | "call" | "demo" | "follow_up"

interface OutreachLog {
  id: string
  user_id: string
  lead_id: string                     // FK to leads
  type: OutreachType
  content: string | null
  sent_at: string                     // ISO timestamp
  response_received: boolean
  response_at: string | null
}
```

### Email Template Types

```typescript
interface EmailTemplate {
  id: string
  user_id: string
  name: string
  subject: string | null
  body: string | null                 // Supports {{placeholders}}
  niche: string | null
  language: string                    // "hr" or "en"
  created_at: string
}
```

### Client Types

```typescript
type ClientStatus = "active" | "paused" | "churned"

interface Client {
  id: string
  user_id: string
  lead_id: string | null              // Optional FK to leads
  business_name: string
  site_url: string | null
  plan: SubscriptionTier | null
  mrr: number                         // EUR
  status: ClientStatus
  started_at: string | null           // ISO date
  notes: string | null
}
```

### Finance Types

```typescript
type FinanceType = "income" | "expense"
type IncomeSource = "father_salary" | "elevera" | "etsy" | "fleet" | "freelance"
type ExpenseCategory = "rent" | "food" | "subscriptions" | "domains" | "transport" | "gym" | "other"

interface Finance {
  id: string
  user_id: string
  type: FinanceType
  amount: number                      // EUR
  source: IncomeSource | null         // For income
  category: ExpenseCategory | null    // For expense
  description: string | null
  date: string                        // ISO date
  recurring: boolean
}
```

### Fitness Types

```typescript
type WorkoutType = "push" | "pull" | "legs"

interface Exercise {
  name: string
  sets: number
  reps: number
  weight_kg: number
  is_pr: boolean
}

interface Workout {
  id: string
  user_id: string
  date: string                        // ISO date
  type: WorkoutType
  exercises: Exercise[]               // Stored as JSONB
  duration_minutes: number | null
  notes: string | null
}

type MealType = "breakfast" | "lunch" | "dinner" | "snack"
type MealSource = "konzum" | "fast_food" | "home" | "restaurant"

interface Meal {
  id: string
  user_id: string
  date: string                        // ISO date
  meal_type: MealType | null
  description: string
  calories_approx: number | null
  protein_g: number | null
  source: MealSource | null
}
```

### University Types

```typescript
type DeadlineType = "exam" | "project" | "assignment"
type Priority = "low" | "medium" | "high" | "critical"

interface Deadline {
  id: string
  user_id: string
  title: string
  type: DeadlineType | null
  course: string | null
  due_date: string                    // ISO date
  completed: boolean
  priority: Priority
  notes: string | null
}
```

### Dashboard Types

```typescript
interface KPICard {
  label: string
  value: string | number
  change?: string
  changeType?: "positive" | "negative" | "neutral"
  icon?: string
}

interface QuickAction {
  label: string
  href: string
  icon: string
}
```

---

## 11. Utility Libraries

### `lib/utils.ts`

```typescript
export function cn(...inputs: ClassValue[]): string
```

Combines `clsx` (conditional class joining) with `tailwind-merge` (intelligent Tailwind class deduplication). Used across all components.

---

## 12. Scripts & Data Import

### `scripts/import-leads.py`

Parses `merged.md` (Notion export of leads) and generates SQL INSERT statements in batches.

**Functions:**
- `parse_date(date_str)` — Handles multiple date formats (B d,Y / Y-m-d / d/m/Y)
- `parse_leads(filepath)` — Splits by `# ` headers into lead dictionaries
- `map_lead(raw)` — Maps Notion fields to Supabase schema
- `sql_val(v)` — Converts Python values to SQL literals
- `generate_sql_batches(leads, batch_size=30)` — Generates batched INSERT SQL

**Enum Mappings:**
- STATUS_MAP: Notion status -> DB status (New->new, Demo Built->demo_built, etc.)
- NICHE_MAP: Notion niche -> DB niche
- CHANNEL_MAP: Notion channel -> DB channel
- MARKET_MAP: Notion market -> DB market

**Output:** `leads-inserts.json` with SQL batches and statistics.

### `scripts/execute-batches.py`

Imports ALL parsed leads directly via Supabase REST API.

- Uses service role key for authentication
- One-by-one insertion for error isolation
- Progress reporting every 50 leads
- Tracks success/failure counts

**Hardcoded:**
- `USER_ID: "c0a74433-7f4a-44e9-af96-e87d1c1acbce"`
- `SUPABASE_URL: "https://ommmjmhhwaegxlklayic.supabase.co"`

### `merged.md`

Notion export containing 100+ lead entries with full metadata (business name, contact info, website, location, niche, status, channel, market, follow-up dates, PageSpeed scores, conversation notes). ~328 KB.

---

## 13. Database Tables & API Coverage Matrix

### Tables

| Table | Columns | Primary Use |
|-------|---------|-------------|
| `leads` | 22 columns | CRM pipeline tracking |
| `outreach_log` | 8 columns | Email/call/demo logging per lead |
| `email_templates` | 7 columns | Reusable email templates |
| `clients` | 10 columns | Active subscription management |
| `finances` | 9 columns | Income/expense tracking |
| `workouts` | 7 columns | Exercise logging (JSONB exercises) |
| `meals` | 8 columns | Nutrition tracking |
| `deadlines` | 9 columns | University deadline management |

### API Route Coverage

| Route | GET | POST | PATCH | DELETE | Tables |
|-------|-----|------|-------|--------|--------|
| `/api/leads` | List with filters | Create lead | — | — | leads |
| `/api/leads/[id]` | Single lead | — | Update fields | Delete | leads |
| `/api/leads/[id]/outreach` | Outreach log | Log outreach | — | — | outreach_log, leads |
| `/api/finance` | List with filters | Create transaction | — | — | finances |
| `/api/finance/[id]` | Single tx | — | Update | Delete | finances |
| `/api/finance/summary` | P&L summary | — | — | — | finances |
| `/api/finance/by-source` | Income breakdown | — | — | — | finances |
| `/api/fitness/workouts` | List | Create | — | — | workouts |
| `/api/fitness/workouts/[id]` | Single | — | Update | Delete | workouts |
| `/api/fitness/meals` | List | Create | — | — | meals |
| `/api/fitness/meals/[id]` | Single | — | Update | Delete | meals |
| `/api/fitness/meals/daily` | Daily summary | — | — | — | meals |
| `/api/fitness/prs` | Personal records | — | — | — | workouts |
| `/api/fitness/streak` | Streak count | — | — | — | workouts |
| `/api/fitness/volume` | Weekly tonnage | — | — | — | workouts |
| `/api/clients` | List | Create | — | — | clients |
| `/api/clients/[id]` | Single | — | Update | Delete | clients |
| `/api/clients/mrr` | MRR summary | — | — | — | clients |
| `/api/university/deadlines` | List | Create | — | — | deadlines |
| `/api/university/deadlines/[id]` | Single | — | Update | Delete | deadlines |
| `/api/dashboard/summary` | Full overview | — | — | — | all tables |
| `/api/weather` | Zagreb weather | — | — | — | (external) |
| `/api/todoist/sync` | Todoist tasks | — | — | — | (external) |
| `/api/mcp` | SSE stream | MCP messages | — | Session cleanup | all tables |

### MCP Tool Coverage (23 tools)

| Category | Tools | Count |
|----------|-------|-------|
| CRM | create_lead, update_lead, move_lead, list_leads, generate_cold_email, get_outreach_stats | 6 |
| Finance | log_income, log_expense, get_financial_summary, get_revenue_by_source | 4 |
| Fitness | log_workout, log_meal, get_fitness_stats, get_ppl_schedule | 4 |
| University | add_deadline, get_deadlines | 2 |
| Tasks | sync_todoist, get_daily_brief | 2 |
| Dashboard | get_dashboard_summary, analyze_pipeline | 2 |
| Clients | add_client, update_client, list_clients | 3 |

---

## File Tree Summary

```
petar-os/
  app/
    globals.css                    # Dark theme CSS variables + animations
    layout.tsx                     # Root layout (Geist fonts, dark mode)
    (dashboard)/
      layout.tsx                   # Sidebar + main content + toaster
      page.tsx                     # Command Center (home dashboard)
      crm/
        page.tsx                   # Outreach CRM (Kanban + Table)
      finance/
        page.tsx                   # Financial Dashboard
      fitness/
        page.tsx                   # Fitness Hub
      clients/
        page.tsx                   # Clients & Subscriptions
      university/
        page.tsx                   # Academic Calendar
    login/
      page.tsx                     # Login/Signup form
      actions.ts                   # Server actions (login, signup)
    auth/
      callback/
        route.ts                   # OAuth callback handler
    api/
      mcp/
        route.ts                   # MCP server endpoint (POST/GET/DELETE)
      leads/
        route.ts                   # GET (list) + POST (create)
        [id]/
          route.ts                 # GET + PATCH + DELETE
          outreach/
            route.ts               # GET (log) + POST (log entry)
      finance/
        route.ts                   # GET (list) + POST (create)
        [id]/
          route.ts                 # GET + PATCH + DELETE
        summary/
          route.ts                 # GET (P&L summary)
        by-source/
          route.ts                 # GET (income breakdown)
      fitness/
        workouts/
          route.ts                 # GET + POST
          [id]/
            route.ts               # GET + PATCH + DELETE
        meals/
          route.ts                 # GET + POST
          [id]/
            route.ts               # GET + PATCH + DELETE
          daily/
            route.ts               # GET (daily summary)
        prs/
          route.ts                 # GET (personal records)
        streak/
          route.ts                 # GET (streak count)
        volume/
          route.ts                 # GET (weekly tonnage)
      clients/
        route.ts                   # GET + POST
        [id]/
          route.ts                 # GET + PATCH + DELETE
        mrr/
          route.ts                 # GET (MRR summary)
      university/
        deadlines/
          route.ts                 # GET + POST
          [id]/
            route.ts               # GET + PATCH + DELETE
      dashboard/
        summary/
          route.ts                 # GET (full overview)
      weather/
        route.ts                   # GET (Zagreb weather)
      todoist/
        sync/
          route.ts                 # GET (Todoist tasks)
  components/
    ui/
      badge.tsx                    # Badge with 6 variants
      button.tsx                   # Button with 6 variants + 4 sizes
      card.tsx                     # Card + Header/Title/Description/Content/Footer
      date-picker.tsx              # Single date picker
      date-range-picker.tsx        # Date range picker
      input.tsx                    # Text input
      label.tsx                    # Form label
      scroll-area.tsx              # Scrollable container
      separator.tsx                # Divider line
      skeleton.tsx                 # Loading placeholder
      tooltip.tsx                  # Hover tooltip
    layout/
      sidebar.tsx                  # Main navigation sidebar
    crm/
      add-lead-modal.tsx           # Create lead form dialog
      kanban-board.tsx             # Drag-and-drop board
      kanban-column.tsx            # Single Kanban column
      lead-card.tsx                # Lead card for Kanban
      lead-detail-modal.tsx        # Lead detail/edit dialog
      table-view.tsx               # Sortable data table
      view-switcher.tsx            # View tab switcher
    finance/
      log-transaction-modal.tsx    # Create transaction dialog
      transaction-list.tsx         # Expandable transaction list
    fitness/
      daily-nutrition.tsx          # Daily calorie/protein tracker
      log-meal-modal.tsx           # Create meal dialog
      log-workout-modal.tsx        # Create workout dialog
      pr-board.tsx                 # Personal records board
  lib/
    utils.ts                       # cn() class merging utility
    supabase/
      client.ts                    # Browser Supabase client
      server.ts                    # Server Supabase client
      admin.ts                     # Admin client (service role)
      middleware.ts                # Auth middleware
    mcp/
      server.ts                    # MCP server factory
      tools/
        index.ts                   # All 23 MCP tool definitions (2512 lines)
  types/
    index.ts                       # All TypeScript interfaces and unions
  design/
    tokens.ts                      # Design system tokens
  scripts/
    import-leads.py                # Notion -> SQL batch generator
    execute-batches.py             # REST API lead importer
    leads-inserts.json             # Generated SQL batches
  middleware.ts                    # Next.js request middleware
  .mcp.json                       # Supabase MCP config
  CLAUDE.md                        # Product Requirements Document
  CHECKLIST.md                     # Feature implementation checklist
  merged.md                        # Notion leads export (~328KB)
  package.json                     # Dependencies (25 deps, 9 devDeps)
  tsconfig.json                    # TypeScript config (strict)
  next.config.mjs                  # React Compiler enabled
  postcss.config.mjs               # Tailwind CSS v4
  eslint.config.mjs                # ESLint config
```
