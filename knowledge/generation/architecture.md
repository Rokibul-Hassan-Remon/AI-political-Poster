# Generation — Architecture

## Pipeline (`generation.service.run(posterId)`)
1. Load poster + template. Headline = `formData.headline` or `layoutConfig.headlineDefault`.
2. `gemini.service.suggest({ occasionType, defaultScheme, headline })` → JSON validated with zod. On any error (no key, 15s timeout, bad JSON) → fallback: `defaultScheme`, `headlineSize` by headline length (≤12 chars `2xl`, ≤24 `xl`, else `lg`).
3. `render.service.render(slug, data)` → fill `server/src/templates/<slug>.html` → Puppeteer → PNG + PDF buffers.
   `render` also returns the layout-editor cut-outs (see "Layers" below).
4. Upload PNG, PDF, background and layer PNGs to Cloudinary `rise-together/posters/<userId>/` via `storage.service` → `Poster.updateOne` (`completed`, `aiSuggestion`, URLs). Any throw → `failed` + generic `error` (details only in logs/GenerationLog).
5. Write `GenerationLog` (success or failure).

`updateOne` (not `save`) so a poster deleted mid-job is not re-created.

`run(id, { keepSuggestion: true })` (layout save) reuses `poster.aiSuggestion` instead of calling Gemini, so colors don't change.

## Layers + layout (canvas editor, D9)
- Movable elements carry `data-layer`: `headline`, `info` (name/designation/area block) in each template; `photo0..2` added by `render.service` (index = `uploadedPhotoUrls` order).
- After load, for each layer: clip = element box + 60px pad (shadows/outlines), clamped to the page. Captured at 1× (`clip.scale: 0.5`): background JPEG with every layer `visibility:hidden`, then one transparent PNG per layer with everything else hidden.
- Then, if `layout` is non-empty, every layer gets `transform-origin: <clip corner rel. to element>; transform: translate(dx,dy) rotate(r) scale(s)` and `z-index` = its index in `layout` (+1; missing → bottom). Same math as Konva placing the layer image at `(x+dx, y+dy)`.
- Templates must not clip or put a stacking context around a layer (campaign-bold's slanted band is a `::before` for this reason).

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
| `backgroundUrl` | user's own design (Cloudinary, own uploads only); used by `own-design.html` as a full-page `<img class="bg">`, so the load check covers it and it lands in the editor's background layer |

Unknown keys become empty strings. New template = seed entry + `<slug>.html`, with `data-layer="headline"` on the headline and `data-layer="info"` on the name/designation/area block (layout editor, see below), and the classes `.headline`, `.name`, `.meta` on the headline, name and designation/area lines.

User text colors (`poster.textColors`, D11): `fillTemplate` adds `<style>.headline{color:#..!important}…</style>` before `</head>` for each set key; values not matching `#rrggbb` are skipped.

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

Photo shape / removal (`layout[].shape`, `layout[].hidden`, D12): `photoTags` adds the shape's CSS (`height:auto;align-self:center;aspect-ratio:…;border-radius:…`) to that photo's inline style, so it beats the template's `.photo` rules and the layer is cut with the new shape. `hidden` sets `visibility:hidden` after the cut-out, so the slot stays and other layers' moves don't shift.
