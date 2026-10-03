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
The generation module owns the placeholder contract. One file per template: `server/src/templates/<slug>.html`, 1200×1600 CSS px, placeholders filled by `render.service` (see generation module). Bangla fonts bundled locally in `server/src/templates/fonts/`.

Design conventions (keep when adding a template):
- Decorations (rays, sun/moon, patterns, bands) are plain `position:absolute; z-index:-1` divs or body pseudo-elements: behind every `[data-layer]` part, above the body background. Never give `.photos` a `z-index` — it would trap the photos in a stacking context and break the editor's "bring to front".
- Colors come only from `{{primary}}/{{secondary}}/{{accent}}/{{text}}` (plus white/black alpha), since Gemini may swap the scheme. Hex alpha suffixes (`{{accent}}40`) are fine.
- Size photos for `.n1/.n2/.n3` (3 photos must fit in ~1080px width); shape overrides keep the template's width.
- Text keeps the `.headline/.name/.meta` classes (user text colors override `color`), so headline effects use `-webkit-text-stroke` + `paint-order` and `text-shadow`, not gradient-clipped text.

## Seed
`npm run seed` (`server/src/scripts/seed.ts`): renders each template's thumbnail (needs Cloudinary + Chromium), upserts templates by slug (`victory-day-classic`, `mourning-tribute`, `campaign-bold`, `eid-mubarak`, `greetings-warm`, `ekushey-february`, `independence-day`, `intellectuals-day`, `genocide-night`, `pohela-boishakh`, `durga-puja`, `buddha-purnima`, `christmas`, `own-design`) and, if `ADMIN_EMAIL` + `ADMIN_PASSWORD` are set, the admin user (role `admin`, password reset to the env value on every run). Idempotent.

## Client
`client/src/app/templates/page.tsx`: occasion filter chips and cards for the templates link to `/create/[templateId]`; the `customBackground` template ("own design", fetched once via `?occasion=custom`) is always the last card in the grid, whatever the filter. Linked from the site header (`user-menu.tsx`, every page) and the home page hero, which also shows the first 3 template thumbnails.

## Files
`server/src/models/Template.ts`, `server/src/routes/templates.ts`, `server/src/scripts/seed.ts`

## Env
`ADMIN_EMAIL`, `ADMIN_PASSWORD` — optional, seed only.
