import crypto from "crypto";
import qrcode from "qrcode";

const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/**
 * Generates a standard RFC 4648 Base32 secret key.
 * @param {number} length Byte length (default 20 bytes = 160 bits)
 * @returns {string} Base32 encoded secret key
 */
export function generateBase32Secret(length = 20) {
  const bytes = crypto.randomBytes(length);
  let secret = "";
  for (let i = 0; i < bytes.length; i++) {
    secret += BASE32_CHARS[bytes[i] % 32];
  }
  return secret;
}

/**
 * Decodes a Base32 string into a Buffer.
 * @param {string} base32
 * @returns {Buffer}
 */
export function base32Decode(base32) {
  const clean = (base32 || "")
    .toUpperCase()
    .replace(/=+$/, "")
    .replace(/[^A-Z2-7]/g, "");

  let bits = "";
  for (let i = 0; i < clean.length; i++) {
    const val = BASE32_CHARS.indexOf(clean[i]);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, "0");
  }

  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substr(i, 8), 2));
  }

  return Buffer.from(bytes);
}

/**
 * Generates a 6-digit TOTP code (RFC 6238) for a given time step and window.
 * @param {string} secret Base32 secret
 * @param {number} timeStep Time step in seconds (default 30)
 * @param {number} window Window offset (0 = current, -1 = previous, +1 = next)
 * @returns {string} 6-digit code
 */
export function generateTOTP(secret, timeStep = 30, window = 0) {
  const epoch = Math.floor(Date.now() / 1000);
  const time = Math.floor(epoch / timeStep) + window;
  const timeBuffer = Buffer.alloc(8);
  timeBuffer.writeBigInt64BE(BigInt(time));

  const key = base32Decode(secret);
  const hmac = crypto.createHmac("sha1", key).update(timeBuffer).digest();

  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = (binary % 1000000).toString().padStart(6, "0");
  return otp;
}

/**
 * Verifies a 6-digit TOTP token against a secret with +/- 1 window tolerance for drift.
 * @param {string} secret Base32 secret
 * @param {string} inputToken 6-digit token entered by user
 * @param {number} timeStep Time step in seconds (default 30)
 * @param {number} windowSize Drift tolerance in windows (default 1 = +/- 30s)
 * @returns {boolean}
 */
export function verifyTOTP(secret, inputToken, timeStep = 30, windowSize = 1) {
  if (!secret || !inputToken) return false;
  const cleaned = inputToken.toString().trim();
  if (cleaned.length !== 6) return false;

  for (let window = -windowSize; window <= windowSize; window++) {
    const expected = generateTOTP(secret, timeStep, window);
    if (expected === cleaned) {
      return true;
    }
  }
  return false;
}

/**
 * Generates an otpauth:// URI and converts it into a base64 PNG data URL for QR code display.
 * @param {string} email User email
 * @param {string} secret Base32 secret
 * @param {string} issuer App name
 * @returns {Promise<{ otpAuthUri: string, qrCodeDataUrl: string }>}
 */
export async function generateTOTPQRCode(email, secret, issuer = "Auth69") {
  const label = encodeURIComponent(`${issuer}:${email}`);
  const encodedIssuer = encodeURIComponent(issuer);
  const otpAuthUri = `otpauth://totp/${label}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;

  const qrCodeDataUrl = await qrcode.toDataURL(otpAuthUri, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 260,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });

  return { otpAuthUri, qrCodeDataUrl };
}
