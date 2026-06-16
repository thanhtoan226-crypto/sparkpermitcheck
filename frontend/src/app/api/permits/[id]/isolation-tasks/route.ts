import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "@/lib/db";

// POST: Add an isolation task (status stays "draft" — holder must confirm separately)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: permitId } = await params;
    const body = await req.json();
    const { taskName, pointNames } = body as { taskName: string; pointNames: string[] };

    if (!taskName?.trim() || !pointNames?.length) {
      return NextResponse.json({ error: "Task name and points required" }, { status: 400 });
    }

    const permit = await prisma.permit.findUnique({ where: { id: permitId } });
    if (!permit) return NextResponse.json({ error: "Permit not found" }, { status: 404 });
    if (permit.status !== "draft") {
      return NextResponse.json({ error: "Tasks can only be added while permit is in draft" }, { status: 400 });
    }

    const task = await prisma.isolationTask.create({
      data: {
        id: uuidv4(),
        name: taskName.trim(),
        permitId,
        isolationPoints: {
          create: pointNames.filter(Boolean).map((name) => ({
            id: uuidv4(),
            name: name.trim(),
          })),
        },
      },
      include: { isolationPoints: { include: { signer: true } } },
    });

    // Status stays "draft" — no automatic transition

    return NextResponse.json(task);
  } catch {
    return NextResponse.json({ error: "Failed to create isolation task" }, { status: 500 });
  }
}

// PUT: Confirm tasks or start signature collection for re-confirmation cycle
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: permitId } = await params;
    const body = await req.json();
    const { action, cycleNumber } = body as { action: string; cycleNumber?: number };

    if (action === "confirm_tasks") {
      const permit = await prisma.permit.findUnique({
        where: { id: permitId },
        include: { isolationTasks: { include: { isolationPoints: true } } },
      });
      if (!permit) return NextResponse.json({ error: "Permit not found" }, { status: 404 });
      if (permit.status !== "draft") {
        return NextResponse.json({ error: "Permit is not in draft status" }, { status: 400 });
      }
      if (permit.isolationTasks.length === 0) {
        return NextResponse.json({ error: "Add at least one isolation task before confirming" }, { status: 400 });
      }
      const hasPoints = permit.isolationTasks.every((t) => t.isolationPoints.length > 0);
      if (!hasPoints) {
        return NextResponse.json({ error: "All tasks must have at least one isolation point" }, { status: 400 });
      }

      await prisma.permit.update({
        where: { id: permitId },
        data: { status: "isolation_pending" },
      });

      return NextResponse.json({ ok: true });
    }

    if (action === "start_collect_signatures") {
      if (cycleNumber == null || cycleNumber < 1) {
        return NextResponse.json({ error: "Invalid cycle number" }, { status: 400 });
      }

      const permit = await prisma.permit.findUnique({
        where: { id: permitId },
        include: { isolationTasks: true },
      });
      if (!permit) return NextResponse.json({ error: "Permit not found" }, { status: 404 });
      if (permit.type !== "CMW") {
        return NextResponse.json({ error: "Only CMW permits use isolation tasks" }, { status: 400 });
      }

      // Idempotent: skip if rows already exist for this cycle
      const existing = await prisma.shiftIsolationConfirmation.count({
        where: { permitId, cycleNumber },
      });
      if (existing > 0) {
        return NextResponse.json({ ok: true });
      }

      await prisma.shiftIsolationConfirmation.createMany({
        data: permit.isolationTasks.map((task) => ({
          id: uuidv4(),
          permitId,
          isolationTaskId: task.id,
          cycleNumber,
          signedBy: null,
          signedAt: null,
        })),
      });

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Failed to process isolation task action" }, { status: 500 });
  }
}

// PATCH: Sign isolation task (initial one-time signing)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: permitId } = await params;
    const body = await req.json();
    const { taskId, workerId, type } = body as { taskId: string; workerId: string; type: "isolate" | "verify" };

    const task = await prisma.isolationTask.findUnique({
      where: { id: taskId },
    });
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const now = new Date().toISOString();

    if (type === "isolate") {
      if (task.isolatedById) return NextResponse.json({ error: "Task already isolated" }, { status: 400 });
      await prisma.isolationTask.update({
        where: { id: taskId },
        data: { isolatedById: workerId, isolatedAt: now },
      });
    } else if (type === "verify") {
      if (task.verifiedById) return NextResponse.json({ error: "Task already verified" }, { status: 400 });
      await prisma.isolationTask.update({
        where: { id: taskId },
        data: { verifiedById: workerId, verifiedAt: now },
      });
    } else {
      return NextResponse.json({ error: "Invalid signature type" }, { status: 400 });
    }

    const permit = await prisma.permit.findUnique({
      where: { id: permitId },
      include: { isolationTasks: true },
    });

    if (permit?.type === "CMW" && permit.isolationTasks.length > 0) {
      const allSigned = permit.isolationTasks.every((t) =>
        t.isolatedById !== null && t.verifiedById !== null
      );
      if (allSigned) {
        await prisma.permit.update({ where: { id: permitId }, data: { status: "active" } });
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to sign isolation task" }, { status: 500 });
  }
}
