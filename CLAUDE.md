# Spark Permit Check Project

## Backgrounds and Contexts

Across the Spark North East Link infrastructure project, mechanical, electrical, and Intelligent Transportation Systems (ITS) construction and commissioning activities require strict safety controls. To minimize field friction, reduce administrative delays, and completely transition away from paper-based tracking, this dedicated digital solution acts as a high-speed field operations middleware.

Instead of managing the entire macro-lifecycle of a permit (such as the initial permit drafting or high-level client approval workflows), this platform focuses exclusively on on-site execution, live field sign-offs, and dynamic workforce attendance tracking.

## Functional Requirements

The platform supports on-site execution, live field sign-offs, and dynamic workforce attendance tracking for permits retrieved from an external platform (Hexagon Smart Completions).

### Permit Type Flows
Three permit types determine the workflow. The type is a display label on the permit; CAP (Non-Isolation) and CAP (Isolation) have identical flows.
- CMW: Create Isolation Task -> Collect Signatures per Task -> Daily Revalidation -> Workers Sign-on / Sign-off -> Daily Relinquishment -> Close Permit
- CAP (Non-Isolation): Daily Revalidation -> Workers Sign-on / Sign-off -> Daily Relinquishment -> Close Permit
- CAP (Isolation): Daily Revalidation -> Workers Sign-on / Sign-off -> Daily Relinquishment -> Close Permit

### Permit Holder Use Cases
1. **Login**: Log in with a username. System stores the session for quick-switching.
2. **Create Permit**: Create a new permit by selecting type (CMW, CAP Non-Isolation, CAP Isolation) and entering a title. Permit holder is automatically assigned.
3. **Create Isolation Task** (CMW only): Create tasks with a name and multiple isolation points. User can generates a QR code for workers to scan and sign off all unsigned tasks.
4. **Daily Revalidation (Shift Start)**: Sign on to begin a new shift. This opens the shift so workers can sign on. A QR code is displayed for workers to scan.
5. **Monitor Worker Attendance**: View all workers currently signed on or off for the active shift. Each worker shows their latest state with expandable sign-on/off history.
6. **Daily Relinquishment (Shift Close)**: Close the current shift. All workers must be signed off before the permit holder can relinquish. Once closed, workers can no longer sign on or off.
7. **Close Permit**: Close the permit with a confirmation prompt. All shifts must be closed first. Once closed, the permit becomes read-only but data remains viewable.
8. **View Permit History**: View past shifts and worker records for any permit, including closed permits.
9. **View Shift History**: On the permit detail page, a dedicated Shift History card shows all closed shifts with their shift number, date, start time, end time, and worker count. Only closed shifts appear here; the active/current shift is shown separately in the Current Shift section.

### Worker Use Cases
1. **Login**: Log in with a 6-digit worker ID. System generates a random full name and stores the session.
2. **Scan to Access Permits**: The Scan page shows all permits. Tapping a permit button routes based on its status:
   - `draft` (CMW only) → Inline error: permit not ready
   - `isolation_pending` (CMW) → Isolation task sign-off page
   - `active` / `shift_open` → Shift sign-on/off page
   - `shift_closed` / `closed` → Inline error: cannot access
   Workers cannot directly navigate to permit detail pages; they access only via the Scan page.
3. **Sign Off Isolation Task** (CMW only): Navigate via [Isolation task for {permit name}] button. View all isolation tasks and sign off unsigned tasks. After signing, a [Go to Permit] button navigates to the shift sign-on/off page.
4. **Sign On to Shift**: Navigate via [Permit {permit name}] button. Sign on to the current shift when it is open. Can sign on and off multiple times per shift.
5. **Sign Off from Shift**: Sign off from the current shift. The sign-off button is only enabled when the worker is currently signed on.
6. **View Related Documents**: From the shift sign-on/off page, access related safety documents as clickable hyperlinks (e.g., Safety Procedures, Isolation Procedures, Emergency Response Plans, Work Method Statements, Risk Assessments).

### Business Rules
- Workers cannot directly view or navigate to permit detail pages; they access only via the Scan page.
- Each sign-on creates a history record. UI shows each worker once with their latest state, with an option to expand full history.
- Shift start time is recorded when the permit holder signs on (Daily Revalidation). Shift end time is recorded when the permit holder signs off (Daily Relinquishment).
- Permit Holder Transfer is out of scope for MVP.
- QR code scanning is simulated via buttons for MVP (no real QR scanning required).
- Always show the latest sign-off or sign-on for Isolation task, Daily Revalidation, Daily Relinquishment, Worker's sign-ons, Worker's sign-offs.
- User can only revalidate permit when all isolation tasks' signatures are collected.
- User can only close permit when all the permit is relinquished.

### Permit Statuses

CMW flow:
```
                        ┌────── Daily Revalidation (Starts Shift) ──────────┐
                        │                                                   │
[draft] ──> [isolation_pending] ──> [active] ──> [daily_revalidated] ──> [daily_relinquished] ──> [closed]
```

CAP (Non-Isolation) and CAP (Isolation) flow:
```
                          ┌───── Daily Revalidation (Starts Shift) ───────┐
                          │                                               │
                       [active] ──> [daily_revalidated] ──> [daily_relinquished] ──> [closed]
```

Status descriptions:
- `draft`: CMW only. Permit created, isolation tasks not yet added.
- `isolation_pending`: CMW only. Isolation tasks exist; workers need to sign off all points.
- `active`: All isolation signed (CMW) or initial state (CAP). Revalidation can begin.
- `daily_revalidated`: Permit holder has signed on (Revalidate permit); workers can sign on/off. Display label: "Daily Revalidated".
- `daily_relinquished`: Permit holder has signed off (Relinquish permit). Shift ended. Display label: "Daily Relinquished".
- `closed`: Permit holder has closed the permit. Read-only.

### Permit section hierarchy
For Permit Holder
- Permit details (name, status, permit holder, etc.)
- Isolation tasks (if CMW)
- Daily Revalidation, Daily Relinquishment. Button [View current shift], [view history] => Redirect to detail page.
- Documents

For Worker
- Permit details (name, status, permit holder, etc.)
- Isolation tasks (if CMW)
- Documents

## Non-Functional Requirements

- **Mobile-first responsive design**: Primary targets are mobile and tablet; desktop is viewable but secondary.
- **Performance**: Fast load times for field use. No heavy client-side computation. Database queries must be efficient.
- **Data persistence**: All data stored in SQLite via Prisma. No data loss on server restart.
- **Session management**: System remembers up to 6 users for quick account switching via header avatar dropdown.
- **Offline resilience**: Not required for MVP. Assumes reliable on-site connectivity.
- **Security**: No authentication for MVP. Role-based access enforced on frontend only (route guards). API routes do not enforce auth.
- **Accessibility**: Touch-friendly targets (minimum 44px). Clear visual states for sign-on/off. High-contrast color scheme per project palette.
- **Browser support**: Modern evergreen browsers (Chrome, Safari, Edge). No IE11 support.
- **Maintainability**: Minimal dependencies. Use popular, well-maintained libraries. Simple codebase structure with clear separation of concerns.

## MVP Scope
- QR code scanning simulated via buttons (no real QR scanning required).
- User names are randomly generated on login. System stores sessions for quick account switching (up to 6 users via header avatar dropdown).
- Permit Holder Transfer is out of scope.
- No real authentication or user management.
- Display random 1 - 3 document hyperlinks in documents section. Click to open a new blank tab.

## Technical Details

- Next.js 15 app (webpack, not Turbopack — Turbopack has issues with Prisma SQLite), client rendered
- Prisma 6 with native SQLite engine (Prisma 7 requires driver adapters that block event loop)
- App lives in `frontend/` subdirectory
- Zustand for client-side UI state only (no server state management)
- shadcn/ui components; uses `render` prop for element composition (not `asChild`)

## Color Scheme

- Accent Yellow: `#ecad0a` - accent lines, highlights
- Blue Primary: `#209dd7` - links, key sections
- Purple Secondary: `#753991` - submit buttons, important actions
- Dark Navy: `#032147` - main headings
- Gray Text: `#888888` - supporting text, labels

## Strategy

1. Write plan with success criteria for each phase to be checked off. Include project scaffolding and .gitignore.
2. Execute the plan ensuring all criteria are met.
3. Carry out integration testing with Playwright or similar, fixing defects.
4. Only complete when the MVP is finished and tested, with the server running and ready for the user.

## Coding standards

1. Use latest versions of libraries and idiomatic approaches as of today
2. Keep it simple - NEVER over-engineer, ALWAYS simplify, NO unnecessary defensive programming. No extra features - focus on simplicity.
3. Be concise. Keep README minimal. IMPORTANT: no emojis ever

## Project Structure
sparkpermitcheck/
├── CLAUDE.md
├── tasks/
│   └── plan(archived).md
├── frontend/                    # Next.js app
│   ├── prisma/
│   │   └── schema.prisma       # Database schema
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/
│   │   │   │   ├── users/route.ts
│   │   │   │   ├── permits/route.ts
│   │   │   │   └── permits/[id]/
│   │   │   │       ├── route.ts
│   │   │   │       ├── isolation-tasks/route.ts
│   │   │   │       ├── shifts/route.ts
│   │   │   │       └── close/route.ts
│   │   │   ├── page.tsx        # Login
│   │   │   ├── permits/
│   │   │   │   ├── page.tsx    # Permits list
│   │   │   │   └── [id]/page.tsx  # Permit detail
│   │   │   ├── scan/page.tsx   # Worker scan (permit-based buttons)
│   │   │   ├── scan/task/page.tsx    # Worker isolation task sign-off
│   │   │   ├── scan/permit/page.tsx  # Worker shift sign-on/off + documents
│   │   │   ├── layout.tsx
│   │   │   └── globals.css
│   │   ├── components/
│   │   │   ├── header.tsx
│   │   │   ├── permit-card.tsx
│   │   │   └── ui/             # shadcn components
│   │   └── lib/
│   │       ├── db.ts           # Prisma client
│   │       ├── store.ts        # Zustand (UI state only)
│   │       ├── types.ts
│   │       ├── constants.ts
│   │       ├── names.ts        # Random name generator
│   │       └── utils.ts        # cn() utility
│   ├── package.json
│   └── .env                    # DATABASE_URL