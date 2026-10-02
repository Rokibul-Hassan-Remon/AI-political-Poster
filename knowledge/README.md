# Knowledge Base

Source of truth for *what* we build (business.md) and *how* (architecture.md), per module.
Code wins over docs when they disagree — then fix the doc.

## Modules

| Module | Owns | Status |
|---|---|---|
| [auth](auth/) | register, login, JWT, roles | done |
| [storage](storage/) | photo upload, Cloudinary | done |
| [templates](templates/) | poster templates, seed script | done |
| [posters](posters/) | poster request, status, history, regenerate, delete | done (generation stubbed) |
| [generation](generation/) | Gemini suggestion + Puppeteer render + export | planned |

System overview: [architecture.md](architecture.md). Cross-cutting decisions: [decisions.md](decisions.md).
End-user guide lives outside this folder: [../user-manual/](../user-manual/).

## MVP scope (deadline 2026-10-04)
In: auth, 2–3 seeded templates, form → generate → preview → regenerate (max 3) → PNG/PDF download, history, rate limit, deploy.
Out (post-MVP): OTP, admin UI, moderation queue, analytics, bulk CSV, payments, watermark, font picker, Gemini image generation.

## Conventions
- **Language:** TypeScript strict in both apps. No `any` unless commented why.
- **Server layout:** `src/{config,models,routes,middleware,services,templates,scripts}`. Route file = routes + handlers for one module; extract to `services/` only for logic shared or external (Gemini, Puppeteer, Cloudinary).
- **Validation:** `zod` at every request boundary (body, params, query).
- **Errors:** throw → one error middleware → `{ "error": { "message": string } }` with correct HTTP status (400 validation, 401 no/invalid token, 403 not owner/admin, 404, 429, 500).
- **Success responses:** return the resource directly (no `{ success, data }` wrapper).
- **Auth:** `Authorization: Bearer <access jwt>` + httpOnly refresh cookie (D7). User id always from the token, never from URL/body.
- **Config:** all secrets/URLs in `.env`, read once in `server/src/config/env.ts` (validated with zod). `.env.example` lists every key.
- **Naming:** camelCase vars/fields, PascalCase models/components, kebab-case URLs, plural REST nouns.
- **Bangla text:** user text is rendered exactly as typed. AI never rewrites name/designation/headline.
- **Commits:** small, one feature each, imperative message (`Add login endpoint`).

## Constraints for AI-assisted work
1. One module per session/task. `/clear` between modules.
2. Docs first: AI reads module docs before coding; updates them after.
3. Every endpoint is tested by hand (Thunder Client) before moving on; the human reads every diff.
4. No new dependency without a reason in the PR/commit message.
5. Secrets never go into chat, code, or docs.
6. When AI is unsure about an external API (Gemini model names, SDK signatures), verify in official docs — don't guess.
