# Spark Permit Check Project

## Backgrounds and Contexts

Across the Spark North East Link infrastructure project, mechanical, electrical, and Intelligent Transportation Systems (ITS) construction and commissioning activities require strict safety controls. To minimize field friction, reduce administrative delays, and completely transition away from paper-based tracking, this dedicated digital solution acts as a high-speed field operations middleware.

Instead of managing the entire macro-lifecycle of a permit (such as the initial permit drafting or high-level client approval workflows), this platform focuses exclusively on on-site execution, live field sign-offs, and dynamic workforce attendance tracking.

## Business Requirements

- Build platform to support on-site execution, live field sign-offs, and dynamic workforce attendance tracking, a part of a permit retrieved from an external platform (Hexagon Smart Completions).
- Focus on Mobile and Tablet versions. However, user can view in desktop mode.
- There are 2 roles: Permit Holder and Worker. The login screen provides 2 options. Permit Holder can login to the application, for mvp, mock username is sufficient. Worker can login via 6-digit number. For prototype purpose, once login, the user logo is visible on the top right, system remembers users upto 6 users.
### User flow
- There are 3 Permit Type, depending on it, each Permit will have different flow:
    - Commissioning Minor Works (CMW): Create Isolation Task -> Collect Signatures per Task -> Daily Revalidation -> Workers Sign-on / Sign-off -> Daily Relinquishment -> Closure Permit
    - Commissioning Access Permit (Non-Isolation): Daily Revalidation -> Workers Sign-on / Sign-off -> Daily Relinquishment -> Closure Permit
    - Commissioning Access Permit (Isolation): Daily Revalidation -> Workers Sign-on / Sign-off -> Daily Relinquishment -> Closure Permit

### For Permit Holder
- User can select login as Permit Holder and enter user name to login.
- User can create Isolation Task. 
- In beginning of each shift, user can collect signatures for each Task by showing QR Code for a worker to scan and click Sign On prior to open the shift (Sign on for Daily Revalidation)
- User can show QR Code for that shift to workers to sign on and sign off. User can monitor all data.
- User can close the shift (Sign off for Daily Relinquisment). Condition: All workers are signed off.
- User can close the permit by clicking on the Closure button (confirmation pop-up required). Once the permit is closed, user no longer modified the permit but can view data.

### For Worker
- User can select login as Worker and enter 6-digit number to login.
- User can scan the QR Code for signing on for an isolation task
- User can scan the QR Code for signing on and signing off for a shift.


### Permit Type Behavior
1. Commissioning Minor Works (CMW)
- Permit Holder data entry (editing Permit details)
- Isolation Record verification by one authorised personnel (authorised personnel is one selected member from the work crew)
- Permit acceptance by Permit Holder (Daily Revalidation / Daily Relinquishment )
- Permit Holder transfer

- Work Crew Sign-On / Sign-Off
2 Commissioning Access Permit (Non-Isolation)
- Permit Holder data entry
- Permit acceptance by Permit Holder (Daily Revalidation / Daily Relinquishment)
- Permit Holder transfer
- Work Crew Sign-On / Sign-Off
3. Commissioning Access Permit (Isolation)
- Permit Holder data entry
- Permit acceptance by Permit Holder (Daily Revalidation/ Daily Relinquishment)
- Permit Holder transfer
- Work Crew Sign-On / Sign-Off

## Core Functional Scope
The platform provides a highly optimized, mobile-first interface designed to digitize and manage five critical field operational milestones:
### Isolation Task Verification (Lockout/LOTO):
- Provide a place for Permit Holder to create Task, including task name, multiple isolation points. Show QR code for worker to scan and sign on.
- Provide a place for worker (in charge) to scan and sign on. Worker (in charge): the login user scanning the QR Code. For MVP, any worker scanning the QR can sign (simplified from "one authorised personnel").
### Daily Revalidation (Sign-on): 
- Permit Holder sign on prior to generate QR Code for workers to scan to sign on and sign off
### Daily Relinquishment (Sign-off):
- Permit Holder signs off to close the shift. All workers must have signed off before the Permit Holder can relinquish. After relinquishment, the shift is closed and workers can no longer sign on or off.

### Worker Sign on / Worker Sign off
Worker scans QR Code to sign on / sign off during the working time. Can be sign on / sign off multiple times

## MVP
- User no need to scan a real QR code. Simulate process by displaying a Scan button.
- Once user logging in using username (Permit holder) or 6-digit number (Worker), randomly make up user's full name, display in the UI with the 6-digit number or user name, and store user information in database. So end-user can switch between accounts by selecting a down arrow icon next to the avatar on the top right.
- Permit Holder Transfer is out of scope for MVP.
- Each sign-on creates a history record. UI shows worker once with latest state, with option to view full history.

## Technical Details

- Implemented as a modern NextJS app, client rendered
- The NextJS app should be created in a subdirectory `frontend`
- No user management for the MVP
- Use popular libraries
- As simple as possible but with an elegant UI
- Must have database to store data

## Color Scheme

- Accent Yellow: `#ecad0a` - accent lines, highlights
- Blue Primary: `#209dd7` - links, key sections
- Purple Secondary: `#753991` - submit buttons, important actions
- Dark Navy: `#032147` - main headings
- Gray Text: `#888888` - supporting text, labels

## Strategy

1. Write plan with success criteria for each phase to be checked off. Include project scaffolding, including .gitignore, and rigorous unit testing.
2. Execute the plan ensuring all critiera are met
3. Carry out extensive integration testing with Playwright or similar, fixing defects
4. Only complete when the MVP is finished and tested, with the server running and ready for the user

## Coding standards

1. Use latest versions of libraries and idiomatic approaches as of today
2. Keep it simple - NEVER over-engineer, ALWAYS simplify, NO unnecessary defensive programming. No extra features - focus on simplicity.
3. Be concise. Keep README minimal. IMPORTANT: no emojis ever

## Project Structure
sparkpermitcheck/
├── CLAUDE.md
├── tasks/
│   └── plan.md
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
│   │   │   ├── scan/page.tsx   # Worker scan
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
│   │       ├── qr-utils.ts     # QR encode/decode
│   │       └── utils.ts        # cn() utility
│   ├── package.json
│   └── .env                    # DATABASE_URL