"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      router.push("/rooms");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card mx-auto max-w-md">
      <h1 className="text-xl font-bold">Log in</h1>
      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Email</label>
          <input name="email" type="email" required className="input" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Password</label>
          <input name="password" type="password" required className="input" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary w-full" disabled={busy}>
          Log in
        </button>
      </form>
    </div>
  );
}
