import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

describe('API Integration & Security Headers', () => {
  const app = createApp();

  it('serves /api/v1/health with system status and AI service status', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('version');
    expect(res.body.data).toHaveProperty('aiService');
    expect(res.body.data).toHaveProperty('database');
  });

  it('sets secure response headers via Helmet and returns X-Request-Id', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.headers).toHaveProperty('x-request-id');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('returns structured 404 error for nonexistent API routes', async () => {
    const res = await request(app).get('/api/v1/nonexistent-endpoint-route');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
    expect(res.body.error).toHaveProperty('message');
  });

  it('rejects unauthenticated requests to protected endpoints with 401', async () => {
    const res = await request(app).get('/api/v1/animals');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects registration with invalid email or weak password with 422/400 validation error', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'invalid-email',
        password: 'weak',
        firstName: 'Test',
        lastName: 'User'
      });
    expect([400, 422]).toContain(res.status);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
