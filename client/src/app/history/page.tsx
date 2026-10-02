"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Poster } from "../poster-fields";

const STATUS: Record<Poster["status"], string> = { generating: "তৈরি হচ্ছে…", completed: "তৈরি হয়েছে", failed: "ব্যর্থ" };

export default function HistoryPage() {
  const [posters, setPosters] = useState<Poster[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Poster[]>("/api/posters/me").then(setPosters).catch((e: Error) => setError(e.message));
  }, []);

  return (
    <main className="mx-auto w-full max-w-5xl p-6">
      <h1 className="mb-4 text-3xl font-bold text-green-700">আমার পোস্টার</h1>
      {error && <p className="text-red-600">{error}</p>}
      {!posters && !error && <p>লোড হচ্ছে…</p>}
      {posters?.length === 0 && (
        <p>
          এখনো কোনো পোস্টার নেই। <Link href="/templates" className="underline">টেমপ্লেট বেছে নিন</Link>
        </p>
      )}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {posters?.map((p) => (
          <Link key={p._id} href={`/posters/${p._id}`} className="overflow-hidden rounded-lg border hover:shadow-lg">
            {p.generatedImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.generatedImageUrl} alt={p.formData.name} className="aspect-[3/4] w-full object-cover" />
            ) : (
              <div className="flex aspect-[3/4] items-center justify-center bg-neutral-100">{STATUS[p.status]}</div>
            )}
            <div className="p-3">
              <p className="font-semibold">{p.formData.name}</p>
              <p className="text-sm text-neutral-500">
                {STATUS[p.status]} · {new Date(p.createdAt).toLocaleDateString("bn-BD")}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
