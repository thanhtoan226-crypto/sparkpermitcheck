import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "@/lib/db";
import { generateName } from "@/lib/names";
import { AVATAR_COLORS, MAX_USERS } from "@/lib/constants";

export async function GET() {
  try {
    const users = await prisma.user.findMany({ orderBy: { id: "asc" } });
    return NextResponse.json(users);
  } catch {
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { role, name } = body as { role: string; name: string };

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const value = name.trim();

    if (role === "worker") {
      if (!/^\d{6}$/.test(value)) {
        return NextResponse.json({ error: "Worker ID must be a 6-digit number" }, { status: 400 });
      }
      const existing = await prisma.user.findFirst({ where: { role: "worker", workerId: value } });
      if (existing) return NextResponse.json(existing);

      const count = await prisma.user.count();
      if (count >= MAX_USERS) {
        return NextResponse.json({ error: `Maximum ${MAX_USERS} users reached. Remove a user first.` }, { status: 400 });
      }

      const fullName = generateName(value);
      const user = await prisma.user.create({
        data: { id: uuidv4(), role: "worker", name: fullName, avatarColor: AVATAR_COLORS[count % AVATAR_COLORS.length], workerId: value },
      });
      return NextResponse.json(user);
    }

    const existing = await prisma.user.findFirst({ where: { role: "spark_user", name: value } });
    if (existing) return NextResponse.json(existing);

    const count = await prisma.user.count();
    if (count >= MAX_USERS) {
      return NextResponse.json({ error: `Maximum ${MAX_USERS} users reached. Remove a user first.` }, { status: 400 });
    }

    const user = await prisma.user.create({
      data: { id: uuidv4(), role: "spark_user", name: value, avatarColor: AVATAR_COLORS[count % AVATAR_COLORS.length] },
    });
    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId } = body as { userId: string };
    await prisma.user.delete({ where: { id: userId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
