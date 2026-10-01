import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { UserRole } from '@vetvision/shared-types';

// Public Pages
import { HomePage } from './pages/public/HomePage';
import { AboutPage } from './pages/public/AboutPage';
import { HowItWorksPage } from './pages/public/HowItWorksPage';
import { LoginPage } from './pages/public/LoginPage';
import { RegisterPage } from './pages/public/RegisterPage';

// Owner Pages
import { OwnerDashboardPage } from './pages/owner/OwnerDashboardPage';
import { AnimalsListPage } from './pages/owner/AnimalsListPage';
import { AnimalDetailPage } from './pages/owner/AnimalDetailPage';
import { NewScanPage } from './pages/owner/NewScanPage';
import { ScanDetailPage } from './pages/owner/ScanDetailPage';
import { ConsultationsPage } from './pages/owner/ConsultationsPage';
import { ConsultationDetailPage } from './pages/owner/ConsultationDetailPage';
import { ProfilePage } from './pages/owner/ProfilePage';
import { SettingsPage } from './pages/owner/SettingsPage';

// Vet Pages
import { VetDashboardPage } from './pages/vet/VetDashboardPage';
import { VetConsultationsPage } from './pages/vet/VetConsultationsPage';
import { VetProfilePage } from './pages/vet/VetProfilePage';

// Admin Pages
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminVetsPage } from './pages/admin/AdminVetsPage';
import { AdminModelsPage } from './pages/admin/AdminModelsPage';
import { AdminAuditLogsPage } from './pages/admin/AdminAuditLogsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

function RootLayout() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Owner Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={[UserRole.OWNER, UserRole.ADMIN]}>
                <OwnerDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/animals"
            element={
              <ProtectedRoute allowedRoles={[UserRole.OWNER, UserRole.ADMIN]}>
                <AnimalsListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/animals/:id"
            element={
              <ProtectedRoute>
                <AnimalDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/animals/:id/health"
            element={
              <ProtectedRoute>
                <AnimalDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/animals/:id/scans"
            element={
              <ProtectedRoute>
                <AnimalDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/animals/:id/scans/new"
            element={
              <ProtectedRoute allowedRoles={[UserRole.OWNER, UserRole.ADMIN]}>
                <NewScanPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/scans/:id"
            element={
              <ProtectedRoute>
                <ScanDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/consultations"
            element={
              <ProtectedRoute>
                <ConsultationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/consultations/:id"
            element={
              <ProtectedRoute>
                <ConsultationDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />

          {/* Veterinarian Protected Routes */}
          <Route
            path="/vet/dashboard"
            element={
              <ProtectedRoute allowedRoles={[UserRole.VETERINARIAN, UserRole.ADMIN]}>
                <VetDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/vet/consultations"
            element={
              <ProtectedRoute allowedRoles={[UserRole.VETERINARIAN, UserRole.ADMIN]}>
                <VetConsultationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/vet/consultations/:id"
            element={
              <ProtectedRoute allowedRoles={[UserRole.VETERINARIAN, UserRole.ADMIN]}>
                <ConsultationDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/vet/animals/:id"
            element={
              <ProtectedRoute allowedRoles={[UserRole.VETERINARIAN, UserRole.ADMIN]}>
                <AnimalDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/vet/profile"
            element={
              <ProtectedRoute allowedRoles={[UserRole.VETERINARIAN, UserRole.ADMIN]}>
                <VetProfilePage />
              </ProtectedRoute>
            }
          />

          {/* Admin Protected Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
                <AdminUsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/veterinarians"
            element={
              <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
                <AdminVetsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/models"
            element={
              <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
                <AdminModelsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/audit-logs"
            element={
              <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
                <AdminAuditLogsPage />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <RootLayout />
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
export default App;
