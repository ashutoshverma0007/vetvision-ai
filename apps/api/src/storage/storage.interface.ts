import { Readable } from 'stream';

export interface SaveFileInput {
  buffer: Buffer;
  originalFilename: string;
  mimeType: string;
}

export interface SaveFileResult {
  storageKey: string;
  sizeBytes: number;
  checksum: string;
  mimeType: string;
}

export interface StorageProvider {
  saveFile(input: SaveFileInput): Promise<SaveFileResult>;
  getFileStream(storageKey: string): Promise<Readable>;
  getFileBuffer(storageKey: string): Promise<Buffer>;
  deleteFile(storageKey: string): Promise<void>;
  getAbsolutePath?(storageKey: string): string;
}
