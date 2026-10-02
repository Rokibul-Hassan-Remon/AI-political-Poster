# Templates — Architecture

## Model `Template`
| field | type | notes |
|---|---|---|
| title | string | Bangla display name |
| slug | string | unique; maps to `server/src/templates/<slug>.html` |
| occasionType | enum | see business.md |
| thumbnailUrl | string | |
| layoutConfig | object | `{ photoSlots: 1-3, defaultScheme: {primary,secondary,accent,text}, headlineDefault }` |
| isActive | boolean | default true |

## Endpoints
| method | path | auth | notes |
|---|---|---|---|
| GET | `/api/templates?occasion=` | – | active only |
| GET | `/api/templates/:id` | – | |

Admin CRUD endpoints: post-MVP.

## HTML templates
One file per template: `server/src/templates/<slug>.html`, 1200×1600 CSS px, placeholders filled by `render.service` (see generation module). Bangla fonts bundled locally in `server/src/templates/fonts/`.

## Seed
`npm run seed` (`server/src/scripts/seed.ts`): upserts templates by slug and the admin user. Idempotent.
