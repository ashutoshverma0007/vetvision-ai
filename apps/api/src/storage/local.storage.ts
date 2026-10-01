import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Readable } from 'stream';
import { StorageProvider, SaveFileInput, SaveFileResult } from './storage.interface.js';
import { BadRequestError, NotFoundError } from '../errors.js';
import { config } from '@vetvision/config';

export class LocalStorageAdapter implements StorageProvider {
  private baseDir: string;

  constructor(customDir?: string) {
    this.baseDir = path.resolve(customDir || config.STORAGE_LOCAL_DIR);
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  private validateMagicBytes(buffer: Buffer, mimeType: string): string {
    if (buffer.length < 12) {
      throw new BadRequestError('File buffer too small to determine format');
    }

    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return '.jpg';
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      return '.png';
    }

    // WEBP: RIFF .... WEBP
    const isRiff = buffer.toString('ascii', 0, 4) === 'RIFF';
    const isWebp = buffer.toString('ascii', 8, 12) === 'WEBP';
    if (isRiff && isWebp) {
      return '.webp';
    }

    throw new BadRequestError(`File header does not match accepted image types (JPEG, PNG, WEBP). Detected: ${mimeType}`);
  }

  public async saveFile(input: SaveFileInput): Promise<SaveFileResult> {
    const extension = this.validateMagicBytes(input.buffer, input.mimeType);

    // Compute SHA-256 Checksum
    const checksum = crypto.createHash('sha256').update(input.buffer).digest('hex');

    // Generate isolated random storage key (UUID + extension)
    const storageKey = `${crypto.randomUUID()}${extension}`;
    const targetPath = this.resolvePath(storageKey);

    await fs.promises.writeFile(targetPath, input.buffer);

    return {
      storageKey,
      sizeBytes: input.buffer.length,
      checksum,
      mimeType: input.mimeType
    };
  }

  public getAbsolutePath(storageKey: string): string {
    return this.resolvePath(storageKey);
  }

  public async getFileStream(storageKey: string): Promise<Readable> {
    const targetPath = this.resolvePath(storageKey);
    if (!fs.existsSync(targetPath)) {
      throw new NotFoundError('Requested storage asset does not exist');
    }
    return fs.createReadStream(targetPath);
  }

  public async getFileBuffer(storageKey: string): Promise<Buffer> {
    const targetPath = this.resolvePath(storageKey);
    if (!fs.existsSync(targetPath)) {
      throw new NotFoundError('Requested storage asset does not exist');
    }
    return fs.promises.readFile(targetPath);
  }

  public async deleteFile(storageKey: string): Promise<void> {
    const targetPath = this.resolvePath(storageKey);
    if (fs.existsSync(targetPath)) {
      await fs.promises.unlink(targetPath);
    }
  }

  private resolvePath(storageKey: string): string {
    // Prevent any directory traversal
    const safeKey = path.basename(storageKey);
    const resolved = path.resolve(this.baseDir, safeKey);
    if (!resolved.startsWith(this.baseDir)) {
      throw new BadRequestError('Invalid storage path traversal attempt');
    }
    return resolved;
  }
}
