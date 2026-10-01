import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Stethoscope, ShieldCheck, Clock, Building, Award } from 'lucide-react';

export function VetProfilePage() {
  const { user } = useAuth();
  const profile = user?.veterinarianProfile;

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Veterinarian Professional Profile
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Licensed medical credentials, verification status, and practice affiliation
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Practitioner Information</span>
              {profile?.verificationStatus === 'VERIFIED' ? (
                <Badge variant="success" className="gap-1">
                  <ShieldCheck className="h-3 w-3" /> Board Verified
                </Badge>
              ) : (
                <Badge variant="warning" className="gap-1">
                  <Clock className="h-3 w-3" /> Pending Verification
                </Badge>
              )}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4 text-sm">
            <div className="grid sm:grid-cols-2 gap-4 pb-4 border-b border-border">
              <div>
                <span className="text-xs uppercase font-bold text-muted-foreground block">Full Name</span>
                <span className="font-semibold text-foreground">Dr. {user?.firstName} {user?.lastName}</span>
              </div>
              <div>
                <span className="text-xs uppercase font-bold text-muted-foreground block">Registered Email</span>
                <span className="text-foreground">{user?.email}</span>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 pb-4 border-b border-border">
              <div>
                <span className="text-xs uppercase font-bold text-muted-foreground block">Board License #</span>
                <span className="font-mono font-bold text-foreground">{profile?.licenseNumber || 'N/A'}</span>
              </div>
              <div>
                <span className="text-xs uppercase font-bold text-muted-foreground block">Clinical Specialization</span>
                <span className="font-semibold text-foreground">{profile?.specialization || 'General Practice'}</span>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 pb-4 border-b border-border">
              <div>
                <span className="text-xs uppercase font-bold text-muted-foreground block">Practice / Clinic</span>
                <span className="text-foreground">{profile?.clinicName || 'Independent Practice'}</span>
              </div>
              <div>
                <span className="text-xs uppercase font-bold text-muted-foreground block">Years of Experience</span>
                <span className="text-foreground">{profile?.experienceYears || 0} years</span>
              </div>
            </div>

            <div>
              <span className="text-xs uppercase font-bold text-muted-foreground block mb-1">Professional Bio</span>
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                {profile?.bio || 'No clinical biography submitted.'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Sidebar Info */}
        <div className="space-y-4">
          <Card className="border border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <Award className="h-4 w-4 text-emerald-600" /> Verification Protocol
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2 leading-relaxed">
              <p>
                Veterinary credentials undergo administrative review against official state and national veterinary medical licensing registries.
              </p>
              <p>
                Once verified, your profile gains a public <strong>Board Verified</strong> trust badge visible to animal owners requesting clinical evaluations.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
