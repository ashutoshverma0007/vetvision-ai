import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card';
import { Alert, AlertTitle, AlertDescription } from '../../components/ui/Alert';
import { Mail, RefreshCw, ArrowLeft, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';
import { UserRole } from '@vetvision/shared-types';

export function VerifyEmailPage() {
  const { verifyOtp, resendOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Retrieve email from navigation state or sessionStorage
  const [email, setEmail] = useState<string>(() => {
    return (
      (location.state as any)?.email ||
      sessionStorage.getItem('vetvision_pending_reg_email') ||
      ''
    );
  });

  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [cooldown, setCooldown] = useState<number>(60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isConfigRequired, setIsConfigRequired] = useState(false);

  // Focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const maskEmail = (raw: string) => {
    if (!raw || !raw.includes('@')) return raw;
    const [local, domain] = raw.split('@');
    if (local.length <= 2) return `${local}***@${domain}`;
    return `${local.charAt(0)}${'*'.repeat(local.length - 2)}${local.charAt(local.length - 1)}@${domain}`;
  };

  const handleDigitChange = (index: number, value: string) => {
    setError(null);
    // Allow only numeric input
    const clean = value.replace(/\D/g, '');

    // Handle multi-character paste into any box
    if (clean.length > 1) {
      handlePaste(clean);
      return;
    }

    const newDigits = [...digits];
    newDigits[index] = clean;
    setDigits(newDigits);

    // Auto-advance to next box if filled
    if (clean && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      // Focus previous input on backspace if current is empty
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (pastedText: string) => {
    const clean = pastedText.replace(/\D/g, '').slice(0, 6);
    if (!clean) return;

    const newDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = clean[i] || '';
    }
    setDigits(newDigits);

    // Focus last filled box or 6th box
    const focusIndex = Math.min(clean.length, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = digits.join('').trim();

    if (!email) {
      setError('Registration email not found. Please restart registration.');
      return;
    }

    if (otpCode.length !== 6) {
      setError('Please enter all 6 digits of the verification code.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setIsConfigRequired(false);

    try {
      const user = await verifyOtp({ email, otp: otpCode });
      setSuccessMessage('Email verified successfully! Setting up your workspace...');
      sessionStorage.removeItem('vetvision_pending_reg_email');

      setTimeout(() => {
        if (user?.role === UserRole.VETERINARIAN) {
          navigate('/vet/dashboard');
        } else if (user?.role === UserRole.ADMIN) {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      }, 1000);
    } catch (err: any) {
      if (err.code === 'CONFIGURATION_REQUIRED') {
        setIsConfigRequired(true);
        setError(
          'Email OTP delivery is not yet configured in this environment (missing MSG91_AUTH_KEY / MSG91_EMAIL_TEMPLATE_ID).'
        );
      } else {
        setError(err.message || 'Verification failed. Please check the code and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || !email) return;

    setIsResending(true);
    setError(null);
    setSuccessMessage(null);
    setIsConfigRequired(false);

    try {
      const res = await resendOtp({ email });
      setCooldown(res.cooldownSeconds || 60);
      setSuccessMessage('A fresh verification code has been dispatched to your email.');
    } catch (err: any) {
      if (err.code === 'CONFIGURATION_REQUIRED') {
        setIsConfigRequired(true);
        setError(
          'Email OTP delivery is not configured on this server. Please configure MSG91 credentials in your .env file.'
        );
      } else {
        setError(err.message || 'Unable to resend verification code. Please wait and try again.');
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50/50 dark:bg-background">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20 mb-1">
            <Mail className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-foreground">
            Verify your email
          </h1>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
            We sent a 6-digit confirmation code to{' '}
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {maskEmail(email) || 'your email'}
            </span>
            . Enter the code below to activate your account.
          </p>
        </div>

        {/* Verification Card */}
        <Card className="border border-slate-200/80 dark:border-border shadow-sm bg-white dark:bg-card">
          <CardContent className="pt-6 space-y-5">
            {error && (
              <Alert variant="destructive" className="py-2.5">
                <AlertTitle className="text-xs font-semibold flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" /> Verification Issue
                </AlertTitle>
                <AlertDescription className="text-xs mt-0.5 leading-relaxed">{error}</AlertDescription>
              </Alert>
            )}

            {isConfigRequired && (
              <div className="p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-2">
                <p className="font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-amber-600" />
                  Development Environment Notice
                </p>
                <p className="leading-relaxed">
                  Real email OTP transmission requires MSG91 credentials in the server environment (<code>MSG91_AUTH_KEY</code> and <code>MSG91_EMAIL_TEMPLATE_ID</code>).
                </p>
                <div className="pt-1">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
                  >
                    Go to Sign In (Pre-seeded demo accounts available) &rarr;
                  </Link>
                </div>
              </div>
            )}

            {successMessage && (
              <Alert variant="info" className="py-2.5 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 text-emerald-800 dark:text-emerald-300">
                <AlertTitle className="text-xs font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Success
                </AlertTitle>
                <AlertDescription className="text-xs mt-0.5">{successMessage}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 6 Digit Inputs */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 text-center mb-3">
                  6-Digit Verification Code
                </label>
                <div
                  className="flex justify-center items-center gap-2 sm:gap-2.5"
                  onPaste={(e) => {
                    e.preventDefault();
                    handlePaste(e.clipboardData.getData('text'));
                  }}
                >
                  {digits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (inputRefs.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      className="w-10 h-12 sm:w-12 sm:h-14 text-center text-lg sm:text-xl font-bold rounded-lg border border-slate-300 dark:border-border bg-slate-50 dark:bg-muted/30 text-slate-900 dark:text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 focus:bg-white dark:focus:bg-card transition-all"
                      aria-label={`Digit ${idx + 1}`}
                      disabled={isSubmitting}
                      required
                    />
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full h-10 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 shadow-sm"
                isLoading={isSubmitting}
                disabled={digits.some((d) => !d) || isSubmitting}
              >
                Verify & Activate Account
              </Button>
            </form>

            {/* Resend Action with Cooldown */}
            <div className="pt-2 text-center space-y-2">
              <div className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                <span>Didn&apos;t receive the code?</span>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={cooldown > 0 || isResending || isSubmitting}
                  className={`font-semibold transition-colors ${
                    cooldown > 0
                      ? 'text-slate-400 dark:text-muted-foreground cursor-not-allowed'
                      : 'text-emerald-600 dark:text-emerald-400 hover:underline'
                  }`}
                >
                  {isResending ? (
                    <span className="flex items-center gap-1">
                      <RefreshCw className="h-3 w-3 animate-spin" /> Sending...
                    </span>
                  ) : cooldown > 0 ? (
                    `Resend in ${cooldown}s`
                  ) : (
                    'Resend Code'
                  )}
                </button>
              </div>
            </div>
          </CardContent>

          <CardFooter className="py-4 border-t border-slate-100 dark:border-border/60 bg-slate-50/50 dark:bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
            <Link
              to="/register"
              className="inline-flex items-center gap-1 text-slate-600 dark:text-muted-foreground hover:text-slate-900 dark:hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to registration
            </Link>
            <Link
              to="/login"
              className="font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Sign In instead
            </Link>
          </CardFooter>
        </Card>

        {/* Security Note */}
        <p className="text-[11px] text-center text-muted-foreground leading-relaxed px-4">
          OTP codes expire in 10 minutes. A maximum of 5 attempts are allowed per challenge for your account security.
        </p>
      </div>
    </div>
  );
}
