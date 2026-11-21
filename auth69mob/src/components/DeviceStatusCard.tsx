import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { mobileService } from '../services/mobileService';

interface DeviceStatusCardProps {
  isOnline: boolean;
  userEmail?: string;
  onServerUrlChange: (newUrl: string) => void;
}

export const DeviceStatusCard: React.FC<DeviceStatusCardProps> = ({ isOnline, userEmail, onServerUrlChange }) => {
  const [showConfig, setShowConfig] = useState(false);
  const [urlInput, setUrlInput] = useState(mobileService.getBaseUrl());

  const handleSaveUrl = () => {
    mobileService.setBaseUrl(urlInput);
    onServerUrlChange(urlInput);
    setShowConfig(false);
  };

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.iconWrap}>
          <Ionicons name="phone-portrait-outline" size={24} color="#6366f1" />
        </View>
        <View style={styles.titles}>
          <Text style={styles.deviceName}>Protected Device (auth69mob)</Text>
          {userEmail && <Text style={styles.userEmailText}>Paired with: {userEmail}</Text>}
          <Text style={styles.serverInfo}>Gateway: {mobileService.getBaseUrl()}</Text>
        </View>
        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => setShowConfig(!showConfig)}
          activeOpacity={0.7}
        >
          <Ionicons name="settings-outline" size={18} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      <View style={styles.statusBanner}>
        <Ionicons
          name={isOnline ? "shield-checkmark" : "warning"}
          size={18}
          color={isOnline ? "#34d399" : "#f87171"}
        />
        <Text style={[styles.statusBannerText, isOnline ? styles.textSuccess : styles.textDanger]}>
          {isOnline
            ? 'Auth69 2FA Active • Listening for login attempts'
            : 'Disconnected from Auth69 server • Check server status'}
        </Text>
      </View>

      {showConfig && (
        <View style={styles.configBox}>
          <Text style={styles.configLabel}>Auth69 Server Endpoint:</Text>
          <TextInput
            style={styles.input}
            value={urlInput}
            onChangeText={setUrlInput}
            placeholder="http://localhost:5000"
            placeholderTextColor="#64748b"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveUrl}>
            <Text style={styles.saveBtnText}>Update Server URL</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titles: {
    flex: 1,
  },
  deviceName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  userEmailText: {
    color: '#a5b4fc',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  serverInfo: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  settingsBtn: {
    padding: 6,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
  },
  statusBannerText: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  textSuccess: {
    color: '#6ee7b7',
  },
  textDanger: {
    color: '#fca5a5',
  },
  configBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  configLabel: {
    color: '#cbd5e1',
    fontSize: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#475569',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#ffffff',
    fontSize: 13,
    marginBottom: 8,
  },
  saveBtn: {
    backgroundColor: '#6366f1',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});
