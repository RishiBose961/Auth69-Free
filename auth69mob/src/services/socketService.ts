import { io, Socket } from 'socket.io-client';
import { SERVER_CONFIG } from '../constants/config';
import { OTPChallengeItem } from '../types';

type PromptListener = (challenge: OTPChallengeItem) => void;
type StatusListener = (connected: boolean) => void;

class SocketService {
  private socket: Socket | null = null;
  private currentEmail: string | null = null;
  private promptListeners: Set<PromptListener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();
  private isConnected: boolean = false;

  public connect(email: string) {
    if (this.socket && this.currentEmail === email) {
      return;
    }

    if (this.socket) {
      this.socket.disconnect();
    }

    this.currentEmail = email.toLowerCase().trim();
    const socketUrl = SERVER_CONFIG.getSocketUrl();

    this.socket = io(socketUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      console.log(`[Socket] Connected to ${socketUrl} for ${this.currentEmail}`);
      this.socket?.emit('register_device', { email: this.currentEmail });
      this.statusListeners.forEach((l) => l(true));
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      this.statusListeners.forEach((l) => l(false));
    });

    this.socket.on('server:login_prompt', (challenge: OTPChallengeItem) => {
      console.log(`[Socket] Received real-time prompt for challenge: ${challenge.challengeId}`);
      this.promptListeners.forEach((l) => l(challenge));
    });
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.currentEmail = null;
      this.isConnected = false;
    }
  }

  public onPrompt(listener: PromptListener) {
    this.promptListeners.add(listener);
    return () => {
      this.promptListeners.delete(listener);
    };
  }

  public onStatusChange(listener: StatusListener) {
    this.statusListeners.add(listener);
    listener(this.isConnected);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  public respondPrompt(
    challengeId: string,
    decision: 'YES' | 'NO',
    selectedNumber?: number,
    selectedAlphabet?: string
  ): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.socket || !this.isConnected) {
        // Fallback to REST
        fetch(`${SERVER_CONFIG.getBaseUrl()}/api/mobile/prompt-respond`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            challengeId,
            decision,
            selectedNumber,
            selectedAlphabet,
            deviceId: 'auth69mob',
          }),
        })
          .then((res) => res.json())
          .then((data) => resolve(data.success))
          .catch(() => resolve(false));
        return;
      }

      this.socket.emit(
        'mobile:prompt_decision',
        {
          challengeId,
          decision,
          selectedNumber,
          selectedAlphabet,
          deviceId: 'auth69mob',
        },
        () => resolve(true)
      );

      // Resolve optimistic
      setTimeout(() => resolve(true), 1000);
    });
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }
}

export const socketService = new SocketService();
