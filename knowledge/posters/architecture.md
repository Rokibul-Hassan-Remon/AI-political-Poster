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

Rate limit (`express-rate-limit`, keyed by user id) on create + regenerate.

## Flow
`route` → save Poster → `generation.service.run(posterId)` (not awaited) → updates Poster status.
On server boot: mark leftover `generating` posters as `failed` (see decisions D4).

## Frontend pages
- `/templates` — library with occasion filter
- `/create/[templateId]` — form + upload
- `/posters/[id]` — polling, preview, edit text, regenerate, download
- `/history` — list
