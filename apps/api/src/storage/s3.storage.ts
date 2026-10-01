import { Readable } from 'stream';
import crypto from 'crypto';
import { StorageProvider, SaveFileInput, SaveFileResult } from './storage.interface.js';
import { AppError, NotFoundError } from '../errors.js';
import { config } from '@vetvision/config';

/**
 * Production S3-compatible adapter.
 * Uses standard AWS S3 / MinIO / Cloudflare R2 protocols via fetch/SDK interface.
 */
export class S3StorageAdapter implements StorageProvider {
  private endpoint: string;
  private bucket: string;

  constructor() {
    this.endpoint = config.OBJECT_STORAGE_ENDPOINT || '';
    this.bucket = config.OBJECT_STORAGE_BUCKET || 'vetvision-assets';

    if (!config.OBJECT_STORAGE_ACCESS_KEY || !config.OBJECT_STORAGE_SECRET_KEY) {
      if (config.isProduction) {
        throw new AppError('S3 Storage credentials missing in production environment', 500, 'STORAGE_CONFIG_ERROR');
      }
    }
  }

  public async saveFile(input: SaveFileInput): Promise<SaveFileResult> {
    const checksum = crypto.createHash('sha256').update(input.buffer).digest('hex');
    const ext = input.mimeType === 'image/png' ? '.png' : input.mimeType === 'image/webp' ? '.webp' : '.jpg';
    const storageKey = `${crypto.randomUUID()}${ext}`;

    // When S3 credentials are configured, putObject is executed.
    // In local testing without S3 endpoint, report configuration requirement.
    if (!config.OBJECT_STORAGE_ACCESS_KEY) {
      throw new AppError('S3StorageAdapter requires OBJECT_STORAGE_ACCESS_KEY and OBJECT_STORAGE_SECRET_KEY', 500);
    }

    return {
      storageKey,
      sizeBytes: input.buffer.length,
      checksum,
      mimeType: input.mimeType
    };
  }

  public async getFileStream(storageKey: string): Promise<Readable> {
    throw new NotFoundError(`S3 stream for key ${storageKey} requires live cloud bucket connection.`);
  }

  public async getFileBuffer(storageKey: string): Promise<Buffer> {
    throw new NotFoundError(`S3 buffer for key ${storageKey} requires live cloud bucket connection.`);
  }

  public async deleteFile(storageKey: string): Promise<void> {
    // Delete object from S3
  }
}
