import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card';
import { Alert, AlertTitle, AlertDescription } from '../../components/ui/Alert';
import { Activity, User, Stethoscope, Mail, Lock, Phone, ArrowRight, Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react';
import { UserRole } from '@vetvision/shared-types';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState<UserRole.OWNER | UserRole.VETERINARIAN>(UserRole.OWNER);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Vet specific fields
  const [licenseNumber, setLicenseNumber] = useState('');
  const [specialization, setSpecialization] = useState('Bovine Dermatology & Large Animal');
  const [experienceYears, setExperienceYears] = useState('5');
  const [clinicName, setClinicName] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfigRequired, setIsConfigRequired] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsConfigRequired(false);

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify your password confirmation.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError('Password must contain at least one uppercase letter and one number.');
      return;
    }

    setIsSubmitting(true);

    const payload: any = {
      role,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      password,
      phone: phone.trim() || undefined
    };

    if (role === UserRole.VETERINARIAN) {
      if (!licenseNumber.trim()) {
        setError('Veterinary license number is required for practitioner registration.');
        setIsSubmitting(false);
        return;
      }
      payload.licenseNumber = licenseNumber.trim();
      payload.specialization = specialization.trim();
      payload.experienceYears = parseInt(experienceYears, 10) || 0;
      payload.clinicName = clinicName.trim() || undefined;
    }

    try {
      const res = await register(payload);
      const targetEmail = res.email || email.trim().toLowerCase();
      try {
        sessionStorage.setItem('vetvision_pending_reg_email', targetEmail);
      } catch {
        // Ignore storage errors
      }
      navigate('/verify-email', { state: { email: targetEmail } });
    } catch (err: any) {
      if (err.code === 'CONFIGURATION_REQUIRED') {
        setIsConfigRequired(true);
        setError(
          'Email OTP delivery is not yet configured on this development server (missing MSG91 credentials in .env).'
        );
      } else {
        setError(err.message || 'Registration failed. Please check your details and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50/50 dark:bg-background">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20 mb-1">
            <Activity className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-foreground">
            Create an account
          </h1>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
            Register your livestock or pet profile to access AI diagnostic screening and clinical care.
          </p>
        </div>

        {/* Card */}
        <Card className="border border-slate-200/80 dark:border-border shadow-sm bg-white dark:bg-card">
          <CardContent className="pt-6 space-y-5">
            {error && (
              <Alert variant="destructive" className="py-2.5">
                <AlertTitle className="text-xs font-semibold flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" /> Registration Notice
                </AlertTitle>
                <AlertDescription className="text-xs mt-0.5 leading-relaxed">{error}</AlertDescription>
              </Alert>
            )}

            {isConfigRequired && (
              <div className="p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-2">
                <p className="font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-amber-600" />
                  Development Environment Note
                </p>
                <p className="leading-relaxed">
                  Real email delivery requires <code>MSG91_AUTH_KEY</code> and <code>MSG91_EMAIL_TEMPLATE_ID</code> in <code>.env</code>. You can sign in immediately using pre-seeded accounts:
                </p>
                <div className="flex gap-2 pt-1">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
                  >
                    Go to Sign In &rarr;
                  </Link>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Role Selection */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
                  Account Type
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setRole(UserRole.OWNER)}
                    className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-all ${
                      role === UserRole.OWNER
                        ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-600'
                        : 'border-slate-200 dark:border-border text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-muted/20'
                    }`}
                  >
                    <User className={`h-4 w-4 ${role === UserRole.OWNER ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                    <div>
                      <p className="text-xs font-bold">Animal Owner</p>
                      <p className="text-[10px] text-muted-foreground">Pet or livestock manager</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole(UserRole.VETERINARIAN)}
                    className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-all ${
                      role === UserRole.VETERINARIAN
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200 ring-1 ring-blue-600'
                        : 'border-slate-200 dark:border-border text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-muted/20'
                    }`}
                  >
                    <Stethoscope className={`h-4 w-4 ${role === UserRole.VETERINARIAN ? 'text-blue-600' : 'text-muted-foreground'}`} />
                    <div>
                      <p className="text-xs font-bold">Veterinarian</p>
                      <p className="text-[10px] text-muted-foreground">Licensed practitioner</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Name fields */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">First Name</label>
                  <Input
                    type="text"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Last Name</label>
                  <Input
                    type="text"
                    placeholder="Dutton"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              {/* Contact fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Mail className="h-3 w-3 text-muted-foreground" /> Email Address
                  </label>
                  <Input
                    type="email"
                    placeholder="name@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Phone className="h-3 w-3 text-muted-foreground" /> Phone (Optional)
                  </label>
                  <Input
                    type="tel"
                    placeholder="+1-555-0100"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              {/* Veterinarian Specific Details */}
              {role === UserRole.VETERINARIAN && (
                <div className="p-3 rounded-lg border border-blue-200/80 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-950/10 space-y-3">
                  <p className="text-xs font-semibold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-blue-600" /> Practitioner Credentials
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300">License Number *</label>
                      <Input
                        type="text"
                        placeholder="e.g. VET-TX-12345"
                        value={licenseNumber}
                        onChange={(e) => setLicenseNumber(e.target.value)}
                        required={role === UserRole.VETERINARIAN}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300">Specialization</label>
                      <Input
                        type="text"
                        placeholder="Large Animal Dermatology"
                        value={specialization}
                        onChange={(e) => setSpecialization(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300">Years Experience</label>
                      <Input
                        type="number"
                        min="0"
                        max="60"
                        value={experienceYears}
                        onChange={(e) => setExperienceYears(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300">Clinic Name (Optional)</label>
                      <Input
                        type="text"
                        placeholder="Valley Veterinary Hospital"
                        value={clinicName}
                        onChange={(e) => setClinicName(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Password fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Lock className="h-3 w-3 text-muted-foreground" /> Password
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min 8 chars, 1 uppercase, 1 digit"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-9 text-xs pr-8"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Confirm Password</label>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full h-10 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 shadow-sm mt-2"
                isLoading={isSubmitting}
              >
                Create Account & Send Verification Code <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </form>
          </CardContent>

          <CardFooter className="py-4 border-t border-slate-100 dark:border-border/60 bg-slate-50/50 dark:bg-muted/20 flex flex-col items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <div>
              Already have an active account?{' '}
              <Link to="/login" className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
                Sign In
              </Link>
            </div>
          </CardFooter>
        </Card>

        {/* Security Note */}
        <p className="text-[11px] text-center text-muted-foreground leading-relaxed px-4">
          A secure verification code will be dispatched to verify email ownership. Accounts are created only after successful email verification.
        </p>
      </div>
    </div>
  );
}
