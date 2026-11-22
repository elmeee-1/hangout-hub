import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { getTemplate } from "@/lib/templates";
import { rateLimit } from "@/lib/rate-limit";

// GET /api/rooms?list=public|mine  -> private rooms are NEVER listed here
export async function GET(req: NextRequest) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const list = req.nextUrl.searchParams.get("list") || "public";

  if (list === "mine") {
    const memberships = await prisma.roomMember.findMany({
      where: { userId: session.id },
      include: {
        room: {
          include: { createdBy: { select: { name: true } }, _count: { select: { members: true, messages: true } } },
        },
      },
      orderBy: { joinedAt: "desc" },
    });
    return NextResponse.json({
      rooms: memberships.map(function (m) {
        return { ...m.room, myStatus: m.status, myRole: m.role };
      }),
    });
  }

  const template = req.nextUrl.searchParams.get("template") || undefined;
  const rooms = await prisma.room.findMany({
    where: { isPrivate: false, ...(template ? { templateKey: template } : {}) },
    include: {
      createdBy: { select: { name: true } },
      _count: { select: { members: true, messages: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ rooms: rooms });
}

// POST /api/rooms -> create a room from a template
export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!rateLimit("roomcreate:" + session.id, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Slow down, try again later" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const templateKey = String((body && body.templateKey) || "");
  const tpl = getTemplate(templateKey);
  if (!tpl) return NextResponse.json({ error: "Unknown template" }, { status: 400 });

  const room = await prisma.room.create({
    data: {
      templateKey: tpl.key,
      title: String((body && body.title) || tpl.suggestedTitle).slice(0, 80),
      description: body && body.description ? String(body.description).slice(0, 500) : tpl.description,
      isPrivate: body && typeof body.isPrivate === "boolean" ? body.isPrivate : tpl.privateByDefault,
      maxMembers: tpl.capacity,
      startsAt: body && body.startsAt ? new Date(body.startsAt) : null,
      location: body && body.location ? String(body.location).slice(0, 200) : null,
      createdById: session.id,
      members: {
        create: { userId: session.id, role: "OWNER", status: "ACTIVE" },
      },
    },
  });

  return NextResponse.json({ room: room });
}
