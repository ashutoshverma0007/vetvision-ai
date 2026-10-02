import * as argon2 from 'argon2';
import crypto from 'crypto';
import { prisma } from '../prisma.js';
import { RegisterInput, LoginInput, ChangePasswordInput } from '@vetvision/validation';
import { UserRole, VetVerificationStatus } from '@vetvision/shared-types';
import { BadRequestError, ConflictError, UnauthorizedError } from '../errors.js';
import { logger } from '../logger.js';

const SESSION_DURATION_DAYS = 30;

export class AuthService {
  private hashSessionToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  public async register(input: RegisterInput, ipAddress?: string, userAgent?: string) {
    // 1. Prevent public registration as ADMIN
    if ((input.role as string) === UserRole.ADMIN) {
      throw new BadRequestError('Cannot register as an Administrator via public registration');
    }

    // 2. Check for duplicate email
    const existing = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() }
    });
    if (existing) {
      throw new ConflictError('An account with this email address already exists');
    }

    // 3. Hash password using Argon2id
    const passwordHash = await argon2.hash(input.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4
    });

    // 4. Create user inside transaction
    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: input.email.toLowerCase(),
          passwordHash,
          role: input.role,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone || null
        }
      });

      // If veterinarian, create initial profile in PENDING verification state
      if (input.role === UserRole.VETERINARIAN) {
        if (!input.licenseNumber) {
          throw new BadRequestError('License number is required for veterinarian registration');
        }
        await tx.veterinarianProfile.create({
          data: {
            userId: user.id,
            licenseNumber: input.licenseNumber,
            specialization: input.specialization || 'General Practice',
            experienceYears: input.experienceYears || 0,
            clinicName: input.clinicName || null,
            bio: input.bio || null,
            verificationStatus: VetVerificationStatus.PENDING
          }
        });
      }

      // Record audit log
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: 'USER_REGISTER',
          resourceType: 'User',
          resourceId: user.id,
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
          metadata: { email: user.email, role: user.role }
        }
      });

      return user;
    });

    logger.event('USER_REGISTER', { userId: newUser.id, role: newUser.role });

    // 5. Create active session
    const { rawToken, session } = await this.createSession(newUser.id);

    return {
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role as UserRole
      },
      sessionToken: rawToken,
      expiresAt: session.expiresAt
    };
  }

  public async login(input: LoginInput, ipAddress?: string, userAgent?: string) {
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
      include: { veterinarianProfile: true }
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isMatch = await argon2.verify(user.passwordHash, input.password);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Create session
    const { rawToken, session } = await this.createSession(user.id);

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'USER_LOGIN',
        resourceType: 'User',
        resourceId: user.id,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null
      }
    });

    logger.event('USER_LOGIN', { userId: user.id, email: user.email });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role as UserRole,
        veterinarianProfile: user.veterinarianProfile
      },
      sessionToken: rawToken,
      expiresAt: session.expiresAt
    };
  }

  public async logout(sessionId: string, userId?: string) {
    await prisma.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() }
    });

    if (userId) {
      logger.event('USER_LOGOUT', { userId, sessionId });
    }
  }

  public async changePassword(userId: string, input: ChangePasswordInput) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    const isMatch = await argon2.verify(user.passwordHash, input.currentPassword);
    if (!isMatch) {
      throw new BadRequestError('Current password is incorrect');
    }

    const newHash = await argon2.hash(input.newPassword, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4
    });

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { passwordHash: newHash }
      });

      // Revoke all existing sessions to enforce re-login
      await tx.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() }
      });
    });

    logger.event('PASSWORD_CHANGE', { userId });
  }

  public async createSession(userId: string) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const sessionTokenHash = this.hashSessionToken(rawToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

    const session = await prisma.session.create({
      data: {
        userId,
        sessionTokenHash,
        expiresAt
      }
    });

    return { rawToken, session };
  }

  public async createSessionWithTx(tx: any, userId: string) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const sessionTokenHash = this.hashSessionToken(rawToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

    const session = await tx.session.create({
      data: {
        userId,
        sessionTokenHash,
        expiresAt
      }
    });

    return { rawToken, session };
  }

  public async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { veterinarianProfile: true }
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role as UserRole,
      emailVerifiedAt: user.emailVerifiedAt,
      createdAt: user.createdAt,
      veterinarianProfile: user.veterinarianProfile
    };
  }
}

export const authService = new AuthService();
