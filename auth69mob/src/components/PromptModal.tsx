import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { OTPChallengeItem } from '../types';

interface PromptModalProps {
  challenge: OTPChallengeItem | null;
  visible: boolean;
  onRespond: (
    challengeId: string,
    decision: 'YES' | 'NO',
    selectedNumber?: number,
    selectedAlphabet?: string
  ) => Promise<void>;
  onClose: () => void;
}

export const PromptModal: React.FC<PromptModalProps> = ({
  challenge,
  visible,
  onRespond,
  onClose,
}) => {
  const [step, setStep] = useState<'CONFIRM' | 'CHALLENGE'>('CONFIRM');
  const [selectedNum, setSelectedNum] = useState<number | null>(null);
  const [selectedAlpha, setSelectedAlpha] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  // Reset to initial confirmation screen whenever a new challenge arrives
  React.useEffect(() => {
    if (challenge) {
      setStep('CONFIRM');
      setSelectedNum(null);
      setSelectedAlpha(null);
      setFeedbackError(null);
    }
  }, [challenge?.challengeId]);

  if (!challenge) return null;

  const mode = challenge.mode || 'number';
  const numbers = challenge.numberOptions || (challenge.matchNumber ? [challenge.matchNumber] : [42, 69, 88]);
  const alphabetCode = challenge.alphabet4 || 'AUTH';
  const alphabetOptions = challenge.alphabetOptions || [alphabetCode, 'WXYZ', 'BRDV'];

  const handleDecision = async (
    decision: 'YES' | 'NO',
    overrideNum?: number,
    overrideAlpha?: string
  ) => {
    try {
      setIsSubmitting(true);
      setFeedbackError(null);
      await onRespond(
        challenge.challengeId,
        decision,
        overrideNum !== undefined ? overrideNum : (selectedNum ?? challenge.matchNumber),
        overrideAlpha !== undefined ? overrideAlpha : (selectedAlpha ?? challenge.alphabet4)
      );
      onClose();
    } catch (err: any) {
      console.error('Prompt error:', err);
      setFeedbackError(err.message || 'Authorization failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 1: User tapped "YES, IT'S ME" on the initial sign-in attempt notification
  const handleConfirmYes = () => {
    // If the active mode is number, alphabet, or otp, proceed to the 2FA selection screen
    if (mode === 'number' || mode === 'alphabet' || mode === 'otp') {
      setStep('CHALLENGE');
    } else {
      // 1-tap YES/NO approval
      handleDecision('YES');
    }
  };

  const handleSelectNumber = async (num: number) => {
    setSelectedNum(num);
    setFeedbackError(null);
    if (challenge.matchNumber && Number(num) === Number(challenge.matchNumber)) {
      await handleDecision('YES', num, undefined);
    } else {
      // User tapped the WRONG number -> Kick out immediately!
      setFeedbackError(`Incorrect number (${num}). Access denied.`);
      await handleDecision('NO', num, undefined);
    }
  };

  const handleSelectAlphabet = async (alpha: string) => {
    setSelectedAlpha(alpha);
    setFeedbackError(null);
    if (challenge.alphabet4 && alpha.trim().toUpperCase() === challenge.alphabet4.trim().toUpperCase()) {
      await handleDecision('YES', undefined, alpha);
    } else {
      // User tapped the WRONG code -> Kick out immediately!
      setFeedbackError(`Incorrect code (${alpha}). Access denied.`);
      await handleDecision('NO', undefined, alpha);
    }
  };

  const copyOTP = async () => {
    await Clipboard.setStringAsync(challenge.otp);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <ScrollView contentContainerStyle={styles.scrollInner} showsVerticalScrollIndicator={false}>
            {step === 'CONFIRM' ? (
              <>
                {/* STEP 1: INITIAL SIGN-IN CONFIRMATION (YES / NO) */}
                <View style={styles.header}>
                  <View style={styles.iconCircle}>
                    <Ionicons name="shield-half" size={32} color="#6366f1" />
                  </View>
                  <Text style={styles.title}>Are you trying to sign in?</Text>
                  <Text style={styles.accountEmail}>{challenge.userEmail}</Text>
                </View>

                {/* Device & Location Details */}
                <View style={styles.infoCard}>
                  <View style={styles.infoRow}>
                    <Ionicons name="desktop-outline" size={16} color="#94a3b8" />
                    <Text style={styles.infoText} numberOfLines={1}>
                      {challenge.userAgent || 'Chrome Web Browser'}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons name="location-outline" size={16} color="#94a3b8" />
                    <Text style={styles.infoText}>IP: {challenge.ipAddress || '127.0.0.1'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons name="time-outline" size={16} color="#94a3b8" />
                    <Text style={styles.infoText}>Just now</Text>
                  </View>
                </View>

                {/* Active Mode Notice */}
                <View style={styles.securityBanner}>
                  <Ionicons name="information-circle-outline" size={18} color="#a5b4fc" />
                  <Text style={styles.securityBannerText}>
                    A sign-in request was detected from your web browser. If this is you, tap "YES, IT'S ME" to proceed with verification.
                  </Text>
                </View>

                {/* YES / NO Action Buttons - ONLY on Step 1 */}
                <View style={styles.actionsContainer}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.btnNo, isSubmitting && styles.btnDisabled]}
                    onPress={() => handleDecision('NO')}
                    disabled={isSubmitting}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="close-circle" size={20} color="#ffffff" />
                    <Text style={styles.btnText}>NO, DENY</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.btnYes, isSubmitting && styles.btnDisabled]}
                    onPress={handleConfirmYes}
                    disabled={isSubmitting}
                    activeOpacity={0.8}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
                        <Text style={styles.btnText}>YES, IT'S ME</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                {/* STEP 2: 2FA CHALLENGE SCREEN (NO YES/NO BUTTONS AT THE BOTTOM) */}
                <View style={styles.challengeTopBar}>
                  <TouchableOpacity
                    onPress={() => setStep('CONFIRM')}
                    style={styles.backBtn}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="arrow-back" size={18} color="#94a3b8" />
                    <Text style={styles.backBtnText}>Back</Text>
                  </TouchableOpacity>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>Step 2 of 2</Text>
                  </View>
                </View>

                <View style={styles.header}>
                  <Text style={styles.title}>
                    {mode === 'number' && 'Select Matching Number'}
                    {mode === 'alphabet' && 'Select 4-Letter Code'}
                    {mode === 'otp' && '6-Digit Passcode'}
                  </Text>
                  <Text style={styles.accountEmail}>
                    {mode === 'number' && 'Tap the number shown on your computer screen'}
                    {mode === 'alphabet' && 'Tap the code shown on your computer screen'}
                    {mode === 'otp' && 'Enter this passcode on your computer screen'}
                  </Text>
                </View>

                {/* MODE 1: 4-Letter Alphabet Match */}
                {mode === 'alphabet' && (
                  <View style={styles.tabContent}>
                    <Text style={styles.sectionTitle}>SELECT MATCHING CODE</Text>
                    <View style={styles.chipsRow}>
                      {alphabetOptions.map((opt) => (
                        <TouchableOpacity
                          key={opt}
                          style={[
                            styles.chipBtn,
                            selectedAlpha === opt && styles.chipBtnSelected,
                          ]}
                          onPress={() => handleSelectAlphabet(opt)}
                          disabled={isSubmitting}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.chipBtnText,
                              selectedAlpha === opt && styles.chipBtnTextSelected,
                            ]}
                          >
                            {opt}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* MODE 2: Random Number Match */}
                {mode === 'number' && (
                  <View style={styles.tabContent}>
                    <Text style={styles.sectionTitle}>SELECT MATCHING NUMBER</Text>
                    <View style={styles.numbersRow}>
                      {numbers.map((num) => (
                        <TouchableOpacity
                          key={num}
                          style={[
                            styles.numBox,
                            selectedNum === num && styles.numBoxSelected,
                          ]}
                          onPress={() => handleSelectNumber(num)}
                          disabled={isSubmitting}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.numBoxText,
                              selectedNum === num && styles.numBoxTextSelected,
                            ]}
                          >
                            {num}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* MODE 3: 6-Digit OTP */}
                {mode === 'otp' && (
                  <View style={styles.tabContent}>
                    <Text style={styles.sectionTitle}>6-DIGIT SECURITY PASSCODE</Text>
                    <View style={styles.otpBox}>
                      <Text style={styles.otpText}>{challenge.otp}</Text>
                      <TouchableOpacity onPress={copyOTP} style={styles.copyPill}>
                        <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color="#ffffff" />
                        <Text style={styles.copyPillText}>{copied ? 'Copied' : 'Copy Code'}</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.hintSubtext}>
                      Enter this 6-digit code on the Auth69 Web screen
                    </Text>
                  </View>
                )}

                {/* Feedback Error Banner */}
                {feedbackError && (
                  <View style={styles.errorBanner}>
                    <Ionicons name="alert-circle" size={16} color="#ef4444" />
                    <Text style={styles.errorBannerText}>{feedbackError}</Text>
                  </View>
                )}

                {/* Cancel link at bottom of 2FA screen */}
                <TouchableOpacity
                  style={styles.cancelLink}
                  onPress={() => handleDecision('NO')}
                  disabled={isSubmitting}
                >
                  <Text style={styles.cancelLinkText}>Cancel & Deny Sign-In</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    backgroundColor: '#131b2e',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#6366f1',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  scrollInner: {
    padding: 20,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 14,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
  },
  accountEmail: {
    fontSize: 14,
    color: '#818cf8',
    fontWeight: '600',
    marginTop: 4,
  },
  infoCard: {
    width: '100%',
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    color: '#cbd5e1',
    flex: 1,
  },
  modeBadgeRow: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 14,
  },
  modePill: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.4)',
  },
  modePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#c7d2fe',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tabContent: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 1.2,
    marginBottom: 12,
    textAlign: 'center',
  },
  // Alphabet 4 Tiles
  alphabetRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  letterTile: {
    width: 52,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#1e1b4b',
    borderWidth: 2,
    borderColor: '#818cf8',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#818cf8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  letterTileText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 1,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  chipBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#1e293b',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  chipBtnMatch: {
    borderColor: 'rgba(99, 102, 241, 0.6)',
  },
  chipBtnSelected: {
    backgroundColor: '#4f46e5',
    borderColor: '#818cf8',
  },
  chipBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#cbd5e1',
    letterSpacing: 1.5,
  },
  chipBtnTextSelected: {
    color: '#ffffff',
  },
  miniCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    marginTop: 4,
  },
  miniCopyText: {
    fontSize: 12,
    color: '#a5b4fc',
    fontWeight: '600',
  },
  // Number Match
  numbersRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 10,
  },
  numBox: {
    width: 68,
    height: 68,
    borderRadius: 16,
    backgroundColor: '#1e293b',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  numBoxMatch: {
    borderColor: 'rgba(99, 102, 241, 0.7)',
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  numBoxSelected: {
    backgroundColor: '#4f46e5',
    borderColor: '#a5b4fc',
    transform: [{ scale: 1.05 }],
  },
  numBoxText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#f8fafc',
  },
  numBoxTextSelected: {
    color: '#ffffff',
  },
  hintSubtext: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 4,
  },
  // 6-Digit OTP Box
  otpBox: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: '#38bdf8',
    alignItems: 'center',
    width: '100%',
    marginBottom: 8,
  },
  otpText: {
    fontSize: 34,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 8,
    marginBottom: 10,
    fontVariant: ['tabular-nums'],
  },
  copyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0284c7',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  copyPillText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginVertical: 10,
    width: '100%',
  },
  errorBannerText: {
    color: '#fca5a5',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  // Action Buttons
  securityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)',
    borderRadius: 12,
    padding: 12,
    marginVertical: 14,
  },
  securityBannerText: {
    color: '#c7d2fe',
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  challengeTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#1e293b',
  },
  backBtnText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
  },
  stepBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  stepBadgeText: {
    color: '#a5b4fc',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cancelLink: {
    marginTop: 22,
    alignItems: 'center',
    paddingVertical: 10,
  },
  cancelLinkText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '600',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 6,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    elevation: 3,
  },
  btnNo: {
    backgroundColor: '#dc2626',
  },
  btnYes: {
    backgroundColor: '#16a34a',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.5,
  },
});
