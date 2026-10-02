"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PosterFields, readPosterText, type Poster } from "../../poster-fields";

type Template = { _id: string; title: string; layoutConfig: { photoSlots: number; headlineDefault: string } };

export default function CreatePage() {
  const { templateId } = useParams<{ templateId: string }>();
  const router = useRouter();
  const [template, setTemplate] = useState<Template | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Template>(`/api/templates/${templateId}`).then(setTemplate).catch((e: Error) => setError(e.message));
  }, [templateId]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const photos = (form.elements.namedItem("photos") as HTMLInputElement).files!;
    const slots = template!.layoutConfig.photoSlots;
    if (photos.length < 1 || photos.length > slots) return setError(`১ থেকে ${slots}টি ছবি দিন।`);

    setBusy(true);
    setError("");
    try {
      const upload = new FormData();
      for (const p of photos) upload.append("photos", p);
      const { urls } = await api<{ urls: string[] }>("/api/upload", { method: "POST", body: upload });
      const poster = await api<Poster>("/api/posters", {
        method: "POST",
        body: JSON.stringify({ templateId, formData: readPosterText(form), uploadedPhotoUrls: urls }),
      });
      router.push(`/posters/${poster._id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  if (!template) return <main className="p-6">{error ? <p className="text-red-600">{error}</p> : "লোড হচ্ছে…"}</main>;

  return (
    <main className="mx-auto w-full max-w-xl p-6">
      <h1 className="mb-4 text-3xl font-bold text-green-700">{template.title}</h1>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <PosterFields headlinePlaceholder={template.layoutConfig.headlineDefault} />
        <label className="flex flex-col gap-1">
          <span>
            ছবি (১–{template.layoutConfig.photoSlots}টি, প্রথম ছবিটি মূল ছবি) <span className="text-red-600">*</span>
          </span>
          <input name="photos" type="file" multiple required accept="image/jpeg,image/png,image/webp" />
        </label>
        {error && <p className="text-red-600">{error}</p>}
        <button disabled={busy} className="rounded bg-green-700 px-4 py-2 font-semibold text-white disabled:opacity-50">
          {busy ? "পাঠানো হচ্ছে…" : "পোস্টার তৈরি করুন"}
        </button>
      </form>
    </main>
  );
}
