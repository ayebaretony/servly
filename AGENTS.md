# AGENTS.md — Courtly (Tennis Booking & Revenue System)

You are helping build **servly**, a simple, good-looking web app that a sports center manager uses to manage tennis court bookings and track revenue. Read this whole file before writing any code, and re-read the relevant section before starting each phase.

---

## 1. Project goals

- Let the manager create, view, edit, and cancel court bookings quickly.
- Show at a glance: today's bookings, today's revenue, court utilization, open slots.
- Track revenue by day, week, month, and court.
- Prevent double-booking. This is the single most important correctness rule.
- Stay **simple**. Fewer features done well beats many features done badly.

**Owner context:** the owner is a sports administrator, not a professional developer. Explain things in plain language, give exact step-by-step instructions for anything done in the Firebase console or terminal, and never assume prior DevOps knowledge.

---

## 2. Hard constraints (never violate)

1. **Budget is zero.** Use only free tiers. Stay within the Firebase **Spark (free) plan**.
2. **Firebase only** for database and authentication: **Cloud Firestore** + **Firebase Authentication** (email/password and Google sign-in). Host on **Firebase Hosting**.
3. **No Cloud Functions.** They require the paid Blaze plan. Do all logic in the client using Firestore transactions and security rules.
4. **No other paid or third-party backend services** (no Supabase, Stripe, Twilio, SendGrid, etc.). Ask first if you think one is needed.
5. **No new dependencies without asking.** Use the approved stack in section 3. If you want to add a package, state what it is, why, and its size, then wait for approval.
6. **Never commit secrets.** No service account JSON, no admin keys. Firebase web config goes in `.env` files (see `.env.example`).
7. **Do not invent features** that are not in this file or the screenshots. Suggest them at the end of a task instead.
8. **Match the screenshots** (section 5). Do not redesign.

---

## 3. Tech stack (approved)

| Concern | Choice |
|---|---|
| Framework | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS (design tokens in section 6) |
| Routing | React Router |
| Backend | Firebase modular SDK (v9+): Auth + Firestore |
| Dates | `date-fns` (+ `date-fns-tz` for timezone) |
| Charts | Recharts (only for the revenue bar chart) |
| Icons | `lucide-react` |
| Local dev | Firebase Emulator Suite (Auth + Firestore) |
| Hosting | Firebase Hosting |

Use the **modular** Firebase SDK only (`import { getFirestore } from "firebase/firestore"`), never the legacy namespaced API.

### Folder structure

```
/docs/design/            # the 5 screenshots (auth, dashboard, Calendar, bookings, Courts)
/src
  /app                   # router, providers, layout shell (sidebar + topbar)
  /components/ui         # Button, Card, Badge, Input, Select, Modal, Table, StatCard
  /features
    /auth
    /dashboard
    /calendar
    /bookings
    /courts
    /revenue
    /settings
  /lib
    firebase.ts          # init app, auth, db (reads from import.meta.env)
    money.ts             # money helpers
    time.ts              # timezone + slot helpers
    conflicts.ts         # slot-key + overlap logic
  /types                 # shared TypeScript types
firestore.rules
firestore.indexes.json
firebase.json
.env.example
AGENTS.md
```

Feature folders own their own hooks, components, and Firestore queries. Components never call Firestore directly; they use hooks in the feature's `hooks/` or a `*.service.ts` file.

---

## 4. Working rules for the AI agent

- **Work in phases** (section 11). Finish and verify one phase before starting the next.
- **One screen or feature per task.** Don't touch unrelated files.
- **Before coding a phase,** post a short plan (files to create or change, data touched). **After,** summarize what was built and how to test it.
- **TypeScript strict mode on.** No `any` unless commented with a reason.
- **Every data screen needs three states:** loading (skeleton), empty (friendly message + action), and error (clear message + retry).
- **Forms:** validate before submit, show inline errors, disable the submit button while saving, show a success toast.
- **Confirm destructive actions** (cancel booking, delete court) with a modal.
- **Run** `npm run build` and `npm run lint` before declaring a task done. Fix all errors.
- **Test against the emulators first,** never against the real project, while developing.
- **When something is ambiguous,** ask one clear question rather than guessing, unless the answer is in this file.
- **Keep code boring and readable.** Small functions, clear names, short comments explaining *why*.

---

## 5. Screens (source of truth: `/docs/design/`)

The screenshots are the **visual reference**. Their sample data (names, numbers, 2024 dates) is placeholder and internally inconsistent (e.g., the dashboard says 18 bookings, the calendar says 7). **Never hard-code or copy that data**; all numbers come from Firestore.

Two screenshots (Bookings, Courts) show a large empty gap at the top of the page. That is a screenshot artifact. Do not reproduce it.

### Global layout
- Left **sidebar**: logo, then Dashboard, Calendar, Bookings, Courts, Revenue, Settings. Active item is a solid green pill with white text. User card (name + role) pinned at the bottom.
- **Top bar:** page title on the left; booking search box, notifications bell, and a green **+ New booking** button on the right. The "New booking" button opens the booking modal from any page.
- Collapse the sidebar into a drawer on mobile; tables scroll horizontally on small screens.

### Auth (`auth.png`)
- Split layout: green brand panel on the left (logo, tagline "Every court. Every booking. Under control.", subtext), form on the right.
- Email + password (show/hide toggle), "Remember me", "Forgot password?" (Firebase password reset email), **Sign in**, divider, **Continue with Google**, "Create one" link.
- Placeholder `admin@courtly.com` is just a placeholder. Don't pre-fill it.
- See section 9 for who is allowed in after signing up.

### Dashboard (`dashboard.png`)
- Greeting ("Good morning, {first name}") + today's date.
- **4 stat cards:** Today's bookings, Today's revenue, Court utilization, Open slots today (with "Across N courts"). Show the change vs. last week where the screenshot shows it.
- **Today at a glance:** timeline list of today's bookings, color-coded by court, with a "View calendar" link.
- **Revenue this month:** big total, % vs. previous month, simple weekly bar chart, "Average booking value".
- **Recent bookings** table (customer, court, date & time, rate, total, status) + "View all bookings".

### Calendar (`Calendar.png`)
- **Month / Week / Day** segmented toggle (build it as a proper styled segmented control; the screenshot's version is unstyled), prev/next arrows, "Today" button.
- Month grid with booking chips (customer · time) colored by court; "+N more" opens that day.
- Court color legend top right.
- **Right-hand day panel:** selected day, count of bookings and revenue, list of bookings (time, customer, court, amount). Today's date gets a filled green circle.
- Clicking an empty slot or day starts a new booking with date prefilled; clicking a chip opens booking details.

### Bookings (`bookings.png`)
- Title "All bookings" + **Export CSV**.
- Filter bar: search (name, email, or phone), date picker, court filter, status filter, "Clear filters".
- Summary strip: Bookings count, Total revenue, Average occupancy (for the current filter).
- Table: Date, Time, Court, Customer, Contact (phone), Email ("Email not provided" if empty), Rate/hour, Total, Status badge, row actions menu (view, edit, cancel).
- Footer note: "Rates are calculated per hour. Partial hours are charged proportionally." + pagination (cursor-based, see section 8).

### Courts (`Courts.png`)
- "Manage your courts" + **Add court**.
- Stat cards: Total courts, Available now, In maintenance, Average rate.
- Table: color dot, name, type/surface (e.g., "Outdoor hard court", "Indoor acrylic court"), status badge, today's bookings, hourly rate, Edit + menu.
- **Today's availability** stacked bar (booked hours vs. open hours).
- **Quick actions:** Block time for maintenance, Update hourly rates, View calendar.

### Revenue and Settings (no screenshots yet)
Design these **later, in the same visual style** (Phase 6) and show the owner a plan before building. Do not build them before Phase 6.

---

## 6. Design system

Calm, clean, lots of whitespace, rounded cards, subtle borders. Font: **Inter**. Estimate exact values by sampling the screenshots; these are the starting tokens. Define them once as Tailwind theme tokens / CSS variables, never hard-code hex values in components.

| Token | Approx. value | Used for |
|---|---|---|
| `--primary` | `#3D7A45` | Buttons, active nav, links |
| `--primary-dark` | `#2F6B3A` | Hover, auth brand panel |
| `--bg` | `#FBFAF6` | Page background (warm off-white) |
| `--surface` | `#FFFFFF` | Cards |
| `--sidebar` | `#F0F5EF` | Sidebar background |
| `--border` | `#E6E8E3` | Card and table borders |
| `--ink` | `#1A2320` | Primary text |
| `--muted` | `#6B7570` | Secondary text |
| `--table-head` | `#EAF0F6` | Table header row |

**Court colors** (dot, calendar chip border, timeline): Court 1 green, Court 2 blue, Court 3 yellow, Court 4 red. Store `color` on each court document; new courts pick the next unused color from a fixed palette.

**Status badges:** Confirmed = green tint, Pending = yellow, Cancelled = red tint, Available = green, Maintenance = red.

Cards: white, 1px border, ~12px radius, very light shadow. Buttons: primary solid green, secondary white with border. Keep motion minimal (150–200ms transitions only). Meet WCAG AA text contrast; all inputs have labels; everything keyboard-navigable.

---

## 7. Firestore data model

Use these collection names and field names exactly.

```
users/{uid}
  displayName: string
  email: string
  role: "admin" | "staff"
  active: boolean
  createdAt: Timestamp

courts/{courtId}
  name: string                  // "Court 1"
  surface: string               // "Outdoor hard court"
  status: "available" | "maintenance"
  hourlyRateMinor: number       // integer, minor units
  color: string                 // palette key
  sortOrder: number
  archived: boolean             // soft delete, never hard-delete a court with bookings

bookings/{bookingId}
  courtId: string
  courtName: string             // denormalized for display
  customerName: string
  customerPhone: string
  customerEmail: string | null
  date: string                  // "YYYY-MM-DD" in the center timezone
  startAt: Timestamp
  endAt: Timestamp
  durationMinutes: number
  hourlyRateMinor: number       // SNAPSHOT of the rate at booking time
  totalMinor: number            // snapshot, never recomputed later
  status: "confirmed" | "pending" | "cancelled"
  notes: string | null
  createdBy: string             // uid
  createdAt: Timestamp
  updatedAt: Timestamp

slots/{courtId}_{date}_{HHmm}   // one doc per occupied slot, see conflict rule below
  courtId: string
  date: string
  bookingId: string | null
  blockId: string | null

blocks/{blockId}                // maintenance / blocked time
  courtId: string
  startAt: Timestamp
  endAt: Timestamp
  reason: string
  createdBy: string

settings/center                 // single doc
  centerName: string
  currency: string              // "AED" (fixed by owner)
  timezone: string              // IANA, e.g. "Asia/Dubai"
  openTime: string              // "07:00"
  closeTime: string             // "22:00"
  slotMinutes: number           // 30
```

### Money rules
- **Store money as integer minor units** (cents/fils). Never floats.
- Total = `Math.round(hourlyRateMinor * durationMinutes / 60)` (partial hours are charged proportionally).
- **The currency is AED (UAE dirham).** The owner has confirmed this. **Ignore the `$` shown in the screenshots**; they are placeholders only. Every price, rate, total, and revenue figure must display in AED.
- Minor unit is the fils (100 fils = 1 AED), so `hourlyRateMinor: 15000` means AED 150.00.
- Format with `Intl.NumberFormat("en-AE", { style: "currency", currency: "AED" })`, driven by `settings/center.currency` (seeded as `"AED"`). Never hard-code `$` or `AED` strings in components; always go through the shared formatter in `lib/money.ts`.
- Rate labels read like "AED 150/hr" instead of "$30/hr".
- Bookings keep their own rate/total snapshot so changing a court's rate later doesn't rewrite history.

### Time rules
- Store timestamps in UTC (Firestore `Timestamp`). Display and calculate "today", "this week", "this month" in `settings/center.timezone`.
- The `date` string is always the booking's start date in the center timezone, and is the field used for day/range queries.

### Double-booking prevention (critical)
Without Cloud Functions, enforce this on the client with a **Firestore transaction**:

1. Compute every slot key the booking covers: `${courtId}_${date}_${HHmm}` at `slotMinutes` granularity (default 30 min).
2. In one `runTransaction`: read all those slot docs; **if any exists, abort** with a "That time is no longer available" error.
3. Otherwise write the booking doc **and** all its slot docs in the same transaction.
4. **Cancelling or editing** a booking deletes/rewrites its slot docs in the same transaction.
5. Maintenance blocks write slot docs with `blockId` the same way, so blocked time can't be booked.
6. Security rules must also reject creating a slot doc that already exists (see section 9).
7. Check this logic with tests: overlapping times, back-to-back bookings (allowed), same time on different courts (allowed), cancel then rebook (allowed), two simultaneous attempts (one must fail).

Also block bookings in the past (except by an admin), outside opening hours, or on courts in maintenance.

---

## 8. Staying inside the free tier (Spark limits)

Firestore free quota is roughly 50k reads, 20k writes, and 1 GiB storage per day/total. That is plenty for one center **if** queries are disciplined:

- **Always query by a bounded range** (`date >= start && date <= end`). Never load the whole `bookings` collection.
- **Paginate** the Bookings table with `limit()` + `startAfter()` cursors (e.g., 10–25 per page). The "1–7 of 42" total count uses `getCountFromServer()` rather than reading every doc.
- **Real-time listeners (`onSnapshot`) only for today's view** (dashboard "Today at a glance", calendar day view). Use one-time `getDocs` for everything else. Unsubscribe on unmount.
- Cache courts and settings in memory (they rarely change); don't refetch per screen.
- Compute dashboard and revenue totals from range queries; if the month view gets heavy, add a `dailyStats/{date}` summary doc updated inside the booking transaction (ask the owner first).
- Add Firestore **composite indexes** to `firestore.indexes.json` for every multi-field query, and commit that file.
- Search (name/phone/email): prefix-match on a lowercase `searchKey` field, or filter within the already-loaded date range. No external search service.

---

## 9. Authentication & security

- Firebase Auth: **email/password** + **Google**. Persistence follows "Remember me" (local vs. session).
- **Signing up must not grant access.** Anyone can create an Auth account, but the app only lets in users who have a `users/{uid}` doc with `active: true` and a valid `role`. Show a friendly "Your account is waiting for approval" screen otherwise.
- The **first admin** is created manually (the agent writes step-by-step console instructions for the owner to add their own `users/{uid}` doc with `role: "admin"`). Admins approve or deactivate others in Settings.
- Roles: **admin** (everything, including courts, rates, settings, users, deleting) and **staff** (create/edit/cancel bookings, view dashboard/calendar; cannot change rates, courts, settings, or users).
- Protect routes with an auth guard; redirect unauthenticated users to `/login`.
- **Write `firestore.rules` for real**, not test mode. Never ship `allow read, write: if true`.
  - Deny everything by default.
  - Read/write only if the user is signed in and active, with role checks per collection.
  - Validate field types, allowed `status` values, and non-negative money values.
  - `slots` documents: create only if they don't already exist; delete only by signed-in active users.
  - Users cannot change their own `role`.
- Test the rules in the emulator, including attempts that should fail, before deploying.
- Don't log customer phone numbers or emails to the console.
- Customer data (name, phone, email) is personal data: collect only what the booking form needs.

---

## 10. Quality bar (definition of done)

A task is done only when:

- [ ] It matches the relevant screenshot (layout, spacing, colors, states).
- [ ] Loading, empty, and error states exist.
- [ ] Works on desktop and is usable on a phone-width screen.
- [ ] No hard-coded sample data; all money shown in AED via the shared formatter.
- [ ] `npm run build` and `npm run lint` pass with zero errors.
- [ ] Firestore queries are bounded, paginated, and indexed.
- [ ] Security rules cover any new collection or field.
- [ ] The owner has plain-language instructions on how to see/test it.

---

## 11. Build phases

**Phase 0: Setup**
Vite + React + TS + Tailwind, Firebase project connection, Emulator Suite, `.env.example`, design tokens, UI primitives (Button, Card, Badge, Input, Select, Modal, Table, StatCard), Firebase Hosting config.

**Phase 1: Auth & app shell**
Login page (email/password, Google, forgot password), auth guard, approval-pending screen, sidebar + top bar layout, `users` doc and role handling, first-draft `firestore.rules`.

**Phase 2: Courts**
Courts list, add/edit court, status (available/maintenance), hourly rate, color. Seed `settings/center`.

**Phase 3: Bookings**
New/edit/cancel booking modal, **transactional conflict prevention**, Bookings table with filters, search, pagination, CSV export, status changes.

**Phase 4: Calendar**
Month, week, and day views, court color legend, day side panel, click-to-create, maintenance blocks.

**Phase 5: Dashboard**
Stat cards, today's timeline, revenue-this-month chart, recent bookings.

**Phase 6: Revenue & Settings**
Show the owner a short design plan first. Revenue by day/week/month/court with CSV export; Settings for center info, currency, hours, slot length, and user approval.

**Phase 7: Hardening & launch**
Rules review and tests, index check, quota check, accessibility pass, empty-data walkthrough, deploy to Firebase Hosting, owner handover notes.

---

## 12. Open decisions (ask the owner; don't assume)

Until answered, implement these defaults behind settings so they're easy to change:

1. **Currency:** ~~open~~ **Decided: AED.** Ignore `$` in the screenshots.
2. **What counts as revenue:** default = **confirmed bookings only**; pending shown separately; cancelled excluded.
3. **Opening hours and slot length:** default 07:00–22:00, 30-minute slots.
4. **Customers:** bookings store customer details inline; there's no separate customer/CRM feature in v1.
5. **Online payments and customer-facing booking:** out of scope for v1 (admin-only tool). Don't build them.

---

## 13. Out of scope for v1

Customer-facing booking portal, online payments, SMS/WhatsApp/email notifications, recurring bookings, coaching/membership management, multi-center support, mobile native app. If the owner asks for one, first explain whether it fits the free-tier and no-Cloud-Functions constraints.
