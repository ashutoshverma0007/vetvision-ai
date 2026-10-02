// ==============================================================================
// VetVision AI MSG91 Email OTP Provider Implementation
// ==============================================================================
import { config } from '@vetvision/config';
import {
  EmailOtpProvider,
  SendEmailOtpParams,
  SendEmailOtpResult,
  VerifyEmailOtpParams,
  VerifyEmailOtpResult,
  ResendEmailOtpParams
} from './email-otp-provider.interface.js';
import { AppError, BadRequestError } from '../../errors.js';
import { logger } from '../../logger.js';

export class Msg91EmailOtpProvider implements EmailOtpProvider {
  public readonly name = 'MSG91_EMAIL';

  private get authKey(): string {
    return config.MSG91_AUTH_KEY || '';
  }

  private get templateId(): string {
    return config.MSG91_EMAIL_TEMPLATE_ID || config.MSG91_TEMPLATE_ID || '';
  }

  private get baseUrl(): string {
    return config.MSG91_OTP_API_URL.replace(/\/$/, '');
  }

  private ensureConfigured(): void {
    if (!this.authKey || !this.templateId) {
      logger.error('MSG91 Email OTP is not configured in server environment');
      throw new AppError(
        'Email OTP service is not configured. Please set MSG91_AUTH_KEY and MSG91_EMAIL_TEMPLATE_ID.',
        500,
        'CONFIGURATION_REQUIRED'
      );
    }
  }

  public async sendOtp(params: SendEmailOtpParams): Promise<SendEmailOtpResult> {
    this.ensureConfigured();

    const normalizedEmail = params.email.trim().toLowerCase();
    const expiryMinutes = params.otpExpiryMinutes || config.OTP_EXPIRY_MINUTES || 10;
    const otpLength = params.otpLength || 6;

    const url = new URL(this.baseUrl);
    url.searchParams.set('template_id', this.templateId);
    url.searchParams.set('email', normalizedEmail);
    url.searchParams.set('otp_expiry', expiryMinutes.toString());
    url.searchParams.set('otp_length', otpLength.toString());

    logger.info('Calling MSG91 Send Email OTP', {
      email: normalizedEmail,
      expiryMinutes
    });

    try {
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          authkey: this.authKey,
          'Content-Type': 'application/json'
        }
      });

      const data = (await response.json()) as { type?: string; message?: string; request_id?: string };

      if (!response.ok || data.type === 'error') {
        const errorMsg = data.message || `MSG91 send failed with status ${response.status}`;
        logger.error('MSG91 Send Email OTP failed', { error: errorMsg, email: normalizedEmail });
        throw new BadRequestError(`Failed to send email verification code: ${errorMsg}`);
      }

      logger.info('MSG91 Send Email OTP succeeded', {
        email: normalizedEmail,
        requestId: data.request_id
      });

      return {
        success: true,
        providerMessage: data.message,
        requestId: data.request_id
      };
    } catch (err: unknown) {
      if (err instanceof AppError) throw err;
      const message = err instanceof Error ? err.message : 'Unknown provider error';
      logger.error('Network error during MSG91 Send Email OTP', { error: message });
      throw new AppError(`Email OTP provider unavailable: ${message}`, 502, 'PROVIDER_ERROR');
    }
  }

  public async verifyOtp(params: VerifyEmailOtpParams): Promise<VerifyEmailOtpResult> {
    this.ensureConfigured();

    const normalizedEmail = params.email.trim().toLowerCase();
    const cleanOtp = params.otp.trim();

    if (!cleanOtp) {
      throw new BadRequestError('Verification code is required');
    }

    const url = new URL(`${this.baseUrl}/verify`);
    url.searchParams.set('otp', cleanOtp);
    url.searchParams.set('email', normalizedEmail);

    logger.info('Calling MSG91 Verify Email OTP', { email: normalizedEmail });

    try {
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          authkey: this.authKey,
          'Content-Type': 'application/json'
        }
      });

      const data = (await response.json()) as { type?: string; message?: string };

      if (!response.ok || data.type === 'error') {
        const errorMsg = data.message || 'Verification code failed';
        logger.warn('MSG91 Verify Email OTP rejected code', {
          email: normalizedEmail,
          message: errorMsg
        });
        return {
          success: false,
          message: errorMsg
        };
      }

      logger.info('MSG91 Verify Email OTP successfully matched', { email: normalizedEmail });
      return {
        success: true,
        message: data.message || 'OTP verified successfully'
      };
    } catch (err: unknown) {
      if (err instanceof AppError) throw err;
      const message = err instanceof Error ? err.message : 'Unknown provider error';
      logger.error('Network error during MSG91 Verify Email OTP', { error: message });
      throw new AppError(`Email OTP verification service error: ${message}`, 502, 'PROVIDER_ERROR');
    }
  }

  public async resendOtp(params: ResendEmailOtpParams): Promise<SendEmailOtpResult> {
    this.ensureConfigured();

    const normalizedEmail = params.email.trim().toLowerCase();
    const url = new URL(`${this.baseUrl}/retry`);
    url.searchParams.set('authkey', this.authKey);
    url.searchParams.set('email', normalizedEmail);
    url.searchParams.set('retrytype', 'text');

    logger.info('Calling MSG91 Resend Email OTP', { email: normalizedEmail });

    try {
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = (await response.json()) as { type?: string; message?: string; request_id?: string };

      if (!response.ok || data.type === 'error') {
        // Fallback: If retry endpoint fails or is unsupported for email, re-issue sendOtp
        logger.warn('MSG91 retry endpoint returned error, re-triggering sendOtp', {
          message: data.message
        });
        return this.sendOtp({ email: normalizedEmail });
      }

      return {
        success: true,
        providerMessage: data.message,
        requestId: data.request_id
      };
    } catch (err: unknown) {
      if (err instanceof AppError) throw err;
      // Fallback to sendOtp on retry network error
      return this.sendOtp({ email: normalizedEmail });
    }
  }
}

export const msg91EmailOtpProvider = new Msg91EmailOtpProvider();
