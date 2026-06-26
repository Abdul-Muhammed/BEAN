import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { colors } from '@/constants/theme';

interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Render the confirm button in red for destructive actions. */
  destructive?: boolean;
  /** Shows a spinner on the confirm button and blocks dismissal while true. */
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Reusable in-app confirmation dialog. Used for sign-out and the destructive
 *  delete-account flow. */
export default function ConfirmationModal({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={loading ? undefined : onCancel}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                destructive ? styles.destructiveButton : styles.confirmButton,
              ]}
              onPress={onConfirm}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmText}>{confirmLabel}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 22,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Lato-Bold',
    color: '#1C1C1E',
    textAlign: 'center',
  },
  message: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: 'Lato-Regular',
    color: '#6B6B70',
    textAlign: 'center',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 22,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F2F2F7',
  },
  cancelText: {
    fontSize: 15,
    fontFamily: 'Lato-Bold',
    color: '#1C1C1E',
  },
  confirmButton: {
    backgroundColor: '#1C1C1E',
  },
  destructiveButton: {
    backgroundColor: colors.danger,
  },
  confirmText: {
    fontSize: 15,
    fontFamily: 'Lato-Bold',
    color: '#FFFFFF',
  },
});
