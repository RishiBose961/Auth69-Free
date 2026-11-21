import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import {
  connectMemoryDB,
  disconnectMemoryDB,
  clearDB,
} from "../setup/memory-server.js";
import OTPChallenge from "../../src/api/models/otpChallenge.model.js";

beforeAll(connectMemoryDB);
afterAll(disconnectMemoryDB);
beforeEach(clearDB);

describe("2-Step Verification & Prompt API", () => {
  it("should enforce 2FA when enabled and verify via OTP, alphabet, or match number", async () => {
    // 1. Register
    const regRes = await request(app).post("/api/auth/register").send({
      email: "twostep@auth69.com",
      password: "Password123!",
      name: "TwoStep User",
    });

    expect(regRes.status).toBe(201);
    expect(regRes.body.data.user.email).toBe("twostep@auth69.com");
    const token = regRes.body.data.token;

    // 2. Enable 2FA
    const toggleRes = await request(app)
      .post("/api/auth/2fa/toggle")
      .set("Authorization", `Bearer ${token}`)
      .send({ enabled: true, method: "number" });

    expect(toggleRes.status).toBe(200);
    expect(toggleRes.body.data.user.twoFactorEnabled).toBe(true);

    // 3. Login attempt with 2FA ON -> triggers challenge
    const loginRes = await request(app).post("/api/auth/login").send({
      email: "twostep@auth69.com",
      password: "Password123!",
    });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.requires2FA).toBe(true);
    expect(loginRes.body.challengeId).toBeDefined();
    expect(loginRes.body.matchNumber).toBeDefined();
    expect(loginRes.body.alphabet4).toBeDefined();

    const challengeId = loginRes.body.challengeId;
    const challengeDoc = await OTPChallenge.findOne({ challengeId });
    expect(challengeDoc).toBeDefined();
    expect(challengeDoc.otp).toHaveLength(6);

    // 4. Verify via OTP
    const verifyRes = await request(app).post("/api/auth/verify-2fa").send({
      challengeId,
      otp: challengeDoc.otp,
    });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);
    expect(verifyRes.body.data.token).toBeDefined();
    expect(verifyRes.body.data.user.email).toBe("twostep@auth69.com");

    // Re-using used OTP should fail
    const reuseRes = await request(app).post("/api/auth/verify-2fa").send({
      challengeId,
      otp: challengeDoc.otp,
    });
    expect(reuseRes.status).toBe(400);
  });

  it("should allow mobile prompt YES approval with instant token issue", async () => {
    // 1. Register & enable 2FA
    const regRes = await request(app).post("/api/auth/register").send({
      email: "mobileprompt@auth69.com",
      password: "Password123!",
      name: "Mobile Prompt User",
    });
    const token = regRes.body.data.token;

    await request(app)
      .post("/api/auth/2fa/toggle")
      .set("Authorization", `Bearer ${token}`)
      .send({ enabled: true, method: "number" });

    // 2. Login on web
    const loginRes = await request(app).post("/api/auth/login").send({
      email: "mobileprompt@auth69.com",
      password: "Password123!",
    });

    const challengeId = loginRes.body.challengeId;

    // 3. Mobile fetches pending OTP
    const pendingRes = await request(app)
      .get(`/api/mobile/pending-otps?email=mobileprompt@auth69.com`)
      .set("Authorization", `Bearer ${token}`);

    expect(pendingRes.status).toBe(200);
    expect(pendingRes.body.data.length).toBe(1);
    expect(pendingRes.body.data[0].challengeId).toBe(challengeId);

    // 4. Mobile approves login
    const approveRes = await request(app).post("/api/mobile/approve").send({
      challengeId,
      deviceId: "auth69mob_simulator",
    });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.success).toBe(true);
    expect(approveRes.body.data.status).toBe("APPROVED");
    expect(approveRes.body.data.token).toBeDefined();

    // 5. Check challenge status on web
    const statusRes = await request(app).get(`/api/auth/challenge/${challengeId}/status`);
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.status).toBe("APPROVED");
    expect(statusRes.body.token).toBeDefined();
  });
});
