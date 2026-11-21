import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { mobileService } from '../services/mobileService';

interface QRScannerModalProps {
  visible: boolean;
  token: string | null;
  userEmail: string;
  onClose: () => void;
}

const { width } = Dimensions.get('window');
const SCAN_BOX_SIZE = Math.min(width * 0.72, 280);

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  visible,
  token,
  userEmail,
  onClose,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [torchActive, setTorchActive] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [detectedQR, setDetectedQR] = useState<{
    qrId: string;
    clientInfo?: { ipAddress?: string; userAgent?: string };
  } | null>(null);

  // Animated laser bar
  const laserAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && !scanned) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(laserAnim, {
            toValue: 1,
            duration: 2200,
            useNativeDriver: true,
          }),
          Animated.timing(laserAnim, {
            toValue: 0,
            duration: 2200,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      laserAnim.stopAnimation();
    }
  }, [visible, scanned]);

  // Reset states on open
  useEffect(() => {
    if (visible) {
      setScanned(false);
      setIsProcessing(false);
      setDetectedQR(null);
      setManualCode('');
      setShowManualInput(false);
    }
  }, [visible]);

  // Extract qrId from auth69://qr-login?qrId=XYZ or raw string
  const extractQRId = (data: string): string => {
    try {
      if (data.includes('qrId=')) {
        const match = data.match(/qrId=([^&]+)/);
        if (match && match[1]) {
          return match[1];
        }
      }
    } catch {}
    return data.trim();
  };

  const processQR = async (rawValue: string) => {
    if (!token) {
      Alert.alert('Authentication Required', 'Please sign in to Auth69 Mobile first.');
      return;
    }

    const qrId = extractQRId(rawValue);
    if (!qrId) {
      Alert.alert('Invalid QR Code', 'Could not parse a valid Auth69 QR code.');
      return;
    }

    try {
      setIsProcessing(true);
      setScanned(true);

      // Notify server of scan
      const res = await mobileService.scanQR(qrId, token);
      setDetectedQR({
        qrId,
        clientInfo: res?.clientInfo,
      });
    } catch (err: any) {
      Alert.alert(
        'Scan Failed',
        err.message || 'QR code is expired or invalid. Please reload on your computer.',
        [{ text: 'OK', onPress: () => setScanned(false) }]
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scanned || isProcessing) return;
    processQR(data);
  };

  const handleConfirmLogin = async () => {
    if (!detectedQR || !token) return;

    try {
      setIsProcessing(true);
      await mobileService.authorizeQR(detectedQR.qrId, token, 'auth69mob_phone');
      Alert.alert(
        'Logged In!',
        'You have successfully authorized the login on your computer screen.',
        [{ text: 'Done', onPress: onClose }]
      );
    } catch (err: any) {
      Alert.alert('Authorization Failed', err.message || 'Failed to authorize login');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelLogin = async () => {
    if (detectedQR && token) {
      try {
        await mobileService.denyQR(detectedQR.qrId, token);
      } catch {}
    }
    setDetectedQR(null);
    setScanned(false);
  };

  const laserTranslateY = laserAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SCAN_BOX_SIZE - 4],
  });

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
            <Ionicons name="close" size={26} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scan QR Code</Text>
          <TouchableOpacity
            onPress={() => setTorchActive((prev) => !prev)}
            style={[styles.iconBtn, torchActive && styles.iconBtnActive]}
          >
            <Ionicons
              name={torchActive ? 'flash' : 'flash-outline'}
              size={22}
              color={torchActive ? '#10b981' : '#ffffff'}
            />
          </TouchableOpacity>
        </View>

        {/* Camera Scanner View or Permission State */}
        {!permission?.granted ? (
          <View style={styles.permissionCard}>
            <Ionicons name="camera-outline" size={54} color="#6366f1" />
            <Text style={styles.permissionTitle}>Camera Permission Required</Text>
            <Text style={styles.permissionDesc}>
              To scan the QR code on your computer screen, allow Auth69 Mobile to access your camera.
            </Text>
            <TouchableOpacity style={styles.grantBtn} onPress={requestPermission}>
              <Text style={styles.grantBtnText}>Grant Camera Access</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.simulateLink}
              onPress={() => setShowManualInput(true)}
            >
              <Text style={styles.simulateLinkText}>Or enter QR ID manually (For emulator)</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.cameraContainer}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              enableTorch={torchActive}
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
              onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
            />

            {/* Viewfinder Target Mask */}
            <View style={styles.overlay}>
              <View style={styles.topMask} />
              <View style={styles.centerRow}>
                <View style={styles.sideMask} />
                <View style={styles.scanTarget}>
                  {/* WhatsApp-Style Corner Accents */}
                  <View style={[styles.corner, styles.topLeft]} />
                  <View style={[styles.corner, styles.topRight]} />
                  <View style={[styles.corner, styles.bottomLeft]} />
                  <View style={[styles.corner, styles.bottomRight]} />

                  {/* Animated Sweeping Laser Bar */}
                  {!scanned && (
                    <Animated.View
                      style={[
                        styles.laserLine,
                        { transform: [{ translateY: laserTranslateY }] },
                      ]}
                    />
                  )}

                  {isProcessing && (
                    <View style={styles.processingOverlay}>
                      <ActivityIndicator size="large" color="#10b981" />
                      <Text style={styles.processingText}>Processing...</Text>
                    </View>
                  )}
                </View>
                <View style={styles.sideMask} />
              </View>
              <View style={styles.bottomMask} />
            </View>

            {/* Instruction Banner at Bottom */}
            <View style={styles.instructionBanner}>
              <Ionicons name="qr-code-outline" size={20} color="#10b981" />
              <Text style={styles.instructionText}>
                Point camera at the QR code on Auth69 Web
              </Text>
            </View>
          </View>
        )}

        {/* Manual ID Input & Simulator Bar (Great for testing/emulators) */}
        {showManualInput && (
          <View style={styles.manualCard}>
            <Text style={styles.manualTitle}>Manual QR ID Input / Simulator</Text>
            <TextInput
              style={styles.manualInput}
              placeholder="Paste or type QR session ID"
              placeholderTextColor="#64748b"
              value={manualCode}
              onChangeText={setManualCode}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.manualButtonsRow}>
              <TouchableOpacity
                style={styles.cancelManualBtn}
                onPress={() => setShowManualInput(false)}
              >
                <Text style={styles.cancelManualText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitManualBtn}
                onPress={() => processQR(manualCode)}
                disabled={!manualCode.trim() || isProcessing}
              >
                <Text style={styles.submitManualText}>Submit Code</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {!showManualInput && (
          <TouchableOpacity
            style={styles.testSimulatorBtn}
            onPress={() => setShowManualInput(true)}
          >
            <Ionicons name="terminal-outline" size={16} color="#94a3b8" />
            <Text style={styles.testSimulatorText}>Test / Manual Input (For Emulators)</Text>
          </TouchableOpacity>
        )}

        {/* WhatsApp-Style Confirmation Card Overlay */}
        {detectedQR && (
          <View style={styles.confirmModalOverlay}>
            <View style={styles.confirmCard}>
              <View style={styles.desktopIconWrap}>
                <Ionicons name="desktop-outline" size={36} color="#10b981" />
              </View>

              <Text style={styles.confirmTitle}>Log in to Auth69 Web?</Text>
              <Text style={styles.confirmSub}>
                A web browser on your computer is requesting access to{' '}
                <Text style={styles.emailHighlight}>{userEmail}</Text>.
              </Text>

              <View style={styles.browserDetailsBox}>
                <View style={styles.browserDetailRow}>
                  <Ionicons name="globe-outline" size={16} color="#94a3b8" />
                  <Text style={styles.browserDetailText}>
                    {detectedQR.clientInfo?.userAgent || 'Chrome Web Browser'}
                  </Text>
                </View>
                <View style={styles.browserDetailRow}>
                  <Ionicons name="location-outline" size={16} color="#94a3b8" />
                  <Text style={styles.browserDetailText}>
                    IP: {detectedQR.clientInfo?.ipAddress || '127.0.0.1'}
                  </Text>
                </View>
              </View>

              <View style={styles.confirmActionsRow}>
                <TouchableOpacity
                  style={styles.cancelActionBtn}
                  onPress={handleCancelLogin}
                  disabled={isProcessing}
                >
                  <Text style={styles.cancelActionText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.confirmActionBtn}
                  onPress={handleConfirmLogin}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
                      <Text style={styles.confirmActionText}>Log In</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#0b0f19',
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  topMask: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  centerRow: {
    height: SCAN_BOX_SIZE,
    flexDirection: 'row',
  },
  sideMask: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  scanTarget: {
    width: SCAN_BOX_SIZE,
    height: SCAN_BOX_SIZE,
    position: 'relative',
    overflow: 'hidden',
  },
  bottomMask: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  // WhatsApp Style Corners
  corner: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderColor: '#10b981',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 10,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 10,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 10,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 10,
  },
  laserLine: {
    height: 2.5,
    backgroundColor: '#10b981',
    width: '100%',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  processingText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  instructionBanner: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  instructionText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '500',
  },
  testSimulatorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: '#131b2e',
  },
  testSimulatorText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  // Permission Card
  permissionCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    textAlign: 'center',
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 18,
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionDesc: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  grantBtn: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    marginBottom: 16,
  },
  grantBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  simulateLink: {
    padding: 8,
  },
  simulateLinkText: {
    color: '#818cf8',
    fontSize: 13,
    fontWeight: '600',
  },
  // Manual Input
  manualCard: {
    backgroundColor: '#131b2e',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  manualTitle: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  manualInput: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 12,
  },
  manualButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelManualBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelManualText: {
    color: '#cbd5e1',
    fontWeight: '600',
    fontSize: 13,
  },
  submitManualBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#10b981',
    borderRadius: 8,
    alignItems: 'center',
  },
  submitManualText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  // Confirmation Card Overlay (WhatsApp Style)
  confirmModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 100,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#131b2e',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#10b981',
    padding: 24,
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  desktopIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1.5,
    borderColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 6,
  },
  confirmSub: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  emailHighlight: {
    color: '#a7f3d0',
    fontWeight: '700',
  },
  browserDetailsBox: {
    width: '100%',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 20,
    gap: 8,
  },
  browserDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  browserDetailText: {
    color: '#cbd5e1',
    fontSize: 12,
    flex: 1,
  },
  confirmActionsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelActionBtn: {
    flex: 1,
    paddingVertical: 13,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelActionText: {
    color: '#e2e8f0',
    fontWeight: '600',
    fontSize: 14,
  },
  confirmActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    backgroundColor: '#10b981',
    borderRadius: 12,
  },
  confirmActionText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
});
