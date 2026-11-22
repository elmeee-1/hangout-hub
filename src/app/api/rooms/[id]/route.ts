import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

// GET /api/rooms/[id]
// Privacy rules:
// - A private room returns 404 to anyone who is not a member, so even its
//   existence stays hidden.
// - Only the owner sees the invite code.
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const room = await prisma.room.findUnique({
    where: { id: params.id },
    include: {
      createdBy: { select: { name: true } },
      _count: { select: { members: true, messages: true } },
    },
  });
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const membership = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId: room.id, userId: session.id } },
  });
  const isOwner = room.createdById === session.id;

  if (room.isPrivate && !membership && !isOwner) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...room,
    inviteCode: isOwner ? room.inviteCode : undefined,
    myStatus: isOwner ? "OWNER" : (membership ? membership.status : null),
  });
}
