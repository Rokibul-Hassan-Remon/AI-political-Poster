import { v2 as cloudinary } from 'cloudinary';
import '../config/env'; // validates CLOUDINARY_URL; the SDK reads it from process.env on first use

// Uploads one in-memory file and returns its permanent https URL.
export function uploadBuffer(buffer: Buffer, folder: string): Promise<string> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder, resource_type: 'auto' }, (err, result) =>
        err || !result ? reject(err ?? new Error('Cloudinary returned no result')) : resolve(result.secure_url),
      )
      .end(buffer);
  });
}
