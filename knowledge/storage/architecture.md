# Storage — Architecture

## Endpoint
| method | path | auth | request → response |
|---|---|---|---|
| POST | `/api/upload` | user | multipart `photos` (1–3 files) → `201 { urls: string[] }` (same order as sent) |

## Flow
`requireAuth` → `multer` (memory storage, 5 MB/file, max 3, JPG/PNG/WEBP by mimetype) → `storage.service.uploadBuffer(buffer, folder)` → Cloudinary (`upload_stream`, `resource_type: auto`) → `secure_url`.

Errors (400): no files, wrong type, >5 MB, >3 files or wrong field name (`MulterError`, handled in `middleware/error.ts`). Cloudinary failure → 500.

The Cloudinary SDK reads `CLOUDINARY_URL` from `process.env` itself; `config/env.ts` only validates it (must start with `cloudinary://`).

## Cloudinary folders
- `rise-together/photos/<userId>/`
- `rise-together/posters/<posterId>.png|.pdf`

## Files
- `server/src/services/storage.service.ts`, `server/src/routes/upload.ts`

## Env
`CLOUDINARY_URL`
