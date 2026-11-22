import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken, setSessionCookie } from "@/lib/auth";
import { rateLimit, otpRateKey } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "local";
  const body = await req.json().catch(() => null);
  const email = String((body && body.email) || "").toLowerCase();
  const password = String((body && body.password) || "");
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }
  if (!rateLimit(otpRateKey("login", email, ip), 8, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many attempts, try later" }, { status: 429 });
  }

  const user = await prisma.user.findUnique({ where: { email: email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
  if (!user.verified) {
    return NextResponse.json({ error: "Account not verified, check your OTP" }, { status: 403 });
  }

  await setSessionCookie(signToken(user));
  return NextResponse.json({ ok: true });
}
