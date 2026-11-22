import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export const COOKIE_NAME = "hh_token";
const JWT_SECRET = process.env.JWT_SECRET || "change-me";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
};

export function signToken(user: SessionUser): string {
  return jwt.sign({ sub: user.id, email: user.email, name: user.name }, JWT_SECRET, {
    expiresIn: "7d",
  });
}

export function verifyToken(token: string): SessionUser | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as {
      sub: string;
      email: string;
      name: string;
    };
    return { id: payload.sub, email: payload.email, name: payload.name };
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const store = cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  cookies().set(COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}
