# Plan: Spark Permit Check Updates

## 1. Database Schema Changes
- [ ] Modify `schema.prisma`:
  - Change `User` role comment from `permit_holder` to `spark_user`.
  - In `Permit` model, add `permitIssuerId` and a relation to `User` (name: `issuedPermits`). Keep `permitHolderId` (name: `heldPermits`).
  - In `User` model, add `issuedPermits Permit[] @relation("PermitIssuer")` and update `permits` to `@relation("PermitHolder")`.
  - In `IsolationTask` model, add `isolatedById String?` and `verifiedById String?`, along with relations to `User` for both. Add `isolatedAt String?` and `verifiedAt String?`.
  - In `Shift` model, add `permitIssuerSignedOn Boolean @default(false)` and `permitIssuerSignedOff Boolean @default(false)`.
  - In `ShiftIsolationConfirmation` model, maybe we need two signatures per cycle too? The requirement says "In status isolation_pending need to collect 2 signatures per isolation task". Let's update `ShiftIsolationConfirmation` to have `isolatedById` and `verifiedById` instead of `signedBy`.
- [ ] Reset database (`npx prisma db push --force-reset` or similar) to apply changes safely since it's dev.

## 2. API Updates
- [ ] `api/users/route.ts`: Change role assignment from `permit_holder` to `spark_user`.
- [ ] `api/permits/route.ts`:
  - Fetch list of all `spark_user`s for the Create Permit form.
  - When creating a permit, set `permitIssuerId` to the current user, and `permitHolderId` from the form payload.
- [ ] `api/permits/[id]/route.ts`:
  - Include `permitIssuer` in the fetched data.
  - Update `isolationTasks` includes to fetch `isolatedBy` and `verifiedBy`.
  - Update `shiftIsolationConfirmations` includes similarly.
- [ ] `api/permits/[id]/isolation-tasks/route.ts`:
  - Update `PATCH` to support `type: "isolate" | "verify"`.
  - Check if both `isolatedById` and `verifiedById` are filled for all tasks to transition to `active`.
- [ ] `api/permits/[id]/shift-isolation/route.ts`:
  - Update `PATCH` to support `type: "isolate" | "verify"`.
- [ ] `api/permits/[id]/shifts/route.ts`:
  - Add actions: `issuer_sign_on`, `issuer_sign_off`.
  - Require `issuer_sign_on` before `holder_sign_on` (or handle it sequentially).
  - Require `issuer_sign_off` before `holder_sign_off`.

## 3. Frontend Updates
- [ ] `page.tsx` (Login): Update UI text from "Permit Holder" to "Spark User".
- [ ] `permits/page.tsx`:
  - Update Create Permit dialog to include a "Select Permit Holder" dropdown.
  - The dropdown should list all users with role `spark_user` except the current user (or include them if they can be both).
- [ ] `permits/[id]/page.tsx`:
  - Update the "Current Shift" section.
  - Show "Permit Issuer Sign On" button if current user is the issuer and hasn't signed on.
  - Show "Permit Holder Sign On" button if current user is the holder, issuer HAS signed on, and holder hasn't.
  - Similar logic for Sign Off.
- [ ] `scan/task/page.tsx`:
  - Update the Isolation Task cards to show two buttons: "Sign as Isolated By" and "Sign as Verified By".
  - Allow a worker to sign one or both.
- [ ] `components/header.tsx` & `lib/constants.ts` & `lib/types.ts`: Update any role checks and typings.

## 4. Verification
- [ ] Run dev server.
- [ ] Test login as Spark User.
- [ ] Test creating a permit and selecting another Spark User as holder.
- [ ] Test worker signing tasks as Isolate and Verify.
- [ ] Test shift revalidation (Issuer signs, then Holder signs).
- [ ] Test shift relinquishment (Issuer signs, then Holder signs).
