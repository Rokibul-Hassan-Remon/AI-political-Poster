"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getUser, logout, type User } from "@/lib/api";

// Shows who is logged in (session restored from the refresh cookie on reload).
export function UserMenu() {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    getUser().then(setUser);
  }, []);

  if (user === undefined) return null;
  if (!user) {
    return (
      <div className="flex gap-3">
        <Link href="/login" className="rounded bg-green-700 px-4 py-2 font-semibold text-white">লগইন</Link>
        <Link href="/register" className="rounded border border-green-700 px-4 py-2 font-semibold text-green-700">রেজিস্টার</Link>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3">
      <span>স্বাগতম, {user.name}</span>
      <Link href="/templates" className="rounded bg-green-700 px-4 py-2 font-semibold text-white">টেমপ্লেট দেখুন</Link>
      <button onClick={logout} className="rounded border border-neutral-300 px-3 py-1">লগআউট</button>
    </div>
  );
}
