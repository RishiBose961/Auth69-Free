import { randomUUID } from "crypto";
import User from "../models/user.model.js";
import OTPChallenge from "../models/otpChallenge.model.js";
import AuditLog from "../models/auditLog.model.js";
import notificationService from "./notification.service.js";
import {
  generateNumericOTP,
  generateMatchNumber,
  generateNumberOptions,
  generateAlphabet4,
  generateAlphabetOptions,
} from "../../utils/otp.utils.js";
import { generateToken } from "../../utils/jwt.utils.js";
import { verifyTOTP } from "../../utils/totp.utils.js";

export class OTPService {
  /**
   * Creates a new OTP / 2-Step Verification challenge.
   * Can accept either a full user object OR a simple email/identifier string.
   */
  async createChallenge(userOrIdentifier, ipAddress = "127.0.0.1", userAgent = "Web Browser") {
    // Normalise input: supports user object or simple string email/phone/id
    const user =
      typeof userOrIdentifier === "string"
        ? {
            id: userOrIdentifier,
            email: userOrIdentifier,
            name: userOrIdentifier.split("@")[0],
            twoFactorMethod: "number",
          }
        : userOrIdentifier || {
            id: randomUUID(),
            email: "anonymous@auth69.io",
            name: "User",
            twoFactorMethod: "number",
          };

    const matchNumber = generateMatchNumber();
    const numberOptions = generateNumberOptions(matchNumber);
    const alphabet4 = generateAlphabet4();
    const alphabetOptions = generateAlphabetOptions(alphabet4);
    const otp = generateNumericOTP();
    const challengeId = randomUUID();
    const mode = user.twoFactorMethod || "number";

    // Expire in 5 minutes
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Invalidate existing unused challenges for this user/email to keep only newest active
    try {
      await OTPChallenge.updateMany(
        { $or: [{ userId: user.id }, { userEmail: user.email.toLowerCase().trim() }], used: false },
        { $set: { used: true, status: "EXPIRED" } }
      );
    } catch {
      // Non-blocking
    }

    const challenge = await OTPChallenge.create({
      challengeId,
      userId: user.id || challengeId,
      userEmail: (user.email || "unknown@auth69.io").toLowerCase().trim(),
      userName: user.name || user.email?.split("@")[0] || "User",
      mode,
      otp,
      matchNumber,
      numberOptions,
      alphabet4,
      alphabetOptions,
      status: "PENDING",
      expiresAt,
      used: false,
      attempts: 0,
      ipAddress,
      userAgent,
    });

    const challengeObj = challenge.toObject();

    // Notify auth69mob device via socket and SSE in real time (safely guarded)
    try {
      await notificationService.notifyLoginPrompt(challengeObj);
    } catch {
      // Socket server optional
    }

    // Record audit log if AuditLog model is available
    try {
      if (AuditLog) {
        await AuditLog.create({
          userId: user.id || challengeId,
          action: "2FA_OTP_GENERATED",
          details: `2FA Prompt generated (Mode: ${mode.toUpperCase()}, Match Number: ${matchNumber}, Alphabet: ${alphabet4}, OTP: ${otp}) for login from ${ipAddress}`,
          ipAddress,
          userAgent,
        });
      }
    } catch {
      // Audit log optional
    }

    return challengeObj;
  }

  /**
   * Verifies an OTP, 4-letter alphabet, or match number submitted by web/client.
   * Works standalone for pre-signup email verification, password reset, or 2FA login.
   */
  async verify2FA(challengeId, inputCode) {
    if (!challengeId || !inputCode) {
      return { success: false, error: "Challenge ID and verification code are required" };
    }

    const challenge = await OTPChallenge.findOne({ challengeId });
    if (!challenge) {
      return { success: false, error: "Invalid or expired 2-step verification challenge" };
    }

    if (challenge.used) {
      return { success: false, error: "This verification code has already been used" };
    }

    if (new Date(challenge.expiresAt).getTime() < Date.now()) {
      try {
        await notificationService.notifyOTPResolved(challengeId, "EXPIRED");
      } catch {}
      return { success: false, error: "Verification code has expired. Please request a new one." };
    }

    if (challenge.attempts >= 5) {
      challenge.used = true;
      challenge.status = "DENIED";
      await challenge.save();
      try {
        await notificationService.notifyOTPResolved(challengeId, "REJECTED");
      } catch {}
      return { success: false, error: "Too many failed attempts. Please restart login." };
    }

    // Normalize input
    const cleanInput = inputCode.toString().trim().replace(/\s+/g, "").toUpperCase();
    const matchesOTP = cleanInput === challenge.otp;
    const matchesAlphabet = cleanInput === (challenge.alphabet4 || "").toUpperCase();
    const matchesNumber = cleanInput === (challenge.matchNumber || "").toString();

    let matchesTOTP = false;
    if (challenge.mode === "totp" && User) {
      try {
        const targetUser = await User.findOne({
          $or: [{ id: challenge.userId }, { email: challenge.userEmail }],
        }).lean();
        if (targetUser && targetUser.totpSecret) {
          matchesTOTP = verifyTOTP(targetUser.totpSecret, cleanInput);
        }
      } catch {}
    }

    if (!matchesOTP && !matchesAlphabet && !matchesNumber && !matchesTOTP) {
      challenge.attempts += 1;
      // If 3 failed attempts, kick out immediately!
      if (challenge.attempts >= 3) {
        challenge.used = true;
        challenge.status = "DENIED";
        await challenge.save();
        try {
          await notificationService.notifyOTPResolved(challengeId, "REJECTED", { reason: "Too many failed attempts" });
        } catch {}
        return {
          success: false,
          status: "DENIED",
          error: "Too many incorrect attempts. Sign-in session terminated.",
        };
      }
      await challenge.save();
      return {
        success: false,
        error: "Invalid verification code. Please check your Authenticator app or device screen.",
      };
    }

    // Mark as approved and used
    challenge.used = true;
    challenge.status = "APPROVED";
    await challenge.save();

    // Check if user model exists in DB; if not, verification is still 100% successful
    let user = null;
    let token = null;
    try {
      if (User && challenge.userId) {
        user = await User.findOne({ id: challenge.userId }).select("-password -salt -__v").lean();
        if (user) {
          token = generateToken(user);
        }
      }
    } catch {
      // User model query optional
    }

    try {
      if (AuditLog) {
        await AuditLog.create({
          userId: challenge.userId || "anonymous",
          action: "2FA_OTP_VERIFIED",
          details: `2-Step Verification completed successfully (Matched: ${
            matchesAlphabet ? "Alphabet" : matchesNumber ? "Number" : "OTP"
          })`,
        });
      }
    } catch {}

    try {
      await notificationService.notifyOTPResolved(challengeId, "VERIFIED", { token, user });
    } catch {}

    return {
      success: true,
      token,
      user,
      status: "APPROVED",
      challengeId: challenge.challengeId,
      userEmail: challenge.userEmail,
    };
  }

  /**
   * Responds to mobile prompt (YES / NO, Number match, or Alphabet match).
   */
  async respondToPrompt(
    challengeId,
    decision,
    selectedNumber = null,
    selectedAlphabet = null,
    deviceId = "auth69mob"
  ) {
    if (
      typeof selectedAlphabet === "string" &&
      selectedAlphabet.length !== 4 &&
      (!deviceId || deviceId === "auth69mob")
    ) {
      deviceId = selectedAlphabet;
      selectedAlphabet = null;
    }

    const challenge = await OTPChallenge.findOne({ challengeId });
    if (!challenge) {
      return { success: false, error: "Challenge not found or expired" };
    }

    if (challenge.used) {
      return { success: false, error: "Challenge already completed" };
    }

    if (new Date(challenge.expiresAt).getTime() < Date.now()) {
      return { success: false, error: "Challenge expired" };
    }

    if (decision === "NO") {
      challenge.used = true;
      challenge.status = "DENIED";
      await challenge.save();

      try {
        if (AuditLog) {
          await AuditLog.create({
            userId: challenge.userId || "anonymous",
            action: "2FA_LOGIN_DENIED_BY_MOBILE",
            details: `Sign-in request was rejected on auth69mob (${deviceId})`,
          });
        }
      } catch {}

      try {
        await notificationService.notifyOTPResolved(challengeId, "REJECTED");
      } catch {}
      return { success: true, status: "DENIED", message: "Sign-in denied" };
    }

    if (selectedAlphabet) {
      if (selectedAlphabet.trim().toUpperCase() !== (challenge.alphabet4 || "").toUpperCase()) {
        challenge.used = true;
        challenge.status = "DENIED";
        challenge.attempts += 1;
        await challenge.save();
        try {
          await notificationService.notifyOTPResolved(challengeId, "REJECTED", { reason: "Incorrect alphabet" });
        } catch {}
        return { success: false, status: "DENIED", error: "Incorrect 4-letter alphabet selected. You have been kicked out." };
      }
    }

    if (selectedNumber !== undefined && selectedNumber !== null) {
      if (Number(selectedNumber) !== challenge.matchNumber) {
        challenge.used = true;
        challenge.status = "DENIED";
        challenge.attempts += 1;
        await challenge.save();
        try {
          await notificationService.notifyOTPResolved(challengeId, "REJECTED", { reason: "Incorrect number" });
        } catch {}
        return { success: false, status: "DENIED", error: "Incorrect number selected. You have been kicked out." };
      }
    }

    // Approved!
    challenge.used = true;
    challenge.status = "APPROVED";
    await challenge.save();

    try {
      if (AuditLog) {
        await AuditLog.create({
          userId: challenge.userId || "anonymous",
          action: "2FA_LOGIN_APPROVED_BY_MOBILE",
          details: `Sign-in approved on auth69mob (${deviceId})`,
        });
      }
    } catch {}

    let user = null;
    let token = null;
    try {
      if (User && (challenge.userId || challenge.userEmail)) {
        user = await User.findOne({
          $or: [{ id: challenge.userId }, { email: challenge.userEmail }],
        })
          .select("-password -salt -__v")
          .lean();
        if (user) {
          token = generateToken(user);
        }
      }
    } catch {}

    try {
      await notificationService.notifyOTPResolved(challengeId, "VERIFIED", { token, user });
    } catch {}

    return {
      success: true,
      status: "APPROVED",
      token,
      user,
      otp: challenge.otp,
      userId: challenge.userId,
      userEmail: challenge.userEmail,
    };
  }

  /**
   * Direct 1-tap mobile approval.
   */
  async approveFromMobile(challengeId, deviceId = "auth69mob") {
    return this.respondToPrompt(challengeId, "YES", null, null, deviceId);
  }

  /**
   * Resends / regenerates challenge for a pending 2FA session.
   */
  async resendChallenge(challengeId) {
    const existing = await OTPChallenge.findOne({ challengeId });
    if (!existing) {
      return { success: false, error: "Original challenge not found" };
    }

    let user = null;
    try {
      if (User && existing.userId) {
        user = await User.findOne({ id: existing.userId }).lean();
      }
    } catch {}

    const targetUser = user || {
      id: existing.userId,
      email: existing.userEmail,
      name: existing.userName,
      twoFactorMethod: existing.mode,
    };

    const newChallenge = await this.createChallenge(targetUser, existing.ipAddress, existing.userAgent);
    return {
      success: true,
      challengeId: newChallenge.challengeId,
      mode: newChallenge.mode,
      matchNumber: newChallenge.matchNumber,
      alphabet4: newChallenge.alphabet4,
    };
  }

  /**
   * Gets pending active challenges for an authenticated user email.
   */
  async getActivePendingOTPs(userIdOrEmail) {
    if (!userIdOrEmail) return [];
    const normalized = userIdOrEmail.toLowerCase().trim();
    const now = new Date();

    return await OTPChallenge.find({
      $or: [{ userId: userIdOrEmail }, { userEmail: normalized }],
      used: false,
      expiresAt: { $gt: now },
    })
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * Checks status of challenge.
   */
  async getChallengeStatus(challengeId) {
    const challenge = await OTPChallenge.findOne({ challengeId }).lean();
    if (!challenge) {
      return { status: "EXPIRED" };
    }

    let token = null;
    let safeUser = null;

    if (challenge.status === "APPROVED") {
      try {
        if (User && (challenge.userId || challenge.userEmail)) {
          const user = await User.findOne({
            $or: [{ id: challenge.userId }, { email: challenge.userEmail }],
          })
            .select("-password -salt -__v")
            .lean();
          if (user) {
            token = generateToken(user);
            safeUser = user;
          }
        }
      } catch {}
    }

    return {
      status: challenge.status,
      mode: challenge.mode,
      matchNumber: challenge.matchNumber,
      alphabet4: challenge.alphabet4,
      token,
      user: safeUser,
    };
  }
}

export const otpService = new OTPService();
export default otpService;
