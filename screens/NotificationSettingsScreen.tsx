import React from 'react';
import { View, StyleSheet, Pressable, Switch, Platform, Linking } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import Spacer from '@/components/Spacer';
import { Spacing, Typography, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useNotifications } from '@/hooks/useNotifications';
import { useLearningMode } from '@/hooks/useLearningMode';
import { showConfirmAlert } from '@/utils/crossPlatformAlert';

interface SettingRowProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

function SettingRow({ icon, title, description, value, onValueChange, disabled }: SettingRowProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.settingRow, { opacity: disabled ? 0.5 : 1 }]}>
      <View style={[styles.iconContainer, { backgroundColor: theme.primary + '20' }]}>
        <Feather name={icon} size={20} color={theme.primary} />
      </View>
      <View style={styles.settingContent}>
        <ThemedText style={styles.settingTitle}>{title}</ThemedText>
        <ThemedText style={[styles.settingDescription, { color: theme.textSecondary }]}>
          {description}
        </ThemedText>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: theme.border, true: theme.primary + '80' }}
        thumbColor={value ? theme.primary : '#f4f4f4'}
      />
    </View>
  );
}

export default function NotificationSettingsScreen() {
  const { theme } = useTheme();
  const { mode, setMode } = useLearningMode();
  const { 
    permission, 
    settings, 
    isLoading,
    requestPermission, 
    updateSettings,
  } = useNotifications();

  const isPermissionGranted = permission === 'granted';
  const isWeb = Platform.OS === 'web';

  const handleRequestPermission = async () => {
    await requestPermission();
  };

  const handleOpenSettings = async () => {
    if (Platform.OS !== 'web') {
      try {
        await Linking.openSettings();
      } catch (error) {
        console.log('Could not open settings:', error);
      }
    }
  };

  const handleModeChange = (nextMode: 'adaptive' | 'static') => {
    if (nextMode === mode) return;
    console.log('[Learning Mode] Change requested', { from: mode, to: nextMode });
    showConfirmAlert(
      `Switch to ${nextMode === 'adaptive' ? 'Adaptive' : 'Static'} mode?`,
      nextMode === 'adaptive'
        ? 'Adaptive mode uses personalization and AI for remediation. Continue?'
        : 'Static mode disables adaptive personalization and AI remediation. Continue?',
      () => {
        console.log('[Learning Mode] Change confirmed', { from: mode, to: nextMode });
        setMode(nextMode);
      },
      'Confirm',
      'Cancel',
      () => {
        console.log('[Learning Mode] Change cancelled', { from: mode, to: nextMode });
      }
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ThemedText>Loading settings...</ThemedText>
      </View>
    );
  }

  return (
    <ScreenScrollView>
      <Spacer height={Spacing.md} />

      {isWeb ? (
        <ThemedView style={[styles.webNotice, { backgroundColor: theme.warning + '20', borderColor: theme.warning }]}>
          <Feather name="info" size={20} color={theme.warning} />
          <Spacer width={Spacing.md} />
          <View style={styles.webNoticeText}>
            <ThemedText style={[styles.webNoticeTitle, { color: theme.warning }]}>
              Web Platform Notice
            </ThemedText>
            <ThemedText style={[styles.webNoticeDescription, { color: theme.textSecondary }]}>
              Push notifications are only available on mobile devices. Download Expo Go to receive notifications.
            </ThemedText>
          </View>
        </ThemedView>
      ) : !isPermissionGranted ? (
        <ThemedView style={[styles.permissionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Feather name="bell-off" size={32} color={theme.textSecondary} />
          <Spacer height={Spacing.md} />
          <ThemedText style={styles.permissionTitle}>
            Enable Notifications
          </ThemedText>
          <ThemedText style={[styles.permissionDescription, { color: theme.textSecondary }]}>
            Allow notifications to receive reminders for challenges, achievements, and learning streaks.
          </ThemedText>
          <Spacer height={Spacing.lg} />
          <Pressable
            style={[styles.enableButton, { backgroundColor: theme.primary }]}
            onPress={handleRequestPermission}
          >
            <ThemedText style={[styles.enableButtonText, { color: theme.buttonText }]}>
              Enable Notifications
            </ThemedText>
          </Pressable>
          {permission === 'denied' ? (
            <>
              <Spacer height={Spacing.md} />
              <Pressable onPress={handleOpenSettings}>
                <ThemedText style={[styles.openSettingsText, { color: theme.primary }]}>
                  Open System Settings
                </ThemedText>
              </Pressable>
            </>
          ) : null}
        </ThemedView>
      ) : null}

      <Spacer height={Spacing.lg} />

      <ThemedView style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <ThemedText style={styles.sectionTitle}>Learning Reminders</ThemedText>
        <Spacer height={Spacing.lg} />

        <SettingRow
          icon="clock"
          title="Daily Reminders"
          description="Get a daily nudge to keep your streak alive"
          value={settings.dailyReminders}
          onValueChange={(value) => updateSettings({ dailyReminders: value })}
          disabled={!isPermissionGranted && !isWeb}
        />

        <Spacer height={Spacing.lg} />

        <SettingRow
          icon="bar-chart-2"
          title="Weekly Progress"
          description="Receive weekly summaries of your learning"
          value={settings.weeklyProgress}
          onValueChange={(value) => updateSettings({ weeklyProgress: value })}
          disabled={!isPermissionGranted && !isWeb}
        />
      </ThemedView>

      <Spacer height={Spacing.lg} />

      <ThemedView style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <ThemedText style={styles.sectionTitle}>Challenge Notifications</ThemedText>
        <Spacer height={Spacing.lg} />

        <SettingRow
          icon="target"
          title="Challenge Reminders"
          description="Get reminded about active challenges"
          value={settings.challengeReminders}
          onValueChange={(value) => updateSettings({ challengeReminders: value })}
          disabled={!isPermissionGranted && !isWeb}
        />

        <Spacer height={Spacing.lg} />

        <SettingRow
          icon="award"
          title="Achievement Alerts"
          description="Celebrate when you complete challenges"
          value={settings.achievementAlerts}
          onValueChange={(value) => updateSettings({ achievementAlerts: value })}
          disabled={!isPermissionGranted && !isWeb}
        />
      </ThemedView>

      <Spacer height={Spacing.lg} />

      <ThemedView style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <ThemedText style={styles.sectionTitle}>Content Updates</ThemedText>
        <Spacer height={Spacing.lg} />

        <SettingRow
          icon="gift"
          title="New Content Alerts"
          description="Be notified when new lessons or challenges are available"
          value={settings.newContentAlerts}
          onValueChange={(value) => updateSettings({ newContentAlerts: value })}
          disabled={!isPermissionGranted && !isWeb}
        />
      </ThemedView>

      <Spacer height={Spacing.lg} />

      <ThemedView style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.modeHeader}>
          <ThemedText style={styles.sectionTitle}>Learning Mode</ThemedText>
          <ThemedText style={[styles.modeHint, { color: theme.textSecondary }]}>
            Benchmarking
          </ThemedText>
        </View>
        <Spacer height={Spacing.md} />
        <View style={[styles.modeToggle, { backgroundColor: theme.backgroundSecondary }]}>
          <Pressable
            onPress={() => handleModeChange('adaptive')}
            style={[
              styles.modeButton,
              mode === 'adaptive' && { backgroundColor: theme.primary },
            ]}
          >
            <ThemedText
              style={[
                styles.modeButtonText,
                { color: mode === 'adaptive' ? '#FFFFFF' : theme.text },
              ]}
            >
              Adaptive
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => handleModeChange('static')}
            style={[
              styles.modeButton,
              mode === 'static' && { backgroundColor: theme.primary },
            ]}
          >
            <ThemedText
              style={[
                styles.modeButtonText,
                { color: mode === 'static' ? '#FFFFFF' : theme.text },
              ]}
            >
              Static
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>

      <Spacer height={Spacing.xl} />
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webNotice: {
    marginHorizontal: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  webNoticeText: {
    flex: 1,
  },
  webNoticeTitle: {
    ...Typography.subhead,
    fontWeight: '600',
  },
  webNoticeDescription: {
    ...Typography.footnote,
    marginTop: Spacing.xs,
  },
  permissionCard: {
    marginHorizontal: Spacing.lg,
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  permissionTitle: {
    ...Typography.headline,
    textAlign: 'center',
  },
  permissionDescription: {
    ...Typography.body,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  enableButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
  },
  enableButtonText: {
    ...Typography.headline,
    fontWeight: '600',
  },
  openSettingsText: {
    ...Typography.body,
    textDecorationLine: 'underline',
  },
  card: {
    marginHorizontal: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  sectionTitle: {
    ...Typography.headline,
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  settingContent: {
    flex: 1,
    marginRight: Spacing.md,
  },
  settingTitle: {
    ...Typography.body,
    fontWeight: '600',
  },
  settingDescription: {
    ...Typography.footnote,
    marginTop: 2,
  },
  modeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modeHint: {
    ...Typography.caption,
  },
  modeToggle: {
    borderRadius: BorderRadius.sm,
    padding: Spacing.xs,
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  modeButton: {
    flex: 1,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  modeButtonText: {
    ...Typography.subhead,
    fontWeight: '600',
  },
});
