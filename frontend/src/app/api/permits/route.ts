import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const isList = req.nextUrl.searchParams.get("list") === "true";

    if (isList) {
      const permits = await prisma.permit.findMany({
        select: {
          id: true,
          type: true,
          title: true,
          status: true,
          permitHolderId: true,
          createdAt: true,
        },
        orderBy: { id: "desc" },
      });
      return NextResponse.json(permits);
    }

    const permits = await prisma.permit.findMany({
      include: {
        permitHolder: true,
        permitIssuer: true,
        isolationTasks: { include: { isolatedBy: true, verifiedBy: true, isolationPoints: { include: { signer: true } } } },
        shifts: { include: { workers: { include: { user: true } } }, orderBy: { id: "asc" } },
        shiftIsolationConfirmations: { include: { isolatedBy: true, verifiedBy: true }, orderBy: { cycleNumber: "asc" } },
      },
      orderBy: { id: "desc" },
    });
    return NextResponse.json(permits);
  } catch {
    return NextResponse.json({ error: "Failed to fetch permits" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, title, holderId, issuerId } = body as { type: string; title: string; holderId: string; issuerId: string };

    if (!title?.trim() || !holderId || !issuerId) {
      return NextResponse.json({ error: "Title, holderId, and issuerId required" }, { status: 400 });
    }

    const initialStatus = type === "CMW" ? "draft" : "active";

    const permit = await prisma.permit.create({
      data: {
        id: uuidv4(),
        type,
        title: title.trim(),
        status: initialStatus,
        permitHolderId: holderId,
        permitIssuerId: issuerId,
        createdAt: new Date().toISOString(),
      },
      include: {
        permitHolder: true,
        permitIssuer: true,
        isolationTasks: { include: { isolationPoints: true } },
        shifts: { include: { workers: { include: { user: true } } } },
      },
    });
    return NextResponse.json(permit);
  } catch {
    return NextResponse.json({ error: "Failed to create permit" }, { status: 500 });
  }
}
