"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getUser, logout, type User } from "@/lib/api";

const NAV: [string, string][] = [
  ["/templates", "টেমপ্লেট"],
  ["/history", "আমার পোস্টার"],
];

// Site header on every page: brand, nav, and who is logged in (session restored from the refresh cookie on reload).
export function SiteHeader() {
  const path = usePathname();
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    getUser().then(setUser);
  }, []);

  return (
    <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-green-700">
          {/* Flag disc: red sun on green. */}
          <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-700">
            <span className="h-3.5 w-3.5 rounded-full bg-red-500" />
          </span>
          রাইজ টুগেদার
        </Link>
        <nav className="flex gap-1">
          {NAV.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className={`rounded-full px-3 py-1 font-semibold ${path.startsWith(href) ? "bg-green-50 text-green-800" : "text-neutral-600 hover:text-green-700"}`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {user === null && (
            <>
              <Link href="/login" className="rounded-lg px-3 py-1.5 font-semibold text-green-700 hover:bg-green-50">লগইন</Link>
              <Link href="/register" className="rounded-lg bg-green-700 px-3 py-1.5 font-semibold text-white hover:bg-green-800">রেজিস্টার</Link>
            </>
          )}
          {user && (
            <>
              <span className="hidden text-neutral-600 sm:inline">স্বাগতম, {user.name}</span>
              <button onClick={logout} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-700 hover:bg-neutral-100">লগআউট</button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
