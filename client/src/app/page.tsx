"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Template = { _id: string; title: string; thumbnailUrl: string };

const STEPS: [string, string][] = [
  ["টেমপ্লেট বাছুন", "উপলক্ষ অনুযায়ী তৈরি ডিজাইন, অথবা নিজের ডিজাইন আপলোড করুন।"],
  ["তথ্য ও ছবি দিন", "নাম, পদবি, এলাকা আর সর্বোচ্চ ৩টি ছবি। রং সাজিয়ে দেয় AI।"],
  ["ডাউনলোড করুন", "ছাপার উপযোগী PNG বা PDF। চাইলে লেখা ও ছবি সরিয়ে নিন।"],
];

export default function Home() {
  const [samples, setSamples] = useState<Template[]>([]);

  useEffect(() => {
    api<Template[]>("/api/templates")
      .then((t) => setSamples(t.filter((x) => x.thumbnailUrl).slice(0, 3)))
      .catch(() => {}); // decoration only
  }, []);

  return (
    <main className="flex-1">
      <section className="overflow-hidden bg-linear-to-b from-green-50 to-white">
        <div className="mx-auto grid w-full max-w-5xl items-center gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 md:py-20">
          <div className="text-center md:text-left">
            <h1 className="text-4xl font-bold leading-tight text-green-800 sm:text-5xl">কয়েক মিনিটে আপনার পোস্টার</h1>
            <p className="mt-4 text-lg text-neutral-600">
              বিজয় দিবস, একুশে, নির্বাচনী প্রচার বা ঈদের শুভেচ্ছা। তথ্য দিন, ছবি দিন, ছাপার উপযোগী পোস্টার নিয়ে যান।
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3 md:justify-start">
              <Link href="/templates" className="rounded-xl bg-green-700 px-6 py-3 text-lg font-semibold text-white shadow-lg shadow-green-700/20 transition hover:-translate-y-0.5 hover:bg-green-800">
                পোস্টার বানানো শুরু করুন →
              </Link>
              <Link href="/history" className="rounded-xl border border-green-700 px-6 py-3 text-lg font-semibold text-green-700 hover:bg-green-50">
                আমার পোস্টার
              </Link>
            </div>
          </div>
          {/* Three real template thumbnails, fanned like a hand of cards. */}
          <div className="relative mx-auto h-72 w-full max-w-sm sm:h-96" aria-hidden="true">
            {samples.map((t, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={t._id}
                src={t.thumbnailUrl}
                alt=""
                className="absolute left-1/2 top-0 aspect-3/4 h-full rounded-xl border-4 border-white object-cover shadow-xl"
                style={{ transform: `translateX(-50%) translateX(${(i - 1) * 38}%) rotate(${(i - 1) * 8}deg)`, zIndex: i === 1 ? 2 : 1 }}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
        <h2 className="mb-6 text-center text-2xl font-bold text-neutral-800">কীভাবে কাজ করে</h2>
        <ol className="grid gap-4 sm:grid-cols-3">
          {STEPS.map(([title, text], i) => (
            <li key={title} className="rounded-2xl border border-neutral-200 p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green-700 text-lg font-bold text-white">
                {(i + 1).toLocaleString("bn-BD")}
              </span>
              <p className="mt-3 text-lg font-semibold">{title}</p>
              <p className="mt-1 text-neutral-600">{text}</p>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
