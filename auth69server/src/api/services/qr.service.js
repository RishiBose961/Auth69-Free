import QRCode from "qrcode";
import { randomUUID } from "crypto";
import QRSession from "../models/qrSession.model.js";
import User from "../models/user.model.js";
import AuditLog from "../models/auditLog.model.js";
import notificationService from "./notification.service.js";
import deviceService from "./device.service.js";
import { generateToken } from "../../utils/jwt.utils.js";

export class QRService {
  /**
   * Generates a new WhatsApp-style QR login session.
   * Can be used completely standalone to produce base64 PNG QR codes.
   */
  async createSession(ipAddress = "127.0.0.1", userAgent = "Web Browser", deviceId = null) {
    const qrId = randomUUID();
    const rawPayload = `auth69://qr-login?qrId=${qrId}&ts=${Date.now()}`;

    // Generate high quality base64 PNG data URL
    const qrCodeDataUrl = await QRCode.toDataURL(rawPayload, {
      errorCorrectionLevel: "H",
      type: "image/png",
      margin: 2,
      width: 280,
      color: {
        dark: "#0F172A",
        light: "#FFFFFF",
      },
    });

    // 10 minutes expiry
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const session = await QRSession.create({
      qrId,
      deviceId: deviceId || qrId,
      rawPayload,
      qrCodeDataUrl,
      status: "PENDING",
      expiresAt,
      ipAddress,
      userAgent,
    });

    return session.toObject();
  }

  /**
   * Step 2: Mobile app scans QR code on computer screen.
   */
  async markScanned(qrId, user) {
    const session = await QRSession.findOne({ qrId });
    if (!session) {
      return { success: false, error: "QR Session not found" };
    }

    if (new Date(session.expiresAt).getTime() < Date.now()) {
      session.status = "EXPIRED";
      await session.save();
      try {
        await notificationService.notifyQRStatus(qrId, "EXPIRED");
      } catch {}
      return { success: false, error: "QR Code has expired. Please reload the QR code on your computer." };
    }

    if (session.status !== "PENDING") {
      return { success: false, error: `Invalid QR state: already ${session.status}` };
    }

    session.status = "SCANNED";
    session.userId = user?.id || user?._id?.toString() || "scanned_user";
    session.userEmail = user?.email || "scanned@auth69.io";
    await session.save();

    try {
      await notificationService.notifyQRStatus(qrId, "SCANNED", null, {
        email: session.userEmail,
        name: user?.name || "User",
      });
    } catch {}

    return {
      success: true,
      status: "SCANNED",
      clientInfo: {
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
      },
    };
  }

  /**
   * Step 3: Mobile user confirms "Log In".
   * Unlocks desktop session and returns token & user payload.
   */
  async authorizeSession(qrId, user, deviceId = "auth69mob_device") {
    const session = await QRSession.findOne({ qrId });
    if (!session) {
      return { success: false, error: "QR Session not found" };
    }

    if (new Date(session.expiresAt).getTime() < Date.now()) {
      session.status = "EXPIRED";
      await session.save();
      return { success: false, error: "QR Code has expired" };
    }

    let fullUser = null;
    try {
      if (User && (user?.id || user?.email)) {
        fullUser = await User.findOne({
          $or: [{ id: user.id }, { email: user.email }],
        })
          .select("-password -salt -__v")
          .lean();
      }
    } catch {}

    const finalUser =
      fullUser ||
      user || {
        id: session.userId || randomUUID(),
        email: session.userEmail || "user@auth69.io",
        name: "User",
      };

    const token = generateToken(finalUser);

    session.status = "AUTHORIZED";
    session.userId = finalUser.id;
    session.userEmail = finalUser.email;
    session.deviceId = deviceId;
    session.token = token;
    await session.save();

    try {
      if (AuditLog) {
        await AuditLog.create({
          userId: finalUser.id,
          action: "QR_LOGIN_AUTHORIZED",
          details: `Desktop login authorized via WhatsApp-style QR scan on ${deviceId}`,
          ipAddress: session.ipAddress,
          userAgent: session.userAgent,
        });
      }
    } catch {}

    try {
      await deviceService.trackDevice({
        userId: finalUser.id,
        userEmail: finalUser.email,
        deviceId: session.deviceId || session.qrId,
        userAgent: session.userAgent,
        ipAddress: session.ipAddress,
      });
    } catch {}

    try {
      await notificationService.notifyQRStatus(qrId, "AUTHORIZED", token, finalUser);
    } catch {}

    return {
      success: true,
      status: "AUTHORIZED",
      token,
      user: finalUser,
    };
  }

  /**
   * Mobile user denies QR login attempt.
   */
  async denySession(qrId, user, deviceId = "auth69mob_device") {
    const session = await QRSession.findOne({ qrId });
    if (!session) {
      return { success: false, error: "QR Session not found" };
    }

    session.status = "DENIED";
    session.deviceId = deviceId;
    await session.save();

    try {
      if (AuditLog && user?.id) {
        await AuditLog.create({
          userId: user.id,
          action: "QR_LOGIN_DENIED",
          details: `Desktop login was denied via auth69mob device`,
          ipAddress: session.ipAddress,
          userAgent: session.userAgent,
        });
      }
    } catch {}

    try {
      await notificationService.notifyQRStatus(qrId, "DENIED");
    } catch {}

    return { success: true, status: "DENIED" };
  }

  /**
   * Checks status of QR session.
   */
  async checkStatus(qrId) {
    const session = await QRSession.findOne({ qrId }).lean();
    if (!session) {
      return { status: "EXPIRED" };
    }

    let user = null;
    if (session.status === "AUTHORIZED" && session.userId) {
      try {
        if (User) {
          user = await User.findOne({ id: session.userId }).select("-password -salt -__v").lean();
        }
      } catch {}
    }

    return {
      status: session.status,
      token: session.token,
      user,
    };
  }
}

export const qrService = new QRService();
export default qrService;
