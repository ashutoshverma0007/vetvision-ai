import { StorageProvider } from './storage.interface.js';
import { LocalStorageAdapter } from './local.storage.js';
import { S3StorageAdapter } from './s3.storage.js';
import { config } from '@vetvision/config';

let storageInstance: StorageProvider;

if (config.STORAGE_PROVIDER === 's3' && config.isProduction) {
  storageInstance = new S3StorageAdapter();
} else {
  storageInstance = new LocalStorageAdapter();
}

export const storage = storageInstance;
export * from './storage.interface.js';
