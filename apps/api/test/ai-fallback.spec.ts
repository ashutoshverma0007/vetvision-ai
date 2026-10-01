import { describe, it, expect, vi } from 'vitest';
import { AIClientService } from '../src/services/ai-client.service.js';
import { PredictionStatus } from '@vetvision/shared-types';

describe('AIClientService Fallback & Resilience', () => {
  it('returns MODEL_UNAVAILABLE with honest diagnostic message when AI service is offline', async () => {
    const aiClient = new AIClientService();

    // Call inference with unreachable port
    const result = await aiClient.infer({
      imagePath: 'nonexistent/path/image.jpg',
      imageMimeType: 'image/jpeg'
    });

    expect(result.status).toBe(PredictionStatus.MODEL_UNAVAILABLE);
    expect(result.errorMessage).toBeDefined();
    expect(result.errorMessage).toMatch(/offline|unmounted|ECONNREFUSED|fetch failed/i);
    // CRITICAL: Ensure no fake predictions or fabricated probabilities are generated
    expect(result.predictedClass).toBeUndefined();
    expect(result.confidence).toBeUndefined();
  });

  it('reports DEGRADED or OFFLINE on health check when Python backend is not running', async () => {
    const aiClient = new AIClientService();
    const health = await aiClient.checkHealth();
    expect(['OFFLINE', 'DEGRADED']).toContain(health.status);
    expect(health.models).toEqual([]);
  });
});
