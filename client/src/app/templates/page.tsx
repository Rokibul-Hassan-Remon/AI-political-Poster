"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Scheme = { primary: string; secondary: string; accent: string; text: string };
type Template = {
  _id: string;
  title: string;
  occasionType: string;
  thumbnailUrl: string;
  layoutConfig: { photoSlots: number; defaultScheme: Scheme; headlineDefault: string; customBackground?: boolean };
};

const OCCASIONS: [string, string][] = [
  ["", "সব"],
  ["victory-day", "বিজয় দিবস"],
  ["national-day", "জাতীয় দিবস"],
  ["mourning", "শোক / স্মরণ"],
  ["campaign", "নির্বাচনী প্রচার"],
  ["greetings", "শুভেচ্ছা"],
  ["festival", "ঈদ / উৎসব"],
];

export default function TemplatesPage() {
  const [occasion, setOccasion] = useState("");
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [error, setError] = useState("");
  // The "own design" template is always shown as the last card in the grid, whatever the filter.
  const [own, setOwn] = useState<Template | null>(null);

  useEffect(() => {
    api<Template[]>("/api/templates?occasion=custom")
      .then((t) => setOwn(t.find((x) => x.layoutConfig.customBackground) ?? null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    api<Template[]>(`/api/templates${occasion ? `?occasion=${occasion}` : ""}`)
      .then((t) => {
        setTemplates(t);
        setError("");
      })
      .catch((e: Error) => setError(e.message));
  }, [occasion]);

  return (
    <main className="mx-auto w-full max-w-5xl p-6">
      <h1 className="mb-4 text-3xl font-bold text-green-700">টেমপ্লেট বেছে নিন</h1>

      <div className="mb-6 flex flex-wrap gap-2">
        {OCCASIONS.map(([value, label]) => (
          <button
            key={value}
            onClick={() => setOccasion(value)}
            className={`rounded-full border px-4 py-1 ${occasion === value ? "bg-green-700 text-white" : "hover:bg-neutral-100"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p className="text-red-600">{error}</p>}
      {!templates && !error && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => <div key={i} className="aspect-3/4 animate-pulse rounded-lg bg-neutral-100" />)}
        </div>
      )}
      {templates?.length === 0 && <p>এই উপলক্ষে কোনো টেমপ্লেট নেই।</p>}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {templates?.filter((t) => !t.layoutConfig.customBackground).map((t) => {
          const s = t.layoutConfig.defaultScheme;
          return (
            <Link key={t._id} href={`/create/${t._id}`} className="group overflow-hidden rounded-lg border transition hover:-translate-y-1 hover:shadow-xl">
              {/* Thumbnails are rendered from the real template by `npm run seed`; the color block is a fallback. */}
              {t.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.thumbnailUrl} alt={t.title} loading="lazy" className="aspect-3/4 w-full object-cover transition group-hover:scale-105" />
              ) : (
                <div
                  className="flex aspect-3/4 items-center justify-center p-4 text-center text-2xl font-bold"
                  style={{ background: `linear-gradient(${s.primary}, ${s.secondary})`, color: s.text, borderBottom: `8px solid ${s.accent}` }}
                >
                  {t.layoutConfig.headlineDefault}
                </div>
              )}
              <div className="p-3">
                <p className="font-semibold">{t.title}</p>
                <p className="text-sm text-neutral-500">
                  {OCCASIONS.find(([v]) => v === t.occasionType)?.[1]} · {t.layoutConfig.photoSlots}টি ছবি
                </p>
              </div>
            </Link>
          );
        })}
        {own && templates && (
          <Link
            href={`/create/${own._id}`}
            className="flex flex-col overflow-hidden rounded-lg border-2 border-dashed border-green-700 bg-green-50 transition hover:-translate-y-1 hover:shadow-xl"
          >
            <div className="flex aspect-3/4 flex-col items-center justify-center gap-3 p-4 text-center">
              <span className="text-5xl font-light text-green-700">+</span>
              <p className="text-lg font-bold text-green-800">নিজের টেমপ্লেট দিয়ে পোস্টার বানান</p>
              <p className="text-sm text-neutral-600">
                আপনার পছন্দের ডিজাইন আপলোড করুন, সর্বোচ্চ {own.layoutConfig.photoSlots}টি ছবি দিন। লেখা ও ছবি পরে যেখানে খুশি সরাতে পারবেন।
              </p>
            </div>
            <div className="p-3">
              <span className="block rounded-md bg-green-700 px-4 py-2 text-center font-semibold text-white">ডিজাইন আপলোড করুন</span>
            </div>
          </Link>
        )}
      </div>
    </main>
  );
}
