import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '@vetvision/shared-types';
import { Loader2, ShieldAlert } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <p className="text-sm text-muted-foreground font-medium">Authenticating session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="container py-16 flex flex-col items-center justify-center text-center">
        <div className="p-4 rounded-full bg-red-100 text-red-600 mb-4">
          <ShieldAlert className="h-10 w-10" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Access Restricted</h2>
        <p className="text-muted-foreground mt-2 max-w-md text-sm">
          Your account role (<span className="font-semibold">{user.role}</span>) does not have authorization to view this area.
        </p>
        <button
          onClick={() => window.history.back()}
          className="mt-6 text-sm font-semibold text-emerald-600 hover:underline"
        >
          &larr; Return to previous screen
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
