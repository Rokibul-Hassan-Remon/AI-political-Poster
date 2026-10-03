"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { MAX_REGENERATES, PosterFields, readPosterText, type LayoutEntry, type Poster, type TextColors } from "../../poster-fields";

// Konva needs the browser's canvas: never render it on the server.
const LayoutEditor = dynamic(() => import("./layout-editor"), { ssr: false });

// Cloudinary's fl_attachment makes the browser save the file instead of opening it in a tab.
const download = (url?: string) => url?.replace("/upload/", "/upload/fl_attachment:poster/");

export default function PosterPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [poster, setPoster] = useState<Poster | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);

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

  async function saveLayout(layout: LayoutEntry[], textColors: TextColors) {
    setError("");
    try {
      setPoster(await api<Poster>(`/api/posters/${id}/layout`, { method: "PUT", body: JSON.stringify({ layout, textColors }) }));
      setEditing(false);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function remove() {
    if (!confirm("পোস্টারটি মুছে ফেলবেন?")) return;
    await api(`/api/posters/${id}`, { method: "DELETE" }).then(() => router.push("/history"), (e: Error) => setError(e.message));
  }

  if (!poster)
    return (
      <main className="mx-auto w-full max-w-5xl p-6">
        {error ? <p className="text-red-600">{error}</p> : <div className="aspect-3/4 w-full max-w-md animate-pulse rounded-xl bg-neutral-100" />}
      </main>
    );
  const left = MAX_REGENERATES - poster.regenerateCount;

  return (
    <main className="mx-auto grid w-full max-w-5xl gap-6 p-6 md:grid-cols-2">
      {/* Poster on the right on wide screens, first on phones. */}
      <section className="md:order-last">
        {poster.status === "generating" && (
          <div className="flex aspect-3/4 w-full flex-col items-center justify-center gap-4 rounded-xl border border-neutral-200 bg-neutral-50 p-6 text-center">
            <span className="h-12 w-12 animate-spin rounded-full border-4 border-green-700 border-t-transparent" />
            <p className="text-xl font-semibold text-green-800">পোস্টার তৈরি হচ্ছে…</p>
          </div>
        )}
        {poster.status === "failed" && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
            <p className="font-semibold">পোস্টার তৈরি হয়নি।</p>
            <p className="mt-1 text-sm">{poster.error} পাশের ফর্ম থেকে আবার চেষ্টা করুন।</p>
          </div>
        )}
        {poster.status === "completed" && editing && (
          <LayoutEditor poster={poster} onSave={saveLayout} onCancel={() => setEditing(false)} />
        )}
        {poster.status === "completed" && !editing && (
          <div className="relative">
            {/* Actions float over the top of the poster (z-10), so they are seen first without scrolling. */}
            <div className="absolute inset-x-2 top-2 z-10 flex flex-wrap justify-center gap-1.5 rounded-xl bg-black/45 p-1.5 shadow-lg backdrop-blur-sm">
              <a href={download(poster.generatedImageUrl)} className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-green-700 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-green-800">
                {/* Picture with a down arrow: download the image. */}
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3v12M7 10l5 5 5-5M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
                </svg>
                PNG ডাউনলোড
              </a>
              <a href={download(poster.generatedPdfUrl)} className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-green-800 hover:bg-green-50">
                {/* Document with folded corner. */}
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                  <path d="M14 3v5h5M12 11v6M9.5 14.5 12 17l2.5-2.5" />
                </svg>
                PDF ডাউনলোড
              </a>
              {poster.layers && (
                <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-green-800 hover:bg-green-50">
                  {/* Pencil: edit the layout. */}
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                  </svg>
                  লেআউট সম্পাদনা
                </button>
              )}
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={poster.generatedImageUrl} alt="পোস্টার" className="w-full rounded-xl border shadow-lg" />
          </div>
        )}
      </section>

      <section>
        <form onSubmit={regenerate} className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-5 shadow-sm">
          <PosterFields defaults={poster.formData} />
          {error && <p className="text-red-600">{error}</p>}
          <button
            disabled={poster.status === "generating" || left <= 0}
            className="mt-1 rounded-lg bg-green-700 px-4 py-2 font-semibold text-white disabled:opacity-50"
          >
            {poster.status === "failed" ? "আবার চেষ্টা করুন" : "আবার তৈরি করুন"} ({left}বার বাকি)
          </button>
        </form>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Link href="/history" className="flex items-center gap-2 rounded border border-green-700 px-4 py-2 font-semibold text-green-700 hover:bg-green-50">
            {/* Stack of pictures: the user's poster history. */}
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="7" y="3" width="14" height="14" rx="2" />
              <path d="M3 7v12a2 2 0 0 0 2 2h12M7 14l4-4 3 3 2-2 5 5" />
            </svg>
            আমার পোস্টার
          </Link>
          <button onClick={remove} className="flex items-center gap-2 rounded border border-red-600 px-4 py-2 font-semibold text-red-600 hover:bg-red-50">
            {/* Trash can. */}
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6" />
            </svg>
            মুছে ফেলুন
          </button>
        </div>
      </section>
    </main>
  );
}
