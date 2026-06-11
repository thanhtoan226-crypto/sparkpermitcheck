# Spark Permit Check - Implementation Plan

## Overview
Build a mobile-first digital permit execution and workforce attendance tracking platform from scratch. Next.js 16, Prisma + SQLite, Zustand for UI state only, API routes for all data persistence.

## Architecture

### Data Flow
- All data mutations go through API routes (persisted in SQLite via Prisma)
- Components fetch data via API calls (useEffect + useState, or custom hooks)
- Zustand holds ONLY: currentUser session, activeQR overlay state
- No in-memory store for permits/shifts - always read from database

### Worker Sign-on/Sign-off
- Each sign-on creates a new ShiftWorker record (full history preserved)
- UI shows worker once with latest state (signed on / signed off)
- "View History" expands to show all sign-on/sign-off timestamps

### Permit Type Flows
- CMW: draft -> isolation_pending -> active -> (shift cycle) -> closed
- CAP Non-Isolation: draft -> active -> (shift cycle) -> closed
- CAP Isolation: draft -> active -> (shift cycle) -> closed
- Shift cycle: revalidation_pending -> open -> closed -> (can start new shift)

---

## Phase 1: Project Scaffolding

### 1.1 Clean Slate
- [ ] Delete all files in frontend/ (preserve .git directory)
- [ ] Create new Next.js 16 app with App Router, TypeScript, Tailwind v4
- [ ] Install dependencies: prisma, @prisma/client, zustand, qrcode.react, lucide-react, uuid
- [ ] Install shadcn/ui CLI and add components: button, input, label, card, badge, dialog, separator, tabs, sheet

### 1.2 Configuration
- [ ] Configure Tailwind with Spark color tokens (yellow, blue, purple, navy, gray)
- [ ] Create .env with DATABASE_URL
- [ ] Create .gitignore (node_modules, .next, .env, dev.db)

### 1.3 Database
- [ ] Initialize Prisma with SQLite provider
- [ ] Define schema: User, Permit, IsolationTask, IsolationPoint, Shift, ShiftWorker
- [ ] Run initial migration
- [ ] Create db.ts singleton client

**Success Criteria**: `npx next build` succeeds. Prisma client generates. DB file exists.

---

## Phase 2: Backend - API Routes

### 2.1 User Routes
- [ ] `POST /api/users` - login/create user (Permit Holder by name, Worker by 6-digit ID with random name generation)
- [ ] `GET /api/users` - list all users
- [ ] `DELETE /api/users` - remove user by ID

### 2.2 Permit Routes
- [ ] `GET /api/permits` - list permits (with relations: holder, tasks, shifts, workers)
- [ ] `POST /api/permits` - create permit (type, title, holderId)
- [ ] `GET /api/permits/[id]` - get permit detail with all relations

### 2.3 Isolation Task Routes
- [ ] `POST /api/permits/[id]/isolation-tasks` - add task with isolation points
- [ ] `PATCH /api/permits/[id]/isolation-tasks` - sign isolation point (auto-transition to active when all signed for CMW)

### 2.4 Shift Routes
- [ ] `POST /api/permits/[id]/shifts` - handle all shift lifecycle actions:
  - start_revalidation
  - holder_sign_on
  - holder_sign_off (validates all workers signed off)
  - worker_sign_on (validates holder signed on, not duplicate active)
  - worker_sign_off

### 2.5 Closure Route
- [ ] `POST /api/permits/[id]/close` - close permit

**Success Criteria**: All routes return correct responses. Data persists in SQLite. Business rules enforced.

---

## Phase 3: Frontend - Core Pages

### 3.1 Layout & Globals
- [ ] Root layout with Geist font, metadata
- [ ] globals.css with Spark color theme variables and Tailwind v4 config

### 3.2 Login Page (`/`)
- [ ] Role toggle: Permit Holder / Worker
- [ ] Permit Holder: username input
- [ ] Worker: 6-digit number input
- [ ] Quick login for returning users (up to 6)
- [ ] Generate random name for workers using seeded random
- [ ] Store current user session in Zustand + localStorage

### 3.3 Header Component
- [ ] Logo + app name
- [ ] Current user avatar with color
- [ ] User switcher dropdown (for permit holders)
- [ ] Scan link (for workers)
- [ ] Logout (tap avatar)

### 3.4 Permits List Page (`/permits`)
- [ ] List permits for current user (holder sees own, worker sees all)
- [ ] Permit cards with type badge, status badge, title
- [ ] Create permit dialog (type selector, title input)
- [ ] Empty state with illustration

**Success Criteria**: User can login, see permits list, create a new permit, switch users.

---

## Phase 4: Frontend - Permit Detail

### 4.1 Permit Detail Page (`/permits/[id]`)
- [ ] Permit header with type badge, status badge, title
- [ ] Read-only mode when permit is closed
- [ ] Tab/section layout for Isolation, Shifts, Actions

### 4.2 Isolation Section (CMW only)
- [ ] Add Isolation Task form (task name, dynamic isolation points)
- [ ] Show tasks with signed/unsigned status per point
- [ ] "Show QR" button for unsigned points (sets activeQR in Zustand)

### 4.3 Shift Section
- [ ] Start Daily Revalidation button (when no active shift)
- [ ] Holder Sign On button (revalidation_pending -> open)
- [ ] Show Sign-On QR / Show Sign-Off QR buttons (when shift open)
- [ ] Worker list showing latest state per worker
- [ ] "View History" per worker expanding all sign-on/sign-off records
- [ ] Sign Off (Daily Relinquishment) button with validation
- [ ] Shift history: past shifts as collapsed cards below current shift

### 4.4 QR Code Display Overlay
- [ ] Modal overlay with QRCodeSVG
- [ ] Label indicating action type (Task Signature, Worker Sign-On, Worker Sign-Off)
- [ ] Close button

### 4.5 Closure Section
- [ ] Close Permit button (enabled when active or shift_closed)
- [ ] Confirmation dialog with warning

**Success Criteria**: Full permit lifecycle works for all 3 permit types. Data persists across page reloads.

---

## Phase 5: Frontend - Worker Experience

### 5.1 Scan Page (`/scan`)
- [ ] Worker-only page (redirect if not worker)
- [ ] Simulated scan button
- [ ] Reads activeQR from Zustand (set by permit holder's QR display)
- [ ] Handles: task_signature, shift_signon, shift_signoff
- [ ] Shows success/error result cards

**Success Criteria**: Worker can scan QR codes for isolation signing, shift sign-on, and shift sign-off.

---

## Phase 6: Testing

### 6.1 Unit Tests (Vitest)
- [ ] Set up Vitest with jsdom environment
- [ ] Test name generator (deterministic output for same ID)
- [ ] Test QR encode/decode utility
- [ ] Test store logic (user session, QR state)

### 6.2 Integration Tests (Playwright)
- [ ] Set up Playwright
- [ ] Test: Permit Holder login -> create permit -> add isolation task -> show QR -> sign point -> start revalidation -> sign on -> worker sign on -> worker sign off -> relinquish -> close
- [ ] Test: CMW full flow
- [ ] Test: CAP Non-Isolation flow (skips isolation)
- [ ] Test: CAP Isolation flow (skips isolation)
- [ ] Test: Worker login -> scan QR -> sign on/off
- [ ] Test: Data persists across page reload
- [ ] Test: Worker history view

**Success Criteria**: All tests pass. Core user flows verified end-to-end.

---

## Phase 7: Polish & Verification

### 7.1 Build Verification
- [ ] Clean `npx next build` with no warnings
- [ ] Verify mobile responsiveness
- [ ] Verify all 3 permit type flows work correctly

### 7.2 Edge Cases
- [ ] Cannot close permit with open shift
- [ ] Cannot sign off if not all workers signed off
- [ ] Cannot start revalidation on closed permit
- [ ] Worker cannot sign on before holder
- [ ] Maximum 6 users enforced

**Success Criteria**: Clean build. All edge cases handled. Server running and ready.

---

## Out of Scope (MVP)
- Permit Holder Transfer
- Real QR code scanning (simulated per spec)
- Real user management / authentication
- Integration with Hexagon Smart Completions
