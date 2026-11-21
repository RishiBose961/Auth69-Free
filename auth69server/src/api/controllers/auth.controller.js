import {
  registerUserService,
  loginUserService,
  getUserProfileService,
  toggle2FAService,
  set2FAMethodService,
} from "../services/user.service.js";
import otpService from "../services/otp.service.js";
import deviceService from "../services/device.service.js";
import User from "../models/user.model.js";
import { generateBase32Secret, generateTOTPQRCode, verifyTOTP } from "../../utils/totp.utils.js";
import { ENV } from "../../config/env.config.js";
import { randomUUID } from "crypto";

export const register = async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const result = await registerUserService({ email, password, name });
    return res.status(201).json({
      success: true,
      data: {
        user: result.user,
        token: result.token,
      },
      message: "User registered successfully",
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password, isMobile } = req.body;
    const ipAddress = req.ip || req.headers["x-forwarded-for"] || "127.0.0.1";
    const userAgent = req.headers["user-agent"] || "Web Browser";

    // 1. Verify user credentials
    const loginResult = await loginUserService({
      email,
      password,
      ipAddress,
      userAgent,
    });

    const user = loginResult.user;

    // 2. If 2FA is enabled and this is a web login, trigger 2-Step Verification
    if (user.twoFactorEnabled && !isMobile) {
      const challenge = await otpService.createChallenge(user, ipAddress, userAgent);
      const mode = user.twoFactorMethod || "number";

      const payload = {
        requires2FA: true,
        challengeId: challenge.challengeId,
        mode: challenge.mode,
        matchNumber: challenge.matchNumber,
        alphabet4: challenge.alphabet4,
        message: `2-Step Verification is ON (${mode.toUpperCase()}). Prompt sent to auth69mob for ${user.email}.`,
      };

      return res.status(200).json({
        success: true,
        data: payload,
        ...payload,
      });
    }

    // 3. 2FA is OFF or direct mobile login -> return session token
    const deviceId = req.headers["x-device-id"] || req.body.deviceId || randomUUID();
    try {
      await deviceService.trackDevice({
        userId: user.id,
        userEmail: user.email,
        deviceId,
        userAgent,
        ipAddress,
      });
    } catch {}

    const payload = {
      requires2FA: false,
      token: loginResult.token,
      user,
      deviceId,
      message: "Login successful",
    };

    return res.status(200).json({
      success: true,
      data: payload,
      ...payload,
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: error.message,
    });
  }
};

export const verify2FA = async (req, res) => {
  try {
    const { challengeId, otp } = req.body;
    const result = await otpService.verify2FA(challengeId, otp);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    const deviceId = req.headers["x-device-id"] || req.body.deviceId || randomUUID();
    const ipAddress = req.ip || req.headers["x-forwarded-for"] || "127.0.0.1";
    const userAgent = req.headers["user-agent"] || "Web Browser";

    if (result.user) {
      try {
        await deviceService.trackDevice({
          userId: result.user.id,
          userEmail: result.user.email,
          deviceId,
          userAgent,
          ipAddress,
        });
      } catch {}
    }

    return res.status(200).json({
      success: true,
      data: {
        token: result.token,
        user: result.user,
        deviceId,
      },
      token: result.token,
      user: result.user,
      deviceId,
      message: "2-Step Verification successful",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const resend2FA = async (req, res) => {
  try {
    const { challengeId } = req.body;
    const result = await otpService.resendChallenge(challengeId);

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    return res.status(200).json({
      success: true,
      data: result,
      message: "New verification challenge issued",
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const checkChallengeStatus = async (req, res) => {
  try {
    const { challengeId } = req.params;
    const result = await otpService.getChallengeStatus(challengeId);

    return res.status(200).json({
      success: true,
      data: result,
      ...result,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const profile = await getUserProfileService(userId);

    if (!profile) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    return res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const toggle2FA = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { enabled, method } = req.body;
    const updatedUser = await toggle2FAService(userId, enabled, method);

    return res.status(200).json({
      success: true,
      data: { user: updatedUser },
      user: updatedUser,
      message: `2-Step Verification ${enabled ? "enabled" : "disabled"}`,
    });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
};

export const set2FAMethod = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { method } = req.body;
    const updatedUser = await set2FAMethodService(userId, method);

    return res.status(200).json({
      success: true,
      data: { user: updatedUser },
      user: updatedUser,
      message: `2-Step Verification method updated to ${method}`,
    });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
};

// --- Authenticator App (TOTP RFC 6238) Setup & Activation ---

export const setupTOTP = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const user = await User.findOne({ $or: [{ id: userId }, { email: req.user.email }] });
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const secret = generateBase32Secret(20);
    const { qrCodeDataUrl, otpAuthUri } = await generateTOTPQRCode(user.email, secret);

    user.tempTotpSecret = secret;
    await user.save();

    return res.status(200).json({
      success: true,
      data: {
        secret,
        qrCodeDataUrl,
        otpAuthUri,
      },
      secret,
      qrCodeDataUrl,
      otpAuthUri,
      message: "Scan this QR code with Google Authenticator, Microsoft Authenticator, or Authy",
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const verifyTOTPSetup = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { code } = req.body;

    if (!code || code.toString().trim().length !== 6) {
      return res.status(400).json({ success: false, error: "A valid 6-digit code is required" });
    }

    const user = await User.findOne({ $or: [{ id: userId }, { email: req.user.email }] });
    if (!user || !user.tempTotpSecret) {
      return res.status(400).json({
        success: false,
        error: "No pending Authenticator setup found. Please generate a new QR code.",
      });
    }

    const isValid = verifyTOTP(user.tempTotpSecret, code.toString().trim());
    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: "Invalid 6-digit code. Please verify the code displayed in your Authenticator app.",
      });
    }

    // Activate TOTP
    user.totpSecret = user.tempTotpSecret;
    user.tempTotpSecret = null;
    user.twoFactorEnabled = true;
    user.twoFactorMethod = "totp";
    await user.save();

    const safeUser = user.toObject();
    delete safeUser.password;
    delete safeUser.salt;
    delete safeUser.totpSecret;
    delete safeUser.tempTotpSecret;

    return res.status(200).json({
      success: true,
      data: { user: safeUser },
      user: safeUser,
      message: "Authenticator App successfully activated as your primary 2-Step Verification method!",
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// --- Connected Devices & Active Sessions Management ---

export const getConnectedDevices = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const currentDeviceId = req.headers["x-device-id"] || req.query.deviceId || "current";

    const devices = await deviceService.getUserDevices(userId, req.user.email, currentDeviceId);

    return res.status(200).json({
      success: true,
      data: devices,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const logoutDevice = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { deviceId } = req.params;

    const revoked = await deviceService.revokeDevice(userId, req.user.email, deviceId);
    if (!revoked) {
      return res.status(404).json({ success: false, error: "Device not found or already logged out" });
    }

    // Broadcast remote logout to socket microservice so the revoked device is booted immediately
    try {
      await fetch(`${ENV.SOCKET_URL}/notify-device-revoked`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, userId }),
      });
    } catch {}

    return res.status(200).json({
      success: true,
      message: `Device ${revoked.deviceName} logged out successfully`,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const logoutAllOtherDevices = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const currentDeviceId = req.headers["x-device-id"] || req.body.deviceId || "current";

    const result = await deviceService.revokeAllOtherDevices(userId, req.user.email, currentDeviceId);

    return res.status(200).json({
      success: true,
      data: { modifiedCount: result.modifiedCount },
      message: `Successfully logged out of all other devices (${result.modifiedCount} sessions ended)`,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
