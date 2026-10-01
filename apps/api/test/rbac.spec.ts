import { describe, it, expect, vi } from 'vitest';
import { requireRole } from '../src/middleware/rbac.middleware.js';
import { UserRole } from '@vetvision/shared-types';
import { ForbiddenError, UnauthorizedError } from '../src/errors.js';
import { Request, Response, NextFunction } from 'express';

describe('RBAC Middleware and Access Control', () => {
  it('calls next with UnauthorizedError if user is missing from request', () => {
    const middleware = requireRole(UserRole.ADMIN);
    const req = {} as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('calls next with ForbiddenError if user does not have required role', () => {
    const middleware = requireRole(UserRole.ADMIN);
    const req = {
      user: {
        id: 'user-123',
        email: 'owner@example.com',
        role: UserRole.OWNER,
        firstName: 'John',
        lastName: 'Doe',
        phone: null,
        emailVerifiedAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });

  it('calls next() without error if user possesses authorized role', () => {
    const middleware = requireRole(UserRole.OWNER, UserRole.ADMIN);
    const req = {
      user: {
        id: 'user-123',
        email: 'owner@example.com',
        role: UserRole.OWNER,
        firstName: 'John',
        lastName: 'Doe',
        phone: null,
        emailVerifiedAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  it('allows VETERINARIAN role when explicitly listed', () => {
    const middleware = requireRole(UserRole.VETERINARIAN);
    const req = {
      user: {
        id: 'vet-456',
        email: 'vet@example.com',
        role: UserRole.VETERINARIAN,
        firstName: 'Jane',
        lastName: 'Smith',
        phone: null,
        emailVerifiedAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });
});
