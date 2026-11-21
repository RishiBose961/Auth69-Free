import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { OTPChallengeItem } from '../types';

interface ActiveOTPAlertProps {
  challenge: OTPChallengeItem;
  onApprove: (challengeId: string) => Promise<void>;
}

export const ActiveOTPAlert: React.FC<ActiveOTPAlertProps> = ({ challenge, onApprove }) => {
  const mode = challenge.mode || 'number';
  const [secondsRemaining, setSecondsRemaining] = useState<number>(300);
  const [isApproving, setIsApproving] = useState(false);
  const [copiedOTP, setCopiedOTP] = useState(false);
  const [copiedAlpha, setCopiedAlpha] = useState(false);

  useEffect(() => {
    const calculateSeconds = () => {
      const diff = Math.max(0, Math.floor((new Date(challenge.expiresAt).getTime() - Date.now()) / 1000));
      setSecondsRemaining(diff);
    };

    calculateSeconds();
    const interval = setInterval(calculateSeconds, 1000);
    return () => clearInterval(interval);
  }, [challenge.expiresAt]);

  const copyOTP = async () => {
    await Clipboard.setStringAsync(challenge.otp);
    setCopiedOTP(true);
    setTimeout(() => setCopiedOTP(false), 2000);
  };

  const copyAlpha = async () => {
    if (challenge.alphabet4) {
      await Clipboard.setStringAsync(challenge.alphabet4);
      setCopiedAlpha(true);
      setTimeout(() => setCopiedAlpha(false), 2000);
    }
  };

  const handleApprove = async () => {
    try {
      setIsApproving(true);
      await onApprove(challenge.challengeId);
    } catch (err: any) {
      Alert.alert('Approval Error', err.message || 'Could not approve login');
    } finally {
      setIsApproving(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <View style={styles.card}>
      <View style={styles.bannerHeader}>
        <View style={styles.badgeRow}>
          <View style={styles.alertDot} />
          <Text style={styles.bannerBadgeText}>SIGN-IN PROMPT ACTIVE</Text>
        </View>
        <Text style={styles.timerText}>Expires in {formatTime(secondsRemaining)}</Text>
      </View>

      <View style={styles.infoRow}>
        <Ionicons name="person-circle-outline" size={24} color="#a5b4fc" />
        <View style={styles.infoCol}>
          <Text style={styles.accountName}>{challenge.userName || 'Account Owner'}</Text>
          <Text style={styles.accountEmail}>{challenge.userEmail}</Text>
        </View>
      </View>

      {/* SINGLE ACTIVE VERIFICATION CHALLENGE (Strictly 1, not all 3 at once) */}
      <View style={styles.activeModeWrapper}>
        {/* 1. Alphabet 4 Card */}
        {mode === 'alphabet' && challenge.alphabet4 && (
          <View style={styles.singleOptionBox}>
            <Text style={styles.optionLabel}>🔤 4-LETTER VERIFICATION CODE</Text>
            <View style={styles.alphabetChipsRow}>
              {challenge.alphabet4.split('').map((char, idx) => (
                <View key={idx} style={styles.charBadge}>
                  <Text style={styles.charText}>{char}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity style={styles.miniBtn} onPress={copyAlpha} activeOpacity={0.7}>
              <Ionicons name={copiedAlpha ? 'checkmark' : 'copy-outline'} size={14} color="#a5b4fc" />
              <Text style={styles.miniBtnText}>{copiedAlpha ? 'Copied' : 'Copy 4-Letter Code'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 2. Number Match Card */}
        {mode === 'number' && challenge.matchNumber && (
          <View style={styles.singleOptionBox}>
            <Text style={styles.optionLabel}>🔢 MATCH NUMBER ON YOUR COMPUTER</Text>
            <View style={styles.numberCircle}>
              <Text style={styles.numberCircleText}>{challenge.matchNumber}</Text>
            </View>
            <Text style={styles.subtext}>Match number {challenge.matchNumber} and approve below</Text>
          </View>
        )}

        {/* 3. 6-Digit OTP Box */}
        {mode === 'otp' && (
          <View style={styles.otpBox}>
            <Text style={styles.otpLabel}>ONE-TIME PASSCODE (OTP)</Text>
            <View style={styles.codeRow}>
              <Text style={styles.codeText}>{challenge.otp}</Text>
              <TouchableOpacity style={styles.copyBtn} onPress={copyOTP} activeOpacity={0.7}>
                <Ionicons
                  name={copiedOTP ? 'checkmark-circle' : 'copy-outline'}
                  size={18}
                  color={copiedOTP ? '#34d399' : '#e0e7ff'}
                />
                <Text style={[styles.copyBtnText, copiedOTP && { color: '#34d399' }]}>
                  {copiedOTP ? 'Copied' : 'Copy'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.approveBtn, isApproving && styles.btnDisabled]}
          onPress={handleApprove}
          disabled={isApproving}
          activeOpacity={0.8}
        >
          <Ionicons name="shield-checkmark" size={18} color="#ffffff" />
          <Text style={styles.approveBtnText}>
            {isApproving ? 'Approving...' : "Approve Sign-In (YES, IT'S ME)"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1e1b4b',
    borderWidth: 1.5,
    borderColor: '#6366f1',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  bannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  alertDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ef4444',
    marginRight: 6,
  },
  bannerBadgeText: {
    color: '#f87171',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  timerText: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
    gap: 10,
  },
  infoCol: {
    flex: 1,
  },
  accountName: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
  },
  accountEmail: {
    color: '#818cf8',
    fontSize: 12,
  },
  activeModeWrapper: {
    width: '100%',
    marginBottom: 14,
  },
  singleOptionBox: {
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.35)',
    alignItems: 'center',
    width: '100%',
  },
  optionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  alphabetChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  charBadge: {
    backgroundColor: '#312e81',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#818cf8',
    width: 38,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  charText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  miniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 4,
  },
  miniBtnText: {
    color: '#a5b4fc',
    fontSize: 11,
    fontWeight: '700',
  },
  numberCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#312e81',
    borderWidth: 2,
    borderColor: '#818cf8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  numberCircleText: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '800',
  },
  subtext: {
    fontSize: 11,
    color: '#cbd5e1',
    marginTop: 2,
  },
  otpBox: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
  },
  otpLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#38bdf8',
    letterSpacing: 1,
    marginBottom: 6,
    textAlign: 'center',
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  codeText: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 4,
    fontVariant: ['tabular-nums'],
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4338ca',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  copyBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  actionsRow: {
    marginTop: 4,
  },
  approveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16a34a',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  approveBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.5,
  },
});
