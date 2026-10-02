# Generation — Architecture

## Pipeline (`generation.service.run(posterId)`)
1. Load poster + template.
2. `gemini.service.suggest(template, formData, photoCount)` → JSON validated with zod; on error/timeout (15s) → `template.layoutConfig.defaultScheme`.
3. `render.service.render(slug, data)` → fill `server/src/templates/<slug>.html` → Puppeteer → PNG buffer + PDF buffer.
4. Upload both via `storage.service` → update Poster (`completed`), or set `failed` + `error`.
5. Write `GenerationLog`.

## Gemini
- SDK: `@google/genai`. Text model (e.g. a current `gemini-*-flash`; verify name in AI Studio docs).
- `responseMimeType: 'application/json'` + response schema:
  `{ scheme: {primary,secondary,accent,text}, photoOrder: number[], headlineSize: 'lg'|'xl'|'2xl', slogan?: string }`
- Cache by `templateId + occasion` is post-MVP (cost control).

## Render
- One shared Puppeteer browser, launched lazily, reused across jobs.
- Viewport 1200×1600, `deviceScaleFactor: 2` → 2400×3200 PNG. `page.pdf({ width:'1200px', height:'1600px', printBackground:true })`.
- Fill placeholders by escaping user text (HTML-escape — never inject raw).
- Wait for `document.fonts.ready` and all `<img>` loaded before screenshot.
- Fonts: Noto Serif Bengali / Hind Siliguri files bundled locally (no network font loading at render time).

## Model `GenerationLog`
`posterId, promptUsed, tokensUsed, latencyMs, success, error?, createdAt`

## Files
`server/src/services/{generation,gemini,render}.service.ts`, `server/src/models/GenerationLog.ts`

## Env
`GEMINI_API_KEY`, `GEMINI_MODEL`
