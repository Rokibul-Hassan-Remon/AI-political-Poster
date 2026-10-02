# Generation — Business

## What AI decides
- Color scheme fitting the occasion (e.g. victory-day: green/red; mourning: black/white/grey).
- Order of photos in slots.
- Headline size class (short vs long text).
- Optional short Bangla slogan line (user can clear it).

## What AI never decides
- User's name, designation, organization, area, headline — rendered exactly as typed.

## Output
- PNG at 2400×3200 px (print-ready, ≥1200×1600 required).
- PDF of the same poster.
- If Gemini fails or times out: render with the template's default scheme (poster still succeeds).

## Content safety (MVP level)
- Reject headline/form text matching a small blocklist of slurs/hate terms.
- Gemini safety filters on its call.
