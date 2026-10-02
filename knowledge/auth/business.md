# Auth — Business

## Who
- **user**: local political workers, committee members, publicity agents. Create and download their own posters.
- **admin**: project owner. Created by seed script only (no admin UI in MVP).

## Rules
- Register with name, email, password. Email unique (case-insensitive).
- Password min 8 chars.
- A login stays valid for 7 days (silently renewed every 15 min in the background); after that → login again.
- Logout ends the session in that browser.
- A user can only see/modify their own posters.
- OTP / phone login: post-MVP.

## Acceptance
- Duplicate email → clear error message.
- Wrong email or password → same generic message (don't reveal which).
- Protected pages redirect to `/login` when not logged in.
