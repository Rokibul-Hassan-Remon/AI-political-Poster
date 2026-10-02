# Storage — Architecture

## Endpoint
| method | path | auth | request → response |
|---|---|---|---|
| POST | `/api/upload` | user | multipart `photos` (1–3 files) → `{ urls: string[] }` |

## Flow
`multer` (memory storage, size + mimetype check) → `storage.service.uploadBuffer(buffer, folder)` → Cloudinary → `secure_url`.

## Cloudinary folders
- `rise-together/photos/<userId>/`
- `rise-together/posters/<posterId>.png|.pdf`

## Files
- `server/src/services/storage.service.ts`, `server/src/routes/upload.ts`

## Env
`CLOUDINARY_URL`
