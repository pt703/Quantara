// =============================================================================
// DEBT TRACKER SCREEN
// =============================================================================
// 
// Allows users to track individual debts with details:
// - Debt name (e.g., Student Loan, Credit Card)
// - Balance
// - Interest rate
// - Minimum payment
// 
// Shows total debt and helps prioritize payoff.
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
import { DebtItem } from '@/types';
import { ProfileStackParamList } from '@/navigation/ProfileStackNavigator';

// =============================================================================
// TYPES
// =============================================================================

type DebtTrackerScreenProps = {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'DebtTracker'>;
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function DebtTrackerScreen({ navigation }: DebtTrackerScreenProps) {
  const { theme } = useTheme();
  const { financial, setFinancial } = useUserData();

  // State for adding new debt
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBalance, setNewBalance] = useState('');
  const [newRate, setNewRate] = useState('');
  const [newMinPayment, setNewMinPayment] = useState('');

  const debtItems = financial.debtItems || [];

  // Calculate totals
  const totalDebt = debtItems.reduce((sum, d) => sum + d.balance, 0);
  const totalMinPayment = debtItems.reduce((sum, d) => sum + d.minimumPayment, 0);
  const highestRateDebt = debtItems.length > 0 
    ? debtItems.reduce((max, d) => d.interestRate > max.interestRate ? d : max, debtItems[0])
    : null;

  // Delete debt - using functional update to avoid stale closures
  const deleteDebt = useCallback((id: string, name: string) => {
    Alert.alert(
      'Delete Debt',
      `Are you sure you want to remove ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            setFinancial(prev => {
              const updatedItems = (prev.debtItems || []).filter(d => d.id !== id);
              return {
                ...prev,
                debtItems: updatedItems,
                totalDebt: updatedItems.reduce((sum, d) => sum + d.balance, 0),
              };
            });
          },
        },
      ]
    );
  }, [setFinancial]);

  // Add new debt
  const addDebt = useCallback(() => {
    if (!newName.trim() || !newBalance.trim()) {
      Alert.alert('Missing Info', 'Please enter at least name and balance.');
      return;
    }

    const balance = parseFloat(newBalance);
    const rate = parseFloat(newRate) || 0;
    const minPayment = parseFloat(newMinPayment) || 0;

    if (isNaN(balance) || balance <= 0) {
      Alert.alert('Invalid Balance', 'Please enter a valid balance.');
      return;
    }

    const newDebt: DebtItem = {
      id: `debt-${Date.now()}`,
      name: newName.trim(),
      balance: balance,
      interestRate: rate,
      minimumPayment: minPayment,
    };

    setFinancial(prev => {
      const updatedItems = [...(prev.debtItems || []), newDebt];
      return {
        ...prev,
        debtItems: updatedItems,
        totalDebt: updatedItems.reduce((sum, d) => sum + d.balance, 0),
      };
    });

    setNewName('');
    setNewBalance('');
    setNewRate('');
    setNewMinPayment('');
    setShowAdd(false);
  }, [newName, newBalance, newRate, newMinPayment, setFinancial]);

  return (
    <ScreenKeyboardAwareScrollView>
      <Spacer height={Spacing.md} />

      {/* Summary Card */}
      <View style={[styles.summaryCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.summaryMain}>
          <ThemedText style={[styles.summaryLabel, { color: theme.textSecondary }]}>
            Total Debt
          </ThemedText>
          <ThemedText style={[styles.summaryValue, { color: '#EF4444' }]}>
            £{totalDebt.toLocaleString()}
          </ThemedText>
        </View>
        
        <View style={styles.summaryStats}>
          <View style={styles.summaryItem}>
            <ThemedText style={[styles.summaryStatLabel, { color: theme.textSecondary }]}>
              Min. Monthly
            </ThemedText>
            <ThemedText style={styles.summaryStatValue}>
              £{totalMinPayment.toLocaleString()}
            </ThemedText>
          </View>
          {highestRateDebt && (
            <View style={styles.summaryItem}>
              <ThemedText style={[styles.summaryStatLabel, { color: theme.textSecondary }]}>
                Highest Rate
              </ThemedText>
              <ThemedText style={[styles.summaryStatValue, { color: '#F59E0B' }]}>
                {highestRateDebt.interestRate}% APR
              </ThemedText>
            </View>
          )}
        </View>
      </View>

      <Spacer height={Spacing.lg} />

      {/* Debt List */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <ThemedText style={styles.sectionTitle}>Your Debts</ThemedText>
          <Pressable
            style={[styles.addButton, { backgroundColor: theme.primary }]}
            onPress={() => setShowAdd(!showAdd)}
          >
            <Feather name={showAdd ? 'x' : 'plus'} size={18} color="#FFFFFF" />
          </Pressable>
        </View>

        <Spacer height={Spacing.md} />

        {/* Add New Form */}
        {showAdd && (
          <View style={[styles.addForm, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
            <TextInput
              style={[styles.addInput, { color: theme.text, borderColor: theme.border }]}
              placeholder="Debt name (e.g., Student Loan)"
              placeholderTextColor={theme.textSecondary}
              value={newName}
              onChangeText={setNewName}
            />
            <TextInput
              style={[styles.addInput, { color: theme.text, borderColor: theme.border }]}
              placeholder="Balance (e.g., 5000)"
              placeholderTextColor={theme.textSecondary}
              value={newBalance}
              onChangeText={setNewBalance}
              keyboardType="decimal-pad"
            />
            <View style={styles.addRow}>
              <TextInput
                style={[styles.addInput, styles.halfInput, { color: theme.text, borderColor: theme.border }]}
                placeholder="Interest % (e.g., 19.9)"
                placeholderTextColor={theme.textSecondary}
                value={newRate}
                onChangeText={setNewRate}
                keyboardType="decimal-pad"
              />
              <TextInput
                style={[styles.addInput, styles.halfInput, { color: theme.text, borderColor: theme.border }]}
                placeholder="Min. payment"
                placeholderTextColor={theme.textSecondary}
                value={newMinPayment}
                onChangeText={setNewMinPayment}
                keyboardType="decimal-pad"
              />
            </View>
            <Pressable
              style={[styles.addConfirmButton, { backgroundColor: theme.primary }]}
              onPress={addDebt}
            >
              <ThemedText style={styles.addConfirmText}>Add Debt</ThemedText>
            </Pressable>
          </View>
        )}

        {/* Debt Items */}
        {debtItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="check-circle" size={48} color="#22C55E" />
            <Spacer height={Spacing.md} />
            <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
              No debts tracked. That is great news! Or tap + to add one.
            </ThemedText>
          </View>
        ) : (
          debtItems
            .sort((a, b) => b.interestRate - a.interestRate) // Sort by interest rate descending
            .map((debt, index) => (
              <View 
                key={debt.id} 
                style={[
                  styles.debtRow, 
                  { borderColor: theme.border },
                  index === 0 && { borderColor: '#F59E0B' },
                ]}
              >
                <View style={styles.debtMain}>
                  <View style={styles.debtHeader}>
                    <ThemedText style={styles.debtName}>{debt.name}</ThemedText>
                    {index === 0 && debtItems.length > 1 && (
                      <View style={[styles.priorityBadge, { backgroundColor: '#F59E0B' }]}>
                        <ThemedText style={styles.priorityText}>Pay First</ThemedText>
                      </View>
                    )}
                  </View>
                  <ThemedText style={[styles.debtBalance, { color: theme.error }]}>
                    £{debt.balance.toLocaleString()}
                  </ThemedText>
                </View>

                <View style={styles.debtDetails}>
                  <View style={styles.debtDetail}>
                    <ThemedText style={[styles.debtDetailLabel, { color: theme.textSecondary }]}>
                      APR
                    </ThemedText>
                    <ThemedText style={styles.debtDetailValue}>
                      {debt.interestRate}%
                    </ThemedText>
                  </View>
                  <View style={styles.debtDetail}>
                    <ThemedText style={[styles.debtDetailLabel, { color: theme.textSecondary }]}>
                      Min/mo
                    </ThemedText>
                    <ThemedText style={styles.debtDetailValue}>
                      £{debt.minimumPayment}
                    </ThemedText>
                  </View>
                  <Pressable
                    style={styles.deleteButton}
                    onPress={() => deleteDebt(debt.id, debt.name)}
                  >
                    <Feather name="trash-2" size={18} color={theme.error} />
                  </Pressable>
                </View>
              </View>
            ))
        )}
      </View>

      <Spacer height={Spacing.xl} />

      {/* Tip */}
      {debtItems.length > 1 && (
        <View style={[styles.tipCard, { backgroundColor: '#F59E0B15', borderColor: '#F59E0B30' }]}>
          <Feather name="zap" size={20} color="#F59E0B" />
          <ThemedText style={[styles.tipText, { color: theme.text }]}>
            Avalanche Strategy: Debts are sorted by interest rate. Pay minimums on all, 
            then put extra money toward the highest rate debt to save the most on interest.
          </ThemedText>
        </View>
      )}

      <Spacer height={Spacing['3xl']} />
    </ScreenKeyboardAwareScrollView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  summaryCard: {
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
  },
  summaryMain: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  summaryLabel: {
    ...Typography.caption,
    marginBottom: Spacing.xs,
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E510',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryStatLabel: {
    ...Typography.caption,
    marginBottom: 2,
  },
  summaryStatValue: {
    ...Typography.body,
    fontWeight: '600',
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
  sectionTitle: {
    ...Typography.headline,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addForm: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  addInput: {
    ...Typography.body,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  addRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  halfInput: {
    flex: 1,
  },
  addConfirmButton: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  addConfirmText: {
    ...Typography.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyText: {
    ...Typography.body,
    textAlign: 'center',
  },
  debtRow: {
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderLeftWidth: 3,
    marginLeft: -Spacing.lg,
    paddingLeft: Spacing.lg,
    marginRight: -Spacing.lg,
    paddingRight: Spacing.lg,
  },
  debtMain: {
    marginBottom: Spacing.sm,
  },
  debtHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  debtName: {
    ...Typography.body,
    fontWeight: '600',
  },
  priorityBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  priorityText: {
    ...Typography.caption,
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 10,
  },
  debtBalance: {
    ...Typography.headline,
    marginTop: 2,
  },
  debtDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  debtDetail: {},
  debtDetailLabel: {
    ...Typography.caption,
    fontSize: 10,
  },
  debtDetailValue: {
    ...Typography.body,
    fontWeight: '500',
  },
  deleteButton: {
    marginLeft: 'auto',
    padding: Spacing.sm,
  },
  tipCard: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.md,
    alignItems: 'flex-start',
  },
  tipText: {
    ...Typography.caption,
    flex: 1,
  },
});
