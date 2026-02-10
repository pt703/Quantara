// =============================================================================
// CROSS-PLATFORM ALERT UTILITY
// =============================================================================
// 
// React Native's Alert.alert() with buttons doesn't work properly on web.
// This utility provides a cross-platform solution:
// - On native (iOS/Android): Uses the standard Alert.alert()
// - On web: Uses browser's window.confirm() for confirmations
//
// =============================================================================

import { Alert, Platform } from 'react-native';

/**
 * Shows a confirmation dialog that works on both web and native platforms.
 * 
 * @param title - The title of the alert
 * @param message - The message to display
 * @param onConfirm - Callback when user confirms (presses "Delete", "OK", etc.)
 * @param confirmText - Text for the confirm button (default: "Delete")
 * @param cancelText - Text for the cancel button (default: "Cancel")
 * @param onCancel - Optional callback when user cancels
 */
export function showConfirmAlert(
  title: string,
  message: string,
  onConfirm: () => void,
  confirmText: string = 'Delete',
  cancelText: string = 'Cancel',
  onCancel?: () => void
): void {
  if (Platform.OS === 'web') {
    // On web, use browser's built-in confirm dialog
    const confirmed = window.confirm(`${title}\n\n${message}`);
    if (confirmed) {
      onConfirm();
    } else {
      onCancel?.();
    }
  } else {
    // On native platforms, use React Native's Alert
    Alert.alert(
      title,
      message,
      [
        { text: cancelText, style: 'cancel', onPress: onCancel },
        { 
          text: confirmText, 
          style: 'destructive',
          onPress: onConfirm,
        },
      ],
      {
        cancelable: true,
        onDismiss: onCancel,
      }
    );
  }
}

/**
 * Shows a simple informational alert.
 * 
 * @param title - The title of the alert
 * @param message - The message to display
 */
export function showAlert(title: string, message: string): void {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}
