import { Injectable, Logger } from '@nestjs/common';
import { UploadApiResponse } from 'cloudinary';
import { configureCloudinary } from '../../config/cloudinary.config';

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
}

// Shared Cloudinary wrapper for admin-uploaded public content (site-content banners, news
// covers) — kept separate from user avatars, which stay on the existing Postgres-bytea path.
@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private readonly cloudinary = configureCloudinary();

  async uploadImage(buffer: Buffer, folder: string): Promise<CloudinaryUploadResult> {
    return new Promise((resolve, reject) => {
      const uploadStream = this.cloudinary.uploader.upload_stream(
        { folder, resource_type: 'image' },
        (error, result: UploadApiResponse | undefined) => {
          if (error || !result) {
            return reject(error || new Error('Cloudinary upload failed'));
          }
          resolve({ url: result.secure_url, publicId: result.public_id });
        },
      );
      uploadStream.end(buffer);
    });
  }

  async deleteImage(publicId: string): Promise<void> {
    try {
      await this.cloudinary.uploader.destroy(publicId);
    } catch (error) {
      // Best-effort cleanup on replace/delete — a failed deletion of the old asset shouldn't
      // block the new upload from being saved.
      this.logger.error(`Failed to delete Cloudinary asset ${publicId}: ${(error as Error).message}`);
    }
  }
}
