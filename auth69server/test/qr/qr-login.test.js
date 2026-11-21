import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import {
  connectMemoryDB,
  disconnectMemoryDB,
  clearDB,
} from "../setup/memory-server.js";

beforeAll(connectMemoryDB);
afterAll(disconnectMemoryDB);
beforeEach(clearDB);

describe("WhatsApp-Style QR Code Login API", () => {
  it("should create, scan, and authorize a QR login session", async () => {
    // 1. Register mobile user
    const regRes = await request(app).post("/api/auth/register").send({
      email: "qruser@auth69.com",
      password: "Password123!",
      name: "QR User",
    });
    const mobileToken = regRes.body.data.token;

    // 2. Web creates QR session
    const createRes = await request(app).post("/api/qr/create").send();
    expect(createRes.status).toBe(200);
    expect(createRes.body.success).toBe(true);
    expect(createRes.body.data.qrId).toBeDefined();
    expect(createRes.body.data.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
    expect(createRes.body.data.status).toBe("PENDING");

    const qrId = createRes.body.data.qrId;

    // 3. Mobile scans QR code
    const scanRes = await request(app)
      .post("/api/qr/scan")
      .set("Authorization", `Bearer ${mobileToken}`)
      .send({ qrId });

    expect(scanRes.status).toBe(200);
    expect(scanRes.body.data.status).toBe("SCANNED");

    // 4. Mobile authorizes login
    const authRes = await request(app)
      .post("/api/qr/authorize")
      .set("Authorization", `Bearer ${mobileToken}`)
      .send({ qrId, deviceId: "auth69mob_iphone" });

    expect(authRes.status).toBe(200);
    expect(authRes.body.data.status).toBe("AUTHORIZED");
    expect(authRes.body.data.token).toBeDefined();
    expect(authRes.body.data.user.email).toBe("qruser@auth69.com");

    // 5. Web checks status
    const statusRes = await request(app).get(`/api/qr/status/${qrId}`);
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.status).toBe("AUTHORIZED");
    expect(statusRes.body.token).toBeDefined();
  });
});
