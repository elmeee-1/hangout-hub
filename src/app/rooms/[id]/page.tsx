"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

type Room = {
  id: string;
  title: string;
  templateKey: string;
  description?: string;
  isPrivate: boolean;
  maxMembers: number;
  startsAt: string | null;
  location: string | null;
  inviteCode?: string;
  myStatus: string | null;
  createdBy: { name: string };
  _count: { members: number; messages: number };
};

type Message = {
  id: string;
  body: string;
  createdAt: string;
  user: { id: string; name: string };
};

type Pending = { id: string; user: { id: string; name: string; email: string } };

export default function RoomPage() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const roomId = params.id;
  const [room, setRoom] = useState<Room | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [pendingList, setPendingList] = useState<Pending[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [notice, setNotice] = useState("");
  const socketRef = useRef<any>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadRoom = useCallback(async () => {
    const res = await fetch("/api/rooms/" + roomId);
    if (res.status === 404) {
      setNotFound(true);
      return null;
    }
    const data = await res.json();
    setRoom(data);
    return data;
  }, [roomId]);

  useEffect(() => {
    loadRoom().then((loaded) => {
      if (loaded && search.get("code")) {
        // Arrived via an invite link: auto-join with the code.
        fetch("/api/rooms/" + roomId + "/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: search.get("code") }),
        }).then(() => loadRoom());
      }
    });
  }, [loadRoom, search, roomId]);

  useEffect(() => {
    if (!room || room.myStatus !== "ACTIVE") return;
    fetch("/api/rooms/" + roomId + "/messages")
      .then((r) => (r.ok ? r.json() : { messages: [] }))
      .then((d) => setMessages(d.messages || []));
  }, [room, roomId]);

  // Real-time chat
  useEffect(() => {
    if (!room || room.myStatus !== "ACTIVE") return;
    let alive = true;
    let socket: any = null;
    import("socket.io-client").then(({ io }) => {
      if (!alive) return;
      socket = io({ path: "/socket.io" });
      socketRef.current = socket;
      socket.emit("room:join", { roomId: roomId }, function (ack: { ok: boolean }) {
        if (!ack.ok) console.warn("cannot join room stream");
      });
      socket.on("chat:message", function (msg: Message) {
        setMessages(function (prev) {
          return prev.some((m) => m.id === msg.id) ? prev : [...prev, msg];
        });
      });
    });
    return function () {
      alive = false;
      if (socket) socket.disconnect();
    };
  }, [room, roomId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Pending requests for owners
  useEffect(() => {
    if (!room || room.myStatus !== "OWNER") return;
    const load = function () {
      fetch("/api/rooms/" + roomId + "/requests")
        .then((r) => (r.ok ? r.json() : { requests: [] }))
        .then((d) => setPendingList(d.requests || []));
    };
    load();
    const t = setInterval(load, 30000); // poll while the page is open
    return function () {
      clearInterval(t);
    };
  }, [room, roomId]);

  if (notFound) {
    return (
      <div className="card">
        <h1 className="text-lg font-bold">Room not found</h1>
        <p className="mt-2 text-sm text-stone-600">
          If this is a private room, only invited members can see it exists.
        </p>
      </div>
    );
  }

  if (!room) return <p className="text-stone-500">Loading...</p>;

  async function joinRoom() {
    const res = await fetch("/api/rooms/" + roomId + "/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: search.get("code") || undefined }),
    });
    const data = await res.json();
    if (!res.ok) {
      setNotice(data.error || "Could not join");
      return;
    }
    if (data.status === "PENDING") setNotice("Request sent. The room owner will approve it.");
    await loadRoom();
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setDraft("");
    socketRef.current?.emit("chat:send", { roomId: roomId, body: body }, function (ack: { ok: boolean }) {
      if (!ack.ok) setNotice("Message could not be sent");
    });
  }

  async function decide(userId: string, action: "approve" | "deny") {
    await fetch("/api/rooms/" + roomId + "/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: userId, action: action }),
    });
    setPendingList(function (p) {
      return p.filter((x) => x.user.id !== userId);
    });
  }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/rooms/" + roomId + "/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail }),
    });
    const data = await res.json();
    if (data.link) setInviteLink(data.link);
    setInviteEmail("");
    setNotice(
      data.emailSent
        ? "Invite sent by email."
        : "Invite created. Email delivery is not configured; share the link below."
    );
  }

  const canChat = room.myStatus === "ACTIVE" || room.myStatus === "OWNER";

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div className="card">
          <h1 className="text-xl font-bold">{room.title}</h1>
          <p className="text-sm text-stone-500">
            {room.isPrivate ? "🔒 Private" : "🌍 Public"} · {room._count.members}/{room.maxMembers} in ·
            by {room.createdBy.name}
          </p>
          {room.location && <p className="mt-1 text-sm">📍 {room.location}</p>}
          {room.startsAt && <p className="text-sm">🕐 {new Date(room.startsAt).toLocaleString()}</p>}
          {room.description && <p className="mt-2 text-sm text-stone-600">{room.description}</p>}
          {notice && <p className="mt-2 text-sm font-medium text-pitch-700">{notice}</p>}
          {!room.myStatus && (
            <button className="btn-primary mt-3" onClick={joinRoom}>
              {room.isPrivate ? "Ask to join" : "Join this room"}
            </button>
          )}
          {room.myStatus === "PENDING" && (
            <p className="mt-3 text-sm font-semibold text-amber-600">Waiting for the owner to approve you.</p>
          )}
        </div>

        {canChat ? (
          <div className="card flex h-96 flex-col">
            <h2 className="mb-2 font-bold">💬 Chat</h2>
            <div className="flex-1 space-y-2 overflow-y-auto">
              {messages.map((m) => (
                <div key={m.id} className="text-sm">
                  <span className="font-semibold">{m.user.name}: </span>
                  <span>{m.body}</span>
                  <span className="ml-2 text-xs text-stone-400">
                    {new Date(m.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <form onSubmit={send} className="mt-2 flex gap-2">
              <input
                className="input"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type a message..."
                maxLength={2000}
              />
              <button className="btn-primary">Send</button>
            </form>
          </div>
        ) : null}
      </div>

      <div className="space-y-4">
        {room.myStatus === "OWNER" && (
          <>
            <div className="card">
              <h2 className="font-bold">🎟️ Invite someone</h2>
              <form onSubmit={sendInvite} className="mt-2 space-y-2">
                <input
                  className="input"
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="friend@uca.ac.ma"
                />
                <button className="btn-primary w-full">Send invite</button>
              </form>
              {inviteLink && (
                <p className="mt-2 break-all text-xs text-stone-600">Invite link: {inviteLink}</p>
              )}
              {room.inviteCode && (
                <>
                  <p className="mt-3 text-xs font-semibold text-stone-500">Join code</p>
                  <p className="break-all rounded bg-stone-100 p-2 text-xs font-mono">{room.inviteCode}</p>
                </>
              )}
            </div>

            <div className="card">
              <h2 className="font-bold">📨 Join requests ({pendingList.length})</h2>
              {pendingList.length === 0 && <p className="mt-1 text-sm text-stone-500">No pending requests.</p>}
              <ul className="mt-2 space-y-2">
                {pendingList.map((p) => (
                  <li key={p.id} className="flex items-center justify-between text-sm">
                    <span>{p.user.name} <span className="text-stone-400">({p.user.email})</span></span>
                    <span className="flex gap-1">
                      <button onClick={() => decide(p.user.id, "approve")} className="rounded bg-pitch-600 px-2 py-1 text-xs font-semibold text-white">
                        Approve
                      </button>
                      <button onClick={() => decide(p.user.id, "deny")} className="rounded border border-stone-300 px-2 py-1 text-xs">
                        Deny
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        <div className="card">
          <h2 className="font-bold">Privacy note</h2>
          <p className="mt-1 text-sm text-stone-600">
            {room.isPrivate
              ? "This room is private. Nobody can find it in listings, and only you can approve who gets in."
              : "This room is public. Anyone verified on the platform can join and chat. Create a new room and tick private to gate one."}
          </p>
        </div>
      </div>
    </div>
  );
}
