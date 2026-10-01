import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card';
import { Alert, AlertTitle, AlertDescription } from '../../components/ui/Alert';
import { Activity, ShieldCheck, Stethoscope, User } from 'lucide-react';
import { UserRole } from '@vetvision/shared-types';

export function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login({ email, password });
      // Redirect based on current session
      // Since user state updates asynchronously, we can route to /dashboard which handles role redirection or read role
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDemo = (role: 'owner' | 'vet' | 'admin') => {
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
    <div className="container flex min-h-[calc(100vh-8rem)] items-center justify-center py-12">
      <Card className="w-full max-w-md shadow-xl border-border/80">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
            <Activity className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold">Sign In to VetVision AI</CardTitle>
          <CardDescription className="text-xs">
            Access animal profiles, diagnostic screening, and consultations
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Authentication Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="e.g. owner@vetvision.ai"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button type="submit" variant="primary" className="w-full" isLoading={isSubmitting}>
              Sign In
            </Button>
          </form>

          {/* Quick-Fill Development Credentials */}
          <div className="pt-4 border-t border-border space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-center">
              Development Quick-Fill:
            </p>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fillDemo('owner')}
                className="text-xs gap-1"
              >
                <User className="h-3 w-3 text-emerald-600" /> Owner
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fillDemo('vet')}
                className="text-xs gap-1"
              >
                <Stethoscope className="h-3 w-3 text-blue-600" /> Vet
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fillDemo('admin')}
                className="text-xs gap-1"
              >
                <ShieldCheck className="h-3 w-3 text-purple-600" /> Admin
              </Button>
            </div>
          </div>
        </CardContent>

        <CardFooter className="justify-center border-t border-border pt-4 text-xs text-muted-foreground">
          Don't have an account?{' '}
          <Link to="/register" className="ml-1 font-semibold text-emerald-600 hover:underline">
            Register here
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
