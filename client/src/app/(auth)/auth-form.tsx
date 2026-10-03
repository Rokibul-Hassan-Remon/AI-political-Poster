"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError, login, register } from "@/lib/api";

const messages: Record<number, string> = {
  401: "ইমেইল বা পাসওয়ার্ড ভুল।",
  409: "এই ইমেইলে আগেই একটি অ্যাকাউন্ট আছে।",
};

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isRegister = mode === "register";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email"));
    const password = String(f.get("password"));
    setBusy(true);
    setError("");
    try {
      if (isRegister) await register(String(f.get("name")), email, password);
      else await login(email, password);
      router.push("/");
    } catch (err) {
      setError((err instanceof ApiError && messages[err.status]) || "কিছু একটা সমস্যা হয়েছে, আবার চেষ্টা করুন।");
      setBusy(false);
    }
  }

  const input = "w-full rounded-lg border border-neutral-300 px-3 py-2 focus:border-green-700 focus:outline-none";

  return (
    <main className="flex flex-1 items-center justify-center bg-linear-to-b from-green-50 to-white p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl shadow-green-900/5">
        <h1 className="text-2xl font-bold text-green-700">{isRegister ? "অ্যাকাউন্ট খুলুন" : "লগইন"}</h1>
        {isRegister && (
          <label className="block space-y-1">
            <span>নাম</span>
            <input name="name" required maxLength={100} autoComplete="name" className={input} />
          </label>
        )}
        <label className="block space-y-1">
          <span>ইমেইল</span>
          <input name="email" type="email" required autoComplete="email" className={input} />
        </label>
        <label className="block space-y-1">
          <span>পাসওয়ার্ড {isRegister && "(কমপক্ষে ৮ অক্ষর)"}</span>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            maxLength={72}
            autoComplete={isRegister ? "new-password" : "current-password"}
            className={input}
          />
        </label>
        {error && <p role="alert" className="text-red-600">{error}</p>}
        <button disabled={busy} className="w-full rounded-lg bg-green-700 py-2.5 font-semibold text-white hover:bg-green-800 disabled:opacity-60">
          {busy ? "অপেক্ষা করুন..." : isRegister ? "রেজিস্টার" : "লগইন"}
        </button>
        <p className="text-center text-sm">
          {isRegister ? (
            <>অ্যাকাউন্ট আছে? <Link href="/login" className="text-green-700 underline">লগইন করুন</Link></>
          ) : (
            <>নতুন? <Link href="/register" className="text-green-700 underline">অ্যাকাউন্ট খুলুন</Link></>
          )}
        </p>
      </form>
    </main>
  );
}
