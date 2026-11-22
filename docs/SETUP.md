# Setup guide

## 1. Requirements

- Node.js 18+ and npm
- PostgreSQL 14+ (local, Docker, or a hosted dev database such as Neon/Supabase)

## 2. Environment

Copy the example and fill the values:

    cp .env.example .env

| Variable | Meaning |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Long random string used to sign session tokens (32+ chars) |
| `NEXT_PUBLIC_APP_URL` | Public URL of the app, used in invite links |
| `SMTP_HOST/PORT/SECURE` | Gmail: `smtp.gmail.com`, `465`, `true` |
| `SMTP_USER` / `SMTP_PASS` | Gmail address + **App Password** (16 chars) |
| `MAIL_FROM` | From header, e.g. `Hangout Hub <you@gmail.com>` |
| `WHATSAPP_ENABLED` | `false` until you configure Twilio |
| `TWILIO_ACCOUNT_SID/AUTH_TOKEN` | From the Twilio console |
| `TWILIO_WHATSAPP_FROM` | Your approved WhatsApp sender, e.g. `whatsapp:+14155238886` |

Gmail app password: Google Account > Security > 2-Step Verification (enable) > App passwords. Never commit `.env`.

## 3. Run locally

    npm install       # also generates the Prisma client
    npm run db:push   # create tables from prisma/schema.prisma
    npm run dev       # Next.js + Socket.IO on http://localhost:3000

Registration flow: `/register` -> enter name/email/password -> OTP code arrives by email (or WhatsApp if enabled) -> verify -> you are logged in.

## 4. Test the flows

1. Register two accounts (use two browsers or incognito).
2. Account A: Rooms > New room, pick a template, tick **Private**.
3. From the room page, invite Account B by email, or share the join code.
4. B opens the invite link and is in, or B opens the private room URL without a code, sends a join request, and A approves it.
5. Chat live in the room (both tabs).

Privacy checks: a private room's URL opened by a stranger shows "Room not found"; `/api/rooms?list=public` never contains private rooms.

## 5. Deploy

Any host with Node 18 works (Railway, Render, Fly.io, a VPS). Because chat uses Socket.IO, run the custom server (`npm run build && npm start`), not `next start`.

- Set the production env vars, run `npm run db:push` against the production DB once.
- Set `NEXT_PUBLIC_APP_URL` to the deployed URL so invite links are correct.
- Put the app behind HTTPS; session cookies switch to `secure` automatically in production.
