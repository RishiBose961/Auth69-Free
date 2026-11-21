import qrService from "../services/qr.service.js";

export const createQRSession = async (req, res) => {
  try {
    const ipAddress = req.ip || req.headers["x-forwarded-for"] || "127.0.0.1";
    const userAgent = req.headers["user-agent"] || "Web Browser";

    const session = await qrService.createSession(ipAddress, userAgent);
    return res.status(200).json({
      success: true,
      data: session,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const checkQRStatus = async (req, res) => {
  try {
    const { qrId } = req.params;
    const result = await qrService.checkStatus(qrId);

    return res.status(200).json({
      success: true,
      data: result,
      ...result,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const scanQR = async (req, res) => {
  try {
    const { qrId } = req.body;
    const user = req.user;

    const result = await qrService.markScanned(qrId, user);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const authorizeQR = async (req, res) => {
  try {
    const { qrId, deviceId } = req.body;
    const user = req.user;

    const result = await qrService.authorizeSession(qrId, user, deviceId);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const denyQR = async (req, res) => {
  try {
    const { qrId, deviceId } = req.body;
    const user = req.user;

    const result = await qrService.denySession(qrId, user, deviceId);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
