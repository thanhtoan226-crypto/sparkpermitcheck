import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }
  try {
    await prisma.shiftWorker.deleteMany();
    await prisma.shift.deleteMany();
    await prisma.isolationPoint.deleteMany();
    await prisma.isolationTask.deleteMany();
    await prisma.permit.deleteMany();
    await prisma.user.deleteMany();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Reset failed" }, { status: 500 });
  }
}
