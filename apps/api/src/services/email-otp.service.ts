// ==============================================================================
// VetVision AI Email OTP Service (Pending Registrations & Verification Flow)
// ==============================================================================
import * as argon2 from 'argon2';
import { prisma } from '../prisma.js';
import { config } from '@vetvision/config';
import { RegisterInput } from '@vetvision/validation';
import { UserRole, VetVerificationStatus } from '@vetvision/shared-types';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  UnauthorizedError,
  AppError
} from '../errors.js';
import { logger } from '../logger.js';
import { EmailOtpProvider } from './otp/email-otp-provider.interface.js';
import { msg91EmailOtpProvider } from './otp/msg91-email-otp.provider.js';
import { authService } from './auth.service.js';

export class EmailOtpService {
  private provider: EmailOtpProvider;

  constructor(provider: EmailOtpProvider = msg91EmailOtpProvider) {
    this.provider = provider;
  }

  /**
   * Set custom provider for tests or alternative providers (e.g. Twilio)
   */
  public setProvider(provider: EmailOtpProvider) {
    this.provider = provider;
  }

  /**
   * Step 1: Initiate signup by creating a temporary pending registration and sending OTP to email.
   * Strictly DOES NOT create the permanent User record yet.
   */
  public async initiateSignup(input: RegisterInput, ipAddress?: string, userAgent?: string) {
    // 1. Prevent public registration as ADMIN
    if ((input.role as string) === UserRole.ADMIN) {
      throw new BadRequestError('Cannot register as an Administrator via public registration');
    }

    const normalizedEmail = input.email.trim().toLowerCase();

    // 2. Check if a permanent user already exists with this email
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });
    if (existingUser) {
      throw new ConflictError('An account with this email address already exists');
    }

    // 3. Hash password using Argon2id for secure storage in pending state
    const passwordHash = await argon2.hash(input.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4
    });

    const now = new Date();
    const cooldownSeconds = config.OTP_RESEND_COOLDOWN_SECONDS || 60;
    const expiryMinutes = config.OTP_EXPIRY_MINUTES || 10;
    const expiresAt = new Date(now.getTime() + expiryMinutes * 60 * 1000);

    // 4. Check for existing pending registration and enforce cooldown
    const existingPending = await prisma.pendingRegistration.findUnique({
      where: { email: normalizedEmail }
    });

    if (existingPending) {
      const elapsedSeconds = Math.floor((now.getTime() - existingPending.lastSentAt.getTime()) / 1000);
      if (elapsedSeconds < cooldownSeconds) {
        const remaining = cooldownSeconds - elapsedSeconds;
        throw new AppError(
          `Please wait ${remaining} seconds before requesting a new verification code.`,
          429,
          'RESEND_COOLDOWN',
          { remainingSeconds: remaining }
        );
      }
    }

    // 5. Package veterinarian data if applicable
    const veterinarianData =
      input.role === UserRole.VETERINARIAN
        ? {
            licenseNumber: input.licenseNumber,
            specialization: input.specialization || 'General Practice',
            experienceYears: input.experienceYears || 0,
            clinicName: input.clinicName || null,
            bio: input.bio || null
          }
        : undefined;

    // 6. Call the configured Email OTP Provider FIRST
    // If the provider fails (or is unconfigured), this fails closed before modifying pending state
    await this.provider.sendOtp({
      email: normalizedEmail,
      otpExpiryMinutes: expiryMinutes
    });

    // 7. Store or update pending registration
    await prisma.pendingRegistration.upsert({
      where: { email: normalizedEmail },
      create: {
        email: normalizedEmail,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        passwordHash,
        phone: input.phone?.trim() || null,
        role: input.role,
        veterinarianData: veterinarianData || undefined,
        attempts: 0,
        lastSentAt: now,
        expiresAt
      },
      update: {
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        passwordHash,
        phone: input.phone?.trim() || null,
        role: input.role,
        veterinarianData: veterinarianData || undefined,
        attempts: 0,
        lastSentAt: now,
        expiresAt
      }
    });

    // 8. Record audit log
    await prisma.auditLog.create({
      data: {
        actorId: null,
        action: 'REGISTRATION_OTP_SENT',
        resourceType: 'PendingRegistration',
        resourceId: normalizedEmail,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        metadata: { email: normalizedEmail, role: input.role }
      }
    });

    logger.event('REGISTRATION_OTP_SENT', { email: normalizedEmail, role: input.role });

    return {
      email: normalizedEmail,
      requireOtp: true,
      cooldownSeconds,
      message: `A 6-digit verification code has been sent to ${normalizedEmail}`
    };
  }

  /**
   * Step 2: Verify the OTP and create the permanent User account.
   * Only upon successful verification is the permanent User record created and session minted.
   */
  public async verifyAndCreateUser(email: string, otp: string, ipAddress?: string, userAgent?: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();

    if (!cleanOtp) {
      throw new BadRequestError('Verification code is required');
    }

    // 1. Look up pending registration
    const pending = await prisma.pendingRegistration.findUnique({
      where: { email: normalizedEmail }
    });

    if (!pending) {
      throw new BadRequestError(
        'Registration request not found or already verified. Please register again.',
        'OTP_NOT_FOUND'
      );
    }

    // 2. Check expiration
    if (new Date() > pending.expiresAt) {
      await prisma.pendingRegistration.delete({ where: { id: pending.id } }).catch(() => {});
      throw new BadRequestError(
        'Verification code has expired. Please register again to receive a fresh code.',
        'OTP_EXPIRED'
      );
    }

    // 3. Check maximum attempts
    const maxAttempts = config.OTP_MAX_ATTEMPTS || 5;
    if (pending.attempts >= maxAttempts) {
      await prisma.pendingRegistration.delete({ where: { id: pending.id } }).catch(() => {});
      throw new ForbiddenError(
        'Maximum verification attempts exceeded. Please restart registration.',
        'MAX_ATTEMPTS_EXCEEDED'
      );
    }

    // 4. Verify OTP with Provider
    const verifyResult = await this.provider.verifyOtp({
      email: normalizedEmail,
      otp: cleanOtp
    });

    if (!verifyResult.success) {
      const nextAttempts = pending.attempts + 1;
      await prisma.pendingRegistration.update({
        where: { id: pending.id },
        data: { attempts: nextAttempts }
      });

      await prisma.auditLog.create({
        data: {
          actorId: null,
          action: 'REGISTRATION_OTP_FAILED',
          resourceType: 'PendingRegistration',
          resourceId: normalizedEmail,
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
          metadata: { email: normalizedEmail, attempts: nextAttempts }
        }
      });

      const remainingAttempts = maxAttempts - nextAttempts;
      throw new UnauthorizedError(
        `Invalid verification code. ${remainingAttempts > 0 ? `${remainingAttempts} attempt(s) remaining.` : 'Account creation blocked.'}`,
        'INVALID_OTP'
      );
    }

    // 5. Verification SUCCEEDED: Atomic permanent User creation
    const { newUser, rawToken, session } = await prisma.$transaction(async (tx) => {
      // Re-verify email uniqueness inside transaction
      const existing = await tx.user.findUnique({ where: { email: normalizedEmail } });
      if (existing) {
        throw new ConflictError('An account with this email address already exists');
      }

      // Create permanent User record with emailVerifiedAt set
      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash: pending.passwordHash,
          firstName: pending.firstName,
          lastName: pending.lastName,
          phone: pending.phone,
          role: pending.role,
          emailVerifiedAt: new Date()
        }
      });

      // Create veterinarian profile if applicable
      if (pending.role === UserRole.VETERINARIAN && pending.veterinarianData) {
        const vetData = pending.veterinarianData as Record<string, any>;
        await tx.veterinarianProfile.create({
          data: {
            userId: user.id,
            licenseNumber: vetData.licenseNumber || 'PENDING',
            specialization: vetData.specialization || 'General Practice',
            experienceYears: Number(vetData.experienceYears) || 0,
            clinicName: vetData.clinicName || null,
            bio: vetData.bio || null,
            verificationStatus: VetVerificationStatus.PENDING
          }
        });
      }

      // Delete the pending registration record now that user is permanent
      await tx.pendingRegistration.delete({ where: { id: pending.id } });

      // Record audit log
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: 'USER_REGISTER_VERIFIED',
          resourceType: 'User',
          resourceId: user.id,
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
          metadata: { email: user.email, role: user.role }
        }
      });

      // Create session
      const sessionResult = await authService.createSessionWithTx(tx, user.id);

      return {
        newUser: user,
        rawToken: sessionResult.rawToken,
        session: sessionResult.session
      };
    });

    logger.event('USER_REGISTER_VERIFIED', { userId: newUser.id, role: newUser.role });

    return {
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        phone: newUser.phone,
        role: newUser.role as UserRole,
        emailVerifiedAt: newUser.emailVerifiedAt
      },
      sessionToken: rawToken,
      expiresAt: session.expiresAt
    };
  }

  /**
   * Resend verification OTP to email with cooldown enforcement.
   */
  public async resendOtp(email: string) {
    const normalizedEmail = email.trim().toLowerCase();

    const pending = await prisma.pendingRegistration.findUnique({
      where: { email: normalizedEmail }
    });

    if (!pending) {
      throw new BadRequestError(
        'No pending registration found for this email address. Please register first.',
        'OTP_NOT_FOUND'
      );
    }

    const now = new Date();
    const cooldownSeconds = config.OTP_RESEND_COOLDOWN_SECONDS || 60;
    const elapsedSeconds = Math.floor((now.getTime() - pending.lastSentAt.getTime()) / 1000);

    if (elapsedSeconds < cooldownSeconds) {
      const remaining = cooldownSeconds - elapsedSeconds;
      throw new AppError(
        `Please wait ${remaining} seconds before requesting a new verification code.`,
        429,
        'RESEND_COOLDOWN',
        { remainingSeconds: remaining }
      );
    }

    // Call provider resend
    await this.provider.resendOtp({ email: normalizedEmail });

    const expiryMinutes = config.OTP_EXPIRY_MINUTES || 10;
    const newExpiresAt = new Date(now.getTime() + expiryMinutes * 60 * 1000);

    await prisma.pendingRegistration.update({
      where: { id: pending.id },
      data: {
        lastSentAt: now,
        expiresAt: newExpiresAt
      }
    });

    return {
      email: normalizedEmail,
      cooldownSeconds,
      message: `A fresh verification code has been sent to ${normalizedEmail}`
    };
  }
}

export const emailOtpService = new EmailOtpService();
