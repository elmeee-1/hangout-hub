"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Step = "form" | "otp";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("form");
  const [email, setEmail] = useState("");
  const [channel, setChannel] = useState<"EMAIL" | "WHATSAPP">("EMAIL");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submitForm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          password: form.get("password"),
          phone: form.get("phone") || undefined,
          channel: channel,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      setEmail(String(form.get("email")));
      setStep("otp");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function submitOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, code: code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");
      router.push("/rooms");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, channel: channel }),
      });
      if (!res.ok) throw new Error("Could not resend the code");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (step === "otp") {
    return (
      <div className="card mx-auto max-w-md">
        <h1 className="text-xl font-bold">Check your {channel === "EMAIL" ? "inbox" : "WhatsApp"}</h1>
        <p className="mt-1 text-sm text-stone-600">
          We sent a 6-digit code to <strong>{email}</strong>. It expires in 10 minutes.
        </p>
        <form onSubmit={submitOtp} className="mt-4 space-y-3">
          <input
            className="input text-center text-2xl tracking-[0.5em]"
            maxLength={6}
            inputMode="numeric"
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button className="btn-primary w-full" disabled={busy || code.length !== 6}>
            Verify and log in
          </button>
          <button type="button" onClick={resend} className="w-full text-sm text-stone-500 underline" disabled={busy}>
            Resend code
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="card mx-auto max-w-md">
      <h1 className="text-xl font-bold">Create your account</h1>
      <form onSubmit={submitForm} className="mt-4 space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Name</label>
          <input name="name" required minLength={2} className="input" placeholder="Your name" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Email</label>
          <input name="email" type="email" required className="input" placeholder="you@uca.ac.ma" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Password</label>
          <input name="password" type="password" required minLength={8} className="input" placeholder="At least 8 characters" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Phone (optional)</label>
          <input name="phone" className="input" placeholder="+212..." />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Verification code by</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setChannel("EMAIL")}
              className={"flex-1 rounded-lg border px-3 py-2 text-sm font-semibold " + (channel === "EMAIL" ? "border-pitch-600 bg-pitch-50 text-pitch-700" : "border-stone-300")}
            >
              ✉️ Email (recommended)
            </button>
            <button
              type="button"
              onClick={() => setChannel("WHATSAPP")}
              className={"flex-1 rounded-lg border px-3 py-2 text-sm font-semibold " + (channel === "WHATSAPP" ? "border-pitch-600 bg-pitch-50 text-pitch-700" : "border-stone-300")}
            >
              💬 WhatsApp
            </button>
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? "Sending code..." : "Sign up"}
        </button>
      </form>
    </div>
  );
}
