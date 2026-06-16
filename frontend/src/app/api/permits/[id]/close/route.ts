import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const permit = await prisma.permit.findUnique({
      where: { id },
      include: { shifts: true },
    });
    if (!permit) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (permit.status !== "active" && permit.status !== "shift_closed") {
      return NextResponse.json({ error: "Permit must be active or shift closed to close" }, { status: 400 });
    }

    const openShifts = permit.shifts.filter((s) => s.status !== "closed");
    if (openShifts.length > 0) {
      return NextResponse.json({ error: "All shifts must be closed before closing permit" }, { status: 400 });
    }

    await prisma.permit.update({
      where: { id },
      data: { status: "closed", closedAt: new Date().toISOString() },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to close permit" }, { status: 500 });
  }
}
