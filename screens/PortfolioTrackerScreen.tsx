// =============================================================================
// PORTFOLIO TRACKER SCREEN
// =============================================================================
// 
// Allows users to track their investment portfolio:
// - Stock holdings
// - Crypto assets
// - ETFs and bonds
// - Cash and other assets
// 
// Calculates total portfolio value and shows allocation.
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
import { PortfolioAsset } from '@/types';
import { ProfileStackParamList } from '@/navigation/ProfileStackNavigator';

// =============================================================================
// TYPES
// =============================================================================

type PortfolioTrackerScreenProps = {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'PortfolioTracker'>;
};

type AssetType = PortfolioAsset['type'];

const ASSET_TYPES: { type: AssetType; label: string; icon: string }[] = [
  { type: 'stock', label: 'Stock', icon: 'trending-up' },
  { type: 'etf', label: 'ETF', icon: 'layers' },
  { type: 'crypto', label: 'Crypto', icon: 'zap' },
  { type: 'bond', label: 'Bond', icon: 'shield' },
  { type: 'cash', label: 'Cash', icon: 'dollar-sign' },
  { type: 'property', label: 'Property', icon: 'home' },
  { type: 'other', label: 'Other', icon: 'box' },
];

// Asset type colors
const TYPE_COLORS: Record<AssetType, string> = {
  stock: '#3B82F6',
  etf: '#8B5CF6',
  crypto: '#F59E0B',
  bond: '#10B981',
  cash: '#6B7280',
  property: '#EC4899',
  other: '#6366F1',
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function PortfolioTrackerScreen({ navigation }: PortfolioTrackerScreenProps) {
  const { theme } = useTheme();
  const { financial, setFinancial } = useUserData();

  // State for adding new asset (simplified - just name, type, total value)
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<AssetType>('stock');
  const [newValue, setNewValue] = useState('');

  const portfolioAssets = financial.portfolioAssets || [];

  // Calculate total portfolio value (simplified: just sum all currentValue)
  const totalValue = portfolioAssets.reduce(
    (sum, a) => sum + a.currentValue, 
    0
  );

  // Delete asset - using functional update to avoid stale closures
  const deleteAsset = useCallback((id: string, name: string) => {
    Alert.alert(
      'Delete Asset',
      `Are you sure you want to remove ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            setFinancial(prev => ({
              ...prev,
              portfolioAssets: (prev.portfolioAssets || []).filter(a => a.id !== id),
            }));
          },
        },
      ]
    );
  }, [setFinancial]);

  // Add new asset (simplified: just total value, no quantity)
  const addAsset = useCallback(() => {
    if (!newName.trim() || !newValue.trim()) {
      Alert.alert('Missing Info', 'Please enter name and total value.');
      return;
    }

    const value = parseFloat(newValue);

    if (isNaN(value) || value <= 0) {
      Alert.alert('Invalid Value', 'Please enter a valid value.');
      return;
    }

    // Simplified model: quantity=1, currentValue = total value
    const newAsset: PortfolioAsset = {
      id: `asset-${Date.now()}`,
      name: newName.trim(),
      type: newType,
      quantity: 1,
      purchasePrice: value,
      currentValue: value,
    };

    setFinancial(prev => ({
      ...prev,
      portfolioAssets: [...(prev.portfolioAssets || []), newAsset],
    }));

    setNewName('');
    setNewValue('');
    setShowAdd(false);
  }, [newName, newType, newValue, setFinancial]);

  // Group assets by type
  const assetsByType = portfolioAssets.reduce((acc, asset) => {
    if (!acc[asset.type]) {
      acc[asset.type] = [];
    }
    acc[asset.type].push(asset);
    return acc;
  }, {} as Record<AssetType, PortfolioAsset[]>);

  return (
    <ScreenKeyboardAwareScrollView>
      <Spacer height={Spacing.md} />

      {/* Summary Card */}
      <View style={[styles.summaryCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.summaryMain}>
          <ThemedText style={[styles.summaryLabel, { color: theme.textSecondary }]}>
            Portfolio Value
          </ThemedText>
          <ThemedText style={styles.summaryValue}>
            £{totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </ThemedText>
        </View>
      </View>

      <Spacer height={Spacing.lg} />

      {/* Assets List */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <ThemedText style={styles.sectionTitle}>Your Assets</ThemedText>
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
              placeholder="Asset name (e.g., Apple, Bitcoin)"
              placeholderTextColor={theme.textSecondary}
              value={newName}
              onChangeText={setNewName}
            />
            
            {/* Asset Type Selector */}
            <View style={styles.typeSelector}>
              {ASSET_TYPES.map(({ type, label }) => (
                <Pressable
                  key={type}
                  style={[
                    styles.typeButton,
                    { 
                      backgroundColor: newType === type ? TYPE_COLORS[type] : theme.background,
                      borderColor: TYPE_COLORS[type],
                    }
                  ]}
                  onPress={() => setNewType(type)}
                >
                  <ThemedText style={[
                    styles.typeButtonText,
                    { color: newType === type ? '#FFFFFF' : TYPE_COLORS[type] }
                  ]}>
                    {label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            <TextInput
              style={[styles.addInput, { color: theme.text, borderColor: theme.border }]}
              placeholder="Total value (e.g., 1000)"
              placeholderTextColor={theme.textSecondary}
              value={newValue}
              onChangeText={setNewValue}
              keyboardType="decimal-pad"
            />
            <Pressable
              style={[styles.addConfirmButton, { backgroundColor: theme.primary }]}
              onPress={addAsset}
            >
              <ThemedText style={styles.addConfirmText}>Add Asset</ThemedText>
            </Pressable>
          </View>
        )}

        {/* Asset Items */}
        {portfolioAssets.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="pie-chart" size={48} color={theme.textSecondary} />
            <Spacer height={Spacing.md} />
            <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
              No assets tracked yet. Tap + to add your first investment.
            </ThemedText>
          </View>
        ) : (
          Object.entries(assetsByType).map(([type, assets]) => (
            <View key={type} style={styles.assetGroup}>
              <View style={styles.assetGroupHeader}>
                <View style={[styles.typeBadge, { backgroundColor: TYPE_COLORS[type as AssetType] }]}>
                  <ThemedText style={styles.typeBadgeText}>
                    {ASSET_TYPES.find(t => t.type === type)?.label || type}
                  </ThemedText>
                </View>
              </View>
              
              {assets.map((asset) => (
                <View 
                  key={asset.id} 
                  style={[styles.assetRow, { borderColor: theme.border }]}
                >
                  <View style={styles.assetInfo}>
                    <ThemedText style={styles.assetName}>{asset.name}</ThemedText>
                    <ThemedText style={[styles.assetType, { color: theme.textSecondary }]}>
                      {ASSET_TYPES.find(t => t.type === asset.type)?.label || asset.type}
                    </ThemedText>
                  </View>
                  
                  <View style={styles.assetValueContainer}>
                    <ThemedText style={styles.assetValue}>
                      £{asset.currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </ThemedText>
                    <Pressable
                      style={styles.deleteButton}
                      onPress={() => deleteAsset(asset.id, asset.name)}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                      <Feather name="trash-2" size={20} color={theme.error} />
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          ))
        )}
      </View>

      <Spacer height={Spacing.xl} />

      {/* Allocation Chart (simplified) */}
      {portfolioAssets.length > 0 && (
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <ThemedText style={styles.sectionTitle}>Allocation</ThemedText>
          <Spacer height={Spacing.md} />
          
          {Object.entries(assetsByType).map(([type, assets]) => {
            const typeValue = assets.reduce((sum, a) => sum + a.currentValue, 0);
            const percentage = (typeValue / totalValue) * 100;
            
            return (
              <View key={type} style={styles.allocationRow}>
                <View style={styles.allocationInfo}>
                  <View style={[styles.allocationDot, { backgroundColor: TYPE_COLORS[type as AssetType] }]} />
                  <ThemedText style={styles.allocationLabel}>
                    {ASSET_TYPES.find(t => t.type === type)?.label || type}
                  </ThemedText>
                </View>
                <View style={styles.allocationValue}>
                  <ThemedText style={[styles.allocationPercent, { color: theme.textSecondary }]}>
                    {percentage.toFixed(1)}%
                  </ThemedText>
                  <ThemedText style={styles.allocationAmount}>
                    £{typeValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </ThemedText>
                </View>
              </View>
            );
          })}
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
  },
  summaryLabel: {
    ...Typography.caption,
    marginBottom: Spacing.xs,
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  gainBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  gainText: {
    ...Typography.caption,
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
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  typeButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  typeButtonText: {
    ...Typography.caption,
    fontWeight: '600',
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
  assetGroup: {
    marginBottom: Spacing.md,
  },
  assetGroupHeader: {
    marginBottom: Spacing.sm,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  typeBadgeText: {
    ...Typography.caption,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  assetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  assetInfo: {
    flex: 1,
  },
  assetName: {
    ...Typography.body,
    fontWeight: '500',
  },
  assetType: {
    ...Typography.caption,
    marginTop: 2,
  },
  assetValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  assetValue: {
    ...Typography.body,
    fontWeight: '600',
  },
  deleteButton: {
    padding: Spacing.xs,
  },
  allocationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  allocationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  allocationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  allocationLabel: {
    ...Typography.body,
  },
  allocationValue: {
    alignItems: 'flex-end',
  },
  allocationPercent: {
    ...Typography.caption,
  },
  allocationAmount: {
    ...Typography.body,
    fontWeight: '500',
  },
});
