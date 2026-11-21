# 🔐 Auth69 Server — Production Modular Node.js API

<div align="center">

**Enterprise-grade REST API with Plug-and-Play Architecture: Email/Password Authentication, 2-Step Verification (OTP, Number Match, 4-Letter Alphabet), WhatsApp-Style QR Login, and MongoDB Persistence**

</div>

---

## 📦 Modular Architecture: Extract Any Feature Standalone

Every feature in `auth69server` can be imported or copied directly into any other Node.js / Express application:

```javascript
// Central gateway for all modular features:
import {
  otpService,           // Standalone 6-Digit OTP & 2FA Engine
  qrService,            // Standalone WhatsApp-Style QR Code Login
  registerUserService,  // Core Registration with PBKDF2 salt hashing
  loginUserService,     // Core Login & JWT generation
  generateNumericOTP,   // 6-digit numeric OTP generator
  generateMatchNumber,  // 2-digit prompt match number generator
  generateAlphabet4,    // 4-letter uppercase code generator
} from './src/modules/index.js';
```

---

## 🛠️ Standalone Feature Guides

### 1. One-Time Password & 2FA Module (`src/modules/otp`)
Works independently for **email verification, phone OTP, password reset, or 2FA login**:

```javascript
import { otpService } from './src/modules/index.js';

// Create a verification challenge for any user or email identifier (TTL: 5 mins)
const challenge = await otpService.createChallenge('user@example.com');
console.log('OTP:', challenge.otp);               // e.g. "592014"
console.log('Match Number:', challenge.matchNumber); // e.g. 42
console.log('Alphabet:', challenge.alphabet4);       // e.g. "KJPX"

// Verify submitted code
const result = await otpService.verify2FA(challenge.challengeId, '592014');
if (result.success) {
  console.log('Verification succeeded!');
}
```

### 2. WhatsApp-Style QR Code Login Module (`src/modules/qr`)
Generate dynamic base64 PNG QR codes and manage mobile authorization:

```javascript
import { qrService } from './src/modules/index.js';

// Desktop generates dynamic QR code session (with base64 PNG data URL)
const session = await qrService.createSession('127.0.0.1', 'Desktop Chrome');
console.log('Base64 PNG:', session.qrCodeDataUrl); // Ready for <img src="..." />

// Mobile scans QR code from screen
await qrService.markScanned(session.qrId, mobileUser);

// Mobile user confirms login
const auth = await qrService.authorizeSession(session.qrId, mobileUser);
// Web unlocks immediately with auth.token!
```

---

## 🏗️ Project Structure

```
auth69server/
├── src/
│   ├── modules/              # 📦 Modular Standalone Features
│   │   └── index.js          # Unified export gateway for all features
│   ├── api/
│   │   ├── controllers/      # Express controllers
│   │   │   ├── auth.controller.js     # Register, Login, 2FA, Profile
│   │   │   ├── user.controller.js     # User operations
│   │   │   ├── qr.controller.js       # WhatsApp QR operations
│   │   │   └── mobile.controller.js   # Mobile companion sync
│   │   ├── middleware/       # JWT & Zod validation middleware
│   │   ├── models/           # Mongoose ODM models (with TTL indexes)
│   │   ├── routes/           # Express router definitions
│   │   ├── services/         # Business logic layer
│   │   └── validators/       # Zod schemas
│   ├── config/               # Database & Environment configs
│   ├── utils/                # PBKDF2 hashing, JWT signing, & OTP generators
│   ├── app.js                # Express app setup & CORS
│   └── index.js              # Server entry point & graceful shutdown
├── test/                     # Vitest test suites
├── .env                      # Environment configurations
└── package.json
```

---

## 📡 API Endpoints Reference

### Authentication (`/api/auth`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register new account with email, password, and name |
| `POST` | `/api/auth/login` | Authenticate with credentials (triggers 2FA challenge if active) |
| `POST` | `/api/auth/verify-2fa` | Verify via 6-digit OTP, 4-letter alphabet, or match number |
| `POST` | `/api/auth/resend-2fa` | Issue a fresh 2FA challenge |
| `GET` | `/api/auth/challenge/:challengeId/status` | Retrieve status of active 2FA challenge |
| `GET` | `/api/auth/me` | Fetch authenticated user profile and security audit logs |
| `POST` | `/api/auth/2fa/toggle` | Enable or disable 2-Step Verification |
| `POST` | `/api/auth/2fa/method` | Choose verification mode (`number`, `alphabet`, `otp`) |

### WhatsApp-Style QR Login (`/api/qr`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/qr/create` | Generate dynamic base64 PNG QR code for desktop login |
| `GET` | `/api/qr/status/:qrId` | Check status of QR session |
| `POST` | `/api/qr/scan` | Mobile scans computer screen QR code |
| `POST` | `/api/qr/authorize` | Mobile confirms and issues auth token for desktop |
| `POST` | `/api/qr/deny` | Mobile rejects desktop login attempt |

### Mobile Companion API (`/api/mobile`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/mobile/pending-otps` | Fetch active pending OTPs for authenticated mobile user |
| `POST` | `/api/mobile/approve` | Direct 1-tap approval from mobile |
| `POST` | `/api/mobile/prompt-respond` | Submit YES/NO, number match, or alphabet decision |
| `GET` | `/api/mobile/status` | Mobile service heartbeat check |

---

## 🧪 Testing

```powershell
# Run all Vitest suites:
npm test
```
