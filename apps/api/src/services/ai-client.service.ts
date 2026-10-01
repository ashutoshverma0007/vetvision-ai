import { config } from '@vetvision/config';
import { AIInferenceRequest, AIInferenceResponse, PredictionStatus } from '@vetvision/shared-types';
import { logger } from '../logger.js';

export class AIClientService {
  private baseUrl: string;
  private secretToken: string;
  private timeoutMs: number;

  constructor() {
    this.baseUrl = config.AI_SERVICE_URL;
    this.secretToken = config.AI_SERVICE_INTERNAL_SECRET;
    this.timeoutMs = config.AI_SERVICE_TIMEOUT_MS;
  }

  public async infer(request: AIInferenceRequest): Promise<AIInferenceResponse> {
    const targetUrl = `${this.baseUrl}/internal/v1/inference`;

    logger.event('AI_INFERENCE_STARTED', {
      targetUrl,
      imagePath: request.imagePath,
      modelVersionId: request.modelVersionId
    });

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Token': this.secretToken
        },
        body: JSON.stringify(request),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        logger.warn('AI internal service returned error status', {
          status: response.status,
          responseBody: errorText
        });

        return {
          status: PredictionStatus.MODEL_UNAVAILABLE,
          errorMessage: `AI service returned HTTP ${response.status}: ${errorText || 'Model unavailable or offline'}`
        };
      }

      const result = (await response.json()) as AIInferenceResponse;

      logger.event('AI_INFERENCE_COMPLETED', {
        status: result.status,
        predictedClass: result.predictedClass,
        confidence: result.confidence,
        latencyMs: result.inferenceTimeMs
      });

      return result;
    } catch (error) {
      const isAbort = error instanceof Error && error.name === 'AbortError';
      const errorMessage = isAbort
        ? `AI inference timed out after ${this.timeoutMs}ms`
        : error instanceof Error
          ? error.message
          : 'Internal AI service connection error';

      logger.event('AI_INFERENCE_FAILED', { error: errorMessage });

      // When AI service is offline or unconfigured, report MODEL_UNAVAILABLE
      // This strictly follows product principle: do not fake predictions, do not block rest of app.
      return {
        status: PredictionStatus.MODEL_UNAVAILABLE,
        errorMessage: `AI Service offline or model weights unmounted: ${errorMessage}`
      };
    }
  }

  public async checkHealth(): Promise<{ status: string; models: string[] }> {
    try {
      const response = await fetch(`${this.baseUrl}/internal/v1/health`, {
        headers: { 'X-Internal-Token': this.secretToken }
      });
      if (response.ok) {
        return (await response.json()) as { status: string; models: string[] };
      }
      return { status: 'DEGRADED', models: [] };
    } catch {
      return { status: 'OFFLINE', models: [] };
    }
  }
}

export const aiClient = new AIClientService();
