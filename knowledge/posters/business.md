# Posters — Business

## Form fields
| field | required | notes |
|---|---|---|
| template | yes | chosen from library |
| name | yes | requester name (Bangla) |
| designation (পদবি) | yes | |
| organization / party | yes | |
| area (union / থানা / জেলা) | no | |
| headline | no | defaults to template headline |
| photos | 1–3 | count must not exceed template photo slots |

## Lifecycle
`generating` → `completed` | `failed`. (`draft` not used in MVP.)

## Rules
- Generation is async; user sees a progress state, then the preview.
- User may edit text and **regenerate up to 3 times** per poster.
- Rate limit: max 10 generations per user per hour.
- History lists the user's posters, newest first, with download (PNG, PDF).
- User can delete their own poster.
- Failed generation shows a retry button (counts as a regenerate).
