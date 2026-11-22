import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";
import { webcrypto } from "crypto";

export type OtpChannel = "EMAIL" | "WHATSAPP";

const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;

export function newOtpCode(): string {
  // 6 digits, cryptographically random
  let code = "";
  const buf = new Uint32Array(6);
  webcrypto.getRandomValues(buf);
  for (let i = 0; i < 6; i++) code += (buf[i] % 10).toString();
  return code;
}

export function otpExpiry(): Date {
  return new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
}

export async function hashOtp(code: string): Promise<string> {
  return bcrypt.hash(code, 10);
}

export async function compareOtp(code: string, hash: string): Promise<boolean> {
  return bcrypt.compare(code, hash);
}

export const otpPolicy = { ttlMinutes: OTP_TTL_MINUTES, maxAttempts: MAX_ATTEMPTS };

async function sendEmailOtp(to: string, code: string, name: string) {
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "465", 10),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transport.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to: to,
    subject: "Your Hangout Hub verification code",
    text:
      "Hi " + name + ",\n\nYour Hangout Hub code is " + code +
      "\nIt expires in " + OTP_TTL_MINUTES + " minutes.\n\nIf you did not request it, ignore this email.",
  });
}

async function sendWhatsAppOtp(to: string, code: string) {
  // Twilio WhatsApp API via REST (no SDK needed)
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!sid || !token || !from) throw new Error("WhatsApp provider not configured");
  const auth = Buffer.from(sid + ":" + token).toString("base64");
  const body = new URLSearchParams({
    From: from,
    To: "whatsapp:" + to,
    Body: "Your Hangout Hub code is " + code + ". It expires in " + OTP_TTL_MINUTES + " minutes.",
  });
  const res = await fetch(
    "https://api.twilio.com/2010-04-01/Accounts/" + sid + "/Messages.json",
    { method: "POST", headers: { Authorization: "Basic " + auth }, body: body }
  );
  if (!res.ok) throw new Error("WhatsApp send failed: " + (await res.text()));
}

/** Send an OTP on the requested channel. Throws when delivery fails. */
export async function sendOtp(
  channel: OtpChannel,
  to: string,
  code: string,
  name: string
): Promise<void> {
  if (channel === "WHATSAPP") {
    await sendWhatsAppOtp(to, code);
  } else {
    await sendEmailOtp(to, code, name);
  }
}

export function resolveChannel(requested?: string): OtpChannel {
  const whatsappOn = process.env.WHATSAPP_ENABLED === "true";
  if (requested === "WHATSAPP" && whatsappOn) return "WHATSAPP";
  if (requested === "EMAIL") return "EMAIL";
  const fallback = (process.env.DEFAULT_OTP_CHANNEL || "EMAIL").toUpperCase();
  return fallback === "WHATSAPP" && whatsappOn ? "WHATSAPP" : "EMAIL";
}
