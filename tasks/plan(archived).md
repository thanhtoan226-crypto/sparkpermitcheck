# Spark Permit Check - Implementation Plan

## Overview
Build a mobile-first digital permit execution and workforce attendance tracking platform. Next.js 15 (webpack), Prisma 6 + SQLite, Zustand for UI state only, API routes for all data persistence.

## Architecture

### Data Flow
- All data mutations go through API routes (persisted in SQLite via Prisma)
- Components fetch data via API calls (useEffect + useState)
- Zustand holds ONLY: currentUser session, activeQR overlay state
- No in-memory store for permits/shifts - always read from database

### Worker Sign-on/Sign-off
- Each sign-on creates a new ShiftWorker record (full history preserved)
- UI shows worker once with latest state (signed on / signed off)
- History icon expands to show all sign-on/sign-off timestamps

### Isolation Task Signing
- One QR code per task (not per point) — "Show QR" button at task level
- Scanning a task QR signs all unsigned points in that task at once
- Re-signing a fully-signed task is blocked with error
- Points display individually with signed/unsigned status and signer name

### Permit Type Flows
- CMW: draft -> isolation_pending -> active -> (shift cycle) -> closed
- CAP Non-Isolation: active -> (shift cycle) -> closed
- CAP Isolation: active -> (shift cycle) -> closed
- Shift cycle: revalidation_pending -> open -> closed -> (can start new shift)

---

## Phase 1: Project Scaffolding

### 1.1 Clean Slate
- [x] Delete all files in frontend/ (preserve .git directory)
- [x] Create new Next.js 15 app with App Router, TypeScript, Tailwind v4
- [x] Install dependencies: prisma, @prisma/client, zustand, qrcode.react, lucide-react, uuid
- [x] Install shadcn/ui CLI and add components: button, input, label, card, badge, dialog, separator

### 1.2 Configuration
- [x] Configure Tailwind with Spark color tokens (yellow, blue, purple, navy, gray)
- [x] Create .env with DATABASE_URL
- [x] Create .gitignore (node_modules, .next, .env, dev.db)

### 1.3 Database
- [x] Initialize Prisma with SQLite provider (Prisma 6, native engine)
- [x] Define schema: User, Permit, IsolationTask, IsolationPoint, Shift, ShiftWorker
- [x] Run initial migration
- [x] Create db.ts singleton client

**Success Criteria**: `npx next build` succeeds. Prisma client generates. DB file exists. **PASS**

---

## Phase 2: Backend - API Routes

### 2.1 User Routes
- [x] `POST /api/users` - login/create user (Permit Holder by name, Worker by 6-digit ID with random name generation)
- [x] `GET /api/users` - list all users
- [x] `DELETE /api/users` - remove user by ID

### 2.2 Permit Routes
- [x] `GET /api/permits` - list permits (with relations: holder, tasks, shifts, workers)
- [x] `POST /api/permits` - create permit (type, title, holderId)
- [x] `GET /api/permits/[id]` - get permit detail with all relations

### 2.3 Isolation Task Routes
- [x] `POST /api/permits/[id]/isolation-tasks` - add task with isolation points
- [x] `PATCH /api/permits/[id]/isolation-tasks` - sign isolation point (auto-transition to active when all signed for CMW)

### 2.4 Shift Routes
- [x] `POST /api/permits/[id]/shifts` - handle all shift lifecycle actions:
  - start_revalidation (with CMW validation: all isolation points must be signed)
  - holder_sign_on
  - holder_sign_off (validates all workers signed off)
  - worker_sign_on (validates holder signed on, shift is open, not duplicate active)
  - worker_sign_off (validates shift is open)

### 2.5 Closure Route
- [x] `POST /api/permits/[id]/close` - close permit

**Success Criteria**: All routes return correct responses. Data persists in SQLite. Business rules enforced. **PASS**

---

## Phase 3: Frontend - Core Pages

### 3.1 Layout & Globals
- [x] Root layout with Geist font, metadata
- [x] globals.css with Spark color theme variables and Tailwind v4 config

### 3.2 Login Page (`/`)
- [x] Role toggle: Permit Holder / Worker
- [x] Permit Holder: username input
- [x] Worker: 6-digit number input
- [x] Quick login for returning users (up to 6)
- [x] Generate random name for workers using seeded random
- [x] Store current user session in Zustand + localStorage

### 3.3 Header Component
- [x] Logo + app name
- [x] Current user avatar with color
- [x] User switcher dropdown
- [x] Scan link (for workers)
- [x] Logout (tap avatar)

### 3.4 Permits List Page (`/permits`)
- [x] List permits for current user (holder sees own, worker sees all)
- [x] Permit cards with type badge, status badge, title
- [x] Create permit dialog (type selector, title input)
- [x] Empty state with illustration

**Success Criteria**: User can login, see permits list, create a new permit, switch users. **PASS**

---

## Phase 4: Frontend - Permit Detail

### 4.1 Permit Detail Page (`/permits/[id]`)
- [x] Permit header with type badge, status badge, title
- [x] Read-only mode when permit is closed
- [x] Section layout for Isolation, Shifts, Actions

### 4.2 Isolation Section (CMW only)
- [x] Add Isolation Task form (task name, dynamic isolation points)
- [x] Show tasks with signed/unsigned status per point
- [x] "Show QR" button at task level (one QR per task, signs all unsigned points when scanned)

### 4.3 Shift Section
- [x] Start Daily Revalidation button (when no active shift, validates CMW has isolation tasks)
- [x] Holder Sign On button (revalidation_pending -> open)
- [x] Show Sign-On QR / Show Sign-Off QR buttons (when shift open)
- [x] Worker list showing latest state per worker
- [x] History icon per worker expanding all sign-on/sign-off records
- [x] Sign Off (Daily Relinquishment) button with validation
- [x] Shift history: past shifts as collapsed cards below current shift

### 4.4 QR Code Display Overlay
- [x] Modal overlay with QRCodeSVG
- [x] Label indicating action type (Task Signature, Worker Sign-On, Worker Sign-Off)
- [x] Close button

### 4.5 Closure Section
- [x] Close Permit button (enabled when active or shift_closed AND no open/pending shifts)
- [x] Confirmation dialog with warning
- [x] Server-side validation: rejects close if any shifts are not closed

### 4.6 Shift History Section
- [x] Dedicated card below Current Shift, separate from the active shift view
- [x] Shows only closed shifts (not the current/open shift)
- [x] Each row: shift number (1-based), date, start time, end time, worker count
- [x] Start/end times sourced from new `startedAt`/`endedAt` fields on Shift model (written at holder sign-on/sign-off)
- [x] Displays "—" gracefully for shifts with null timestamps (pre-migration data)
- [x] DB migration `add_shift_timestamps` adds nullable `startedAt String?` and `endedAt String?` to Shift

**Success Criteria**: Full permit lifecycle works for all 3 permit types. Data persists across page reloads. **PASS**

---

## Phase 5: Frontend - Worker Experience

### 5.1 Scan Page (`/scan`)
- [x] Worker-only page (redirect if not worker)
- [x] Lists all active permits with per-permit buttons: [Isolation task for {name}] and [Permit {name}]
- [x] Workers cannot access /permits or /permits/[id] directly (redirected to /scan)
- [x] Workers login redirects to /scan instead of /permits

### 5.2 Isolation Task Page (`/scan/task`)
- [x] Shows all isolation tasks for a CMW permit with signed/unsigned points
- [x] "Sign Off" button per task to sign all unsigned points
- [x] After signing, shows "Go to Permit" button to navigate to shift sign-on/off

### 5.3 Permit Sign-On/Off Page (`/scan/permit`)
- [x] Shows current shift status and Sign On / Sign Off buttons
- [x] Worker list with latest state per worker and history expand
- [x] Past shifts section (collapsed)
- [x] Related Documents section with dummy hyperlinks
- [x] Success/error result messages inline

**Success Criteria**: Worker can scan QR codes for isolation signing, shift sign-on, and shift sign-off. **PASS**

---

## Phase 6: Quality Review

### 6.1 Code Review (3 parallel reviewers)
- [x] Simplicity/DRY/Elegance review
- [x] Bugs/Functional correctness review
- [x] Project conventions review

### 6.2 Bugs Fixed
- [x] CMW permit: empty isolation tasks array passed `.every()` check, allowing premature revalidation
- [x] Worker could sign on/off to closed shift (no status check)
- [x] start_revalidation API had no server-side CMW validation
- [x] Missing res.ok checks on mutation handlers (handleAddTask, handleStartRevalidation, handleHolderSignOn, handleClose)
- [x] Fixed createdAt @default("()") in Prisma schema
- [x] Removed unused getUserName function
- [x] Added eslint-disable for useEffect dependency in permit detail
- [x] Changed QR from per-point to per-task (one QR per isolation task, signs all unsigned points)
- [x] Permit could be closed with open/pending shifts (added server-side + frontend check)
- [x] Removed unused hasUnsigned variable after QR refactor

### 6.3 Testing

Systematic test results (5 suites, 40+ test cases):

**Suite 1 - User Management** (10 tests): ALL PASS
- Create permit holder, worker, returning users, invalid inputs, max users limit

**Suite 2 - CMW Full Lifecycle** (27 tests): ALL PASS
- Draft -> isolation_pending -> active -> shift cycle -> closed
- Edge cases: no-task revalidation blocked, worker before holder blocked, duplicate sign-on blocked, holder sign-off with active workers blocked, worker sign-on to closed shift blocked, re-sign signed task blocked

**Suite 3 - CAP Permits + Multi-Shift** (13 tests): 12 PASS, 1 bug found + fixed
- CAP_NON_ISOLATION and CAP_ISOLATION start as active, skip isolation
- Multi-shift support verified (2 shifts on same permit)
- BUG FOUND: permit could be closed with open/pending shift -> FIXED (server + frontend check)

**Suite 4 - Edge Cases + UI Rendering** (8 tests): ALL PASS
- Non-existent permit returns 404, close non-existent returns error
- CMW with multiple isolation tasks (sign separately, auto-activate only when all signed)
- Double worker sign-off blocked, delete user works
- UI pages render (login, permits, scan, permit detail)

**Suite 5 - QR Scan Simulation** (6 tests): ALL PASS
- Task signature scan (signs all unsigned points via taskId)
- Shift sign-on/off scans
- Worker state verification in shift

- [x] Clean production build with no warnings
- [x] Dev server works (page rendering + API routes)

**Note**: Automated unit/integration tests (Vitest/Playwright) not written for MVP. All flows verified manually via API and build checks.

**Success Criteria**: Clean build. All edge cases handled. Bug fixes verified. **PASS**

---

## Phase 7: Summary

### What was built
Complete Spark Permit Check MVP with:
- Login system (Permit Holder by name, Worker by 6-digit ID with generated names, up to 6 users)
- Three permit types (CMW, CAP Non-Isolation, CAP Isolation) with correct lifecycle flows
- Isolation task management with per-task QR code signing (signs all unsigned points at once)
- Worker access via scan-only flow (no direct permit viewing; permit-based scan buttons on /scan page)
- Worker isolation task view/sign-off page with "Go to Permit" navigation
- Worker shift sign-on/off page with related documents
- Daily revalidation/relinquishment with full shift lifecycle
- Worker sign-on/off with history tracking
- QR code simulation (display + scan)
- Permit closure with confirmation
- Mobile-first responsive UI with Spark color scheme

### Key decisions made
- Next.js 15 with webpack (not Next.js 16/Turbopack - causes Prisma SQLite hangs)
- Prisma 6 with native SQLite engine (not Prisma 7 - requires driver adapters that block event loop)
- UUIDs for all entity IDs (prevents hot-reload collision issues)
- Zustand for UI state only (currentUser + activeQR) - all data persisted via API to SQLite

### Files modified (from scratch)
- `frontend/prisma/schema.prisma` - 6 models
- `frontend/src/lib/db.ts` - Prisma client singleton
- `frontend/src/lib/store.ts` - Zustand store
- `frontend/src/lib/types.ts` - TypeScript types
- `frontend/src/lib/constants.ts` - Labels and config
- `frontend/src/lib/names.ts` - Seeded random name generator
- `frontend/src/lib/qr-utils.ts` - QR encode/decode
- `frontend/src/lib/utils.ts` - cn() utility
- `frontend/src/app/page.tsx` - Login page
- `frontend/src/app/permits/page.tsx` - Permits list
- `frontend/src/app/permits/[id]/page.tsx` - Permit detail (largest file)
- `frontend/src/app/scan/page.tsx` - Worker scan page (permit-based buttons)
- `frontend/src/app/scan/task/page.tsx` - Worker isolation task sign-off
- `frontend/src/app/scan/permit/page.tsx` - Worker shift sign-on/off + documents
- `frontend/src/app/layout.tsx` - Root layout
- `frontend/src/app/globals.css` - Tailwind + Spark theme
- `frontend/src/components/header.tsx` - Header with user switcher
- `frontend/src/components/permit-card.tsx` - Permit card
- `frontend/src/app/api/users/route.ts` - User CRUD
- `frontend/src/app/api/permits/route.ts` - Permit list/create
- `frontend/src/app/api/permits/[id]/route.ts` - Permit detail
- `frontend/src/app/api/permits/[id]/isolation-tasks/route.ts` - Isolation tasks
- `frontend/src/app/api/permits/[id]/shifts/route.ts` - Shift lifecycle
- `frontend/src/app/api/permits/[id]/close/route.ts` - Permit closure

### Suggested next steps
- Add Playwright integration tests for full UI flow verification
- Add Vitest unit tests for name generator, QR utils, store logic
- Extract shared SessionUser type and status color mappings to reduce duplication
- Add API error handling (try/catch) for better error messages
- Consider lightweight permits list query (select only needed fields)
- Visual testing in a mobile browser emulator

---

## Out of Scope (MVP)
- Permit Holder Transfer
- Real QR code scanning (simulated per spec)
- Real user management / authentication
- Integration with Hexagon Smart Completions
