# Posters — Architecture

## Model `Poster`
| field | type | notes |
|---|---|---|
| userId | ObjectId → User | indexed |
| templateId | ObjectId → Template | |
| formData | `{ name, designation, organization, area?, headline? }` | |
| uploadedPhotoUrls | string[] | 1–3 |
| backgroundUrl | string | optional; user's own design, only kept for templates with `customBackground` |
| photoAdjust | `{ x, y, zoom }[]` | optional, one per photo: focal point % (0–100) + zoom (1–3), set by pan/zoom on the form |
| layout | `{ key, dx, dy, scale, rotate, shape?, hidden? }[]` | optional, from the canvas editor; array order = paint order (D9); `shape`/`hidden` per photo (D12) |
| textColors | `{ headline?, name?, meta? }` (#rrggbb) | optional, from the editor; a missing key keeps the template/AI color (D11) |
| layers | `{ background, items: { key, url, x, y, w, h }[] }` | cut-outs of the last render for the editor |
| aiSuggestion | object | Gemini JSON used for the last render |
| generatedImageUrl | string | PNG |
| generatedPdfUrl | string | |
| status | `'generating' \| 'completed' \| 'failed'` | |
| error | string | set when failed |
| regenerateCount | number | max 3 |
| createdAt | Date | timestamps |

## Endpoints (all `requireAuth`, owner-only)
| method | path | notes |
|---|---|---|
| POST | `/api/posters` | `{templateId, formData, uploadedPhotoUrls, backgroundUrl?, photoAdjust?}` → poster (`generating`), starts job |
| GET | `/api/posters/me` | history, newest first |
| GET | `/api/posters/:id` | client polls every 2s until not `generating` |
| POST | `/api/posters/:id/regenerate` | optional new `formData`; 409 if limit reached |
| PUT | `/api/posters/:id/layout` | `{ layout, textColors? }` → re-render with the kept AI colors + the user's text colors; not a regenerate; 409 while `generating` |
| DELETE | `/api/posters/:id` | |

Rate limit (`express-rate-limit`, 10/hour, keyed by user id, in-memory) on create + regenerate → 429.

## Validation & errors
- `formData`: name/designation ≤100, organization/area/headline ≤150, trimmed; empty `area`/`headline` are dropped (headline then falls back to the template default at render).
- `uploadedPhotoUrls`: 1–3, must be `https://res.cloudinary.com/.../rise-together/photos/<userId>/...` (Puppeteer loads them — no SSRF, no other users' photos) → else 400.
- `photoAdjust` (optional): one `{x, y, zoom}` per photo, x/y 0–100, zoom 1–3 → else 400. Regenerate keeps it.
- `backgroundUrl`: same Cloudinary own-upload rule as photos; required (400) when the template has `customBackground`, dropped otherwise. Client uploads it with a separate `POST /api/upload`.
- Template must exist and be active (404); photo count ≤ `layoutConfig.photoSlots` (400).
- Not found / bad id → 404; other user's poster → 403.
- Regenerate: 409 while `generating` or when `regenerateCount >= 3`. Body `{ formData? }` replaces the whole formData; photos and template can't change.
- `layout`: ≤5 entries, key `headline|info|photo0|photo1|photo2`, dx/dy ±1600, scale 0.2–4, rotate ±180 → else 400.  Optional `shape` `circle|square|portrait|landscape` and `hidden` boolean (D12). Rate-limited like create. Regenerate keeps it.
- `textColors` (optional, same PUT): only keys `headline|name|meta`, each `#rrggbb` → else 400. Omitted → cleared (the editor always sends it). Regenerate keeps it.
- Delete → 204. Generated Cloudinary files are not deleted.

## Flow
`route` → save Poster → `generation.service.run(posterId)` (not awaited) → updates Poster status.
On server boot: `failStaleJobs()` marks leftover `generating` posters as `failed` (see decisions D4).

## Files
`server/src/models/Poster.ts`, `server/src/routes/posters.ts`, `server/src/services/generation.service.ts`;
client `src/app/{create/[templateId],posters/[id],history}/page.tsx`, shared fields in `src/app/poster-fields.tsx`.

## Frontend pages
- `/templates` — library with occasion filter
- `/create/[templateId]` — form + upload
- `/posters/[id]` — polling, preview, edit text, regenerate, download, layout editor (`layout-editor.tsx`, react-konva, loaded with `ssr: false`)
- `/history` — list
