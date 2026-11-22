import Link from "next/link";
import { ROOM_TEMPLATES } from "@/lib/templates";

const features = [
  { emoji: "🔒", title: "Privacy first", text: "Private rooms are invisible to everyone who is not in them. Even the invite list of a date room stays between the two of you." },
  { emoji: "✉️", title: "Verified accounts", text: "Register in a minute: a 6-digit OTP by email (Gmail) or WhatsApp confirms it is really you." },
  { emoji: "💬", title: "Live chat", text: "Every room has real-time chat so plans, lineups and shopping lists all land in one place." },
  { emoji: "🎟️", title: "Invites & requests", text: "Invite by email with a link, or let classmates knock and you approve. Your call." },
];

export default function HomePage() {
  return (
    <div className="space-y-12">
      <section className="text-center">
        <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">
          Plan hangouts with your faculty, minus the group-chat chaos.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-stone-600">
          One place for football matches, gaming nights at the cybercafé, Montazah
          picnics, coffee breaks and everything in between. Create a room, invite
          your people, keep it private if you want.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/register" className="btn-primary">Create your account</Link>
          <Link href="/rooms" className="rounded-lg border border-stone-300 bg-white px-4 py-2 font-semibold hover:bg-stone-100">
            Browse rooms
          </Link>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-bold">Ready-made activity rooms</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ROOM_TEMPLATES.map((t) => (
            <div key={t.key} className="card">
              <div className="text-3xl">{t.emoji}</div>
              <h3 className="mt-2 font-bold">{t.title}</h3>
              <p className="mb-3 text-sm text-stone-500">{t.tagline}</p>
              <p className="mb-3 text-sm text-stone-600">{t.description}</p>
              <div className="flex flex-wrap gap-1">
                {t.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                    {tag}
                  </span>
                ))}
                {t.privateByDefault && (
                  <span className="rounded-full bg-pitch-50 px-2 py-0.5 text-xs font-semibold text-pitch-700">
                    private by default
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {features.map((f) => (
          <div key={f.title} className="card flex gap-3">
            <div className="text-2xl">{f.emoji}</div>
            <div>
              <h3 className="font-bold">{f.title}</h3>
              <p className="text-sm text-stone-600">{f.text}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
