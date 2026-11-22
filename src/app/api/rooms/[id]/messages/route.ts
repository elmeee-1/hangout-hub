import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

// GET /api/rooms/[id]/messages -> members only
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId: params.id, userId: session.id } },
  });
  const room = await prisma.room.findUnique({ where: { id: params.id } });
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  if (!membership || membership.status !== "ACTIVE") {
    // Hide even the existence of a private room's content
    return NextResponse.json({ error: "Room not found" }, { status: room.isPrivate ? 404 : 403 });
  }

  const messages = await prisma.message.findMany({
    where: { roomId: params.id },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
  return NextResponse.json({ messages: messages });
}
