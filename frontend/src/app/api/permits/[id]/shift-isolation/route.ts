import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// PATCH: Worker signs a ShiftIsolationConfirmation (per-shift re-confirmation)
// Body: { taskId: string, cycleNumber: number, workerId: string, type: "isolate" | "verify" }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: permitId } = await params;
    const body = await req.json();
    const { taskId, cycleNumber, workerId, type } = body as {
      taskId: string;
      cycleNumber: number;
      workerId: string;
      type: "isolate" | "verify";
    };

    if (!taskId || cycleNumber == null || !workerId || !type) {
      return NextResponse.json(
        { error: "taskId, cycleNumber, workerId, and type are required" },
        { status: 400 }
      );
    }

    const confirmation = await prisma.shiftIsolationConfirmation.findFirst({
      where: { permitId, isolationTaskId: taskId, cycleNumber },
    });

    if (!confirmation) {
      return NextResponse.json({ error: "Confirmation record not found" }, { status: 404 });
    }

    const now = new Date().toISOString();

    if (type === "isolate") {
      if (confirmation.isolatedById) return NextResponse.json({ error: "Already isolated" }, { status: 400 });
      await prisma.shiftIsolationConfirmation.update({
        where: { id: confirmation.id },
        data: { isolatedById: workerId, isolatedAt: now },
      });
    } else if (type === "verify") {
      if (confirmation.verifiedById) return NextResponse.json({ error: "Already verified" }, { status: 400 });
      await prisma.shiftIsolationConfirmation.update({
        where: { id: confirmation.id },
        data: { verifiedById: workerId, verifiedAt: now },
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to sign isolation confirmation" }, { status: 500 });
  }
}
