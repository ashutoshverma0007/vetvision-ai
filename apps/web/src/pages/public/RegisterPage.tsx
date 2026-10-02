import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card';
import { Alert, AlertTitle, AlertDescription } from '../../components/ui/Alert';
import { Activity, User, Stethoscope, Mail, ArrowLeft, RefreshCw, CheckCircle2 } from 'lucide-react';
import { UserRole } from '@vetvision/shared-types';

export function RegisterPage() {
  const { register, verifyOtp, resendOtp } = useAuth();
  const navigate = useNavigate();

  // Registration Form State
  const [role, setRole] = useState<UserRole.OWNER | UserRole.VETERINARIAN>(UserRole.OWNER);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');

  // Vet specific fields
  const [licenseNumber, setLicenseNumber] = useState('');
  const [specialization, setSpecialization] = useState('Bovine Dermatology & Large Animal');
  const [experienceYears, setExperienceYears] = useState('5');
  const [clinicName, setClinicName] = useState('');
  const [bio, setBio] = useState('');

  // OTP Verification Flow State
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [cooldown, setCooldown] = useState(60);
  const [isResending, setIsResending] = useState(false);
  const [otpSuccessMessage, setOtpSuccessMessage] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cooldown countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOtpStep && cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isOtpStep, cooldown]);

  // Restore pending email state from sessionStorage if page is refreshed
  useEffect(() => {
    try {
      const savedEmail = sessionStorage.getItem('vetvision_pending_reg_email');
      if (savedEmail) {
        setPendingEmail(savedEmail);
        setIsOtpStep(true);
      }
    } catch {
      // Ignore storage access errors
    }
  }, []);

  // Handle Step 1: Submit Form & Initiate Email OTP
  const handleInitiateSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter confirm password.');
      return;
    }

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
      const res = await register(payload);
      const targetEmail = res.email || email;
      setPendingEmail(targetEmail);
      try {
        sessionStorage.setItem('vetvision_pending_reg_email', targetEmail);
      } catch {}
      setCooldown(res.cooldownSeconds || 60);
      setOtpSuccessMessage(res.message || `A verification code was sent to ${targetEmail}`);
      setIsOtpStep(true);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check form details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Step 2: Verify Entered OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setOtpSuccessMessage(null);

    const cleanOtp = otp.trim();
    if (!cleanOtp) {
      setError('Please enter the 6-digit verification code sent to your email.');
      return;
    }

    setIsSubmitting(true);

    try {
      await verifyOtp({
        email: pendingEmail,
        otp: cleanOtp
      });

      try {
        sessionStorage.removeItem('vetvision_pending_reg_email');
      } catch {}

      // Verification succeeded: session is active, redirect to dashboard
      if (role === UserRole.VETERINARIAN) {
        navigate('/vet/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please check the code and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Resend OTP with Cooldown
  const handleResendOtp = async () => {
    if (cooldown > 0 || isResending) return;
    setError(null);
    setIsResending(true);

    try {
      const res = await resendOtp({ email: pendingEmail });
      setCooldown(res.cooldownSeconds || 60);
      setOtpSuccessMessage(res.message || 'A fresh verification code has been sent to your email.');
    } catch (err: any) {
      setError(err.message || 'Failed to resend code. Please try again shortly.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="container flex min-h-[calc(100vh-8rem)] items-center justify-center py-12">
      {/* ------------------------------------------------------------- */}
      {/* STEP 2: EMAIL OTP VERIFICATION SCREEN                         */}
      {/* ------------------------------------------------------------- */}
      {isOtpStep ? (
        <Card className="w-full max-w-md shadow-xl border-border/80">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20">
              <Mail className="h-7 w-7" />
            </div>
            <CardTitle className="text-2xl font-bold">Verify Your Email</CardTitle>
            <CardDescription className="text-xs">
              We've sent a 6-digit verification code to
              <br />
              <span className="font-semibold text-foreground text-sm">{pendingEmail}</span>
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleVerifyOtp}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertTitle>Verification Failed</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {otpSuccessMessage && (
                <Alert variant="success">
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>Code Sent</AlertTitle>
                  <AlertDescription>{otpSuccessMessage}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground text-center block">
                  Enter 6-Digit Email Verification Code
                </label>
                <input
                  type="text"
                  maxLength={8}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="------"
                  autoFocus
                  required
                  className="w-full text-center tracking-[0.5em] text-2xl font-mono py-3 px-4 rounded-xl border-2 border-border focus:border-emerald-600 focus:outline-none bg-background text-foreground transition-all shadow-inner"
                />
                <p className="text-[11px] text-muted-foreground text-center">
                  Verification code expires in 10 minutes.
                </p>
              </div>

              {/* Resend Cooldown Section */}
              <div className="text-center pt-2">
                {cooldown > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Resend code available in{' '}
                    <span className="font-semibold text-foreground">{cooldown}s</span>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={isResending}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isResending ? 'animate-spin' : ''}`} />
                    Resend Verification Code
                  </button>
                )}
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" variant="primary" className="w-full text-sm" isLoading={isSubmitting}>
                Verify & Create Account
              </Button>

              <button
                type="button"
                onClick={() => {
                  try {
                    sessionStorage.removeItem('vetvision_pending_reg_email');
                  } catch {}
                  setIsOtpStep(false);
                  setError(null);
                  setOtp('');
                }}
                className="inline-flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Change email or edit details
              </button>
            </CardFooter>
          </form>
        </Card>
      ) : (
        /* ------------------------------------------------------------- */
        /* STEP 1: REGISTRATION INPUT FORM                               */
        /* ------------------------------------------------------------- */
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

          <form onSubmit={handleInitiateSignup}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertTitle>Registration Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="First Name"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
                <Input
                  label="Last Name"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>

              <Input
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Password (min 8 chars, 1 uppercase, 1 digit)"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Input
                  label="Confirm Password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <Input
                label="Phone Number (Optional)"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1-555-0123"
              />

              {/* Veterinarian Specific Details */}
              {role === UserRole.VETERINARIAN && (
                <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 dark:border-blue-900/40 dark:bg-blue-950/20 space-y-3">
                  <p className="text-xs font-semibold text-blue-900 dark:text-blue-300">
                    Veterinary License & Practice Details
                  </p>

                  <Input
                    label="Veterinary License Number"
                    type="text"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    required
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Specialization"
                      type="text"
                      value={specialization}
                      onChange={(e) => setSpecialization(e.target.value)}
                      required
                    />
                    <Input
                      label="Experience (Years)"
                      type="number"
                      value={experienceYears}
                      onChange={(e) => setExperienceYears(e.target.value)}
                      required
                    />
                  </div>

                  <Input
                    label="Clinic / Hospital Name"
                    type="text"
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                  />
                </div>
              )}
            </CardContent>

            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" variant="primary" className="w-full" isLoading={isSubmitting}>
                Create Account & Send Verification Code
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Already have an account?{' '}
                <Link to="/login" className="font-semibold text-primary hover:underline">
                  Sign In
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      )}
    </div>
  );
}
