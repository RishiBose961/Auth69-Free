import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { MobileHeader } from '../components/MobileHeader';
import { DeviceStatusCard } from '../components/DeviceStatusCard';
import { ActiveOTPAlert } from '../components/ActiveOTPAlert';
import { MobileAuthScreen } from '../components/MobileAuthScreen';
import { PromptModal } from '../components/PromptModal';
import { QRScannerModal } from '../components/QRScannerModal';
import { useMobileAuth } from '../context/MobileAuthContext';
import { mobileService } from '../services/mobileService';
import { socketService } from '../services/socketService';
import { OTPChallengeItem } from '../types';

export default function MobileHomeScreen() {
  const { user, token, isLoading, logout } = useMobileAuth();
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [activeOTPs, setActiveOTPs] = useState<OTPChallengeItem[]>([]);
  const [history, setHistory] = useState<OTPChallengeItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [promptChallenge, setPromptChallenge] = useState<OTPChallengeItem | null>(null);
  const [isQRScannerVisible, setIsQRScannerVisible] = useState<boolean>(false);

  const fetchStatusAndOTPs = useCallback(async () => {
    if (!user) return;

    try {
      // Direct single request (eliminates redundant status ping before fetching)
      const pending = await mobileService.getPendingOTPs(token, user.email);
      setIsOnline(true);
      setActiveOTPs(pending);

      // If there's an active pending challenge, open prompt modal
      if (pending.length > 0 && !promptChallenge) {
        setPromptChallenge(pending[0]);
      }

      // Track history of observed OTPs
      if (pending.length > 0) {
        setHistory((prev) => {
          const map = new Map(prev.map((item) => [item.challengeId, item]));
          pending.forEach((p) => {
            if (!map.has(p.challengeId)) {
              map.set(p.challengeId, p);
            }
          });
          return Array.from(map.values()).slice(0, 15);
        });
      }
    } catch (err) {
      setIsOnline(false);
    }
  }, [user, token, promptChallenge]);

  // Connect to dedicated Socket service when user is logged in
  useEffect(() => {
    if (!user) return;

    // Initial check on mount
    fetchStatusAndOTPs();

    // Connect to WebSocket gateway (zero continuous HTTP polling!)
    socketService.connect(user.email);

    const unsubPrompt = socketService.onPrompt((challenge) => {
      console.log(`[Socket] Received push prompt on mobile for ${challenge.userEmail}`);
      // Add to active OTPs
      setActiveOTPs((prev) => [challenge, ...prev.filter((o) => o.challengeId !== challenge.challengeId)]);
      // Immediately display the YES/NO & Number Match Modal!
      setPromptChallenge(challenge);

      // Add to history
      setHistory((prev) => {
        const filtered = prev.filter((h) => h.challengeId !== challenge.challengeId);
        return [challenge, ...filtered].slice(0, 15);
      });
    });

    const unsubStatus = socketService.onStatusChange((connected) => {
      setIsOnline(connected);
    });

    return () => {
      unsubPrompt();
      unsubStatus();
      socketService.disconnect();
    };
  }, [user]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchStatusAndOTPs();
    setIsRefreshing(false);
  };

  const handlePromptDecision = async (
    challengeId: string,
    decision: 'YES' | 'NO',
    selectedNumber?: number,
    selectedAlphabet?: string
  ) => {
    try {
      const success = await socketService.respondPrompt(
        challengeId,
        decision,
        selectedNumber,
        selectedAlphabet
      );
      if (success) {
        if (decision === 'YES') {
          Alert.alert('Sign-In Approved', 'You successfully authorized the login attempt on web!');
        } else {
          Alert.alert('Sign-In Denied', 'The unauthorized login attempt was blocked.');
        }

        // Update local state
        setActiveOTPs((prev) => prev.filter((o) => o.challengeId !== challengeId));
        setHistory((prev) =>
          prev.map((h) =>
            h.challengeId === challengeId
              ? { ...h, status: decision === 'YES' ? 'APPROVED' : 'DENIED' }
              : h
          )
        );
      }
    } catch (err: any) {
      Alert.alert('Response Failed', err.message || 'Could not send decision');
    }
  };

  const handleApprove = async (challengeId: string) => {
    await handlePromptDecision(challengeId, 'YES');
  };

  // 1. Initial storage check
  if (isLoading) {
    return (
      <View style={styles.centerLoading}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Initializing auth69mob...</Text>
      </View>
    );
  }

  // 2. If not logged in on mobile, require Sign In / Register first!
  if (!user) {
    return <MobileAuthScreen />;
  }

  // 3. User is logged in: show active Authenticator with isolated OTP stream
  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar style="light" />
      <MobileHeader
        isOnline={isOnline}
        userEmail={user.email}
        userName={user.name}
        onLogout={logout}
        onScanQR={() => setIsQRScannerVisible(true)}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#6366f1" />
        }
      >
        {/* WhatsApp-Style Scan QR Code Card */}
        <TouchableOpacity
          style={styles.qrScanBannerCard}
          onPress={() => setIsQRScannerVisible(true)}
          activeOpacity={0.8}
        >
          <View style={styles.qrBannerIconWrap}>
            <Ionicons name="qr-code-outline" size={28} color="#10b981" />
          </View>
          <View style={styles.qrBannerTextWrap}>
            <Text style={styles.qrBannerTitle}>Scan QR Code for Web Login</Text>
            <Text style={styles.qrBannerSub}>
              WhatsApp Web style • Point camera at computer screen to log in
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#64748b" />
        </TouchableOpacity>

        <DeviceStatusCard
          isOnline={isOnline}
          userEmail={user.email}
          onServerUrlChange={() => fetchStatusAndOTPs()}
        />

        {/* Active OTP Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {activeOTPs.length > 0 ? `Incoming Prompts for ${user.email}` : 'Authenticator Status'}
          </Text>
          {activeOTPs.length > 0 && (
            <View style={styles.badgeCount}>
              <Text style={styles.badgeCountText}>{activeOTPs.length} Pending</Text>
            </View>
          )}
        </View>

        {activeOTPs.length > 0 ? (
          activeOTPs.map((challenge) => (
            <ActiveOTPAlert
              key={challenge.challengeId}
              challenge={challenge}
              onApprove={handleApprove}
            />
          ))
        ) : (
          <View style={styles.emptyStateCard}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="shield-checkmark-outline" size={40} color="#6366f1" />
            </View>
            <Text style={styles.emptyTitle}>Account Protected: {user.email}</Text>
            <Text style={styles.emptyDesc}>
              No pending login prompts. When you sign in to Auth69 Web with{' '}
              <Text style={styles.highlightText}>{user.email}</Text>, an instant YES / NO prompt
              with random number matching will appear here in real time.
            </Text>
          </View>
        )}

        {/* History Section */}
        {history.length > 0 && (
          <View style={styles.historySection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Activity for {user.email}</Text>
            </View>

            {history.map((item) => (
              <View key={item.challengeId} style={styles.historyItem}>
                <View style={styles.historyLeft}>
                  <Text style={styles.historyCode}>
                    {item.matchNumber ? `Match: ${item.matchNumber}` : item.otp}
                  </Text>
                  <Text style={styles.historyEmail}>{item.userEmail}</Text>
                </View>
                <View style={styles.historyRight}>
                  <Text
                    style={[
                      styles.historyStatus,
                      item.status === 'APPROVED'
                        ? styles.statusApproved
                        : item.status === 'DENIED'
                        ? styles.statusDenied
                        : styles.statusDelivered,
                    ]}
                  >
                    {item.status === 'APPROVED'
                      ? 'Approved'
                      : item.status === 'DENIED'
                      ? 'Denied'
                      : 'Pending'}
                  </Text>
                  <Text style={styles.historyTime}>
                    {new Date(item.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Real-time YES / NO & Number Matching Modal */}
      <PromptModal
        challenge={promptChallenge}
        visible={!!promptChallenge}
        onRespond={handlePromptDecision}
        onClose={() => setPromptChallenge(null)}
      />

      {/* WhatsApp-Style QR Code Scanner Modal */}
      <QRScannerModal
        visible={isQRScannerVisible}
        token={token}
        userEmail={user.email}
        onClose={() => setIsQRScannerVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  centerLoading: {
    flex: 1,
    backgroundColor: '#0b0f19',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  qrScanBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    gap: 12,
  },
  qrBannerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  qrBannerTextWrap: {
    flex: 1,
  },
  qrBannerTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  qrBannerSub: {
    color: '#94a3b8',
    fontSize: 11.5,
    lineHeight: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 12,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  badgeCount: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeCountText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  emptyStateCard: {
    backgroundColor: '#131b2e',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
    marginVertical: 8,
  },
  emptyIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDesc: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  highlightText: {
    color: '#a5b4fc',
    fontWeight: '700',
  },
  historySection: {
    marginTop: 20,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#131b2e',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  historyLeft: {
    flex: 1,
  },
  historyCode: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1,
  },
  historyEmail: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  historyRight: {
    alignItems: 'flex-end',
  },
  historyStatus: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  statusApproved: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    color: '#34d399',
  },
  statusDenied: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: '#f87171',
  },
  statusDelivered: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    color: '#a5b4fc',
  },
  historyTime: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 4,
  },
});
