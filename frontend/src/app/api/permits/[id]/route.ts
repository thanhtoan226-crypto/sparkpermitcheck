import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const permit = await prisma.permit.findUnique({
      where: { id },
      include: {
        permitHolder: true,
        permitIssuer: true,
        isolationTasks: { include: { isolatedBy: true, verifiedBy: true, isolationPoints: { include: { signer: true } } } },
        shifts: { include: { workers: { include: { user: true } } }, orderBy: { createdAt: "asc" } },
        shiftIsolationConfirmations: { include: { isolatedBy: true, verifiedBy: true }, orderBy: { cycleNumber: "asc" } },
      },
    });
    if (!permit) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(permit);
  } catch {
    return NextResponse.json({ error: "Failed to fetch permit" }, { status: 500 });
  }
}
