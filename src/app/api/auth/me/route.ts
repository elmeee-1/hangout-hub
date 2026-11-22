import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ user: null }, { status: 200 });
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, name: true, email: true, verified: true, phone: true, createdAt: true },
  });
  return NextResponse.json({ user: user });
}
