import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hangout Hub",
  description: "Organize football, gaming, picnics and more with your friends and faculty.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-stone-50 text-stone-900 antialiased">
        <header className="border-b border-stone-200 bg-white">
          <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-bold">
              <span aria-hidden>🤝</span> Hangout Hub
            </Link>
            <div className="flex items-center gap-4 text-sm">
              <Link href="/rooms" className="text-stone-600 hover:text-stone-900">
                Rooms
              </Link>
              <Link href="/login" className="text-stone-600 hover:text-stone-900">
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-pitch-600 px-3 py-1.5 font-semibold text-white hover:bg-pitch-700"
              >
                Create account
              </Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
