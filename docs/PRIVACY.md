# Privacy model

Privacy is a product feature here, not a setting buried in a menu.

## Room visibility

| Room type | Visible in public list? | Reachable by direct URL? | Join path |
| --- | --- | --- | --- |
| Public | Yes | Yes | One click, "Join this room" |
| Private | **Never** | **No: the API answers 404 to non-members**, as if the room did not exist | Owner's invite link/code, or an approved join request |

## What this means in practice

- A **date ideas** room is private by default and capped at 2 members. Nobody can browse into it; even a leaked URL shows nothing.
- A **5v5 or 7v7 match** is public by default so the promo fills the teams, but any game can be flipped to private at creation.
- Chat history is server-side gated: only members with an `ACTIVE` membership can fetch messages, and the Socket.IO stream verifies membership for every join and every message.
- Join requests to private rooms go to the owner only. Admitting someone is a manual, explicit human decision.

## Accounts

- OTP codes are stored **hashed** (bcrypt), expire after 10 minutes, allow max 5 attempts, and sending/verifying is rate-limited per address.
- Verification responses never leak which emails exist on the platform. Resend and register replies are uniform.
- Passwords are bcrypt-hashed (cost 12). Sessions are JWTs in `httpOnly`, `sameSite=lax` cookies (7 days).
- Phone numbers are optional and stored only if a user provides one (needed for WhatsApp OTP).

## Data sharing

- The platform sends email only for OTP codes and room invites you asked for. No marketing.
- Invite links embed a private room's join code; treat the link like a key.
- Location notes ("Montazah park, gate 2") live in the room and are only as visible as the room is.
