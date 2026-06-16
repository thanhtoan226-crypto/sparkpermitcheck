import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "@/lib/db";

type ShiftAction =
  | { action: "issuer_sign_on" }
  | { action: "holder_sign_on"; shiftId: string }
  | { action: "issuer_sign_off"; shiftId: string }
  | { action: "holder_sign_off"; shiftId: string }
  | { action: "worker_sign_on"; shiftId: string; workerId: string }
  | { action: "worker_sign_off"; shiftId: string; workerId: string };

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: permitId } = await params;
    const body = (await req.json()) as ShiftAction;

    switch (body.action) {
      case "issuer_sign_on": {
        const permit = await prisma.permit.findUnique({
          where: { id: permitId },
          include: {
            isolationTasks: true,
            shifts: true,
          },
        });
        if (!permit || permit.status === "closed") {
          return NextResponse.json({ error: "Cannot start revalidation" }, { status: 400 });
        }

        if (permit.type === "CMW") {
          const closedShiftCount = permit.shifts.filter((s) => s.status === "closed").length;

          if (closedShiftCount === 0) {
            const allSigned =
              permit.isolationTasks.length > 0 &&
              permit.isolationTasks.every((t) =>
                t.isolatedById !== null && t.verifiedById !== null
              );
            if (!allSigned) {
              return NextResponse.json(
                { error: "All isolation tasks must be signed first" },
                { status: 400 }
              );
            }
          } else {
            const cycleNumber = closedShiftCount;
            const confirmations = await prisma.shiftIsolationConfirmation.findMany({
              where: { permitId, cycleNumber },
            });
            const allConfirmed =
              confirmations.length > 0 &&
              confirmations.every((c) => c.isolatedById !== null && c.verifiedById !== null);
            if (!allConfirmed) {
              return NextResponse.json(
                { error: "All isolation tasks must be re-confirmed for this cycle" },
                { status: 400 }
              );
            }
          }
        }

        const now = new Date().toISOString();
        await prisma.shift.create({
          data: {
            id: uuidv4(),
            date: now.split("T")[0],
            status: "revalidation_pending",
            permitIssuerSignedOn: true,
            createdAt: now,
            permitId,
          },
        });
        // We don't update permit status yet, wait for holder
        return NextResponse.json({ ok: true });
      }

      case "holder_sign_on": {
        const shift = await prisma.shift.findUnique({ where: { id: body.shiftId } });
        if (!shift) return NextResponse.json({ error: "Shift not found" }, { status: 404 });
        if (!shift.permitIssuerSignedOn) {
          return NextResponse.json({ error: "Issuer must sign on first" }, { status: 400 });
        }

        const now = new Date().toISOString();
        await prisma.shift.update({
          where: { id: body.shiftId },
          data: {
            permitHolderSignedOn: true,
            status: "open",
            startedAt: now,
          },
        });
        await prisma.permit.update({ where: { id: permitId }, data: { status: "shift_open" } });
        return NextResponse.json({ ok: true });
      }

      case "issuer_sign_off": {
        const shift = await prisma.shift.findUnique({
          where: { id: body.shiftId },
          include: { workers: true },
        });
        if (!shift) return NextResponse.json({ error: "Shift not found" }, { status: 404 });

        const activeWorkers = shift.workers.filter((w) => w.signedOffAt === null);
        if (activeWorkers.length > 0) {
          return NextResponse.json(
            { error: "All workers must sign off before relinquishment" },
            { status: 400 }
          );
        }

        await prisma.shift.update({
          where: { id: body.shiftId },
          data: { permitIssuerSignedOff: true },
        });
        return NextResponse.json({ ok: true });
      }

      case "holder_sign_off": {
        const shift = await prisma.shift.findUnique({
          where: { id: body.shiftId },
        });
        if (!shift) return NextResponse.json({ error: "Shift not found" }, { status: 404 });
        if (!shift.permitIssuerSignedOff) {
          return NextResponse.json({ error: "Issuer must sign off first" }, { status: 400 });
        }

        await prisma.shift.update({
          where: { id: body.shiftId },
          data: { permitHolderSignedOff: true, status: "closed", endedAt: new Date().toISOString() },
        });
        await prisma.permit.update({ where: { id: permitId }, data: { status: "shift_closed" } });

        return NextResponse.json({ ok: true });
      }

      case "worker_sign_on": {
        const shift = await prisma.shift.findUnique({
          where: { id: body.shiftId },
          include: { workers: true },
        });
        if (!shift) return NextResponse.json({ error: "Shift not found" }, { status: 404 });
        if (shift.status !== "open") {
          return NextResponse.json({ error: "Shift is not open for sign-on" }, { status: 400 });
        }

        const alreadyOn = shift.workers.find(
          (w) => w.userId === body.workerId && w.signedOffAt === null
        );
        if (alreadyOn) {
          return NextResponse.json({ error: "Worker already signed on" }, { status: 400 });
        }

        await prisma.shiftWorker.create({
          data: {
            id: uuidv4(),
            userId: body.workerId,
            signedOnAt: new Date().toISOString(),
            shiftId: body.shiftId,
          },
        });
        return NextResponse.json({ ok: true });
      }

      case "worker_sign_off": {
        const shift = await prisma.shift.findUnique({ where: { id: body.shiftId } });
        if (!shift) return NextResponse.json({ error: "Shift not found" }, { status: 404 });
        if (shift.status !== "open") {
          return NextResponse.json({ error: "Shift is not open for sign-off" }, { status: 400 });
        }
        const worker = await prisma.shiftWorker.findFirst({
          where: { userId: body.workerId, shiftId: body.shiftId, signedOffAt: null },
        });
        if (!worker) {
          return NextResponse.json({ error: "No active sign-on found" }, { status: 400 });
        }
        await prisma.shiftWorker.update({
          where: { id: worker.id },
          data: { signedOffAt: new Date().toISOString() },
        });
        return NextResponse.json({ ok: true });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Failed to process shift action" }, { status: 500 });
  }
}
