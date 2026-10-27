import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card';
import { Alert, AlertTitle, AlertDescription } from '../../components/ui/Alert';
import { Activity, ShieldCheck, Stethoscope, User, Eye, EyeOff, Lock, Mail, ArrowRight } from 'lucide-react';
import { UserRole } from '@vetvision/shared-types';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const user = await login({ email, password });
      // Role-specific navigation to avoid unauthorized route bouncing
      if (user?.role === UserRole.VETERINARIAN) {
        navigate('/vet/dashboard');
      } else if (user?.role === UserRole.ADMIN) {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDemo = (role: 'owner' | 'vet' | 'admin') => {
    setError(null);
    if (role === 'owner') {
      setEmail('owner@vetvision.ai');
      setPassword('DevOwner123!');
    } else if (role === 'vet') {
      setEmail('vet@vetvision.ai');
      setPassword('DevVet123!');
    } else if (role === 'admin') {
      setEmail('admin@vetvision.ai');
      setPassword('DevAdmin123!');
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50/50 dark:bg-background">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20 mb-1">
            <Activity className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-foreground">
            Welcome back
          </h1>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            Sign in to access your animal profiles, diagnostic screening records, and clinical consultations.
          </p>
        </div>

        {/* Login Card */}
        <Card className="border border-slate-200/80 dark:border-border shadow-sm bg-white dark:bg-card">
          <CardContent className="pt-6 space-y-5">
            {error && (
              <Alert variant="destructive" className="py-2.5">
                <AlertTitle className="text-xs font-semibold">Sign In Failed</AlertTitle>
                <AlertDescription className="text-xs mt-0.5">{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Email Address
                </label>
                <Input
                  type="email"
                  placeholder="name@vetvision.ai"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  className="h-10 text-sm"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-muted-foreground" /> Password
                  </label>
                </div>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    className="h-10 pr-10 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-slate-900 dark:hover:text-foreground transition-colors"
                    tabIndex={-1}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full h-10 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 shadow-sm"
                isLoading={isSubmitting}
              >
                Sign In <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </form>

            {/* Quick-Fill Development Credentials */}
            <div className="pt-4 border-t border-slate-100 dark:border-border/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Development Quick-Fill
                </span>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">Pre-seeded Demo</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fillDemo('owner')}
                  className="h-8 text-xs gap-1 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-200"
                >
                  <User className="h-3 w-3 text-emerald-600" /> Owner
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fillDemo('vet')}
                  className="h-8 text-xs gap-1 hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:border-blue-200"
                >
                  <Stethoscope className="h-3 w-3 text-blue-600" /> Vet
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fillDemo('admin')}
                  className="h-8 text-xs gap-1 hover:bg-purple-50 dark:hover:bg-purple-950/30 hover:border-purple-200"
                >
                  <ShieldCheck className="h-3 w-3 text-purple-600" /> Admin
                </Button>
              </div>
            </div>
          </CardContent>

          <CardFooter className="py-4 border-t border-slate-100 dark:border-border/60 bg-slate-50/50 dark:bg-muted/20 flex flex-col items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <div>
              Don&apos;t have an account?{' '}
              <Link to="/register" className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
                Create an account
              </Link>
            </div>
          </CardFooter>
        </Card>

        {/* Security & Regulatory Note */}
        <p className="text-[11px] text-center text-muted-foreground leading-relaxed px-4">
          Session security enforced via Argon2id password verification and HttpOnly cookies. AI-assisted screening is an operational decision aid, not a standalone veterinary diagnosis.
        </p>
      </div>
    </div>
  );
}
