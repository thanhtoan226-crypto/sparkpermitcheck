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

// PUT: Confirm tasks — permit holder explicitly transitions draft → isolation_pending
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: permitId } = await params;
    const body = await req.json();
    const { action } = body as { action: string };

    if (action !== "confirm_tasks") {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

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
  } catch {
    return NextResponse.json({ error: "Failed to confirm tasks" }, { status: 500 });
  }
}

// PATCH: Sign isolation points (initial one-time signing, preserves history)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: permitId } = await params;
    const body = await req.json();
    const { taskId, workerId } = body as { taskId: string; workerId: string };

    const task = await prisma.isolationTask.findUnique({
      where: { id: taskId },
      include: { isolationPoints: true },
    });
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const now = new Date().toISOString();
    const unsignedPoints = task.isolationPoints.filter((pt) => pt.signedBy === null);

    if (unsignedPoints.length === 0) {
      return NextResponse.json({ error: "All points already signed" }, { status: 400 });
    }

    await prisma.$transaction(
      unsignedPoints.map((pt) =>
        prisma.isolationPoint.update({
          where: { id: pt.id },
          data: { signedBy: workerId, signedAt: now },
        })
      )
    );

    const permit = await prisma.permit.findUnique({
      where: { id: permitId },
      include: { isolationTasks: { include: { isolationPoints: true } } },
    });

    if (permit?.type === "CMW" && permit.isolationTasks.length > 0) {
      const allSigned = permit.isolationTasks.every((t) =>
        t.isolationPoints.every((pt) => pt.signedBy !== null)
      );
      if (allSigned) {
        await prisma.permit.update({ where: { id: permitId }, data: { status: "active" } });
      }
    }

    return NextResponse.json({ ok: true, signedCount: unsignedPoints.length });
  } catch {
    return NextResponse.json({ error: "Failed to sign isolation task" }, { status: 500 });
  }
}
