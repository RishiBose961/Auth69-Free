import otpService from "../services/otp.service.js";

export const getPendingOTPs = async (req, res) => {
  try {
    const userEmail = req.user?.email || req.query.email || null;
    const userId = req.user?.id || req.user?.userId || req.query.userId || null;

    if (!userEmail && !userId) {
      return res.status(200).json({
        success: true,
        data: [],
        message: "No user authenticated",
      });
    }

    const otps = await otpService.getActivePendingOTPs(userEmail || userId);

    return res.status(200).json({
      success: true,
      data: otps,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const approveLogin = async (req, res) => {
  try {
    const { challengeId, deviceId } = req.body;
    const result = await otpService.approveFromMobile(challengeId, deviceId);

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    return res.status(200).json({
      success: true,
      data: result,
      message: "Login approved from mobile companion",
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const handlePromptResponse = async (req, res) => {
  try {
    const { challengeId, decision, selectedNumber, selectedAlphabet, deviceId } = req.body;
    const result = await otpService.respondToPrompt(
      challengeId,
      decision,
      selectedNumber,
      selectedAlphabet,
      deviceId
    );

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    return res.status(200).json({
      success: true,
      data: result,
      message: `Prompt response (${decision}) processed successfully`,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const getMobileStatus = async (req, res) => {
  return res.status(200).json({
    status: "ok",
    service: "auth69server",
    companion: "auth69mob",
    timestamp: new Date().toISOString(),
  });
};
