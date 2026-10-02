---
name: explain
description: Explain the project fast — system architecture, one module, or how an end user uses the app. Use when asked "explain the architecture", "how does X work", "how does a user make a poster", or to onboard someone.
---

Answer from the docs, not by scanning code. Read only what the question needs:

| Question about | Read |
|---|---|
| Whole system, request flow, folders, deploy | `knowledge/architecture.md` |
| Why something was chosen | `knowledge/decisions.md` |
| One module (auth, storage, templates, posters, generation) | `knowledge/<module>/business.md` + `architecture.md` |
| How an end user uses the app | `user-manual/bn.md` (Bangla) or `user-manual/en.md` |
| Coding rules | `knowledge/README.md` |

Then:
1. Reply in Bangla (technical terms may stay English).
2. Start with a 3–5 line summary, then detail only if asked.
3. The user knows ASP.NET Core MVC — map new concepts to it (Express route ≈ Controller, Mongoose ≈ EF Core, zod ≈ DataAnnotations, React component ≈ Razor partial).
4. If docs and code disagree, say so and trust the code.
