import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '../../src/components/layout/ProtectedRoute';
import * as AuthContextModule from '../../src/context/AuthContext';
import { UserRole } from '@vetvision/shared-types';

describe('ProtectedRoute Component (<ProtectedRoute />)', () => {
  it('renders loading spinner and message when session is loading', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn()
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByText('Authenticating session...')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('redirects unauthenticated user to /login', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn()
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div>Secret Dashboard</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Login Page Screen</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Login Page Screen')).toBeInTheDocument();
    expect(screen.queryByText('Secret Dashboard')).not.toBeInTheDocument();
  });

  it('renders Access Restricted when user role is not in allowedRoles', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 'owner-uuid-1',
        email: 'owner@vetvision.ai',
        firstName: 'Jane',
        lastName: 'Owner',
        role: UserRole.OWNER,
        isEmailVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn()
    });

    render(
      <MemoryRouter initialEntries={['/admin/users']}>
        <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
          <div>Admin Management Screen</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByText('Access Restricted')).toBeInTheDocument();
    expect(screen.getByText(UserRole.OWNER)).toBeInTheDocument();
    expect(screen.queryByText('Admin Management Screen')).not.toBeInTheDocument();
  });

  it('renders children when authenticated and role is allowed', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 'vet-uuid-1',
        email: 'vet@vetvision.ai',
        firstName: 'Dr. Sarah',
        lastName: 'Vance',
        role: UserRole.VETERINARIAN,
        isEmailVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn()
    });

    render(
      <MemoryRouter initialEntries={['/vet/consultations']}>
        <ProtectedRoute allowedRoles={[UserRole.VETERINARIAN, UserRole.ADMIN]}>
          <div>Veterinarian Clinical Workspace</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByText('Veterinarian Clinical Workspace')).toBeInTheDocument();
  });
});
