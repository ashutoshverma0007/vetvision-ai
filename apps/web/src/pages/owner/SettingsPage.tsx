import React, { useState } from 'react';
import { api } from '../../lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Alert, AlertTitle, AlertDescription } from '../../components/ui/Alert';
import { KeyRound, ShieldAlert, Palette, Sun, Moon, Monitor, Check } from 'lucide-react';
import { useTheme, Theme } from '../../context/ThemeContext';

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.auth.changePassword({ currentPassword, newPassword });
      setMessage(res.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container max-w-2xl py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Preferences & Security</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Customize your interface appearance and account credentials</p>
      </div>

      {/* Theme & Appearance Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Palette className="h-5 w-5 text-emerald-600" /> Interface Theme
          </CardTitle>
          <CardDescription className="text-xs">
            Choose your preferred color theme across the VetVision AI platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                id: 'light' as Theme,
                label: 'Light Mode',
                desc: 'Clean, high-contrast daytime interface',
                icon: Sun,
                iconColor: 'text-amber-500'
              },
              {
                id: 'dark' as Theme,
                label: 'Dark Mode',
                desc: 'Sleek, low-glare nighttime palette',
                icon: Moon,
                iconColor: 'text-indigo-400'
              },
              {
                id: 'system' as Theme,
                label: 'System Match',
                desc: 'Follows your operating system settings',
                icon: Monitor,
                iconColor: 'text-emerald-500'
              }
            ].map((option) => {
              const Icon = option.icon;
              const isSelected = theme === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setTheme(option.id)}
                  className={`p-4 rounded-xl border text-left transition-all duration-200 relative flex flex-col justify-between ${
                    isSelected
                      ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-sm'
                      : 'border-border hover:border-border/80 hover:bg-muted/50'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className={`p-2 rounded-lg bg-card border border-border/60 ${option.iconColor}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      {isSelected && (
                        <div className="h-5 w-5 rounded-full bg-primary text-white flex items-center justify-center">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                    <p className="font-semibold text-sm text-foreground">{option.label}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-snug">{option.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-emerald-600" /> Change Account Password
          </CardTitle>
          <CardDescription className="text-xs">
            Argon2id password hashing is enforced. Updating your password invalidates all existing login sessions.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Password Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {message && (
            <Alert variant="success">
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <Input
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />

            <Input
              label="New Password (min 8 chars, 1 uppercase, 1 digit)"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />

            <Input
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Update Password & Revoke Sessions
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
