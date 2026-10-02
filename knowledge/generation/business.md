# Generation — Business

## What AI decides
- Color scheme fitting the occasion (e.g. victory-day: green/red; mourning: black/white/grey).
- Headline size class (short vs long text).

## What AI never decides
- User's name, designation, organization, area, headline — rendered exactly as typed. Gemini never even receives them (only the headline length).

## Output
- PNG at 2400×3200 px (print-ready, ≥1200×1600 required).
- PDF of the same poster.
- If Gemini fails, times out or has no API key: render with the template's default scheme, headline size by length (poster still succeeds).

## Content safety (MVP level)
- Gemini sees no user text, so its safety filters don't apply to it.
- Deferred: reject headline/form text matching a blocklist of slurs/hate terms (needs a curated Bangla list from the team).

## Deferred
- Optional AI slogan line: needs a "clear slogan" control in the UI first.

## Photo placement (user decides)
- The user picks the **main photo** on the form (মূল ছবি); other photos keep upload order.
- With 1 or 3 photos the main photo sits in the middle (largest on 3-photo templates); with 2 it is the first (left).
- Inside its frame, the user can drag (pan) and zoom (1–3×) each photo so the face sits right; the poster uses the same crop.
- Moving photos to other places on the poster is post-MVP (D8).
