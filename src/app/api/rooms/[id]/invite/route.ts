import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

async function canManage(roomOwnerById: string, roomId: string, userId: string): Promise<boolean> {
  if (roomOwnerById === userId) return true;
  const me = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId: roomId, userId: userId } },
  });
  return !!me && me.role !== "MEMBER";
}

// POST /api/rooms/[id]/invite body: { email: string }
// Owner/admin invites someone by email. Creates a per-invite code and sends
// the join link by email; the response always includes the link so owners
// can also share it by hand.
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
  const email = String((body && body.email) || "").toLowerCase().trim();
  if (!email || email.length > 180) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }

  const invite = await prisma.roomInvite.upsert({
    where: { roomId_email: { roomId: room.id, email: email } },
    update: { invitedById: session.id },
    create: { roomId: room.id, email: email, invitedById: session.id },
  });

  const link = appUrl() + "/rooms/" + room.id + "?code=" + invite.inviteCode;

  let emailed = false;
  try {
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "465", 10),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transport.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to: email,
      subject: "You are invited: " + room.title,
      text:
        "You have been invited to join the room '" + room.title + "'.\n" +
        "Open this link to join: " + link +
        (room.isPrivate
          ? "\n\nThis is a private room. The link is what gets you in; keep it to yourself."
          : ""),
    });
    emailed = true;
  } catch (e) {
    console.error("invite email failed", e);
  }

  return NextResponse.json({ ok: true, emailSent: emailed, link: link });
}
