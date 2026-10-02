# Rise Together — AI Political Poster Maker

Users fill a form (name, designation, party, area, occasion, Bangla headline, ≤3 photos) → AI suggests layout/colors → server renders a print-ready Bangladeshi-style poster (PNG/PDF).

- `client/` Next.js (App Router, TS, Tailwind) — port 3000
- `server/` Express (TS), Mongoose, Puppeteer, Gemini — port 5000
- Deadline: 2026-10-04. MVP only; see `knowledge/README.md` for scope.

## Docs map
- `knowledge/` — for developers/AI. Start at `knowledge/architecture.md` (system overview) and `knowledge/README.md` (conventions).
- `user-manual/` — for end users: `en.md`, `bn.md`. Never mix developer details into it.
- Skills: `/explain` (answer from docs), `/feature <module>` (docs-first build workflow).

## Before working on a feature
1. Read `knowledge/README.md` (conventions + constraints).
2. Read only the module you touch: `knowledge/<module>/business.md` and `architecture.md`.
3. Check `knowledge/decisions.md` before changing an approach.

## Rules
- Reply to the user in Bangla; code, docs and commits in English (except `user-manual/bn.md`).
- Any change to behavior, API, model or env var → update that module's knowledge docs in the same change.
- Any change a user can see → update both `user-manual/en.md` and `user-manual/bn.md`.
- Never commit `.env`. Never ask the user to paste secrets in chat.
