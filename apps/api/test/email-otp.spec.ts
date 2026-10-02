import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/prisma.js';
import { emailOtpService } from '../src/services/email-otp.service.js';
import { msg91EmailOtpProvider, Msg91EmailOtpProvider } from '../src/services/otp/msg91-email-otp.provider.js';
import {
  EmailOtpProvider,
  SendEmailOtpParams,
  SendEmailOtpResult,
  VerifyEmailOtpParams,
  VerifyEmailOtpResult,
  ResendEmailOtpParams
} from '../src/services/otp/email-otp-provider.interface.js';
import { UserRole } from '@vetvision/shared-types';

class MockEmailOtpProvider implements EmailOtpProvider {
  public readonly name = 'MOCK_EMAIL_OTP';
  public sentOtps = new Map<string, string>();
  public sendCount = 0;
  public resendCount = 0;

  async sendOtp(params: SendEmailOtpParams): Promise<SendEmailOtpResult> {
    this.sendCount++;
    // Simulate real external OTP provider generating and sending OTP to user's inbox
    this.sentOtps.set(params.email.toLowerCase(), '654321');
    return {
      success: true,
      providerMessage: 'OTP sent successfully',
      requestId: 'mock-req-123'
    };
  }

  async verifyOtp(params: VerifyEmailOtpParams): Promise<VerifyEmailOtpResult> {
    const valid = this.sentOtps.get(params.email.toLowerCase());
    if (valid && params.otp === valid) {
      return { success: true, message: 'OTP verified successfully' };
    }
    return { success: false, message: 'Invalid OTP entered' };
  }

  async resendOtp(params: ResendEmailOtpParams): Promise<SendEmailOtpResult> {
    this.resendCount++;
    this.sentOtps.set(params.email.toLowerCase(), '654321');
    return {
      success: true,
      providerMessage: 'OTP resent successfully',
      requestId: 'mock-resend-456'
    };
  }
}

describe('Email OTP Registration Flow & Guardrails', () => {
  const app = createApp();
  let mockProvider: MockEmailOtpProvider;

  const testEmail = 'new-petowner@vetvision.ai';
  const testPassword = 'SecurePassword123!';

  beforeEach(async () => {
    mockProvider = new MockEmailOtpProvider();
    emailOtpService.setProvider(mockProvider);

    // Clean up test data
    await prisma.pendingRegistration.deleteMany({
      where: { email: { in: [testEmail, 'unconfigured@vetvision.ai', 'expired@vetvision.ai', 'attempts@vetvision.ai'] } }
    });
    await prisma.user.deleteMany({
      where: { email: { in: [testEmail, 'unconfigured@vetvision.ai', 'expired@vetvision.ai', 'attempts@vetvision.ai'] } }
    });
  });

  afterEach(async () => {
    // Restore default provider
    emailOtpService.setProvider(msg91EmailOtpProvider);

    await prisma.pendingRegistration.deleteMany({
      where: { email: { in: [testEmail, 'unconfigured@vetvision.ai', 'expired@vetvision.ai', 'attempts@vetvision.ai'] } }
    });
    await prisma.user.deleteMany({
      where: { email: { in: [testEmail, 'unconfigured@vetvision.ai', 'expired@vetvision.ai', 'attempts@vetvision.ai'] } }
    });
  });

  it('1. Fails closed with CONFIGURATION_REQUIRED if MSG91 is unconfigured', async () => {
    const unconfiguredProvider = new Msg91EmailOtpProvider();
    emailOtpService.setProvider(unconfiguredProvider);

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'unconfigured@vetvision.ai',
        password: testPassword,
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.OWNER
      });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('CONFIGURATION_REQUIRED');

    // Ensure neither pending nor permanent records are created when unconfigured
    const pending = await prisma.pendingRegistration.findUnique({
      where: { email: 'unconfigured@vetvision.ai' }
    });
    expect(pending).toBeNull();

    const permanent = await prisma.user.findUnique({
      where: { email: 'unconfigured@vetvision.ai' }
    });
    expect(permanent).toBeNull();
  });

  it('2. New email → creates PendingRegistration, sends OTP, and strictly DOES NOT create permanent User', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: testEmail,
        password: testPassword,
        firstName: 'Alice',
        lastName: 'Smith',
        role: UserRole.OWNER
      });

    expect(res.status).toBe(202);
    expect(res.body.success).toBe(true);
    expect(res.body.data.requireOtp).toBe(true);
    expect(res.body.data.email).toBe(testEmail);
    expect(res.body.data.cooldownSeconds).toBe(60);

    // Verify PendingRegistration was created in database
    const pending = await prisma.pendingRegistration.findUnique({
      where: { email: testEmail }
    });
    expect(pending).not.toBeNull();
    expect(pending?.firstName).toBe('Alice');
    expect(pending?.lastName).toBe('Smith');
    expect(pending?.attempts).toBe(0);

    // CRITICAL REQUIREMENT: Verify permanent User record is NOT created yet
    const permanent = await prisma.user.findUnique({
      where: { email: testEmail }
    });
    expect(permanent).toBeNull();

    // Verify provider send was called
    expect(mockProvider.sendCount).toBe(1);
  });

  it('3. Direct login attempt before OTP verification is rejected', async () => {
    // Initiate signup so pending registration exists
    await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: testEmail,
        password: testPassword,
        firstName: 'Alice',
        lastName: 'Smith',
        role: UserRole.OWNER
      });

    // Attempt direct login via API
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testEmail,
        password: testPassword
      });

    expect(loginRes.status).toBe(401);
    expect(loginRes.body.success).toBe(false);
    expect(loginRes.body.error.code).toBe('UNAUTHORIZED');
  });

  it('4. Wrong OTP → rejected, attempts incremented, permanent User NOT created', async () => {
    // Initiate signup
    await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: testEmail,
        password: testPassword,
        firstName: 'Alice',
        lastName: 'Smith',
        role: UserRole.OWNER
      });

    // Submit invalid OTP
    const verifyRes = await request(app)
      .post('/api/v1/auth/otp/verify')
      .send({
        email: testEmail,
        otp: '000000'
      });

    expect(verifyRes.status).toBe(401);
    expect(verifyRes.body.success).toBe(false);
    expect(verifyRes.body.error.code).toBe('INVALID_OTP');

    // Verify attempts counter incremented
    const pending = await prisma.pendingRegistration.findUnique({
      where: { email: testEmail }
    });
    expect(pending?.attempts).toBe(1);

    // Verify permanent User still does NOT exist
    const permanent = await prisma.user.findUnique({
      where: { email: testEmail }
    });
    expect(permanent).toBeNull();
  });

  it('5. Maximum verification attempts (>5) invalidates pending registration', async () => {
    // Initiate signup
    await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: testEmail,
        password: testPassword,
        firstName: 'Alice',
        lastName: 'Smith',
        role: UserRole.OWNER
      });

    // Fast-forward attempts to 5
    await prisma.pendingRegistration.update({
      where: { email: testEmail },
      data: { attempts: 5 }
    });

    const verifyRes = await request(app)
      .post('/api/v1/auth/otp/verify')
      .send({
        email: testEmail,
        otp: '654321'
      });

    expect(verifyRes.status).toBe(403);
    expect(verifyRes.body.success).toBe(false);
    expect(verifyRes.body.error.code).toBe('MAX_ATTEMPTS_EXCEEDED');

    // Verify pending registration was removed
    const pending = await prisma.pendingRegistration.findUnique({
      where: { email: testEmail }
    });
    expect(pending).toBeNull();

    // Verify permanent User was not created
    const permanent = await prisma.user.findUnique({
      where: { email: testEmail }
    });
    expect(permanent).toBeNull();
  });

  it('6. Expired OTP → rejected, account is not created', async () => {
    // Initiate signup
    await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: testEmail,
        password: testPassword,
        firstName: 'Alice',
        lastName: 'Smith',
        role: UserRole.OWNER
      });

    // Set expiry in the past
    await prisma.pendingRegistration.update({
      where: { email: testEmail },
      data: { expiresAt: new Date(Date.now() - 60000) }
    });

    const verifyRes = await request(app)
      .post('/api/v1/auth/otp/verify')
      .send({
        email: testEmail,
        otp: '654321'
      });

    expect(verifyRes.status).toBe(400);
    expect(verifyRes.body.success).toBe(false);
    expect(verifyRes.body.error.code).toBe('OTP_EXPIRED');

    // Verify permanent User was not created
    const permanent = await prisma.user.findUnique({
      where: { email: testEmail }
    });
    expect(permanent).toBeNull();
  });

  it('7. Resend OTP enforces 60-second cooldown', async () => {
    // Initiate signup
    await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: testEmail,
        password: testPassword,
        firstName: 'Alice',
        lastName: 'Smith',
        role: UserRole.OWNER
      });

    // Immediate resend should be rate-limited
    const cooldownRes = await request(app)
      .post('/api/v1/auth/otp/resend')
      .send({ email: testEmail });

    expect(cooldownRes.status).toBe(429);
    expect(cooldownRes.body.success).toBe(false);
    expect(cooldownRes.body.error.code).toBe('RESEND_COOLDOWN');

    // Fast-forward lastSentAt by 65 seconds
    await prisma.pendingRegistration.update({
      where: { email: testEmail },
      data: { lastSentAt: new Date(Date.now() - 65000) }
    });

    // Now resend should succeed
    const allowedRes = await request(app)
      .post('/api/v1/auth/otp/resend')
      .send({ email: testEmail });

    expect(allowedRes.status).toBe(200);
    expect(allowedRes.body.success).toBe(true);
    expect(allowedRes.body.data.cooldownSeconds).toBe(60);
    expect(mockProvider.resendCount).toBe(1);
  });

  it('8. Correct OTP → creates permanent User, sets emailVerifiedAt, mints session, deletes pending registration', async () => {
    // Initiate signup
    await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: testEmail,
        password: testPassword,
        firstName: 'Alice',
        lastName: 'Smith',
        role: UserRole.OWNER
      });

    // Verify OTP with correct code
    const verifyRes = await request(app)
      .post('/api/v1/auth/otp/verify')
      .send({
        email: testEmail,
        otp: '654321'
      });

    expect(verifyRes.status).toBe(201);
    expect(verifyRes.body.success).toBe(true);
    expect(verifyRes.body.data.user.email).toBe(testEmail);
    expect(verifyRes.body.data.user.emailVerifiedAt).not.toBeNull();

    // Verify session cookie was set
    const cookies = verifyRes.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies.some((c: string) => c.includes('vetvision_session='))).toBe(true);

    // Verify permanent User in DB
    const permanent = await prisma.user.findUnique({
      where: { email: testEmail }
    });
    expect(permanent).not.toBeNull();
    expect(permanent?.emailVerifiedAt).not.toBeNull();
    expect(permanent?.firstName).toBe('Alice');

    // Verify pending registration was deleted
    const pending = await prisma.pendingRegistration.findUnique({
      where: { email: testEmail }
    });
    expect(pending).toBeNull();
  });

  it('9. Existing verified user → login works normally', async () => {
    // 1. Sign up and verify
    await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: testEmail,
        password: testPassword,
        firstName: 'Alice',
        lastName: 'Smith',
        role: UserRole.OWNER
      });

    await request(app)
      .post('/api/v1/auth/otp/verify')
      .send({
        email: testEmail,
        otp: '654321'
      });

    // 2. Normal login with valid credentials
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testEmail,
        password: testPassword
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
    expect(loginRes.body.data.user.email).toBe(testEmail);
    expect(loginRes.headers['set-cookie']).toBeDefined();
  });

  it('10. Zero Plaintext OTP Storage Guardrail: DB does not store OTP codes', async () => {
    // Initiate registration
    await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: testEmail,
        password: testPassword,
        firstName: 'Alice',
        lastName: 'Smith',
        role: UserRole.OWNER
      });

    // Query pending registration record directly
    const pending = await prisma.pendingRegistration.findUnique({
      where: { email: testEmail }
    });

    expect(pending).not.toBeNull();
    // Verify there is no 'otp' or 'code' field stored in the record
    expect((pending as any).otp).toBeUndefined();
    expect((pending as any).code).toBeUndefined();
  });
});
