import React from "react";
import { StyleSheet, Pressable, View, Switch, Alert } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from '@expo/vector-icons';
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import Spacer from "@/components/Spacer";
import { Spacing, Typography, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useUserData } from "@/hooks/useUserData";
import { useAuthContext } from "@/context/AuthContext";
import { ProfileStackParamList } from "@/navigation/ProfileStackNavigator";

type ProfileScreenProps = {
  navigation: NativeStackNavigationProp<ProfileStackParamList, "Profile">;
};

export default function ProfileScreen({ navigation }: ProfileScreenProps) {
  const { theme } = useTheme();
  const { profile, financial, setFinancial } = useUserData();
  const { signOut, user } = useAuthContext();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  };

  const toggleSubscription = (id: string) => {
    setFinancial({
      ...financial,
      subscriptions: financial.subscriptions.map((sub) =>
        sub.id === id ? { ...sub, active: !sub.active } : sub
      ),
    });
  };

  const cancelledSubscriptions = financial.subscriptions.filter((s) => !s.active);
  const savings = cancelledSubscriptions.reduce((sum, sub) => sum + sub.cost, 0);

  return (
    <ScreenScrollView>
      <Spacer height={Spacing.md} />

      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: theme.primary + '20' }]}>
          <ThemedText style={[styles.avatarText, { color: theme.primary }]}>
            {profile.name.charAt(0).toUpperCase()}
          </ThemedText>
        </View>

        <Spacer height={Spacing.md} />

        <ThemedText style={styles.name}>{profile.name}</ThemedText>
      </View>

      <Spacer height={Spacing.xl} />

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

      <Spacer height={Spacing.lg} />

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
              <Feather name="chevron-right" size={18} color={theme.textSecondary} />
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
        </ThemedView>
      </Pressable>

      <Spacer height={Spacing.lg} />

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
        </View>
      ) : null}

      <Spacer height={Spacing.xl} />
    </ScreenScrollView>
  );
}

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
  cardTitle: {
    ...Typography.headline,
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
  subscriptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subscriptionInfo: {
    flex: 1,
  },
  subscriptionName: {
    ...Typography.body,
    marginBottom: Spacing.xs,
  },
  subscriptionCost: {
    ...Typography.footnote,
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
  tapToEdit: {
    ...Typography.caption,
    textAlign: 'center',
  },
  subscriptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  subscriptionCount: {
    ...Typography.body,
    fontWeight: '600',
  },
});
