import crypto from "crypto";
import bcrypt from "bcryptjs";
import User, { IUser } from "../models/User";
import { sendEmail } from "../config/email";

// Configurable constants
const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || "10", 10);
const OTP_RESEND_COOLDOWN_SECONDS = parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS || "60", 10);
const OTP_MAX_ATTEMPTS = parseInt(process.env.OTP_MAX_ATTEMPTS || "5", 10);

/**
 * Generate a cryptographically secure 6-digit numeric OTP
 */
export function generateSecureOtp(): string {
  const num = crypto.randomInt(100000, 1000000);
  return num.toString();
}

/**
 * Hash an OTP for secure storage
 */
export async function hashOtp(otp: string): Promise<string> {
  return await bcrypt.hash(otp, 10);
}

/**
 * Compare plain OTP against stored hash
 */
export async function compareOtp(plainOtp: string, hashedOtp: string): Promise<boolean> {
  return await bcrypt.compare(plainOtp, hashedOtp);
}

/**
 * Generate, store, and send real Email OTP via Brevo
 */
export async function generateAndSendEmailOtp(user: IUser): Promise<{ success: boolean; message: string; cooldownSeconds?: number }> {
  // Check cooldown if OTP was sent recently
  if (user.emailOtpLastSentAt) {
    const elapsedSeconds = Math.floor((Date.now() - new Date(user.emailOtpLastSentAt).getTime()) / 1000);
    if (elapsedSeconds < OTP_RESEND_COOLDOWN_SECONDS) {
      const remaining = OTP_RESEND_COOLDOWN_SECONDS - elapsedSeconds;
      return {
        success: false,
        message: `Please wait ${remaining} seconds before requesting another verification code.`,
        cooldownSeconds: remaining,
      };
    }
  }

  const plainOtp = generateSecureOtp();
  const hashedOtp = await hashOtp(plainOtp);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  user.emailOtpHash = hashedOtp;
  user.emailOtpExpiresAt = expiresAt;
  user.emailOtpAttempts = 0;
  user.emailOtpLastSentAt = new Date();

  await user.save();

  // Send real email via Brevo
  const emailHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; color: #1e293b;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #4338ca; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">SafeHer</h1>
        <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">Women's Personal Safety & Emergency Response</p>
      </div>

      <div style="padding: 24px; background-color: #f8fafc; border-radius: 12px; border: 1px solid #edf2f7; text-align: left;">
        <p style="font-size: 15px; margin: 0 0 12px 0; color: #0f172a;">
          Hello <strong>${user.name}</strong>,
        </p>
        <p style="font-size: 14px; margin: 0 0 20px 0; color: #475569; line-height: 1.5;">
          Thank you for joining SafeHer. Please use the following 6-digit verification code to confirm your email address:
        </p>

        <div style="text-align: center; margin: 24px 0;">
          <div style="display: inline-block; padding: 14px 28px; background-color: #ffffff; border: 2px dashed #4338ca; border-radius: 10px; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #4338ca; font-family: monospace;">
            ${plainOtp}
          </div>
          <p style="font-size: 12px; color: #64748b; margin: 10px 0 0 0;">
            Code valid for <strong>${OTP_EXPIRY_MINUTES} minutes</strong>.
          </p>
        </div>

        <p style="font-size: 13px; margin: 0; color: #64748b; line-height: 1.4;">
          If you did not request this verification code, you can safely ignore this email.
        </p>
      </div>

      <div style="margin-top: 24px; text-align: center; font-size: 11px; color: #94a3b8;">
        <p style="margin: 0;">SafeHer Emergency Response System · Confidential</p>
      </div>
    </div>
  `;

  try {
    await sendEmail({
      to: user.email,
      subject: `Verify your SafeHer account (${plainOtp.slice(0, 3)}...)`,
      html: emailHtml,
    });
    return { success: true, message: `Verification code sent to ${user.email}` };
  } catch (error: any) {
    console.error("Failed to send OTP email:", error);
    return { success: false, message: "Failed to dispatch verification email. Please check your email address." };
  }
}

/**
 * Verify submitted OTP against user's record
 */
export async function verifyUserEmailOtp(email: string, submittedOtp: string): Promise<{ success: boolean; message: string; user?: IUser }> {
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    return { success: false, message: "Account not found." };
  }

  if (user.isEmailVerified) {
    return { success: true, message: "Email is already verified.", user };
  }

  if (!user.emailOtpHash || !user.emailOtpExpiresAt) {
    return { success: false, message: "No verification code pending. Please request a new code." };
  }

  // Check expiration
  if (new Date() > new Date(user.emailOtpExpiresAt)) {
    return { success: false, message: "Verification code has expired. Please request a new code." };
  }

  // Check maximum attempts
  const attempts = (user.emailOtpAttempts || 0) + 1;
  user.emailOtpAttempts = attempts;

  if (attempts > OTP_MAX_ATTEMPTS) {
    user.emailOtpHash = undefined;
    user.emailOtpExpiresAt = undefined;
    await user.save();
    return { success: false, message: "Too many incorrect attempts. Please request a new verification code." };
  }

  // Compare OTP
  const isMatch = await compareOtp(submittedOtp.trim(), user.emailOtpHash);
  if (!isMatch) {
    await user.save();
    const remainingAttempts = OTP_MAX_ATTEMPTS - attempts;
    return {
      success: false,
      message: `Invalid verification code. ${remainingAttempts} attempt(s) remaining.`,
    };
  }

  // OTP verified successfully -> Invalidate OTP & Mark Email as Verified
  user.isEmailVerified = true;
  user.emailOtpHash = undefined;
  user.emailOtpExpiresAt = undefined;
  user.emailOtpAttempts = 0;

  // If user role is "user", they are now active and verified.
  // If user role is "volunteer", email is verified, but admin approval is still required.
  if (user.role === "user") {
    user.isVerified = true;
  }

  await user.save();

  return {
    success: true,
    message: user.role === "volunteer"
      ? "Email verified successfully! Your application is now pending admin review."
      : "Email verified successfully! You can now access SafeHer.",
    user,
  };
}
