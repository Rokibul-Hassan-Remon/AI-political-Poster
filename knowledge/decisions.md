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

## D8 — User picks the main photo; fixed slots, no freeform placement (2026-10-03) — placement part superseded by D9
Gemini only got a photo count, never the photos, so its `photoOrder` was arbitrary and could override the user's choice; removed. The user marks one photo as main on the form (`uploadedPhotoUrls[0]`); templates keep fixed slots so photos never cover the headline/footer. Pan + zoom inside each frame is allowed (`photoAdjust`, native CSS, no editor library). Ceiling: photos can't leave their slot. Upgrade: per-slot picker, or a canvas editor (react-konva) with saved positions.

## D9 — Canvas layout editor (react-konva) over server-cut layers (2026-10-03)
Users wanted to move/resize/rotate the headline, name box and photos anywhere. Konva drawing Bangla text itself risks broken conjuncts and a second renderer that drifts from Puppeteer. Instead, each render also cuts every `[data-layer]` element out as a transparent PNG (+ a background JPEG without them); the editor only drags those images. Saving stores `{key, dx, dy, scale, rotate}` per layer; Puppeteer applies the same move as a CSS `transform` (origin = the layer image's top-left), so editor and PNG/PDF match. Layout order = paint order (`z-index`). Ceilings: text can't be edited inside the canvas (form + regenerate); each render uploads 3–6 extra files to Cloudinary; posters rendered before D9 need one regenerate to get layers. Upgrade: native Konva text once Bangla shaping is verified.

## D10 — "Own design" template: user uploads the background (2026-10-03)
Some users won't like any built-in design. Rather than a template builder, one extra template (`own-design`, `layoutConfig.customBackground: true`) renders the user's uploaded image full-page behind the usual headline/photos/name block; the D9 editor then places those anywhere on it. Reuses `/api/upload` and the editor, no new dependency. Ceiling: non-3:4 images are cropped (`object-fit: cover`); text colors come from the scheme, not from the image. Upgrade: pick text color from the image, or let users save their designs as reusable templates.

## D11 — User picks text colors per section, applied as a CSS override (2026-10-03)
Users didn't want to be stuck with the template/AI colors (e.g. yellow name). The layout editor offers three color pickers (headline, name, designation/area) saved as `poster.textColors` with the layout PUT, so trying colors never uses up a regenerate. Every template already styles these with `.headline`, `.name`, `.meta`, so `render.service` appends one `!important` color rule per set key instead of changing each template. Ceiling: color only (no per-section font/size), and the canvas shows the new color only after saving (it drags images of the last render). Upgrade: pickers on the create form too, or a live CSS preview.
