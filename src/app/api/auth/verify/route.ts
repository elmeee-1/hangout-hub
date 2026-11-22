import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { compareOtp, otpPolicy } from "@/lib/otp";
import { signToken, setSessionCookie } from "@/lib/auth";
import { rateLimit, otpRateKey } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "local";
  const body = await req.json().catch(() => null);
  const email = String((body && body.email) || "").toLowerCase();
  const code = String((body && body.code) || "").replace(/\D/g, "");
  if (!email || code.length !== 6) {
    return NextResponse.json({ error: "Email and 6-digit code required" }, { status: 400 });
  }
  if (!rateLimit(otpRateKey("verify", email, ip), 10, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many attempts, try later" }, { status: 429 });
  }

  const user = await prisma.user.findUnique({ where: { email: email } });
  if (!user) return NextResponse.json({ error: "No pending registration" }, { status: 404 });
  if (user.verified) {
    const token = signToken(user);
    await setSessionCookie(token);
    return NextResponse.json({ ok: true, alreadyVerified: true });
  }

  const otp = await prisma.otpCode.findFirst({
    where: { userId: user.id, consumed: false },
    orderBy: { createdAt: "desc" },
  });
  if (!otp) return NextResponse.json({ error: "No code found, request a new one" }, { status: 400 });
  if (otp.expiresAt < new Date()) {
    return NextResponse.json({ error: "Code expired, request a new one" }, { status: 400 });
  }
  if (otp.attempts >= otpPolicy.maxAttempts) {
    await prisma.otpCode.update({ where: { id: otp.id }, data: { consumed: true } });
    return NextResponse.json({ error: "Too many wrong attempts, request a new code" }, { status: 429 });
  }

  const match = await compareOtp(code, otp.codeHash);
  if (!match) {
    await prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    return NextResponse.json({ error: "Wrong code" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.otpCode.update({ where: { id: otp.id }, data: { consumed: true } }),
    prisma.user.update({ where: { id: user.id }, data: { verified: true } }),
  ]);

  const token = signToken(user);
  await setSessionCookie(token);
  return NextResponse.json({ ok: true });
}
