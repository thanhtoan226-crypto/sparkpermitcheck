import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// PATCH: Worker signs a ShiftIsolationConfirmation (per-shift re-confirmation)
// Body: { taskId: string, cycleNumber: number, workerId: string }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: permitId } = await params;
    const body = await req.json();
    const { taskId, cycleNumber, workerId } = body as {
      taskId: string;
      cycleNumber: number;
      workerId: string;
    };

    if (!taskId || cycleNumber == null || !workerId) {
      return NextResponse.json(
        { error: "taskId, cycleNumber, and workerId are required" },
        { status: 400 }
      );
    }

    const confirmation = await prisma.shiftIsolationConfirmation.findFirst({
      where: { permitId, isolationTaskId: taskId, cycleNumber },
    });

    if (!confirmation) {
      return NextResponse.json({ error: "Confirmation record not found" }, { status: 404 });
    }

    if (confirmation.signedBy !== null) {
      return NextResponse.json({ error: "Already signed" }, { status: 400 });
    }

    await prisma.shiftIsolationConfirmation.update({
      where: { id: confirmation.id },
      data: { signedBy: workerId, signedAt: new Date().toISOString() },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to sign isolation confirmation" }, { status: 500 });
  }
}
