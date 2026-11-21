import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MobileHeaderProps {
  isOnline: boolean;
  userEmail?: string;
  userName?: string;
  onLogout?: () => void;
  onScanQR?: () => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  isOnline,
  userEmail,
  userName,
  onLogout,
  onScanQR,
}) => {
  const confirmLogout = () => {
    Alert.alert(
      'Sign Out of auth69mob',
      `Are you sure you want to sign out from ${userEmail}? This device will stop receiving 2FA OTP codes for this account.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: onLogout },
      ]
    );
  };

  return (
    <View style={styles.header}>
      <View style={styles.brandRow}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoText}>69</Text>
        </View>
        <View style={styles.brandTitles}>
          <Text style={styles.title}>auth69mob</Text>
          {userEmail ? (
            <Text style={styles.userSubtitle} numberOfLines={1}>
              {userEmail}
            </Text>
          ) : (
            <Text style={styles.subtitle}>2-Step Verification Companion</Text>
          )}
        </View>
      </View>

      <View style={styles.rightActions}>
        {onScanQR && (
          <TouchableOpacity
            style={styles.qrHeaderBtn}
            onPress={onScanQR}
            activeOpacity={0.7}
            accessibilityLabel="Scan Web QR Code"
          >
            <Ionicons name="qr-code-outline" size={18} color="#10b981" />
          </TouchableOpacity>
        )}

        <View style={[styles.statusPill, isOnline ? styles.onlinePill : styles.offlinePill]}>
          <View style={[styles.statusDot, isOnline ? styles.onlineDot : styles.offlineDot]} />
          <Text style={[styles.statusText, isOnline ? styles.onlineText : styles.offlineText]}>
            {isOnline ? 'LIVE' : 'OFFLINE'}
          </Text>
        </View>

        {onLogout && (
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={confirmLogout}
            activeOpacity={0.7}
            accessibilityLabel="Sign out"
          >
            <Ionicons name="log-out-outline" size={20} color="#f87171" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
  },
  brandTitles: {
    flexDirection: 'column',
    flex: 1,
  },
  title: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 11,
  },
  userSubtitle: {
    color: '#a5b4fc',
    fontSize: 11,
    fontWeight: '600',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qrHeaderBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
    gap: 5,
  },
  onlinePill: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  offlinePill: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  onlineDot: {
    backgroundColor: '#10b981',
  },
  offlineDot: {
    backgroundColor: '#ef4444',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  onlineText: {
    color: '#34d399',
  },
  offlineText: {
    color: '#f87171',
  },
  logoutBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
});
