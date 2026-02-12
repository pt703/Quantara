// =============================================================================
// PROFILE SCREEN
// =============================================================================
// 
// Displays user profile with separate sections for:
// - Financial Overview (income, expenses, debt, savings)
// - Portfolio (asset allocation with pie chart)
// - Subscriptions (monthly costs)
// - Analytics button (moved to bottom)
// - Sign out
//
// Each section has its own edit button for focused editing.
//
// =============================================================================

import React, { useMemo } from "react";
import { StyleSheet, Pressable, View } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showAlert, showConfirmAlert } from '@/utils/crossPlatformAlert';
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from '@expo/vector-icons';
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { PortfolioPieChart } from "@/components/PortfolioPieChart";
import Spacer from "@/components/Spacer";
import { Spacing, Typography, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useUserData } from "@/hooks/useUserData";
import { useAuthContext } from "@/context/AuthContext";
import { useGamification } from "@/hooks/useGamification";
import { useModuleProgress } from "@/hooks/useModuleProgress";
import { useSkillAccuracy } from "@/hooks/useSkillAccuracy";
import { useWrongAnswerRegistry } from "@/hooks/useWrongAnswerRegistry";
import { useCourseCertificates } from "@/hooks/useCourseCertificates";
import { ProfileStackParamList } from "@/navigation/ProfileStackNavigator";
import { resetUserAccountData } from "@/services/supabaseDataService";
import { DEFAULT_SKILLS, MAX_HEARTS } from "@/types";
import { createInitialBanditState } from "@/services/ContextualBandit";
import { courses } from "@/mock/courses";

// =============================================================================
// TYPES
// =============================================================================

type ProfileScreenProps = {
  navigation: NativeStackNavigationProp<ProfileStackParamList, "Profile">;
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function ProfileScreen({ navigation }: ProfileScreenProps) {
  const { theme } = useTheme();
  const { profile, financial, setProfile, setFinancial, refreshData } = useUserData();
  const { signOut, user } = useAuthContext();
  const { unlockedCourseIds, isCertificateUnlocked, reload: reloadCertificates } = useCourseCertificates();
  const { reload: reloadGamification } = useGamification();
  const { reload: reloadModuleProgress } = useModuleProgress();
  const { resetAll: resetSkillAccuracy } = useSkillAccuracy();
  const { clearRegistry } = useWrongAnswerRegistry();
  const displayName = useMemo(() => {
    const emailPrefix = user?.email?.split('@')[0]?.trim();
    if (emailPrefix) return emailPrefix;
    const profileName = profile.name?.trim();
    if (profileName) return profileName;
    return 'User';
  }, [user?.email, profile.name]);

  // Handle sign out with error handling
  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      showAlert('Error', 'Failed to sign out. Please try again.');
    }
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

  // Calculate subscription savings from cancelled subscriptions
  // Add null check to prevent crash if subscriptions array is undefined
  const cancelledSubscriptions = (financial.subscriptions || []).filter((s) => !s.active);
  const savings = cancelledSubscriptions.reduce((sum, sub) => sum + sub.cost, 0);
  
  // Calculate total portfolio value (simplified: just sum currentValue)
  // Add null check to prevent crash if portfolioAssets array is undefined
  const totalPortfolioValue = useMemo(() => {
    return (financial.portfolioAssets || []).reduce(
      (sum, asset) => sum + asset.currentValue, 
      0
    );
  }, [financial.portfolioAssets]);

  return (
    <ScreenScrollView>
      <Spacer height={Spacing.md} />

      {/* ================================================================== */}
      {/* USER HEADER */}
      {/* ================================================================== */}
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: theme.primary + '20' }]}>
          <ThemedText style={[styles.avatarText, { color: theme.primary }]}>
            {displayName.charAt(0).toUpperCase()}
          </ThemedText>
        </View>

        <Spacer height={Spacing.md} />

        <ThemedText style={styles.name}>{displayName}</ThemedText>
      </View>

      <Spacer height={Spacing.xl} />

      {/* ================================================================== */}
      {/* CERTIFICATES */}
      {/* ================================================================== */}
      <ThemedView style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <ThemedText style={styles.cardTitle}>Certificates</ThemedText>
          <ThemedText style={[styles.badgeCount, { color: theme.primary }]}>
            {unlockedCourseIds.length}/{courses.length}
          </ThemedText>
        </View>

        <Spacer height={Spacing.lg} />

        <View style={styles.certificateGrid}>
          {courses.map((course) => {
            const isUnlocked = isCertificateUnlocked(course.id);
            return (
              <View 
                key={course.id} 
                style={[
                  styles.certificateItem,
                  { borderColor: theme.border, backgroundColor: isUnlocked ? course.color + '15' : theme.border + '25' }
                ]}
              >
                <View
                  style={[
                    styles.certificateIconWrap,
                    { backgroundColor: isUnlocked ? course.color + '25' : theme.border + '55' },
                  ]}
                >
                  <Feather 
                    name={course.icon as any} 
                    size={20} 
                    color={isUnlocked ? course.color : theme.textSecondary + '80'} 
                  />
                </View>
                <Spacer height={Spacing.xs} />
                <ThemedText 
                  style={[
                    styles.certificateName, 
                    { color: isUnlocked ? theme.text : theme.textSecondary + '80' }
                  ]}
                  numberOfLines={1}
                >
                  {course.title}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.certificateStatus,
                    { color: isUnlocked ? course.color : theme.textSecondary + '90' },
                  ]}
                >
                  {isUnlocked ? 'Earned' : 'Locked'}
                </ThemedText>
              </View>
            );
          })}
        </View>
      </ThemedView>

      <Spacer height={Spacing.lg} />

      {/* ================================================================== */}
      {/* FINANCIAL OVERVIEW - Income, Expenses, Debt, Savings */}
      {/* ================================================================== */}
      <Pressable
        onPress={() => navigation.navigate('FinancialEdit')}
        style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
      >
        <ThemedView style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.cardHeader}>
            <ThemedText style={styles.cardTitle}>Financial Overview</ThemedText>
            <Feather name="edit-2" size={18} color={theme.primary} />
          </View>

          <Spacer height={Spacing.lg} />

          <View style={styles.financialRow}>
            <ThemedText style={[styles.financialLabel, { color: theme.textSecondary }]}>
              Monthly Income
            </ThemedText>
            <ThemedText style={styles.financialValue}>
              £{financial.monthlyIncome.toLocaleString()}
            </ThemedText>
          </View>

          <Spacer height={Spacing.md} />

          <View style={styles.financialRow}>
            <ThemedText style={[styles.financialLabel, { color: theme.textSecondary }]}>
              Monthly Expenses
            </ThemedText>
            <ThemedText style={styles.financialValue}>
              £{financial.monthlyExpenses.toLocaleString()}
            </ThemedText>
          </View>

          <Spacer height={Spacing.md} />

          <View style={styles.financialRow}>
            <ThemedText style={[styles.financialLabel, { color: theme.textSecondary }]}>
              Total Debt
            </ThemedText>
            <ThemedText style={[styles.financialValue, financial.totalDebt > 0 && { color: theme.error }]}>
              £{financial.totalDebt.toLocaleString()}
            </ThemedText>
          </View>

          <Spacer height={Spacing.md} />

          <View style={styles.financialRow}>
            <ThemedText style={[styles.financialLabel, { color: theme.textSecondary }]}>
              Savings Progress
            </ThemedText>
            <ThemedText style={styles.financialValue}>
              £{financial.currentSavings.toLocaleString()} / £
              {financial.savingsGoal.toLocaleString()}
            </ThemedText>
          </View>

          <Spacer height={Spacing.md} />

          <ThemedText style={[styles.tapToEdit, { color: theme.textSecondary }]}>
            Tap to edit your finances
          </ThemedText>
        </ThemedView>
      </Pressable>

      <Spacer height={Spacing.lg} />

      {/* ================================================================== */}
      {/* PORTFOLIO - Asset Allocation with Pie Chart */}
      {/* ================================================================== */}
      <Pressable
        onPress={() => navigation.navigate('PortfolioTracker')}
        style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
      >
        <ThemedView style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.cardHeader}>
            <ThemedText style={styles.cardTitle}>Portfolio</ThemedText>
            <View style={styles.headerRight}>
              <ThemedText style={[styles.portfolioTotal, { color: theme.primary }]}>
                £{totalPortfolioValue.toLocaleString()}
              </ThemedText>
              <Spacer width={Spacing.sm} />
              <Feather name="edit-2" size={18} color={theme.primary} />
            </View>
          </View>

          <Spacer height={Spacing.md} />

          {/* Portfolio Pie Chart showing asset allocation */}
          <PortfolioPieChart assets={financial.portfolioAssets} />

          <Spacer height={Spacing.sm} />

          <ThemedText style={[styles.tapToEdit, { color: theme.textSecondary }]}>
            Tap to manage your investments
          </ThemedText>
        </ThemedView>
      </Pressable>

      <Spacer height={Spacing.lg} />

      {/* ================================================================== */}
      {/* SUBSCRIPTIONS */}
      {/* ================================================================== */}
      <Pressable
        onPress={() => navigation.navigate('SubscriptionManager')}
        style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
      >
        <ThemedView style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.cardHeader}>
            <ThemedText style={styles.cardTitle}>Subscriptions</ThemedText>
            <View style={styles.subscriptionBadge}>
              <ThemedText style={[styles.subscriptionCount, { color: theme.textSecondary }]}>
                {financial.subscriptions.length}
              </ThemedText>
              <Feather name="edit-2" size={18} color={theme.primary} />
            </View>
          </View>

          <Spacer height={Spacing.md} />

          <View style={styles.financialRow}>
            <ThemedText style={[styles.financialLabel, { color: theme.textSecondary }]}>
              Active Cost
            </ThemedText>
            <ThemedText style={[styles.financialValue, { color: theme.error }]}>
              £{financial.subscriptions.filter(s => s.active).reduce((sum, s) => sum + s.cost, 0).toFixed(2)}/mo
            </ThemedText>
          </View>

          {savings > 0 ? (
            <>
              <Spacer height={Spacing.md} />
              <View style={[styles.savingsCalculator, { backgroundColor: theme.success + '20' }]}>
                <Feather name="trending-down" size={16} color={theme.success} />
                <Spacer width={Spacing.sm} />
                <ThemedText style={[styles.savingsText, { color: theme.success }]}>
                  Saving £{savings.toFixed(2)}/month by cancelling {cancelledSubscriptions.length}
                </ThemedText>
              </View>
            </>
          ) : null}

          <Spacer height={Spacing.sm} />

          <ThemedText style={[styles.tapToEdit, { color: theme.textSecondary }]}>
            Tap to manage subscriptions
          </ThemedText>
        </ThemedView>
      </Pressable>

      <Spacer height={Spacing.lg} />

      <Pressable
        style={({ pressed }) => [
          styles.coachButton,
          { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.85 : 1 },
        ]}
        onPress={() => navigation.navigate('AIFinancialCoach')}
      >
        <Feather name="message-circle" size={20} color={theme.primary} />
        <View style={styles.coachTextWrap}>
          <ThemedText style={styles.coachTitle}>AI Financial Coach</ThemedText>
          <ThemedText style={[styles.coachSubtitle, { color: theme.textSecondary }]}>
            Ask money questions anytime
          </ThemedText>
        </View>
        <Feather name="chevron-right" size={20} color={theme.textSecondary} />
      </Pressable>

      <Spacer height={Spacing.xl} />

      {/* ================================================================== */}
      {/* ACTION BUTTONS - Analytics and Notifications */}
      {/* ================================================================== */}
      <Pressable
        style={({ pressed }) => [
          styles.analyticsButton,
          { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
        ]}
        onPress={() => navigation.navigate('Analytics')}
      >
        <Feather name="bar-chart-2" size={20} color="#FFFFFF" />
        <ThemedText style={styles.analyticsButtonText}>View Analytics</ThemedText>
        <Feather name="chevron-right" size={20} color="#FFFFFF" />
      </Pressable>

      <Spacer height={Spacing.md} />

      <Pressable
        style={({ pressed }) => [
          styles.notificationButton,
          { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.85 : 1 },
        ]}
        onPress={() => navigation.navigate('NotificationSettings')}
      >
        <Feather name="bell" size={20} color={theme.primary} />
        <ThemedText style={[styles.notificationButtonText, { color: theme.text }]}>
          Notification Settings
        </ThemedText>
        <Feather name="chevron-right" size={20} color={theme.textSecondary} />
      </Pressable>

      <Spacer height={Spacing.lg} />

      {/* ================================================================== */}
      {/* ACCOUNT / SIGN OUT */}
      {/* ================================================================== */}
      {user ? (
        <View style={styles.accountSection}>
          <ThemedText style={[styles.emailText, { color: theme.textSecondary }]}>
            Signed in as {user.email}
          </ThemedText>
          <Spacer height={Spacing.md} />
          <Pressable
            style={({ pressed }) => [
              styles.signOutButton,
              { borderColor: theme.error, opacity: pressed ? 0.7 : 1 },
            ]}
            onPress={handleSignOut}
          >
            <Feather name="log-out" size={18} color={theme.error} />
            <ThemedText style={[styles.signOutText, { color: theme.error }]}>
              Sign Out
            </ThemedText>
          </Pressable>
          <Spacer height={Spacing.md} />
          <Pressable
            style={({ pressed }) => [
              styles.resetButton,
              { borderColor: theme.warning, opacity: pressed ? 0.7 : 1 },
            ]}
            onPress={handleResetAccountData}
          >
            <Feather name="refresh-ccw" size={18} color={theme.warning} />
            <ThemedText style={[styles.resetText, { color: theme.warning }]}>
              Reset
            </ThemedText>
          </Pressable>
        </View>
      ) : null}

      <Spacer height={Spacing.xl} />
    </ScreenScrollView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '600',
  },
  name: {
    ...Typography.title,
  },
  card: {
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    ...Typography.headline,
  },
  portfolioTotal: {
    ...Typography.headline,
    fontWeight: '600',
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  financialLabel: {
    ...Typography.body,
  },
  financialValue: {
    ...Typography.body,
    fontWeight: '600',
  },
  subscriptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  subscriptionCount: {
    ...Typography.body,
    fontWeight: '600',
  },
  savingsCalculator: {
    flexDirection: 'row',
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  savingsText: {
    ...Typography.subhead,
    flex: 1,
  },
  analyticsButton: {
    marginHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  analyticsButtonText: {
    ...Typography.headline,
    color: '#FFFFFF',
    fontWeight: '600',
    flex: 1,
  },
  notificationButton: {
    marginHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.md,
  },
  coachButton: {
    marginHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  coachTextWrap: {
    flex: 1,
  },
  coachTitle: {
    ...Typography.headline,
    fontWeight: '600',
  },
  coachSubtitle: {
    ...Typography.caption,
    marginTop: 2,
  },
  notificationButtonText: {
    ...Typography.headline,
    fontWeight: '600',
    flex: 1,
  },
  accountSection: {
    marginHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  emailText: {
    ...Typography.footnote,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    gap: Spacing.sm,
  },
  signOutText: {
    ...Typography.body,
    fontWeight: '600',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    gap: Spacing.sm,
  },
  resetText: {
    ...Typography.body,
    fontWeight: '600',
  },
  tapToEdit: {
    ...Typography.caption,
    textAlign: 'center',
  },
  badgeCount: {
    ...Typography.headline,
    fontWeight: '600',
  },
  certificateGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  certificateItem: {
    flex: 1,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
    borderWidth: 1,
  },
  certificateIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  certificateName: {
    ...Typography.caption,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
  },
  certificateStatus: {
    ...Typography.caption,
    textAlign: 'center',
    marginTop: 2,
  },
});
