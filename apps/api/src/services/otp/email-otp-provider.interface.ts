// ==============================================================================
// VetVision AI Email OTP Provider Interface
// ==============================================================================

export interface SendEmailOtpParams {
  email: string;
  otpExpiryMinutes?: number;
  otpLength?: number;
}

export interface SendEmailOtpResult {
  success: boolean;
  providerMessage?: string;
  requestId?: string;
}

export interface VerifyEmailOtpParams {
  email: string;
  otp: string;
}

export interface VerifyEmailOtpResult {
  success: boolean;
  message: string;
}

export interface ResendEmailOtpParams {
  email: string;
}

export interface EmailOtpProvider {
  readonly name: string;
  sendOtp(params: SendEmailOtpParams): Promise<SendEmailOtpResult>;
  verifyOtp(params: VerifyEmailOtpParams): Promise<VerifyEmailOtpResult>;
  resendOtp(params: ResendEmailOtpParams): Promise<SendEmailOtpResult>;
}
