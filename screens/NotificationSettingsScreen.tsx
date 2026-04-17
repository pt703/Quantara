import React from 'react';
import { View, StyleSheet, Pressable, Switch, Platform, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import Spacer from '@/components/Spacer';
import { Spacing, Typography, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useNotifications } from '@/hooks/useNotifications';
import { useLearningMode } from '@/hooks/useLearningMode';
import { showAlert, showConfirmAlert } from '@/utils/crossPlatformAlert';
import { useUserData } from '@/hooks/useUserData';
import { useAuthContext } from '@/context/AuthContext';
import { useGamification } from '@/hooks/useGamification';
import { useModuleProgress } from '@/hooks/useModuleProgress';
import { useSkillAccuracy } from '@/hooks/useSkillAccuracy';
import { useWrongAnswerRegistry } from '@/hooks/useWrongAnswerRegistry';
import { useCourseCertificates } from '@/hooks/useCourseCertificates';
import { resetUserAccountData } from '@/services/supabaseDataService';
import { DEFAULT_SKILLS, MAX_HEARTS } from '@/types';
import { createInitialBanditState } from '@/services/ContextualBandit';

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
  const { setProfile, setFinancial, refreshData } = useUserData();
  const { user } = useAuthContext();
  const { reload: reloadGamification } = useGamification();
  const { reload: reloadModuleProgress } = useModuleProgress();
  const { resetAll: resetSkillAccuracy } = useSkillAccuracy();
  const { clearRegistry } = useWrongAnswerRegistry();
  const { reload: reloadCertificates } = useCourseCertificates();
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

  const handleResetAccountData = () => {
    showConfirmAlert(
      'Reset all data?',
      'This will reset your progress, lessons, quiz history, badges, and financial inputs for this account. Continue?',
      async () => {
        try {
          const userId = user?.id || null;
          const scopedKeys = [
            `user_profile:${userId || 'guest'}`,
            `user_financial:${userId || 'guest'}`,
            `learning_mode:${userId || 'guest'}`,
            `quantara_gamification_state:${userId || 'guest'}`,
            `@quantara_module_progress:${userId || 'guest'}`,
          ];
          const globalKeys = [
            'user_profile',
            'user_financial',
            'learning_progress',
            'quantara_bandit_state',
            '@quantara_bandit_state',
            '@quantara_module_progress',
            '@quantara_wrong_answer_registry',
            '@quantara_skill_accuracy',
            '@quantara/badges',
            '@quantara/badge_stats',
            '@quantara_notification_settings',
            'quantara_gamification_state',
            'quantara_skill_profile',
            'quantara_completed_lessons',
            'quantara_lesson_attempts',
            'quantara_assessed_courses',
            'quantara_baseline_assessments',
            'quantara_achievements',
            'quantara_stats',
            'quantara_course_certificates',
            `quantara_course_certificates:${userId || 'guest'}`,
          ];

          const defaultGamification = {
            hearts: 0,
            maxHearts: MAX_HEARTS,
            xp: 0,
            todayXP: 0,
            todayXPDate: '',
            level: 1,
            streak: 0,
            longestStreak: 0,
            lastActiveDate: '',
            lastActivityTimestamp: '',
            heartsLastRefilled: new Date().toISOString(),
            activeDays: [],
          };

          const defaultSkillAccuracy = {
            budgeting: { correct: 0, total: 0 },
            saving: { correct: 0, total: 0 },
            debt: { correct: 0, total: 0 },
            investing: { correct: 0, total: 0 },
            credit: { correct: 0, total: 0 },
          };

          const defaultSkillProfile = {
            ...DEFAULT_SKILLS,
            lastUpdated: new Date().toISOString(),
          };

          const defaultBadgeStats = {
            quizCount: 0,
            lessonCount: 0,
            perfectQuizCount: 0,
            challengeCount: 0,
            totalXp: 0,
            currentStreak: 0,
            hasSavingsGoal: false,
            completedDomains: [],
          };

          const defaultAchievementStats = {
            lessonsCompleted: 0,
            coursesCompleted: 0,
            perfectScores: 0,
          };

          await AsyncStorage.multiRemove(scopedKeys);
          await AsyncStorage.multiSet([
            ['learning_progress', JSON.stringify({})],
            ['quantara_bandit_state', JSON.stringify(createInitialBanditState())],
            ['@quantara_bandit_state', JSON.stringify(createInitialBanditState())],
            ['@quantara_module_progress', JSON.stringify({})],
            [`@quantara_module_progress:${userId || 'guest'}`, JSON.stringify({})],
            ['@quantara_wrong_answer_registry', JSON.stringify([])],
            ['@quantara_skill_accuracy', JSON.stringify(defaultSkillAccuracy)],
            ['@quantara/badges', JSON.stringify([])],
            ['@quantara/badge_stats', JSON.stringify(defaultBadgeStats)],
            ['@quantara_notification_settings', JSON.stringify({})],
            ['quantara_gamification_state', JSON.stringify(defaultGamification)],
            [`quantara_gamification_state:${userId || 'guest'}`, JSON.stringify(defaultGamification)],
            ['quantara_skill_profile', JSON.stringify(defaultSkillProfile)],
            ['quantara_completed_lessons', JSON.stringify([])],
            ['quantara_lesson_attempts', JSON.stringify([])],
            ['quantara_assessed_courses', JSON.stringify([])],
            ['quantara_baseline_assessments', JSON.stringify([])],
            ['quantara_achievements', JSON.stringify([])],
            ['quantara_stats', JSON.stringify(defaultAchievementStats)],
            [`quantara_course_certificates:${userId || 'guest'}`, JSON.stringify([])],
          ]);
          await AsyncStorage.multiRemove(['user_profile', 'user_financial', ...globalKeys]);

          const remoteResetOk = await resetUserAccountData();
          if (!remoteResetOk) {
            console.log('[Reset] Remote reset was partial or unavailable; local reset completed.');
          }

          setProfile({
            name: user?.email?.split('@')[0] || 'User',
            avatar: 0,
          });
          setFinancial({
            monthlyIncome: 0,
            monthlyExpenses: 0,
            totalDebt: 0,
            savingsGoal: 0,
            currentSavings: 0,
            subscriptions: [],
            debtItems: [],
            portfolioAssets: [],
          });

          clearRegistry();
          await resetSkillAccuracy();
          await Promise.all([refreshData(), reloadGamification(), reloadModuleProgress(), reloadCertificates()]);
          showAlert('Reset complete', 'Your account data has been reset for a fresh demo state.');
        } catch (error) {
          console.error('Failed to reset account data:', error);
          showAlert('Reset failed', 'Could not reset all data. Please try again.');
        }
      },
      'Confirm',
      'Cancel'
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
        <Spacer height={Spacing.lg} />
        <Pressable
          style={({ pressed }) => [
            styles.resetButton,
            { borderColor: theme.warning, opacity: pressed ? 0.7 : 1 },
          ]}
          onPress={handleResetAccountData}
        >
          <Feather name="refresh-ccw" size={18} color={theme.warning} />
          <Spacer width={Spacing.sm} />
          <ThemedText style={[styles.resetText, { color: theme.warning }]}>
            Reset
          </ThemedText>
        </Pressable>
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
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
  },
  resetText: {
    ...Typography.body,
    fontWeight: '600',
  },
});
