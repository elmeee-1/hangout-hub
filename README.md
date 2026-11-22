# 🤝 Hangout Hub

One place to organize hangouts with your friends and your faculty: football matches, gaming nights at the cybercafé, Montazah picnics, coffee breaks, date plans and more.

Built for a faculty promo: create your account, get verified with a one-time code, make a room, invite people, and chat live.

## ✨ Features

- **Verified accounts, no spam**: register with email + password, then confirm with a 6-digit OTP sent by **Gmail** (default, free and instant) or **WhatsApp** (optional, via Twilio). Codes are hashed, expire in 10 minutes, and are rate-limited.
- **Pre-organized activity rooms**: start from a template with sensible capacity and privacy defaults.
  - ⚽ 5v5 football · 🥅 7v7 football
  - 🎮 Gaming night (cybercafé)
  - 🧺 Montazah picnic
  - ☕ Coffee break
  - 💫 Date ideas (private by default, capacity 2)
- **Public or private rooms, privacy first**:
  - Private rooms are **invisible in listings and return 404 to non-members**, so even their existence is hidden.
  - Join a private room only with a **personal invite link/code** (sent by email) or by **knocking** and being approved by the owner.
  - Only members (with an active status) can read a room's chat history.
- **Live chat** per room over Socket.IO, messages persisted in PostgreSQL.
- **Invites and join requests**: owners see pending knocks and approve or deny them.

## 🧱 Stack

| Layer | Choice |
| --- | --- |
| App | Next.js 14 (App Router, TypeScript, Tailwind) |
| API | Next.js route handlers |
| Real-time | Socket.IO (custom server, `server.js`) |
| DB | PostgreSQL + Prisma |
| Auth | Custom JWT sessions in httpOnly cookies, bcrypt passwords |
| Email OTP | Nodemailer + Gmail SMTP (app password) |
| WhatsApp OTP | Twilio WhatsApp API (optional) |

## 🚀 Quick start

See [docs/SETUP.md](docs/SETUP.md) for the full walkthrough.

    git clone https://github.com/elmeee-1/hangout-hub.git
    cd hangout-hub
    cp .env.example .env         # then fill in DATABASE_URL, JWT_SECRET, SMTP_*
    npm install
    npm run db:push
    npm run dev                  # http://localhost:3000

## 🔐 The OTP channel decision

| Channel | Cost | Reliability | Recommendation |
| --- | --- | --- | --- |
| Email (Gmail SMTP) | Free | Instant, works for every student with an inbox | **Use this first** |
| WhatsApp (Twilio) | Per-message cost + business verification | Good, but subject to template approval and sender verification | Add later as a fallback |

`WHATSAPP_ENABLED=false` by default: the platform works fully with email OTP on day one.

## 🗺️ Roadmap

- [ ] Team-balancing for 5v5/7v7 (GK picker, randomized squads)
- [ ] Room "lineup" view with yes/maybe/no per date
- [ ] Shared checklist per room (picnic shopping list, who books the pitch)
- [ ] Push/browser notifications for new messages
- [ ] Faculty department tags to browse rooms per promo
- [ ] PWA install + Arabic/French localization

## 📄 Docs

- [docs/SETUP.md](docs/SETUP.md) — environment, database, providers, deployment
- [docs/PRIVACY.md](docs/PRIVACY.md) — the privacy model room by room

## License

MIT
