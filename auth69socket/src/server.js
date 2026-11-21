import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 5002;

app.use(cors({ origin: '*' }));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  // Efficient heartbeat: ping every 25s, timeout 20s
  pingInterval: 25000,
  pingTimeout: 20000,
});

// Track registered user rooms
io.on('connection', (socket) => {
  console.log(`[Socket] New connection: ${socket.id}`);

  // 1. Mobile Device Registration (joins room for this specific user email)
  socket.on('register_device', ({ email }) => {
    if (email) {
      const room = `user_${email.toLowerCase().trim()}`;
      socket.join(room);
      socket.data.userEmail = email.toLowerCase().trim();
      console.log(`[Socket] Mobile client ${socket.id} joined room: ${room}`);
      socket.emit('device_registered', { success: true, room });
    }
  });

  // 2. Web Client Challenge Watcher (joins room for this specific challengeId)
  socket.on('watch_challenge', async ({ challengeId }) => {
    if (challengeId) {
      const room = `challenge_${challengeId}`;
      socket.join(room);
      console.log(`[Socket] Web client ${socket.id} watching challenge: ${room}`);
      socket.emit('challenge_watched', { success: true, challengeId });

      // Immediate check: What if mobile user approved BEFORE web client finished joining?
      try {
        const checkRes = await fetch(`http://localhost:5000/api/auth/challenge-status/${challengeId}`);
        const checkResult = await checkRes.json();
        const checkData = checkResult.data || checkResult;
        if (checkData && (checkData.status === 'APPROVED' || checkData.status === 'DENIED')) {
          console.log(`[Socket] Challenge ${challengeId} was already ${checkData.status}. Notifying client immediately.`);
          socket.emit('server:challenge_resolved', {
            challengeId,
            status: checkData.status,
            decision: checkData.status === 'APPROVED' ? 'YES' : 'NO',
            token: checkData.token,
            user: checkData.user,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (err) {
        // Safe check fallback
      }
    }
  });

  // 3. Web Client QR Code Login Watcher (WhatsApp Web style)
  socket.on('watch_qr', ({ qrId }) => {
    if (qrId) {
      const room = `qr_${qrId}`;
      socket.join(room);
      console.log(`[Socket] Web client ${socket.id} watching QR login: ${room}`);
      socket.emit('qr_watched', { success: true, qrId });
    }
  });

  // 4. Device Watcher for remote session termination / kick-out
  socket.on('watch_device', ({ deviceId }) => {
    if (deviceId) {
      const room = `device_${deviceId}`;
      socket.join(room);
      console.log(`[Socket] Client ${socket.id} watching device session: ${room}`);
    }
  });

  // 3. Mobile User Prompt Decision (YES / NO / number match / alphabet match)
  socket.on('mobile:prompt_decision', async ({ challengeId, decision, selectedNumber, selectedAlphabet, deviceId }) => {
    console.log(`[Socket] Received prompt decision for ${challengeId}: ${decision} (Num: ${selectedNumber}, Alphabet: ${selectedAlphabet})`);

    try {
      // Forward to auth69server
      const response = await fetch('http://localhost:5000/api/mobile/prompt-respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeId,
          decision,
          selectedNumber,
          selectedAlphabet,
          deviceId: deviceId || 'auth69mob',
        }),
      });

      const result = await response.json();

      if (result.success) {
        const status = decision === 'NO' ? 'DENIED' : 'APPROVED';
        // Immediately notify web client in real time with token & user (zero unnecessary HTTP polling)
        io.to(`challenge_${challengeId}`).emit('server:challenge_resolved', {
          challengeId,
          status,
          decision,
          token: result.data?.token,
          user: result.data?.user,
          timestamp: new Date().toISOString(),
        });

        // Acknowledge back to mobile
        socket.emit('prompt_acknowledged', { success: true, status });
      } else {
        // Broadcast DENIED to web client to kick him out immediately!
        io.to(`challenge_${challengeId}`).emit('server:challenge_resolved', {
          challengeId,
          status: 'DENIED',
          decision: 'NO',
          reason: result.error || 'Incorrect verification option selected. Session terminated.',
          timestamp: new Date().toISOString(),
        });
        socket.emit('prompt_acknowledged', { success: false, error: result.error });
      }
    } catch (err) {
      console.error('[Socket] Error communicating with auth69server:', err.message);
      socket.emit('prompt_acknowledged', { success: false, error: 'Could not forward decision to auth69server' });
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Disconnected: ${socket.id}`);
  });
});

// REST endpoint called by auth69server to broadcast prompt to mobile
app.post('/notify-prompt', (req, res) => {
  const challenge = req.body;
  if (!challenge || !challenge.userEmail) {
    return res.status(400).json({ success: false, error: 'Invalid challenge data' });
  }

  const room = `user_${challenge.userEmail.toLowerCase().trim()}`;
  console.log(`[Socket] Dispatching real-time prompt to room ${room} (Match Number: ${challenge.matchNumber})`);

  // Emit to all mobile devices registered for this user
  io.to(room).emit('server:login_prompt', {
    challengeId: challenge.challengeId,
    userEmail: challenge.userEmail,
    userName: challenge.userName,
    mode: challenge.mode || 'number',
    matchNumber: challenge.matchNumber,
    numberOptions: challenge.numberOptions,
    alphabet4: challenge.alphabet4,
    alphabetOptions: challenge.alphabetOptions,
    otp: challenge.otp,
    ipAddress: challenge.ipAddress || '127.0.0.1',
    userAgent: challenge.userAgent || 'Web Browser',
    createdAt: challenge.createdAt,
    expiresAt: challenge.expiresAt,
  });

  return res.json({ success: true, dispatchedTo: room });
});



// REST endpoint called by auth69server to broadcast WhatsApp-style QR status
app.post('/notify-qr', (req, res) => {
  const { qrId, status, token, user } = req.body;
  if (!qrId) {
    return res.status(400).json({ success: false, error: 'qrId required' });
  }

  const room = `qr_${qrId}`;
  console.log(`[Socket] Dispatching QR status ${status} to room ${room}`);

  io.to(room).emit('server:qr_status', {
    qrId,
    status,
    token,
    user,
    timestamp: new Date().toISOString(),
  });

  return res.json({ success: true, dispatchedTo: room });
});



// REST endpoint called by auth69server when a device session is remotely revoked
app.post('/notify-device-revoked', (req, res) => {
  const { deviceId, userId } = req.body;
  if (!deviceId) {
    return res.status(400).json({ success: false, error: 'deviceId required' });
  }

  const room = `device_${deviceId}`;
  console.log(`[Socket] Broadcasting remote logout to device room: ${room}`);
  io.to(room).emit('server:device_revoked', {
    deviceId,
    userId,
    timestamp: new Date().toISOString(),
  });

  return res.json({ success: true, revokedRoom: room });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'auth69socket',
    connectedSockets: io.engine.clientsCount,
    uptime: process.uptime(),
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log('========================================================');
  console.log(`⚡ Auth69 Dedicated Socket Server running on: http://localhost:${port}`);
  console.log(`🔒 Real-time 2FA Prompt & YES/NO Gateway ready`);
  console.log('========================================================');
});
