# Templates — Architecture

## Model `Template`
| field | type | notes |
|---|---|---|
| title | string | Bangla display name |
| slug | string | unique; maps to `server/src/templates/<slug>.html` |
| occasionType | enum | see business.md (`OCCASIONS` in `models/Template.ts`) |
| thumbnailUrl | string | set by seed: the real template rendered with sample data, uploaded to Cloudinary `rise-together/thumbnails` (600px via URL transform). Client falls back to a color block when empty |
| layoutConfig | object | `{ photoSlots: 1-3, defaultScheme: {primary,secondary,accent,text} (#rrggbb), headlineDefault, customBackground (bool, default false: poster must send `backgroundUrl`) }` |
| isActive | boolean | default true |

## Endpoints
| method | path | auth | notes |
|---|---|---|---|
| GET | `/api/templates?occasion=` | – | active only, oldest first; unknown `occasion` → 400 |
| GET | `/api/templates/:id` | – | invalid id or inactive → 404 |

Admin CRUD endpoints: post-MVP.

## HTML templates
Not created yet — written with the generation module, which owns the placeholder contract. One file per template: `server/src/templates/<slug>.html`, 1200×1600 CSS px, placeholders filled by `render.service` (see generation module). Bangla fonts bundled locally in `server/src/templates/fonts/`.

## Seed
`npm run seed` (`server/src/scripts/seed.ts`): renders each template's thumbnail (needs Cloudinary + Chromium), upserts templates by slug (`victory-day-classic`, `mourning-tribute`, `campaign-bold`, `eid-mubarak`, `greetings-warm`) and, if `ADMIN_EMAIL` + `ADMIN_PASSWORD` are set, the admin user (role `admin`, password reset to the env value on every run). Idempotent.

## Client
`client/src/app/templates/page.tsx`: a banner at the top links to the `customBackground` template ("own design", fetched once via `?occasion=custom`); below it, occasion filter chips and cards for the other templates link to `/create/[templateId]`. Linked from the home page user menu.

## Files
`server/src/models/Template.ts`, `server/src/routes/templates.ts`, `server/src/scripts/seed.ts`

## Env
`ADMIN_EMAIL`, `ADMIN_PASSWORD` — optional, seed only.
