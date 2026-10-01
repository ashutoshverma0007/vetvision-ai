import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { User, Mail, Phone, Calendar, ShieldCheck } from 'lucide-react';
import { formatDate } from '../../lib/utils';

export function ProfilePage() {
  const { user } = useAuth();

  return (
    <div className="container max-w-3xl py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Account Profile</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Your personal user account and platform contact details</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center gap-2">
              <User className="h-5 w-5 text-emerald-600" /> User Profile
            </span>
            <Badge variant="outline">{user?.role}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid sm:grid-cols-2 gap-4 pb-4 border-b border-border">
            <div>
              <span className="text-xs uppercase font-bold text-muted-foreground block">Full Name</span>
              <span className="font-semibold text-foreground">
                {user?.firstName} {user?.lastName}
              </span>
            </div>
            <div>
              <span className="text-xs uppercase font-bold text-muted-foreground block">Email Address</span>
              <span className="font-medium text-foreground">{user?.email}</span>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 pb-4 border-b border-border">
            <div>
              <span className="text-xs uppercase font-bold text-muted-foreground block">Phone</span>
              <span className="font-medium text-foreground">{user?.phone || 'Not provided'}</span>
            </div>
            <div>
              <span className="text-xs uppercase font-bold text-muted-foreground block">Account Role</span>
              <span className="font-medium text-foreground capitalize">{user?.role?.toLowerCase()}</span>
            </div>
          </div>

          <div>
            <span className="text-xs uppercase font-bold text-muted-foreground block">Member Since</span>
            <span className="text-foreground">{formatDate(user?.createdAt)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
