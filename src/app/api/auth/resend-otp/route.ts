import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { newOtpCode, otpExpiry, hashOtp, sendOtp, resolveChannel } from "@/lib/otp";
import { rateLimit, otpRateKey } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "local";
  const body = await req.json().catch(() => null);
  const email = String((body && body.email) || "").toLowerCase();
  const channel = body && typeof body.channel === "string" ? body.channel : undefined;
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  if (!rateLimit(otpRateKey("resend", email, ip), 3, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "Please wait before asking for a new code" }, { status: 429 });
  }

  const user = await prisma.user.findUnique({ where: { email: email } });
  if (!user || user.verified) {
    // Uniform response: do not reveal account state
    return NextResponse.json({ ok: true });
  }

  const useChannel = resolveChannel(channel);
  const target = useChannel === "WHATSAPP" ? (user.phone || "") : user.email;
  if (!target) {
    return NextResponse.json({ error: "No phone number on file for WhatsApp OTP" }, { status: 400 });
  }

  const code = newOtpCode();
  await prisma.otpCode.create({
    data: {
      userId: user.id,
      channel: useChannel,
      target: target,
      codeHash: await hashOtp(code),
      expiresAt: otpExpiry(),
    },
  });

  try {
    await sendOtp(useChannel, target, code, user.name);
  } catch (e) {
    console.error("OTP delivery failed", e);
    return NextResponse.json({ error: "Could not send the code, try again" }, { status: 502 });
  }

  return NextResponse.json({ ok: true, channel: useChannel });
}
