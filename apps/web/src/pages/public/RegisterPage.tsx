import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card';
import { Alert, AlertTitle, AlertDescription } from '../../components/ui/Alert';
import { Activity, User, Stethoscope } from 'lucide-react';
import { UserRole } from '@vetvision/shared-types';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState<UserRole.OWNER | UserRole.VETERINARIAN>(UserRole.OWNER);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');

  // Vet specific fields
  const [licenseNumber, setLicenseNumber] = useState('');
  const [specialization, setSpecialization] = useState('Bovine Dermatology & Large Animal');
  const [experienceYears, setExperienceYears] = useState('5');
  const [clinicName, setClinicName] = useState('');
  const [bio, setBio] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const payload: any = {
      role,
      firstName,
      lastName,
      email,
      password,
      phone: phone || undefined
    };

    if (role === UserRole.VETERINARIAN) {
      payload.licenseNumber = licenseNumber;
      payload.specialization = specialization;
      payload.experienceYears = parseInt(experienceYears, 10) || 0;
      payload.clinicName = clinicName || undefined;
      payload.bio = bio || undefined;
    }

    try {
      await register(payload);
      if (role === UserRole.VETERINARIAN) {
        navigate('/vet/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check form details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container flex min-h-[calc(100vh-8rem)] items-center justify-center py-12">
      <Card className="w-full max-w-lg shadow-xl border-border/80">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
            <Activity className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold">Create Your Account</CardTitle>
          <CardDescription className="text-xs">
            Join VetVision AI for clinical records and AI-assisted screening
          </CardDescription>

          {/* Role Switcher */}
          <div className="grid grid-cols-2 gap-2 pt-4">
            <button
              type="button"
              onClick={() => setRole(UserRole.OWNER)}
              className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                role === UserRole.OWNER
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted'
              }`}
            >
              <User className="h-4 w-4" /> Animal Owner / Rancher
            </button>
            <button
              type="button"
              onClick={() => setRole(UserRole.VETERINARIAN)}
              className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                role === UserRole.VETERINARIAN
                  ? 'border-blue-600 bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted'
              }`}
            >
              <Stethoscope className="h-4 w-4" /> Licensed Veterinarian
            </button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Registration Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="First Name"
                placeholder="John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
              <Input
                label="Last Name"
                placeholder="Dutton"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>

            <Input
              label="Email Address"
              type="email"
              placeholder="e.g. john@yellowstone.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Password (min 8 chars, 1 uppercase, 1 digit)"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Input
              label="Phone Number (Optional)"
              type="tel"
              placeholder="+1-555-0123"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            {/* Veterinarian Specific Professional Fields */}
            {role === UserRole.VETERINARIAN && (
              <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 space-y-3">
                <p className="text-xs font-bold text-blue-900 dark:text-blue-200">
                  Veterinary Board Licensing Information
                </p>
                <Input
                  label="State / National License Number"
                  placeholder="e.g. VET-TX-987654"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  required
                />
                <Input
                  label="Clinical Specialization"
                  placeholder="e.g. Bovine Medicine, Dermatology"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  required
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Years of Experience"
                    type="number"
                    min="0"
                    max="60"
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(e.target.value)}
                    required
                  />
                  <Input
                    label="Clinic / Practice Name"
                    placeholder="e.g. Valley Vet Clinic"
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                  />
                </div>
              </div>
            )}

            <Button type="submit" variant="primary" className="w-full" isLoading={isSubmitting}>
              Complete Registration
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center border-t border-border pt-4 text-xs text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="ml-1 font-semibold text-emerald-600 hover:underline">
            Sign In
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
