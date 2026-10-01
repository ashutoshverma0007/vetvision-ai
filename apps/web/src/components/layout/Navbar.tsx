import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Activity, LogOut, ShieldCheck, Stethoscope, User, Menu, X } from 'lucide-react';
import { UserRole } from '@vetvision/shared-types';

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getDashboardRoute = () => {
    if (!user) return '/dashboard';
    if (user.role === UserRole.ADMIN) return '/admin';
    if (user.role === UserRole.VETERINARIAN) return '/vet/dashboard';
    return '/dashboard';
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/90 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-emerald-600 to-teal-700 bg-clip-text text-transparent">
              VetVision AI
            </span>
            <span className="hidden sm:inline-block ml-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              Clinical v1.0
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors">
            Home
          </Link>
          <Link to="/how-it-works" className="hover:text-foreground transition-colors">
            How It Works
          </Link>
          <Link to="/about" className="hover:text-foreground transition-colors">
            Research & About
          </Link>
        </nav>

        {/* User / Auth CTA */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              <Link to={getDashboardRoute()}>
                <Button variant="outline" size="sm" className="gap-2">
                  {user.role === UserRole.ADMIN && <ShieldCheck className="h-4 w-4 text-purple-600" />}
                  {user.role === UserRole.VETERINARIAN && <Stethoscope className="h-4 w-4 text-blue-600" />}
                  {user.role === UserRole.OWNER && <Activity className="h-4 w-4 text-emerald-600" />}
                  Dashboard
                </Button>
              </Link>

              <div className="flex items-center gap-2 pl-2 border-l border-border">
                <div className="text-right">
                  <p className="text-xs font-semibold leading-tight text-foreground">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-[10px] text-muted-foreground capitalize">{user.role.toLowerCase()}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={handleLogout} title="Log Out">
                  <LogOut className="h-4 w-4 text-muted-foreground hover:text-red-600" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="primary" size="sm">
                  Get Started
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-muted-foreground hover:text-foreground"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-card p-4 space-y-3">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-medium py-1 text-muted-foreground hover:text-foreground"
          >
            Home
          </Link>
          <Link
            to="/how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-medium py-1 text-muted-foreground hover:text-foreground"
          >
            How It Works
          </Link>
          <Link
            to="/about"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-medium py-1 text-muted-foreground hover:text-foreground"
          >
            Research & About
          </Link>

          <div className="pt-3 border-t border-border flex flex-col gap-2">
            {isAuthenticated && user ? (
              <>
                <Link to={getDashboardRoute()} onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" size="sm" className="w-full">
                    Go to Dashboard
                  </Button>
                </Link>
                <Button variant="outline" size="sm" onClick={handleLogout} className="w-full text-red-600">
                  Log Out
                </Button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" size="sm" className="w-full">
                    Sign In
                  </Button>
                </Link>
                <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" size="sm" className="w-full">
                    Register
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
