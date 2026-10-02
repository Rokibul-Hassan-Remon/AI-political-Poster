# Auth — Architecture

## Model `User`
| field | type | notes |
|---|---|---|
| name | string | required |
| email | string | required, unique, lowercase |
| passwordHash | string | bcrypt, never returned in responses |
| role | `'user' \| 'admin'` | default `user` |
| createdAt | Date | timestamps |

## Endpoints
| method | path | auth | body → response |
|---|---|---|---|
| POST | `/api/auth/register` | – | `{name,email,password}` → `{token,user}` |
| POST | `/api/auth/login` | – | `{email,password}` → `{token,user}` |
| GET | `/api/auth/me` | user | → `user` |

## Middleware
- `requireAuth`: verifies Bearer JWT (`JWT_SECRET`), sets `req.user = { id, role }`, else 401.
- `requireAdmin`: after `requireAuth`, 403 if role ≠ admin.

## Files
- `server/src/models/User.ts`, `server/src/routes/auth.ts`, `server/src/middleware/auth.ts`
- `client/src/app/(auth)/login`, `register` pages; token in localStorage; small `api()` fetch helper adds the header and redirects to `/login` on 401.

## Env
`JWT_SECRET`, `JWT_EXPIRES_IN=7d`
