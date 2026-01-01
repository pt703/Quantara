// =============================================================================
// SUBSCRIPTION MANAGER SCREEN
// =============================================================================
// 
// Allows users to add, edit, and remove subscriptions.
// Features:
// - View all subscriptions with monthly costs
// - Toggle subscriptions on/off
// - Add new subscriptions
// - Delete subscriptions
// - See total monthly subscription cost
//
// =============================================================================

import React, { useState, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Pressable, 
  TextInput,
} from 'react-native';
import { showConfirmAlert, showAlert } from '@/utils/crossPlatformAlert';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ScreenKeyboardAwareScrollView } from '@/components/ScreenKeyboardAwareScrollView';
import Spacer from '@/components/Spacer';
import { Spacing, BorderRadius, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useUserData } from '@/hooks/useUserData';
import { Subscription } from '@/types';
import { ProfileStackParamList } from '@/navigation/ProfileStackNavigator';

// =============================================================================
// TYPES
// =============================================================================

type SubscriptionManagerScreenProps = {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'SubscriptionManager'>;
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function SubscriptionManagerScreen({ navigation }: SubscriptionManagerScreenProps) {
  const { theme } = useTheme();
  const { financial, setFinancial } = useUserData();

  // State for adding new subscription
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCost, setNewCost] = useState('');

  // Calculate totals
  const activeTotal = financial.subscriptions
    .filter(s => s.active)
    .reduce((sum, s) => sum + s.cost, 0);
  const inactiveTotal = financial.subscriptions
    .filter(s => !s.active)
    .reduce((sum, s) => sum + s.cost, 0);

  // Toggle subscription active status - using functional update to avoid stale closures
  const toggleSubscription = useCallback((id: string) => {
    setFinancial(prev => ({
      ...prev,
      subscriptions: prev.subscriptions.map(sub =>
        sub.id === id ? { ...sub, active: !sub.active } : sub
      ),
    }));
  }, [setFinancial]);

  // Delete subscription - using functional update to avoid stale closures
  const deleteSubscription = useCallback((id: string, name: string) => {
    showConfirmAlert(
      'Delete Subscription',
      `Are you sure you want to remove ${name}?`,
      () => {
        setFinancial(prev => ({
          ...prev,
          subscriptions: prev.subscriptions.filter(s => s.id !== id),
        }));
      }
    );
  }, [setFinancial]);

  // Add new subscription
  const addSubscription = useCallback(() => {
    if (!newName.trim() || !newCost.trim()) {
      showAlert('Missing Info', 'Please enter both name and cost.');
      return;
    }

    const cost = parseFloat(newCost);
    if (isNaN(cost) || cost <= 0) {
      showAlert('Invalid Cost', 'Please enter a valid cost.');
      return;
    }

    const newSub: Subscription = {
      id: `sub-${Date.now()}`,
      name: newName.trim(),
      cost: cost,
      active: true,
    };

    setFinancial(prev => ({
      ...prev,
      subscriptions: [...prev.subscriptions, newSub],
    }));

    setNewName('');
    setNewCost('');
    setShowAdd(false);
  }, [newName, newCost, setFinancial]);

  return (
    <ScreenKeyboardAwareScrollView>
      <Spacer height={Spacing.md} />

      {/* Summary Card */}
      <View style={[styles.summaryCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <ThemedText style={[styles.summaryLabel, { color: theme.textSecondary }]}>
              Active
            </ThemedText>
            <ThemedText style={[styles.summaryValue, { color: '#EF4444' }]}>
              £{activeTotal.toFixed(2)}/mo
            </ThemedText>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />
          <View style={styles.summaryItem}>
            <ThemedText style={[styles.summaryLabel, { color: theme.textSecondary }]}>
              Saved by Cancelling
            </ThemedText>
            <ThemedText style={[styles.summaryValue, { color: '#22C55E' }]}>
              £{inactiveTotal.toFixed(2)}/mo
            </ThemedText>
          </View>
        </View>
      </View>

      <Spacer height={Spacing.lg} />

      {/* Subscriptions List */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <ThemedText style={styles.sectionTitle}>Your Subscriptions</ThemedText>
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
              placeholder="Subscription name (e.g., Netflix)"
              placeholderTextColor={theme.textSecondary}
              value={newName}
              onChangeText={setNewName}
            />
            <View style={styles.addRow}>
              <TextInput
                style={[styles.addInput, styles.costInput, { color: theme.text, borderColor: theme.border }]}
                placeholder="Cost (e.g., 12.99)"
                placeholderTextColor={theme.textSecondary}
                value={newCost}
                onChangeText={setNewCost}
                keyboardType="decimal-pad"
              />
              <Pressable
                style={[styles.addConfirmButton, { backgroundColor: theme.primary }]}
                onPress={addSubscription}
              >
                <ThemedText style={styles.addConfirmText}>Add</ThemedText>
              </Pressable>
            </View>
          </View>
        )}

        {/* Subscription Items */}
        {financial.subscriptions.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="credit-card" size={48} color={theme.textSecondary} />
            <Spacer height={Spacing.md} />
            <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
              No subscriptions yet. Tap + to add one.
            </ThemedText>
          </View>
        ) : (
          financial.subscriptions.map((sub) => (
            <View 
              key={sub.id} 
              style={[
                styles.subscriptionRow, 
                { 
                  borderColor: theme.border,
                  opacity: sub.active ? 1 : 0.6,
                }
              ]}
            >
              <Pressable
                style={styles.subscriptionInfo}
                onPress={() => toggleSubscription(sub.id)}
              >
                <View style={[
                  styles.checkbox,
                  { 
                    borderColor: sub.active ? theme.primary : theme.border,
                    backgroundColor: sub.active ? theme.primary : 'transparent',
                  }
                ]}>
                  {sub.active && <Feather name="check" size={14} color="#FFFFFF" />}
                </View>
                <View style={styles.subscriptionDetails}>
                  <ThemedText 
                    style={[
                      styles.subscriptionName,
                      !sub.active && styles.subscriptionInactive,
                    ]}
                  >
                    {sub.name}
                  </ThemedText>
                  <ThemedText style={[styles.subscriptionCost, { color: theme.textSecondary }]}>
                    £{sub.cost.toFixed(2)}/month
                  </ThemedText>
                </View>
              </Pressable>

              <Pressable
                style={styles.deleteButton}
                onPress={() => deleteSubscription(sub.id, sub.name)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Feather name="trash-2" size={20} color={theme.error} />
              </Pressable>
            </View>
          ))
        )}
      </View>

      <Spacer height={Spacing.xl} />

      {/* Tip */}
      <View style={[styles.tipCard, { backgroundColor: theme.primary + '10', borderColor: theme.primary + '30' }]}>
        <Feather name="info" size={20} color={theme.primary} />
        <ThemedText style={[styles.tipText, { color: theme.text }]}>
          Tip: Toggle off subscriptions you are considering cancelling to see your potential savings.
        </ThemedText>
      </View>

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
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    marginHorizontal: Spacing.md,
  },
  summaryLabel: {
    ...Typography.caption,
    marginBottom: Spacing.xs,
  },
  summaryValue: {
    ...Typography.headline,
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
  costInput: {
    flex: 1,
    marginBottom: 0,
  },
  addConfirmButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
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
  subscriptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  subscriptionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  subscriptionDetails: {
    flex: 1,
  },
  subscriptionName: {
    ...Typography.body,
    fontWeight: '500',
  },
  subscriptionInactive: {
    textDecorationLine: 'line-through',
  },
  subscriptionCost: {
    ...Typography.caption,
    marginTop: 2,
  },
  deleteButton: {
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
