# Generation — Business

## What AI decides
- Color scheme fitting the occasion (e.g. victory-day: green/red; mourning: black/white/grey).
- Order of photos in slots.
- Headline size class (short vs long text).

## What AI never decides
- User's name, designation, organization, area, headline — rendered exactly as typed. Gemini never even receives them (only the headline length).

## Output
- PNG at 2400×3200 px (print-ready, ≥1200×1600 required).
- PDF of the same poster.
- If Gemini fails, times out or has no API key: render with the template's default scheme, photos in upload order, headline size by length (poster still succeeds).

## Content safety (MVP level)
- Gemini sees no user text, so its safety filters don't apply to it.
- Deferred: reject headline/form text matching a blocklist of slurs/hate terms (needs a curated Bangla list from the team).

## Deferred
- Optional AI slogan line: needs a "clear slogan" control in the UI first.
