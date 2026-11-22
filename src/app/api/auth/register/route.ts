import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { newOtpCode, otpExpiry, hashOtp, sendOtp, resolveChannel } from "@/lib/otp";
import { rateLimit, otpRateKey } from "@/lib/rate-limit";

const schema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email().max(180),
  password: z.string().min(8).max(120),
  phone: z.string().min(8).max(20).optional(),
  channel: z.enum(["EMAIL", "WHATSAPP"]).optional(),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "local";
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { name, email, password, phone, channel } = parsed.data;

  if (!rateLimit(otpRateKey("register", email, ip), 5, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many attempts, try later" }, { status: 429 });
  }

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing && existing.verified) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: { name: name, passwordHash: passwordHash, phone: phone, verified: false },
      })
    : await prisma.user.create({
        data: { name: name, email: email.toLowerCase(), passwordHash: passwordHash, phone: phone },
      });

  const useChannel = resolveChannel(channel);
  const target = useChannel === "WHATSAPP" ? (phone || "") : user.email;
  if (!target) {
    return NextResponse.json(
      { error: "A phone number is required for WhatsApp OTP" },
      { status: 400 }
    );
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
    return NextResponse.json(
      { error: "Could not send the verification code, try again" },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, needsVerification: true, channel: useChannel });
}
