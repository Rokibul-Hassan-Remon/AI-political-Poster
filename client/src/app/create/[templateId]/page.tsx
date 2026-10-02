"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PosterFields, readPosterText, type Poster } from "../../poster-fields";

type Template = { _id: string; title: string; layoutConfig: { photoSlots: number; headlineDefault: string } };
// x, y: focal point in % (object-position); zoom 1–3. The server renders the same crop (render.service adjustStyle).
type Photo = { file: File; url: string; x: number; y: number; zoom: number };

const ACCEPT = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024; // mirrors server/src/routes/upload.ts
const clamp = (n: number) => Math.min(100, Math.max(0, n));

export default function CreatePage() {
  const { templateId } = useParams<{ templateId: string }>();
  const router = useRouter();
  const [template, setTemplate] = useState<Template | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);

  useEffect(() => {
    api<Template>(`/api/templates/${templateId}`).then(setTemplate).catch((e: Error) => setError(e.message));
  }, [templateId]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (photos.length < 1) return setError("অন্তত ১টি ছবি দিন।");

    setBusy(true);
    setError("");
    try {
      const upload = new FormData();
      for (const p of photos) upload.append("photos", p.file);
      const { urls } = await api<{ urls: string[] }>("/api/upload", { method: "POST", body: upload });
      const photoAdjust = photos.map(({ x, y, zoom }) => ({ x: Math.round(x), y: Math.round(y), zoom }));
      const poster = await api<Poster>("/api/posters", {
        method: "POST",
        body: JSON.stringify({ templateId, formData: readPosterText(form), uploadedPhotoUrls: urls, photoAdjust }),
      });
      router.push(`/posters/${poster._id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  function addPhotos(files: FileList | null) {
    const picked = [...(files ?? [])];
    const bad = picked.find((f) => !ACCEPT.includes(f.type) || f.size > MAX_BYTES);
    if (bad) return setError(`"${bad.name}" নেওয়া যাচ্ছে না — শুধু JPG/PNG/WEBP, সর্বোচ্চ ৫ MB।`);
    setError("");
    const room = template!.layoutConfig.photoSlots - photos.length;
    const added = picked.slice(0, room).map((file) => ({ file, url: URL.createObjectURL(file), x: 50, y: 50, zoom: 1 }));
    setPhotos([...photos, ...added]);
  }

  function removePhoto(i: number) {
    URL.revokeObjectURL(photos[i].url);
    setPhotos(photos.filter((_, j) => j !== i));
  }

  const makeMain = (i: number) => setPhotos([photos[i], ...photos.filter((_, j) => j !== i)]);
  const adjust = (i: number, f: (p: Photo) => Partial<Photo>) => setPhotos((ps) => ps.map((p, j) => (j === i ? { ...p, ...f(p) } : p)));

  // Drag the photo inside its frame: moving right shows more of the left side, so the focal point moves left.
  function startDrag(i: number, e: React.PointerEvent<HTMLImageElement>) {
    const img = e.currentTarget;
    img.setPointerCapture(e.pointerId);
    const { width, height } = img.getBoundingClientRect();
    let last = { x: e.clientX, y: e.clientY };
    img.onpointermove = (m) => {
      const dx = m.clientX - last.x;
      const dy = m.clientY - last.y;
      last = { x: m.clientX, y: m.clientY };
      adjust(i, (p) => ({ x: clamp(p.x - (dx / width) * 100), y: clamp(p.y - (dy / height) * 100) }));
    };
    img.onpointerup = img.onpointercancel = () => (img.onpointermove = null);
  }

  if (!template) return <main className="p-6">{error ? <p className="text-red-600">{error}</p> : "লোড হচ্ছে…"}</main>;

  return (
    <main className="mx-auto w-full max-w-xl p-6">
      <h1 className="mb-4 text-3xl font-bold text-green-700">{template.title}</h1>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <PosterFields headlinePlaceholder={template.layoutConfig.headlineDefault} />
        <div className="flex flex-col gap-1">
          <span>
            ছবি (সর্বোচ্চ {template.layoutConfig.photoSlots}টি) <span className="text-red-600">*</span>
          </span>
          <div className="grid grid-cols-3 gap-3">
            {photos.map((p, i) => (
              <div key={p.url} className="flex flex-col gap-1">
                <div className="relative aspect-3/4 overflow-hidden rounded border-2 border-green-700">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
                  <img
                    src={p.url}
                    alt={`ছবি ${i + 1}`}
                    draggable={false}
                    onPointerDown={(e) => startDrag(i, e)}
                    className="h-full w-full cursor-move touch-none select-none object-cover"
                    style={{ objectPosition: `${p.x}% ${p.y}%`, transform: `scale(${p.zoom})`, transformOrigin: `${p.x}% ${p.y}%` }}
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    aria-label="ছবি সরান"
                    className="absolute right-1 top-1 h-7 w-7 rounded-full bg-black/60 text-white"
                  >
                    ×
                  </button>
                  {i === 0 ? (
                    <span className="absolute inset-x-0 bottom-0 bg-green-700 py-1 text-center text-sm text-white">মূল ছবি</span>
                  ) : (
                    <button type="button" onClick={() => makeMain(i)} className="absolute inset-x-0 bottom-0 bg-black/60 py-1 text-sm text-white">
                      মূল ছবি করুন
                    </button>
                  )}
                </div>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.05}
                  value={p.zoom}
                  onChange={(e) => adjust(i, () => ({ zoom: Number(e.target.value) }))}
                  aria-label={`ছবি ${i + 1} জুম`}
                  className="accent-green-700"
                />
              </div>
            ))}
            {photos.length < template.layoutConfig.photoSlots && (
              <label className="flex aspect-3/4 cursor-pointer flex-col items-center justify-center gap-1 rounded border-2 border-dashed border-gray-400 text-gray-600 hover:border-green-700 hover:text-green-700">
                <span className="text-4xl leading-none">+</span>
                <span className="text-sm">ছবি যোগ করুন</span>
                <input
                  type="file"
                  multiple
                  accept={ACCEPT.join(",")}
                  className="sr-only"
                  onChange={(e) => {
                    addPhotos(e.target.files);
                    e.target.value = ""; // lets the same file be picked again after removing it
                  }}
                />
              </label>
            )}
          </div>
          <span className="text-sm text-gray-500">
            JPG, PNG বা WEBP, প্রতিটি সর্বোচ্চ ৫ MB। মূল ছবিটি পোস্টারের প্রধান জায়গায় বসবে। ছবি টেনে সরান, নিচের স্লাইডারে জুম করুন।
          </span>
        </div>
        {error && <p className="text-red-600">{error}</p>}
        <button disabled={busy} className="rounded bg-green-700 px-4 py-2 font-semibold text-white disabled:opacity-50">
          {busy ? "পাঠানো হচ্ছে…" : "পোস্টার তৈরি করুন"}
        </button>
      </form>
    </main>
  );
}
