import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../apps/api/src/app.js';

describe('Integration: Multi-Entity API Flow & Verification', () => {
  const app = createApp();

  it('verifies system health check endpoint reports degraded gracefully without db connection', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.version).toBe('1.0.0');
    expect(res.body.data).toHaveProperty('aiService');
  });

  it('configures credentials and security headers for API requests', async () => {
    const res = await request(app)
      .get('/api/v1/health')
      .set('Origin', 'http://localhost:5173');
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-credentials']).toBe('true');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it('rejects malicious or malformed JSON payloads gracefully without exposing stack traces', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send('{ "email": "invalid json');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('BAD_REQUEST');
    expect(res.text).not.toContain('node_modules');
  });

  it('validates rate limit headers are attached to incoming API calls', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.headers).toHaveProperty('x-ratelimit-limit');
    expect(res.headers).toHaveProperty('x-ratelimit-remaining');
  });
});
