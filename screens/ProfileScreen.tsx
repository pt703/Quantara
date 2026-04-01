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
import { showAlert } from '@/utils/crossPlatformAlert';
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from '@expo/vector-icons';
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { PortfolioPieChart } from "@/components/PortfolioPieChart";
import Spacer from "@/components/Spacer";
import { Spacing, Typography, BorderRadius, Shadows } from "@/constants/theme";
import { ProgressBar } from "@/components/ProgressBar";
import { useTheme } from "@/hooks/useTheme";
import { useUserData } from "@/hooks/useUserData";
import { useAuthContext } from "@/context/AuthContext";
import { useCourseCertificates } from "@/hooks/useCourseCertificates";
import { ProfileStackParamList } from "@/navigation/ProfileStackNavigator";
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
  const { profile, financial } = useUserData();
  const { signOut, user } = useAuthContext();
  const { unlockedCourseIds, isCertificateUnlocked } = useCourseCertificates();
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
      <ThemedView style={[styles.card, Shadows.md, { backgroundColor: theme.card }]}>
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
        <ThemedView style={[styles.card, Shadows.md, { backgroundColor: theme.card }]}>
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

          <View>
            <View style={styles.financialRow}>
              <ThemedText style={[styles.financialLabel, { color: theme.textSecondary }]}>
                Savings Goal
              </ThemedText>
              <ThemedText style={[styles.financialValue, { color: theme.success }]}>
                {Math.round((financial.currentSavings / financial.savingsGoal) * 100)}%
              </ThemedText>
            </View>
            <Spacer height={Spacing.sm} />
            <ProgressBar
              progress={financial.currentSavings / financial.savingsGoal}
              color={theme.success}
              height={8}
            />
            <ThemedText style={[styles.savingsSubLabel, { color: theme.textSecondary }]}>
              £{financial.currentSavings.toLocaleString()} of £{financial.savingsGoal.toLocaleString()}
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
        <ThemedView style={[styles.card, Shadows.md, { backgroundColor: theme.card }]}>
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
        <ThemedView style={[styles.card, Shadows.md, { backgroundColor: theme.card }]}>
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
          Shadows.sm,
          { backgroundColor: theme.card, opacity: pressed ? 0.85 : 1 },
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
          <ThemedText style={[styles.legalFooter, { color: theme.textSecondary }]}>
            © Quantara. All rights reserved
          </ThemedText>
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
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
  },
  savingsSubLabel: {
    ...Typography.caption,
    marginTop: Spacing.xs,
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
    borderRadius: BorderRadius.xl,
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
  legalFooter: {
    ...Typography.caption,
    textAlign: 'center',
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
