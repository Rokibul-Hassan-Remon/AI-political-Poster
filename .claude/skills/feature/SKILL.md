---
name: feature
description: Build or change one module (auth, storage, templates, posters, generation) the docs-first way. Use when the user says "/feature <module>", "start the auth module", "implement posters", or similar.
---

Argument: module name. One module per session.

1. **Read** `knowledge/README.md`, `knowledge/<module>/business.md`, `knowledge/<module>/architecture.md`. Check `knowledge/decisions.md` before changing an approach.
2. **Plan** in 3–6 bullets (files to create/edit, endpoints). Confirm with the user if it deviates from the docs.
3. **Build** following README conventions (zod at boundaries, one error middleware, user id from JWT, no new dependency without a reason).
4. **Check**: run `npx tsc --noEmit` in the touched app; give the user exact Thunder Client requests (method, URL, headers, body, expected response) to test each endpoint.
5. **Update docs** in the same change:
   - behavior/API/model/env changed → `knowledge/<module>/*.md` (+ `knowledge/architecture.md` if module table or flow changed; `.env.example` for new env vars)
   - anything the end user sees changed → both `user-manual/en.md` and `user-manual/bn.md`
   - module done → set its status in `knowledge/README.md`
6. **Commit** only when the user asks: one small commit per feature, imperative message.

Explain what you did in Bangla, mapping to ASP.NET Core where it helps.
