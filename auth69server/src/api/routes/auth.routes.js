import express from "express";
import {
  register,
  login,
  verify2FA,
  resend2FA,
  checkChallengeStatus,
  getProfile,
  toggle2FA,
  set2FAMethod,
  setupTOTP,
  verifyTOTPSetup,
  getConnectedDevices,
  logoutDevice,
  logoutAllOtherDevices,
} from "../controllers/auth.controller.js";
import { authenticateUser } from "../middleware/authenticateUser.middleware.js";
import validate from "../middleware/validate.middleware.js";
import { createUserSchema, loginUserSchema } from "../validators/user.validator.js";

const router = express.Router();

router.post("/register", validate(createUserSchema), register);
router.post("/login", validate(loginUserSchema), login);
router.post("/verify-2fa", verify2FA);
router.post("/resend-2fa", resend2FA);
router.get("/challenge/:challengeId/status", checkChallengeStatus);

// Protected routes
router.get("/me", authenticateUser, getProfile);
router.post("/2fa/toggle", authenticateUser, toggle2FA);
router.post("/2fa/method", authenticateUser, set2FAMethod);

// Authenticator App (TOTP)
router.post("/2fa/totp/setup", authenticateUser, setupTOTP);
router.post("/2fa/totp/verify", authenticateUser, verifyTOTPSetup);

// Connected Devices & Session Management
router.get("/devices", authenticateUser, getConnectedDevices);
router.post("/devices/:deviceId/logout", authenticateUser, logoutDevice);
router.post("/devices/logout-all", authenticateUser, logoutAllOtherDevices);

export default router;
