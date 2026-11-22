import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

function canManage(roomOwnerById: string, roomId: string, userId: string): Promise<boolean> {
  if (roomOwnerById === userId) return Promise.resolve(true);
  return prisma.roomMember
    .findUnique({ where: { roomId_userId: { roomId: roomId, userId: userId } } })
    .then(function (me) {
      return !!me && me.role !== "MEMBER";
    });
}

// GET /api/rooms/[id]/requests -> owner/admin: list pending join requests
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const room = await prisma.room.findUnique({ where: { id: params.id } });
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  if (!(await canManage(room.createdById, room.id, session.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const requests = await prisma.roomMember.findMany({
    where: { roomId: room.id, status: "PENDING" },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { joinedAt: "asc" },
  });
  return NextResponse.json({ requests: requests });
}

// POST /api/rooms/[id]/requests body: { userId, action: "approve" | "deny" }
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const room = await prisma.room.findUnique({ where: { id: params.id } });
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  if (!(await canManage(room.createdById, room.id, session.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const targetUserId = String((body && body.userId) || "");
  const action = String((body && body.action) || "");
  if (!targetUserId || ["approve", "deny"].indexOf(action) < 0) {
    return NextResponse.json({ error: "userId and action required" }, { status: 400 });
  }

  const membership = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId: room.id, userId: targetUserId } },
  });
  if (!membership || membership.status !== "PENDING") {
    return NextResponse.json({ error: "No pending request from this user" }, { status: 404 });
  }

  if (action === "approve") {
    const active = await prisma.roomMember.count({ where: { roomId: room.id, status: "ACTIVE" } });
    if (active >= room.maxMembers) {
      return NextResponse.json({ error: "Room is full" }, { status: 409 });
    }
    await prisma.roomMember.update({ where: { id: membership.id }, data: { status: "ACTIVE" } });
  } else {
    await prisma.roomMember.delete({ where: { id: membership.id } });
  }
  return NextResponse.json({ ok: true });
}
