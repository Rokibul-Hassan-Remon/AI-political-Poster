# Posters — Architecture

## Model `Poster`
| field | type | notes |
|---|---|---|
| userId | ObjectId → User | indexed |
| templateId | ObjectId → Template | |
| formData | `{ name, designation, organization, area?, headline? }` | |
| uploadedPhotoUrls | string[] | 1–3 |
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
| POST | `/api/posters` | `{templateId, formData, uploadedPhotoUrls}` → poster (`generating`), starts job |
| GET | `/api/posters/me` | history, newest first |
| GET | `/api/posters/:id` | client polls every 2s until not `generating` |
| POST | `/api/posters/:id/regenerate` | optional new `formData`; 409 if limit reached |
| DELETE | `/api/posters/:id` | |

Rate limit (`express-rate-limit`, 10/hour, keyed by user id, in-memory) on create + regenerate → 429.

## Validation & errors
- `formData`: name/designation ≤100, organization/area/headline ≤150, trimmed; empty `area`/`headline` are dropped (headline then falls back to the template default at render).
- `uploadedPhotoUrls`: 1–3, must be `https://res.cloudinary.com/.../rise-together/photos/<userId>/...` (Puppeteer loads them — no SSRF, no other users' photos) → else 400.
- Template must exist and be active (404); photo count ≤ `layoutConfig.photoSlots` (400).
- Not found / bad id → 404; other user's poster → 403.
- Regenerate: 409 while `generating` or when `regenerateCount >= 3`. Body `{ formData? }` replaces the whole formData; photos and template can't change.
- Delete → 204. Generated Cloudinary files are not deleted.

## Flow
`route` → save Poster → `generation.service.run(posterId)` (not awaited) → updates Poster status.
On server boot: `failStaleJobs()` marks leftover `generating` posters as `failed` (see decisions D4).
Until the generation module lands, `run()` is a stub that marks the poster `failed` ("Poster generation is not available yet").

## Files
`server/src/models/Poster.ts`, `server/src/routes/posters.ts`, `server/src/services/generation.service.ts`;
client `src/app/{create/[templateId],posters/[id],history}/page.tsx`, shared fields in `src/app/poster-fields.tsx`.

## Frontend pages
- `/templates` — library with occasion filter
- `/create/[templateId]` — form + upload
- `/posters/[id]` — polling, preview, edit text, regenerate, download
- `/history` — list
