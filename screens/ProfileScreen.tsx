import React from "react";
import { StyleSheet, Pressable, View, Switch } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from '@expo/vector-icons';
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import Spacer from "@/components/Spacer";
import { Spacing, Typography, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useUserData } from "@/hooks/useUserData";
import { ProfileStackParamList } from "@/navigation/ProfileStackNavigator";

type ProfileScreenProps = {
  navigation: NativeStackNavigationProp<ProfileStackParamList, "Profile">;
};

export default function ProfileScreen({ navigation }: ProfileScreenProps) {
  const { theme } = useTheme();
  const { profile, financial, setFinancial } = useUserData();

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

      <ThemedView style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <ThemedText style={styles.cardTitle}>Financial Overview</ThemedText>
          <Pressable onPress={() => navigation.navigate('Settings')}>
            <Feather name="settings" size={20} color={theme.textSecondary} />
          </Pressable>
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
          <ThemedText style={styles.financialValue}>
            £{financial.totalDebt.toLocaleString()}
          </ThemedText>
        </View>

        <Spacer height={Spacing.md} />

        <View style={styles.financialRow}>
          <ThemedText style={[styles.financialLabel, { color: theme.textSecondary }]}>
            Savings Goal
          </ThemedText>
          <ThemedText style={styles.financialValue}>
            £{financial.currentSavings.toLocaleString()} / £
            {financial.savingsGoal.toLocaleString()}
          </ThemedText>
        </View>
      </ThemedView>

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

      <ThemedView style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <ThemedText style={styles.cardTitle}>Subscriptions</ThemedText>

        <Spacer height={Spacing.lg} />

        {financial.subscriptions.map((sub) => (
          <React.Fragment key={sub.id}>
            <View style={styles.subscriptionRow}>
              <View style={styles.subscriptionInfo}>
                <ThemedText style={styles.subscriptionName}>{sub.name}</ThemedText>
                <ThemedText style={[styles.subscriptionCost, { color: theme.textSecondary }]}>
                  £{sub.cost.toFixed(2)}/month
                </ThemedText>
              </View>

              <Switch
                value={sub.active}
                onValueChange={() => toggleSubscription(sub.id)}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor={theme.card}
              />
            </View>

            <Spacer height={Spacing.md} />
          </React.Fragment>
        ))}

        {savings > 0 ? (
          <>
            <Spacer height={Spacing.md} />

            <View style={[styles.savingsCalculator, { backgroundColor: theme.success + '20' }]}>
              <Feather name="info" size={20} color={theme.success} />
              <Spacer width={Spacing.md} />
              <ThemedText style={[styles.savingsText, { color: theme.success }]}>
                By cancelling {cancelledSubscriptions.length} subscription
                {cancelledSubscriptions.length !== 1 ? 's' : ''}, you save £
                {savings.toFixed(2)}/month
              </ThemedText>
            </View>
          </>
        ) : null}
      </ThemedView>

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
});
