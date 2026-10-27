import { describe, it, expect } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';
import { AIClientService } from '../src/services/ai-client.service.js';
import { storage } from '../src/storage/index.js';
import { PredictionStatus, PredictedClass } from '@vetvision/shared-types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../../');

describe('Live Node.js API to FastAPI AI Service End-to-End', () => {
  const aiClient = new AIClientService();

  it('connects to live FastAPI /internal/v1/health and reports HEALTHY status', async () => {
    const health = await aiClient.checkHealth();
    expect(health.status).toBe('HEALTHY');
    expect(health.models).toContain('lsd-efficientnetb0-v1.0.0');
  });

  it('runs live inference on real cattle lesion image through AIClientService', async () => {
    const realImagePath = path.join(
      REPO_ROOT,
      'data',
      'storage',
      '0fa7f247-a87e-4d18-b28a-c71478ee26b7.jpg'
    );

    const result = await aiClient.infer({
      imagePath: realImagePath,
      imageMimeType: 'image/jpeg'
    });

    expect(result.status).toBe(PredictionStatus.AVAILABLE);
    expect(result.predictedClass).toBe(PredictedClass.SEVERE);
    expect(result.confidence).toBeGreaterThanOrEqual(0.65);
    expect(result.normalProbability).toBeDefined();
    expect(result.mildProbability).toBeDefined();
    expect(result.severeProbability).toBeDefined();

    // Check sum of probabilities
    const sumProbs = (result.normalProbability || 0) + (result.mildProbability || 0) + (result.severeProbability || 0);
    expect(Math.abs(sumProbs - 1.0)).toBeLessThan(0.001);

    expect(result.modelVersion).toBe('lsd-efficientnetb0-v1.0.0');
    expect(result.deviceType).toBe('cpu');
    expect(result.inferenceTimeMs).toBeGreaterThan(0);
  });

  it('validates storage and executes inference pipeline on new saved file', async () => {
    const realImagePath = path.join(
      REPO_ROOT,
      'data',
      'storage',
      '0fa7f247-a87e-4d18-b28a-c71478ee26b7.jpg'
    );
    const fs = await import('fs');
    const imageBuffer = fs.readFileSync(realImagePath);

    // 1. Save file through storage abstraction
    const saved = await storage.saveFile({
      buffer: imageBuffer,
      originalFilename: 'live_test_cattle.jpg',
      mimeType: 'image/jpeg'
    });

    expect(saved.storageKey).toBeDefined();
    expect(saved.storageKey.endsWith('.jpg')).toBe(true);

    const savedAbsolutePath = storage.getAbsolutePath(saved.storageKey);
    expect(fs.existsSync(savedAbsolutePath)).toBe(true);

    // 2. Call live AI inference on the saved asset
    const result = await aiClient.infer({
      imagePath: savedAbsolutePath,
      imageMimeType: 'image/jpeg'
    });

    expect(result.status).toBe(PredictionStatus.AVAILABLE);
    expect(result.predictedClass).toBe(PredictedClass.SEVERE);
    expect(result.confidence).toBeCloseTo(0.7305, 2);

    // Clean up temporary saved file
    await storage.deleteFile(saved.storageKey);
  });

  it('reports FAILED gracefully when nonexistent file path is requested', async () => {
    const result = await aiClient.infer({
      imagePath: 'nonexistent/path/does_not_exist.jpg',
      imageMimeType: 'image/jpeg'
    });

    expect(result.status).toBe(PredictionStatus.FAILED);
    expect(result.errorMessage).toContain('Image file not found');
  });
});
