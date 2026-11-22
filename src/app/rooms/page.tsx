"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ROOM_TEMPLATES } from "@/lib/templates";

type Room = {
  id: string;
  title: string;
  templateKey: string;
  isPrivate: boolean;
  maxMembers: number;
  startsAt: string | null;
  location: string | null;
  myStatus?: string;
  createdBy?: { name?: string };
  _count?: { members: number; messages: number };
};

export default function RoomsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"public" | "mine" | "create">("public");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ title: "", startsAt: "", location: "", isPrivate: false });
  const [templateKey, setTemplateKey] = useState(ROOM_TEMPLATES[0].key);

  useEffect(() => {
    if (tab === "create") return;
    let cancelled = false;
    setBusy(true);
    setError("");
    fetch("/api/rooms?list=" + tab)
      .then(async (res) => {
        if (res.status === 401) {
          router.push("/login");
          return { rooms: [] };
        }
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setRooms(data.rooms || []);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load rooms");
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, router]);

  async function createRoom(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateKey: templateKey,
          ...form,
          startsAt: form.startsAt || undefined,
          location: form.location || undefined,
          title: form.title || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create the room");
      router.push("/rooms/" + data.room.id);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  const tpl = ROOM_TEMPLATES.find((t) => t.key === templateKey)!;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {(["public", "mine", "create"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={"rounded-lg px-4 py-2 text-sm font-semibold " + (tab === t ? "bg-pitch-600 text-white" : "border border-stone-300 bg-white text-stone-600")}
          >
            {t === "public" ? "Public rooms" : t === "mine" ? "My rooms" : "+ New room"}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {tab === "create" ? (
        <form onSubmit={createRoom} className="card max-w-xl space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Activity type</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ROOM_TEMPLATES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => {
                    setTemplateKey(t.key);
                    setForm((f) => ({ ...f, isPrivate: t.privateByDefault }));
                  }}
                  className={"rounded-lg border p-3 text-left text-sm " + (templateKey === t.key ? "border-pitch-600 bg-pitch-50" : "border-stone-300 bg-white")}
                >
                  <span className="mr-1" aria-hidden>{t.emoji}</span>
                  <span className="font-semibold">{t.title}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Room title</label>
            <input
              className="input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder={tpl.suggestedTitle}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">When</label>
              <input
                type="datetime-local"
                className="input"
                value={form.startsAt}
                onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Where</label>
              <input
                className="input"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Pitch, cyber, park..."
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={form.isPrivate}
              onChange={(e) => setForm({ ...form, isPrivate: e.target.checked })}
            />
            Private room (hidden from everyone you do not invite)
          </label>
          <p className="text-sm text-stone-500">{tpl.description}</p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button className="btn-primary" disabled={busy}>
            Create room
          </button>
        </form>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {busy && <p className="text-stone-500">Loading...</p>}
          {!busy && rooms.length === 0 && (
            <p className="text-stone-500">Nothing here yet. Create the first room!</p>
          )}
          {rooms.map((r) => {
            const t = ROOM_TEMPLATES.find((x) => x.key === r.templateKey);
            return (
              <Link key={r.id} href={"/rooms/" + r.id} className="card hover:border-pitch-500">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold">
                      <span className="mr-1" aria-hidden>{t ? t.emoji : ""}</span>
                      {r.title}
                    </h3>
                    <p className="text-sm text-stone-500">
                      {t ? t.title : r.templateKey} · by {r.createdBy ? r.createdBy.name : "unknown"}
                    </p>
                  </div>
                  {r.isPrivate && (
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-600">
                      🔒 private
                    </span>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-sm text-stone-600">
                  <span>👥 {r._count ? r._count.members : 0}/{r.maxMembers}</span>
                  <span>💬 {r._count ? r._count.messages : 0}</span>
                  {r.location && <span>📍 {r.location}</span>}
                  {r.startsAt && <span>🕐 {new Date(r.startsAt).toLocaleString()}</span>}
                  {r.myStatus === "PENDING" && (
                    <span className="font-semibold text-amber-600">waiting for approval</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
