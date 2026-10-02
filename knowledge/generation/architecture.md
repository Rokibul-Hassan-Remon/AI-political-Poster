# Generation — Architecture

## Pipeline (`generation.service.run(posterId)`)
1. Load poster + template. Headline = `formData.headline` or `layoutConfig.headlineDefault`.
2. `gemini.service.suggest({ occasionType, defaultScheme, headline })` → JSON validated with zod. On any error (no key, 15s timeout, bad JSON) → fallback: `defaultScheme`, `headlineSize` by headline length (≤12 chars `2xl`, ≤24 `xl`, else `lg`).
3. `render.service.render(slug, data)` → fill `server/src/templates/<slug>.html` → Puppeteer → PNG + PDF buffers.
4. Upload both to Cloudinary `rise-together/posters/<userId>/` via `storage.service` → `Poster.updateOne` (`completed`, `aiSuggestion`, URLs). Any throw → `failed` + generic `error` (details only in logs/GenerationLog).
5. Write `GenerationLog` (success or failure).

`updateOne` (not `save`) so a poster deleted mid-job is not re-created.

## Gemini
- SDK: `@google/genai`, `ai.models.generateContent` with `responseMimeType: 'application/json'` and `responseJsonSchema: z.toJSONSchema(suggestionSchema)` — one zod schema drives both the request and validation.
- Response: `{ scheme: {primary,secondary,accent,text}, headlineSize: 'lg'|'xl'|'2xl' }` (colors `#RRGGBB`).
- Prompt carries only occasion, default colors, headline length — no user text or PII. Photo order is the user's, not Gemini's (D8).
- Model: `GEMINI_MODEL`, default `gemini-3.8-flash` (`gemini-2.5-flash` returns 404 for new keys as of 2026-10-03).
- Cache by `templateId + occasion` is post-MVP (cost control).

## Render
- One shared Puppeteer browser, launched lazily, reused across jobs; relaunched if Chromium disconnects. Launch args `--no-sandbox --disable-dev-shm-usage` (Docker).
- Viewport 1200×1600, `deviceScaleFactor: 2` → 2400×3200 PNG. `page.pdf({ width:'1200px', height:'1600px', printBackground:true })`.
- `setContent(html, { waitUntil: 'load' })` (Puppeteer 25 has no `networkidle` here), then `document.fonts.ready` and fail if any `<img>` didn't load.
- Templates and fonts are read from `src/templates/` (resolved from `__dirname/../../src`, so it works under `tsx` and `dist/`).

## Templates (`server/src/templates/<slug>.html`)
One self-contained HTML file per seeded template slug. Placeholders `{{key}}`:

| Key | Value |
|---|---|
| `fonts` | `@font-face` CSS with Hind Siliguri 400/700 as base64 data URIs |
| `photos` | `<img class="photo">` per photo in upload order; `uploadedPhotoUrls[0]` (main) also gets class `main` and, with 3 photos, is placed in the middle. With `photoAdjust`, each img gets an inline `object-position` + `object-view-box: inset(...)` crop (Chromium-only CSS; same result as the form preview's `scale(zoom)` around the focal point, without scaling the frame) |
| `photoCount` | `1`–`3` (use as class `n{{photoCount}}` for layout) |
| `headlineSize` | `lg` / `xl` / `2xl` (CSS classes; `2xl` is `.\32xl`) |
| `primary`, `secondary`, `accent`, `text` | hex colors |
| `name`, `designation`, `organization`, `area`, `headline` | user text, HTML-escaped |

Unknown keys become empty strings. New template = seed entry + `<slug>.html`.

## Fonts
Hind Siliguri (Regular, Bold, OFL) bundled in `server/src/templates/fonts/`, embedded as data URIs — no network font loading at render time.

## Model `GenerationLog`
`posterId, promptUsed?, tokensUsed?, latencyMs, success, error?, createdAt`

## Files
`server/src/services/{generation,gemini,render}.service.ts`, `server/src/models/GenerationLog.ts`, `server/src/templates/`

## Env
`GEMINI_API_KEY` (optional — without it every poster uses the fallback), `GEMINI_MODEL`

## Ops notes
- Cloudinary blocks PDF delivery on new accounts by default: Settings → Security → enable "Allow delivery of PDF and ZIP files", or the PDF link returns 401.
- Docker image (deploy, D3) needs Chromium's system libs; Puppeteer downloads Chrome on `npm install`.
