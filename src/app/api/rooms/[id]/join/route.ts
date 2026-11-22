import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

// POST /api/rooms/[id]/join  body: { code?: string }
// - Public room: join directly as ACTIVE.
// - Private room + valid code: join directly as ACTIVE.
// - Private room without a valid code: create a PENDING join request for
//   the owner to approve. Nothing else is revealed.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!rateLimit("join:" + session.id, 20, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const code = body && body.code ? String(body.code).trim() : undefined;

  const room = await prisma.room.findUnique({ where: { id: params.id } });
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const existing = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId: room.id, userId: session.id } },
  });
  if (existing && existing.status === "ACTIVE") {
    return NextResponse.json({ ok: true, status: "ACTIVE" });
  }
  if (existing && existing.status === "PENDING") {
    return NextResponse.json({ ok: true, status: "PENDING" });
  }

  const isOwner = room.createdById === session.id;
  const active = await prisma.roomMember.count({ where: { roomId: room.id, status: "ACTIVE" } });
  const full = active >= room.maxMembers;

  if (room.isPrivate && !isOwner && !(code && code === room.inviteCode)) {
    if (!full) {
      await prisma.roomMember.create({
        data: { roomId: room.id, userId: session.id, status: "PENDING", role: "MEMBER" },
      });
    }
    return NextResponse.json({ ok: true, status: "PENDING" });
  }

  if (full) return NextResponse.json({ error: "Room is full" }, { status: 409 });

  await prisma.roomMember.upsert({
    where: { roomId_userId: { roomId: room.id, userId: session.id } },
    update: { status: "ACTIVE" },
    create: { roomId: room.id, userId: session.id, status: "ACTIVE", role: isOwner ? "OWNER" : "MEMBER" },
  });
  return NextResponse.json({ ok: true, status: "ACTIVE" });
}
