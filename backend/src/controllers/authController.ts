import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User";
import { AuthRequest } from "../middleware/authMiddleware";
import { generateAndSendEmailOtp, verifyUserEmailOtp } from "../services/otpService";

/**
 * Register User or Volunteer (Creates account in unverified state & sends real Email OTP)
 * POST /api/auth/register
 */
export const registerUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { name, email, phone, password, role } = req.body;
    if (!name || !email || !phone || !password) {
      res.status(400).json({
        success: false,
        message: "All fields are required",
      });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedPhone = phone.trim();

    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { phone: normalizedPhone }],
    });

    if (existingUser) {
      // If the user already registered but never verified their email, allow resending OTP
      if (!existingUser.isEmailVerified) {
        const otpResult = await generateAndSendEmailOtp(existingUser);
        res.status(200).json({
          success: true,
          requireOtpVerification: true,
          email: existingUser.email,
          message: "Account already exists but is pending email verification. A new OTP has been sent.",
        });
        return;
      }

      res.status(400).json({
        success: false,
        message: "An account with this email or phone number already exists.",
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const assignedRole = role === "volunteer" ? "volunteer" : role === "admin" ? "admin" : "user";

    const newUser = new User({
      name: name.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      password: hashedPassword,
      role: assignedRole,
      isEmailVerified: false,
      isVerified: false,
      verificationStatus: assignedRole === "volunteer" ? "PENDING" : undefined,
    });

    await newUser.save();

    // Generate and send real Email OTP via Brevo
    const otpResult = await generateAndSendEmailOtp(newUser);

    res.status(201).json({
      success: true,
      requireOtpVerification: true,
      email: newUser.email,
      message: otpResult.message || "Account created. Please enter the 6-digit code sent to your email.",
      data: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        isEmailVerified: false,
      },
    });
  } catch (error: any) {
    console.error("Registration Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to register account.",
    });
  }
};

/**
 * Verify Email OTP
 * POST /api/auth/verify-otp
 */
export const verifyEmailOtp = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      res.status(400).json({
        success: false,
        message: "Email and 6-digit OTP are required.",
      });
      return;
    }

    const result = await verifyUserEmailOtp(email, otp);
    if (!result.success || !result.user) {
      res.status(400).json({
        success: false,
        message: result.message,
      });
      return;
    }

    const user = result.user;

    // Issue JWT token upon successful email verification
    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET as string,
      {
        expiresIn: "7d",
      }
    );

    res.status(200).json({
      success: true,
      message: result.message,
      token,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        isVerified: user.isVerified,
        verificationStatus: user.verificationStatus,
      },
    });
  } catch (error: any) {
    console.error("Verify OTP Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to verify code.",
    });
  }
};

/**
 * Resend Email OTP
 * POST /api/auth/resend-otp
 */
export const resendEmailOtp = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({
        success: false,
        message: "Email is required to resend verification code.",
      });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      res.status(404).json({
        success: false,
        message: "Account not found with this email.",
      });
      return;
    }

    if (user.isEmailVerified) {
      res.status(400).json({
        success: false,
        message: "This email is already verified. Please sign in.",
      });
      return;
    }

    const result = await generateAndSendEmailOtp(user);
    if (!result.success) {
      res.status(429).json({
        success: false,
        message: result.message,
        cooldownSeconds: result.cooldownSeconds,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    console.error("Resend OTP Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to resend verification code.",
    });
  }
};

/**
 * Login User, Volunteer, or Admin
 * POST /api/auth/login
 */
export const loginUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
      return;
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
      return;
    }

    if (user.isBlocked) {
      res.status(403).json({
        success: false,
        message: "Your account has been suspended by the administrator.",
      });
      return;
    }

    // Check if email has been verified
    if (!user.isEmailVerified) {
      // Auto-send fresh OTP
      await generateAndSendEmailOtp(user);
      res.status(403).json({
        success: false,
        requireEmailVerification: true,
        email: user.email,
        message: "Your email is not verified yet. A 6-digit verification code has been sent to your email.",
      });
      return;
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET as string,
      {
        expiresIn: "7d",
      }
    );

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        profileImage: user.profileImage || "",
        isVerified: user.isVerified,
        isEmailVerified: user.isEmailVerified,
        verificationStatus: user.verificationStatus,
      },
    });
  } catch (error: any) {
    console.error("Login Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to log in.",
    });
  }
};

/**
 * Get Authenticated User Profile
 * GET /api/auth/profile
 */
export const getProfile = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const user = await User.findById(req.user?.id).select("-password");

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};