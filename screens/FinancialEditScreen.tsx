// =============================================================================
// FINANCIAL EDIT SCREEN
// =============================================================================
// 
// Allows users to edit their complete financial snapshot:
// - Monthly income and expenses
// - Savings goals
// - Debt tracking with individual debt items
// - Portfolio assets
// - Subscription management
//
// All data persists via useUserData hook to AsyncStorage.
//
// =============================================================================

import React, { useState, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Pressable, 
  TextInput,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ScreenKeyboardAwareScrollView } from '@/components/ScreenKeyboardAwareScrollView';
import Spacer from '@/components/Spacer';
import { Spacing, BorderRadius, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useUserData } from '@/hooks/useUserData';
import { ProfileStackParamList } from '@/navigation/ProfileStackNavigator';

// =============================================================================
// TYPES
// =============================================================================

type FinancialEditScreenProps = {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'FinancialEdit'>;
};

// =============================================================================
// INPUT COMPONENT
// =============================================================================

interface NumberInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  placeholder?: string;
}

function NumberInput({ label, value, onChange, prefix = '£', placeholder = '0' }: NumberInputProps) {
  const { theme } = useTheme();
  const [text, setText] = useState(value > 0 ? value.toString() : '');

  const handleChange = (newText: string) => {
    // Only allow numbers and decimal point
    const cleaned = newText.replace(/[^0-9.]/g, '');
    setText(cleaned);
    const parsed = parseFloat(cleaned) || 0;
    onChange(parsed);
  };

  return (
    <View style={styles.inputContainer}>
      <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>
        {label}
      </ThemedText>
      <View style={[styles.inputWrapper, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
        <ThemedText style={styles.inputPrefix}>{prefix}</ThemedText>
        <TextInput
          style={[styles.textInput, { color: theme.text }]}
          value={text}
          onChangeText={handleChange}
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          keyboardType="decimal-pad"
        />
      </View>
    </View>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function FinancialEditScreen({ navigation }: FinancialEditScreenProps) {
  const { theme } = useTheme();
  const { financial, setFinancial } = useUserData();

  // Local state for editing
  const [income, setIncome] = useState(financial.monthlyIncome);
  const [expenses, setExpenses] = useState(financial.monthlyExpenses);
  const [totalDebt, setTotalDebt] = useState(financial.totalDebt);
  const [savingsGoal, setSavingsGoal] = useState(financial.savingsGoal);
  const [currentSavings, setCurrentSavings] = useState(financial.currentSavings);

  // Save changes - using functional update to avoid stale closure issues
  const handleSave = useCallback(() => {
    setFinancial(prev => ({
      ...prev,
      monthlyIncome: income,
      monthlyExpenses: expenses,
      totalDebt: totalDebt,
      savingsGoal: savingsGoal,
      currentSavings: currentSavings,
    }));
    navigation.goBack();
  }, [income, expenses, totalDebt, savingsGoal, currentSavings, setFinancial, navigation]);

  // Calculate surplus/deficit
  const surplus = income - expenses;
  const surplusColor = surplus >= 0 ? '#22C55E' : '#EF4444';

  return (
    <ScreenKeyboardAwareScrollView>
      <Spacer height={Spacing.md} />

      {/* Income Section */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <ThemedText style={styles.sectionTitle}>Income</ThemedText>
        <Spacer height={Spacing.md} />
        <NumberInput
          label="Monthly Income (after tax)"
          value={income}
          onChange={setIncome}
        />
      </View>

      <Spacer height={Spacing.lg} />

      {/* Expenses Section */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <ThemedText style={styles.sectionTitle}>Expenses</ThemedText>
        <Spacer height={Spacing.md} />
        <NumberInput
          label="Monthly Expenses (total)"
          value={expenses}
          onChange={setExpenses}
        />

        <Spacer height={Spacing.md} />

        {/* Surplus/Deficit indicator */}
        <View style={[styles.surplusBox, { backgroundColor: surplusColor + '15' }]}>
          <Feather 
            name={surplus >= 0 ? 'trending-up' : 'trending-down'} 
            size={20} 
            color={surplusColor} 
          />
          <ThemedText style={[styles.surplusText, { color: surplusColor }]}>
            {surplus >= 0 ? 'Surplus' : 'Deficit'}: £{Math.abs(surplus).toLocaleString()}/month
          </ThemedText>
        </View>
      </View>

      <Spacer height={Spacing.lg} />

      {/* Debt Section */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>Debt</ThemedText>
          <Pressable 
            onPress={() => navigation.navigate('DebtTracker')}
            style={[styles.detailButton, { backgroundColor: theme.primary + '15' }]}
          >
            <ThemedText style={[styles.detailButtonText, { color: theme.primary }]}>
              View Details
            </ThemedText>
            <Feather name="chevron-right" size={16} color={theme.primary} />
          </Pressable>
        </View>
        <Spacer height={Spacing.md} />
        <NumberInput
          label="Total Debt"
          value={totalDebt}
          onChange={setTotalDebt}
        />
      </View>

      <Spacer height={Spacing.lg} />

      {/* Savings Section */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <ThemedText style={styles.sectionTitle}>Savings</ThemedText>
        <Spacer height={Spacing.md} />
        <NumberInput
          label="Savings Goal"
          value={savingsGoal}
          onChange={setSavingsGoal}
        />
        <Spacer height={Spacing.md} />
        <NumberInput
          label="Current Savings"
          value={currentSavings}
          onChange={setCurrentSavings}
        />
        
        {savingsGoal > 0 && (
          <>
            <Spacer height={Spacing.md} />
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { backgroundColor: theme.backgroundSecondary }]}>
                <View 
                  style={[
                    styles.progressFill, 
                    { 
                      width: `${savingsGoal > 0 ? Math.min((currentSavings / savingsGoal) * 100, 100) : 0}%`,
                      backgroundColor: theme.primary,
                    }
                  ]} 
                />
              </View>
              <ThemedText style={[styles.progressText, { color: theme.textSecondary }]}>
                {savingsGoal > 0 ? Math.round((currentSavings / savingsGoal) * 100) : 0}% of goal
              </ThemedText>
            </View>
          </>
        )}
      </View>

      <Spacer height={Spacing.lg} />

      {/* Quick Links */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <ThemedText style={styles.sectionTitle}>Manage</ThemedText>
        <Spacer height={Spacing.md} />

        <Pressable 
          style={[styles.linkRow, { borderColor: theme.border }]}
          onPress={() => navigation.navigate('SubscriptionManager')}
        >
          <View style={styles.linkInfo}>
            <Feather name="credit-card" size={20} color={theme.primary} />
            <ThemedText style={styles.linkText}>Subscriptions</ThemedText>
          </View>
          <View style={styles.linkBadge}>
            <ThemedText style={[styles.linkBadgeText, { color: theme.textSecondary }]}>
              {financial.subscriptions.length}
            </ThemedText>
            <Feather name="chevron-right" size={20} color={theme.textSecondary} />
          </View>
        </Pressable>

        <Pressable 
          style={[styles.linkRow, { borderColor: theme.border }]}
          onPress={() => navigation.navigate('PortfolioTracker')}
        >
          <View style={styles.linkInfo}>
            <Feather name="pie-chart" size={20} color={theme.primary} />
            <ThemedText style={styles.linkText}>Portfolio</ThemedText>
          </View>
          <View style={styles.linkBadge}>
            <ThemedText style={[styles.linkBadgeText, { color: theme.textSecondary }]}>
              {financial.portfolioAssets?.length || 0}
            </ThemedText>
            <Feather name="chevron-right" size={20} color={theme.textSecondary} />
          </View>
        </Pressable>

        <Pressable 
          style={[styles.linkRow, { borderColor: 'transparent' }]}
          onPress={() => navigation.navigate('DebtTracker')}
        >
          <View style={styles.linkInfo}>
            <Feather name="file-text" size={20} color={theme.primary} />
            <ThemedText style={styles.linkText}>Debt Breakdown</ThemedText>
          </View>
          <View style={styles.linkBadge}>
            <ThemedText style={[styles.linkBadgeText, { color: theme.textSecondary }]}>
              {financial.debtItems?.length || 0}
            </ThemedText>
            <Feather name="chevron-right" size={20} color={theme.textSecondary} />
          </View>
        </Pressable>
      </View>

      <Spacer height={Spacing.xl} />

      {/* Save Button */}
      <Pressable
        style={({ pressed }) => [
          styles.saveButton,
          { backgroundColor: theme.primary, opacity: pressed ? 0.8 : 1 },
        ]}
        onPress={handleSave}
      >
        <Feather name="check" size={20} color="#FFFFFF" />
        <ThemedText style={styles.saveButtonText}>Save Changes</ThemedText>
      </Pressable>

      <Spacer height={Spacing['3xl']} />
    </ScreenKeyboardAwareScrollView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
  },
  sectionTitle: {
    ...Typography.headline,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  detailButtonText: {
    ...Typography.caption,
    fontWeight: '600',
    marginRight: Spacing.xs,
  },
  inputContainer: {
    marginBottom: Spacing.sm,
  },
  inputLabel: {
    ...Typography.caption,
    marginBottom: Spacing.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    height: 48,
  },
  inputPrefix: {
    ...Typography.body,
    marginRight: Spacing.xs,
  },
  textInput: {
    flex: 1,
    ...Typography.body,
    paddingVertical: 0,
  },
  surplusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  surplusText: {
    ...Typography.body,
    fontWeight: '600',
    marginLeft: Spacing.sm,
  },
  progressContainer: {
    gap: Spacing.sm,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    ...Typography.caption,
    textAlign: 'center',
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  linkInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  linkText: {
    ...Typography.body,
  },
  linkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  linkBadgeText: {
    ...Typography.caption,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  saveButtonText: {
    ...Typography.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
