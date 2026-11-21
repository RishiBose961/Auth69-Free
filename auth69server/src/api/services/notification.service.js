import { ENV } from "../../config/env.config.js";

class NotificationService {
  constructor() {
    this.sseClients = new Set();
  }

  addSSEClient(res) {
    this.sseClients.add(res);
  }

  removeSSEClient(res) {
    this.sseClients.delete(res);
  }

  /**
   * Dispatches login prompt (with match number, 4-letter alphabet, or OTP) to mobile via socket
   */
  async notifyLoginPrompt(challenge) {
    console.log(
      `[Notification] Dispatching OTP/Prompt to auth69mob device for user: ${challenge.userEmail} (Mode: ${challenge.mode}, OTP: ${challenge.otp}, Num: ${challenge.matchNumber}, Alphabet: ${challenge.alphabet4})`
    );

    // 1. Dispatch to dedicated socket microservice (port 5002)
    try {
      await fetch(`${ENV.SOCKET_URL}/notify-prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(challenge),
      });
    } catch (err) {
      // Socket server might be starting or offline in isolated unit tests
    }

    // 2. Dispatch to any active SSE clients
    if (this.sseClients.size > 0) {
      const payload = `data: ${JSON.stringify({ type: "LOGIN_PROMPT", data: challenge })}\n\n`;
      for (const client of this.sseClients) {
        try {
          client.write(payload);
        } catch {
          this.sseClients.delete(client);
        }
      }
    }
  }

  /**
   * Broadcasts challenge status resolution (VERIFIED / DENIED / EXPIRED)
   */
  async notifyOTPResolved(challengeId, status, extra = {}) {
    if (this.sseClients.size > 0) {
      const payload = `data: ${JSON.stringify({ type: "OTP_RESOLVED", challengeId, status, ...extra })}\n\n`;
      for (const client of this.sseClients) {
        try {
          client.write(payload);
        } catch {
          this.sseClients.delete(client);
        }
      }
    }
  }

  /**
   * Dispatches WhatsApp-style QR code update to web via socket
   */
  async notifyQRStatus(qrId, status, token = null, user = null) {
    try {
      await fetch(`${ENV.SOCKET_URL}/notify-qr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrId, status, token, user }),
      });
    } catch (err) {
      // Socket server might be offline in isolated unit tests
    }
  }
}

export const notificationService = new NotificationService();
export default notificationService;
