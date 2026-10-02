# Decisions (ADR log)

Short records of choices that are expensive to reverse. Add new ones at the bottom.

## D1 — Render posters with HTML + Puppeteer, not AI image generation (2026-10-02)
AI image models misspell Bangla conjuncts. Gemini only returns a JSON suggestion (color scheme, photo slot order, headline size, optional slogan); Puppeteer renders the HTML template with the user's exact text.

## D2 — Decorations via CSS, Gemini image generation deferred (2026-10-02)
Image generation on Gemini free tier is uncertain and slow. Templates use CSS (flag colors, gradients, borders) and framed photos. Revisit after MVP.

## D3 — Backend on Render (Docker), frontend on Vercel (2026-10-02)
Puppeteer needs Chromium + Bangla fonts + long requests; Vercel serverless is a poor fit.

## D4 — In-process background job, no queue (2026-10-02)
`POST /api/posters` saves `status: generating`, returns immediately, renders in the same process; client polls. Ceiling: jobs are lost on server restart (mark stale `generating` as `failed` on boot). Upgrade: BullMQ + Redis if load grows.

## D5 — `GET /api/posters/me` instead of `/api/posters/user/:userId` (2026-10-02)
Prevents IDOR; user id comes from the JWT.

## D6 — JWT in `Authorization` header, stored in localStorage (2026-10-02) — superseded by D7
Frontend and backend are on different domains; httpOnly cross-site cookies add CORS/SameSite complexity. Ceiling: XSS can read the token. Upgrade: httpOnly cookie behind a shared domain.

## D7 — Access token in memory + refresh token in httpOnly cookie, via Next.js rewrite proxy (2026-10-03)
Access JWT (15 min) returned in the body and kept in JS memory; refresh JWT (7 days) in an httpOnly, secure, sameSite=strict cookie scoped to `/api/auth`. XSS can no longer steal a long-lived token. Vercel and Render are different sites, so the client proxies `/api/*` to Express with `next.config.ts` rewrites — the cookie is first-party and CORS is unused by the browser. Ceiling: refresh tokens aren't rotated or revocable (logout only clears the cookie). Upgrade: `tokenVersion` on User, bumped on logout/password change.
