import Device from "../models/device.model.js";
import AuditLog from "../models/auditLog.model.js";

/**
 * Parses user-agent string to extract friendly browser, OS, and device type.
 */
function parseUserAgent(ua = "") {
  const userAgent = ua.toLowerCase();
  let browser = "Web Browser";
  let os = "Desktop";
  let deviceType = "desktop";

  // Detect Mobile / Tablet
  if (userAgent.includes("iphone") || userAgent.includes("ipod")) {
    deviceType = "mobile";
    os = "iOS";
  } else if (userAgent.includes("ipad")) {
    deviceType = "tablet";
    os = "iPadOS";
  } else if (userAgent.includes("android")) {
    deviceType = userAgent.includes("mobile") ? "mobile" : "tablet";
    os = "Android";
  } else if (userAgent.includes("windows")) {
    os = "Windows";
  } else if (userAgent.includes("macintosh") || userAgent.includes("mac os")) {
    os = "macOS";
  } else if (userAgent.includes("linux")) {
    os = "Linux";
  }

  // Detect Browser
  if (userAgent.includes("auth69mob") || userAgent.includes("expo")) {
    browser = "Auth69 Mobile App";
    deviceType = "mobile";
  } else if (userAgent.includes("edg/")) {
    browser = "Microsoft Edge";
  } else if (userAgent.includes("chrome") && !userAgent.includes("edg")) {
    browser = "Google Chrome";
  } else if (userAgent.includes("safari") && !userAgent.includes("chrome")) {
    browser = "Safari";
  } else if (userAgent.includes("firefox")) {
    browser = "Mozilla Firefox";
  }

  return { browser, os, deviceType, deviceName: `${browser} on ${os}` };
}

export class DeviceService {
  /**
   * Records or updates a connected device session on login or active request.
   */
  async trackDevice({ userId, userEmail, deviceId, userAgent = "", ipAddress = "127.0.0.1" }) {
    if (!userId || !deviceId) return null;

    const parsed = parseUserAgent(userAgent);
    const normalizedEmail = (userEmail || "").toLowerCase().trim();

    const device = await Device.findOneAndUpdate(
      { deviceId },
      {
        $set: {
          userId,
          userEmail: normalizedEmail,
          deviceName: parsed.deviceName,
          deviceType: parsed.deviceType,
          browser: parsed.browser,
          os: parsed.os,
          ipAddress,
          userAgent,
          lastActive: new Date(),
          isActive: true,
        },
      },
      { upsert: true, returnDocument: "after" }
    );

    return device;
  }

  /**
   * Retrieves all active connected devices for a user.
   */
  async getUserDevices(userId, userEmail, currentDeviceId) {
    const normalizedEmail = (userEmail || "").toLowerCase().trim();

    const devices = await Device.find({
      $or: [{ userId }, { userEmail: normalizedEmail }],
      isActive: true,
    })
      .sort({ lastActive: -1 })
      .lean();

    return devices.map((d) => ({
      deviceId: d.deviceId,
      deviceName: d.deviceName,
      deviceType: d.deviceType,
      browser: d.browser,
      os: d.os,
      ipAddress: d.ipAddress,
      lastActive: d.lastActive,
      isCurrent: d.deviceId === currentDeviceId,
    }));
  }

  /**
   * Revokes (logs out) a specific connected device.
   */
  async revokeDevice(userId, userEmail, deviceIdToRevoke) {
    const normalizedEmail = (userEmail || "").toLowerCase().trim();

    const device = await Device.findOneAndUpdate(
      {
        deviceId: deviceIdToRevoke,
        $or: [{ userId }, { userEmail: normalizedEmail }],
      },
      { $set: { isActive: false } },
      { returnDocument: "after" }
    );

    if (device) {
      try {
        await AuditLog.create({
          userId,
          action: "DEVICE_REVOKED",
          details: `User logged out device: ${device.deviceName} (ID: ${device.deviceId}, IP: ${device.ipAddress})`,
        });
      } catch {}
    }

    return device;
  }

  /**
   * Revokes all active devices except the current requesting device.
   */
  async revokeAllOtherDevices(userId, userEmail, currentDeviceId) {
    const normalizedEmail = (userEmail || "").toLowerCase().trim();

    const result = await Device.updateMany(
      {
        $or: [{ userId }, { userEmail: normalizedEmail }],
        deviceId: { $ne: currentDeviceId },
        isActive: true,
      },
      { $set: { isActive: false } }
    );

    try {
      await AuditLog.create({
        userId,
        action: "ALL_OTHER_DEVICES_REVOKED",
        details: `User terminated all other active sessions (Count: ${result.modifiedCount})`,
      });
    } catch {}

    return result;
  }
}

export const deviceService = new DeviceService();
export default deviceService;
