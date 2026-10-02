// Text fields shared by /create/[templateId] (new poster) and /posters/[id] (edit + regenerate).

export type PosterText = { name: string; designation: string; organization: string; area?: string; headline?: string };
export type Poster = {
  _id: string;
  templateId: string;
  formData: PosterText;
  uploadedPhotoUrls: string[];
  generatedImageUrl?: string;
  generatedPdfUrl?: string;
  status: "generating" | "completed" | "failed";
  error?: string;
  regenerateCount: number;
  createdAt: string;
};

export const MAX_REGENERATES = 3;

const FIELDS: [keyof PosterText, string, boolean][] = [
  ["name", "নাম", true],
  ["designation", "পদবি", true],
  ["organization", "দল / সংগঠন", true],
  ["area", "এলাকা (ইউনিয়ন / থানা / জেলা)", false],
  ["headline", "শিরোনাম", false],
];

export function PosterFields({ defaults, headlinePlaceholder }: { defaults?: PosterText; headlinePlaceholder?: string }) {
  return FIELDS.map(([key, label, required]) => (
    <label key={key} className="flex flex-col gap-1">
      <span>
        {label} {required && <span className="text-red-600">*</span>}
      </span>
      <input
        name={key}
        required={required}
        maxLength={150}
        defaultValue={defaults?.[key] ?? ""}
        placeholder={key === "headline" ? headlinePlaceholder : undefined}
        className="rounded border px-3 py-2"
      />
    </label>
  ));
}

/** Reads the PosterFields inputs out of a submitted <form>. */
export function readPosterText(form: HTMLFormElement): PosterText {
  const get = (k: keyof PosterText) => String(new FormData(form).get(k) ?? "");
  return { name: get("name"), designation: get("designation"), organization: get("organization"), area: get("area"), headline: get("headline") };
}
