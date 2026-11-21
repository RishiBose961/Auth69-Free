# Auth69 — Production Modular Authentication & 2-Step Verification System

A production-grade, highly modular, end-to-end authentication ecosystem featuring Email & Password authentication, JWT session management, security audit logs, **2-Step Verification (2FA)** with **YES / NO & Random Number Matching prompts**, **WhatsApp-style QR code desktop login**, **MongoDB & Mongoose** data persistence, **Redux Toolkit + TanStack Query** state management, and a dedicated WebSocket microservice for zero-polling cost efficiency.

---

## 🧩 Modular Architecture: Take Any Feature Standalone

Every single feature in Auth69 has been decoupled into self-contained modules. If you or any developer in the future wants to extract **ONLY** one specific feature (e.g., *only the 6-digit OTP*, *only the WhatsApp QR login*, or *only the Redux/TanStack Query layer*), you can copy that module directly into any project with **zero errors or external dependencies**.

```
Auth69/
├── auth69server/             # Backend API with Modular Feature Architecture
│   └── src/
│       ├── modules/          # 📦 PLUG-AND-PLAY STANDALONE FEATURE MODULES
│       │   ├── index.js      # Central export gateway for all features
│       │   ├── auth/         # Core Email/Password, PBKDF2 hashing & JWT
│       │   ├── otp/          # 6-Digit OTP, 4-Letter Alphabet & Match Number Engine
│       │   ├── qr/           # WhatsApp-Style Base64 QR Code Login Engine
│       │   └── mobile/       # Mobile Authenticator Sync & Per-Email Isolation
│       ├── api/              # Express Controllers, Routes, Middleware, & Models
│       └── config/           # Database & Environment configuration
├── auth69socket/             # Dedicated Socket.IO Microservice (port 5002)
├── auth69web/                # React 19 + Redux Toolkit + TanStack Query Web Client
│   └── src/
│       ├── features/         # 📦 PLUG-AND-PLAY FRONTEND HOOKS
│       │   ├── otp/useOTP.ts # Standalone OTP & 2FA verification hook
│       │   └── qr/useQRLogin.ts # Standalone WhatsApp QR Login hook
│       ├── store/            # Redux Toolkit store & typed hooks
│       └── services/         # TanStack Query mutations & queries
└── auth69mob/                # React Native + Expo Mobile Authenticator
```

---

## 🛠️ How to Extract & Use Any Feature in Another Project

### 1. Extract ONLY the 6-Digit OTP & 2-Step Verification Engine
You want to add OTP verification to an existing app (for email verification, password reset, or phone OTP) without using the rest of Auth69.

#### Backend Usage:
```javascript
import { otpService } from './auth69server/src/modules/index.js';

// Step 1: Issue OTP for any email or phone identifier (TTL: 5 mins)
const challenge = await otpService.createChallenge('user@example.com');
console.log('Generated OTP:', challenge.otp); // e.g. "829401"
console.log('Challenge ID:', challenge.challengeId);

// Step 2: Verify user input (supports 6-digit OTP, 4-letter alphabet, or match number)
const result = await otpService.verify2FA(challenge.challengeId, '829401');
if (result.success) {
  console.log('OTP verified successfully!');
}
```

#### Frontend Usage:
```tsx
import { useOTP } from './features/otp/useOTP';

function OTPVerifyScreen({ challengeId }) {
  const { verify, resend, isVerifying, error } = useOTP({
    challengeId,
    onSuccess: (data) => alert('Verified! Token: ' + data.token),
  });

  return (
    <div>
      <input placeholder="Enter 6-digit OTP" onBlur={(e) => verify(e.target.value)} />
      <button onClick={() => resend()}>Resend Code</button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
```

---

### 2. Extract ONLY the WhatsApp-Style QR Code Desktop Login
You want passwordless QR login where a desktop browser displays a dynamic QR code and a logged-in mobile app scans it to authorize the web session.

#### Backend Usage:
```javascript
import { qrService } from './auth69server/src/modules/index.js';

// Step 1: Desktop browser generates a dynamic QR session with base64 PNG data URL
const session = await qrService.createSession('127.0.0.1', 'Desktop Chrome');
console.log('QR Base64 PNG Data URL:', session.qrCodeDataUrl); // Render in <img src="..." />
console.log('QR Session ID:', session.qrId);

// Step 2: Mobile app scans QR code from computer screen
await qrService.markScanned(session.qrId, mobileUser);

// Step 3: Mobile user taps "Log In" on mobile confirmation dialog
const authResult = await qrService.authorizeSession(session.qrId, mobileUser);
// Desktop browser receives authResult.token immediately via WebSocket or polling!
```

#### Frontend Usage:
```tsx
import { useQRLogin } from './features/qr/useQRLogin';

function QRCodeLoginPage() {
  const { session, status, timeLeft, refreshQR } = useQRLogin({
    onAuthorized: ({ token, user }) => {
      localStorage.setItem('token', token);
      window.location.href = '/dashboard';
    },
  });

  return (
    <div>
      {status === 'EXPIRED' ? (
        <button onClick={refreshQR}>Reload Code</button>
      ) : (
        session && <img src={session.qrCodeDataUrl} alt="Scan QR Code" />
      )}
      <p>Expires in: {timeLeft}s</p>
    </div>
  );
}
```

---

### 3. Extract ONLY the Google-Style Number & Alphabet Match Prompts
You want the desktop to display a random 2-digit number (e.g. **42**) or a 4-letter uppercase code (e.g. **KJPX**), while the user's mobile prompts them to tap the matching option or tap **YES, IT'S ME / NO, DENY**.

```javascript
import {
  generateMatchNumber,
  generateNumberOptions,
  generateAlphabet4,
  generateAlphabetOptions,
} from './auth69server/src/modules/index.js';

// Generate 2-digit match number & 3 randomized options for mobile display
const correctNumber = generateMatchNumber(); // e.g. 42
const options = generateNumberOptions(correctNumber); // e.g. [27, 42, 89]

// Generate 4-letter alphabet code & 3 randomized options
const alphabetCode = generateAlphabet4(); // e.g. "KJPX"
const alphabetOptions = generateAlphabetOptions(alphabetCode); // e.g. ["BVTQ", "KJPX", "WLYR"]
```

---

### 4. Extract ONLY the Redux Toolkit + TanStack Query State Layer
You want a battle-tested state management architecture with zero manual boilerplate:

- **Redux Toolkit ([authSlice.ts](file:///d:/Auth69/auth69web/src/store/authSlice.ts))**: Manages credentials, tokens, active 2FA challenges, audit logs, and errors.
- **TanStack Query ([authQueries.ts](file:///d:/Auth69/auth69web/src/services/authQueries.ts))**:
  - `useLoginMutation()`: Credentials login mutation syncing with Redux.
  - `useRegisterMutation()`: User registration mutation.
  - `useVerify2FAMutation()`: 2FA challenge verification.
  - `useProfileQuery()`: Automated caching, background synchronization, and token lifecycle management.
- **Unified Context Hook ([AuthContext.tsx](file:///d:/Auth69/auth69web/src/context/AuthContext.tsx))**: Exposes `useAuth()` to any UI component with zero breaking changes.

---

## ⚡ Production & Cost-Efficiency Architecture

### 1. MongoDB & Mongoose Persistence Layer
- Full production database integration replacing in-memory/JSON storage:
  - **Connection**: `mongodb://127.0.0.1:27017/auth69` (auto-reconnect with connection pooling and graceful teardown).
  - **Mongoose Models**:
    - `UserModel`: User credentials with PBKDF2 salt & password hash, 2FA status, and preferred 2FA method.
    - `OTPChallengeModel`: TTL auto-expiring verification records (`expireAfterSeconds: 3600`).
    - `QRSessionModel`: TTL auto-expiring QR login sessions (`expireAfterSeconds: 600`).
    - `DeviceModel`: Enrolled trusted mobile devices.
    - `AuditLogModel`: Tamper-evident security access logs.
  - **Lean Queries (`.lean()`)**: High throughput, zero Mongoose document overhead for ultra-fast response times.

### 2. Elimination of Unnecessary & Redundant Server Calls
- **Direct Auth Emission via WebSocket**: When a challenge or QR session is approved from mobile, the WebSocket emits `{ status: 'APPROVED', token, user }` directly into the room. The web client immediately logs in with **zero extra HTTP calls** (`checkChallengeStatus` round-trips eliminated).
- **Universal Payload Envelopes**: Login endpoints return both `data: payload` and `...payload` at top level, ensuring web, mobile, and third-party consumers never fail with undefined responses.
- **Single-Flight Mobile Sync**: Consolidated mobile startup checks from double requests down to a single optimized fetch.
- **Zero Continuous Polling**: Client apps do not poll the server in loops (`setInterval` eliminated). Real-time updates are driven by the dedicated `auth69socket` microservice.

---

## 🚀 Quick Start Instructions

Run each service in its own terminal:

### 1. Start the Backend API Server
```powershell
cd D:\Auth69\auth69server
npm run dev
# Running on http://localhost:5000
```

### 2. Start the Dedicated Socket Server
```powershell
cd D:\Auth69\auth69socket
npm run dev
# Running on http://localhost:5002
```

### 3. Start the Web App
```powershell
cd D:\Auth69\auth69web
npm run dev
# Running on http://localhost:5173
```

### 4. Start the Mobile Companion App
```powershell
cd D:\Auth69\auth69mob
npx expo start
# Press 'w' for web preview, or scan QR code with Expo Go on your mobile phone!
```

### 5. Run the Automated Test Suites
```powershell
# Run the complete server test suite (Vitest + MongoDB):
npm --prefix auth69server test

# Build Web Frontend for Production:
npm --prefix auth69web run build

# Check Mobile TypeScript:
& .\auth69mob\node_modules\.bin\tsc.cmd --project auth69mob/tsconfig.json --noEmit
```
