import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { LocalStorageAdapter } from '../src/storage/local.storage.js';
import { BadRequestError } from '../src/errors.js';

describe('LocalStorageAdapter', () => {
  const testDir = path.resolve('./data/test-storage');
  let adapter: LocalStorageAdapter;

  beforeEach(() => {
    adapter = new LocalStorageAdapter(testDir);
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('successfully saves valid JPEG binary with magic bytes and calculates checksum', async () => {
    // Valid JPEG header: FF D8 FF E0
    const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);

    const result = await adapter.saveFile({
      buffer: jpegBuffer,
      originalFilename: 'test-scan.jpg',
      mimeType: 'image/jpeg'
    });

    expect(result.storageKey).toMatch(/\.jpg$/);
    expect(result.sizeBytes).toBe(jpegBuffer.length);
    expect(result.checksum).toHaveLength(64); // SHA-256 hex string

    const fileContent = await adapter.getFileBuffer(result.storageKey);
    expect(fileContent.equals(jpegBuffer)).toBe(true);
  });

  it('successfully saves valid PNG binary with magic bytes', async () => {
    // Valid PNG header: 89 50 4E 47 0D 0A 1A 0A
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);

    const result = await adapter.saveFile({
      buffer: pngBuffer,
      originalFilename: 'nodule.png',
      mimeType: 'image/png'
    });

    expect(result.storageKey).toMatch(/\.png$/);
    expect(result.sizeBytes).toBe(pngBuffer.length);
  });

  it('rejects files with fraudulent MIME type but invalid magic bytes', async () => {
    // Plain text masquerading as JPEG
    const maliciousBuffer = Buffer.from('<?php echo "exploit"; ?>', 'utf-8');

    await expect(
      adapter.saveFile({
        buffer: maliciousBuffer,
        originalFilename: 'exploit.jpg',
        mimeType: 'image/jpeg'
      })
    ).rejects.toThrow(BadRequestError);
  });

  it('rejects path traversal attempts when accessing storage files', async () => {
    await expect(adapter.getFileStream('../../etc/passwd')).rejects.toThrow();
  });
});
