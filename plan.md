# Analysis and Plan

The request is to implement two requirements:
1. In status `isolation_pending`, need to collect 2 signatures per isolation task:
   - ISOLATED BY (Auth. Person) Electrical
   - VERIFIED BY (Auth. Person) Electrical
   (Both must be members of workers).
2. In status `daily_revalidated` and `daily_relinquished`, require signature from a new role: Permit Issuer (Prior to Permit holder).

## Requirement 1: Isolation Task Signatures
Currently, `IsolationPoint` holds `signedBy` and `signedAt`. The user signs all unsigned points of an `IsolationTask` with a single click.
But the requirement says: "need to collect 2 signatures per isolation task for ISOLATED BY... and VERIFIED BY...". This suggests we might need these 2 specific signatures *per task* instead of just signing points. Or perhaps each task needs to have exactly these two signatures.

Looking at `schema.prisma`:
`IsolationTask` has many `IsolationPoint`s.
It seems the requirement is saying we need two specific signature roles per task.

Let's refine this: Instead of signing arbitrary points, or maybe alongside it, the task itself needs two distinct signatures from workers.
Wait, right now we have `IsolationPoint` which is created by the permit holder. Maybe the requirement means that for each task, we need these 2 signatures (Isolated By, Verified By).

Let's analyze Requirement 2:
"In status `daily_revalidated` and `daily_relinquished` required signature from the new role Permit issuer (Prior to Permit holder)."
Currently, `daily_revalidated` (which corresponds to `shift_open` / open Shift) and `daily_relinquished` (which corresponds to `shift_closed` / closed Shift) are triggered when the Permit Holder signs on and signs off a shift.
The new requirement says we need a new role `permit_issuer`. Before the Permit Holder can sign on (revalidate) or sign off (relinquish), the Permit Issuer must provide their signature.

Let me explore the schema more and formulate a concrete plan.
