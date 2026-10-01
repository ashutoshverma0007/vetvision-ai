import React, { useState } from 'react';
import { api } from '../../lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Alert, AlertTitle, AlertDescription } from '../../components/ui/Alert';
import { KeyRound, ShieldAlert } from 'lucide-react';

export function SettingsPage() {
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
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Security Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage session credentials and account security</p>
      </div>

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
