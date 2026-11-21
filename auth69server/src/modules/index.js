/**
 * Auth69 Modular Architecture Gateway
 * -----------------------------------------------------------
 * Each feature module can be extracted, imported, or used independently
 * in any Node.js / Express / MongoDB project with zero external coupling.
 */

// 1. Core Authentication Module
export {
  registerUserService,
  loginUserService,
  getUserProfileService,
  toggle2FAService,
  set2FAMethodService,
} from "../api/services/user.service.js";

// 2. One-Time Password & 2FA Verification Module (6-digit OTP, Random Number match, 4-Letter Alphabet match)
export { OTPService, otpService } from "../api/services/otp.service.js";
export {
  generateNumericOTP,
  generateMatchNumber,
  generateNumberOptions,
  generateAlphabet4,
  generateAlphabetOptions,
} from "../utils/otp.utils.js";

// 3. WhatsApp-Style QR Code Login Module (Base64 PNG QR generation, Session lifecycle, Mobile authorization)
export { QRService, qrService } from "../api/services/qr.service.js";

// 4. Real-Time Push Notification & Event Dispatcher Module
export { NotificationService, notificationService } from "../api/services/notification.service.js";

// 5. Security & Cryptography Utilities
export { generateSalt, hashPassword, verifyPassword } from "../utils/password.utils.js";
export { generateToken, verifyToken } from "../utils/jwt.utils.js";

// 6. Mongoose Models
export { default as UserModel } from "../api/models/user.model.js";
export { default as OTPChallengeModel } from "../api/models/otpChallenge.model.js";
export { default as QRSessionModel } from "../api/models/qrSession.model.js";
export { default as DeviceModel } from "../api/models/device.model.js";
export { default as AuditLogModel } from "../api/models/auditLog.model.js";
