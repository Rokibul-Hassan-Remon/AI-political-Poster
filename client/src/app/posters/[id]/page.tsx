"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { MAX_REGENERATES, PosterFields, readPosterText, type Poster } from "../../poster-fields";

export default function PosterPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [poster, setPoster] = useState<Poster | null>(null);
  const [error, setError] = useState("");

  // Poll every 2s while the background job runs.
  const generating = !poster || poster.status === "generating";
  useEffect(() => {
    if (!generating) return;
    const load = () => api<Poster>(`/api/posters/${id}`).then(setPoster).catch((e: Error) => setError(e.message));
    load();
    const timer = setInterval(load, 2000);
    return () => clearInterval(timer);
  }, [id, generating]);

  async function regenerate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    try {
      setPoster(await api<Poster>(`/api/posters/${id}/regenerate`, { method: "POST", body: JSON.stringify({ formData: readPosterText(e.currentTarget) }) }));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function remove() {
    if (!confirm("পোস্টারটি মুছে ফেলবেন?")) return;
    await api(`/api/posters/${id}`, { method: "DELETE" }).then(() => router.push("/history"), (e: Error) => setError(e.message));
  }

  if (!poster) return <main className="p-6">{error ? <p className="text-red-600">{error}</p> : "লোড হচ্ছে…"}</main>;
  const left = MAX_REGENERATES - poster.regenerateCount;

  return (
    <main className="mx-auto grid w-full max-w-5xl gap-6 p-6 md:grid-cols-2">
      <section>
        {poster.status === "generating" && <p className="animate-pulse text-lg">পোস্টার তৈরি হচ্ছে… একটু অপেক্ষা করুন।</p>}
        {poster.status === "failed" && <p className="text-red-600">পোস্টার তৈরি হয়নি: {poster.error}</p>}
        {poster.status === "completed" && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={poster.generatedImageUrl} alt="পোস্টার" className="w-full rounded border" />
            <div className="mt-3 flex gap-3">
              <a href={poster.generatedImageUrl} target="_blank" className="rounded bg-green-700 px-4 py-2 font-semibold text-white">PNG ডাউনলোড</a>
              <a href={poster.generatedPdfUrl} target="_blank" className="rounded border border-green-700 px-4 py-2 font-semibold text-green-700">PDF ডাউনলোড</a>
            </div>
          </>
        )}
      </section>

      <section>
        <form onSubmit={regenerate} className="flex flex-col gap-4">
          <PosterFields defaults={poster.formData} />
          {error && <p className="text-red-600">{error}</p>}
          <button
            disabled={poster.status === "generating" || left <= 0}
            className="rounded bg-green-700 px-4 py-2 font-semibold text-white disabled:opacity-50"
          >
            {poster.status === "failed" ? "আবার চেষ্টা করুন" : "আবার তৈরি করুন"} ({left}বার বাকি)
          </button>
        </form>
        <div className="mt-6 flex gap-4">
          <Link href="/history" className="underline">আমার পোস্টার</Link>
          <button onClick={remove} className="text-red-600 underline">মুছে ফেলুন</button>
        </div>
      </section>
    </main>
  );
}
