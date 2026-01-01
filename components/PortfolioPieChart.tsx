// =============================================================================
// PORTFOLIO PIE CHART COMPONENT
// =============================================================================
// 
// Displays a visual pie chart of the user's portfolio asset allocation.
// Shows the percentage composition of different asset classes like:
// - Stocks
// - Real Estate
// - Bonds
// - Cash/High Yield Savings
// - Other assets
//
// =============================================================================

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius, Typography } from '@/constants/theme';
import { PortfolioAsset } from '@/types';

// =============================================================================
// TYPES
// =============================================================================

interface PortfolioPieChartProps {
  assets: PortfolioAsset[];
}

// Color palette for pie chart segments
const ASSET_COLORS: Record<string, string> = {
  stocks: '#3B82F6',      // Blue
  bonds: '#22C55E',        // Green
  'real estate': '#F59E0B', // Amber
  cash: '#8B5CF6',         // Purple
  crypto: '#EC4899',       // Pink
  commodities: '#F97316',  // Orange
  other: '#6B7280',        // Gray
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getAssetColor(assetType: string): string {
  const lowerType = assetType.toLowerCase();
  for (const [key, color] of Object.entries(ASSET_COLORS)) {
    if (lowerType.includes(key)) {
      return color;
    }
  }
  return ASSET_COLORS.other;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function PortfolioPieChart({ assets }: PortfolioPieChartProps) {
  const { theme } = useTheme();

  // Calculate total and percentages
  const { total, segments } = useMemo(() => {
    const totalValue = assets.reduce((sum, asset) => sum + asset.currentValue, 0);
    
    // Group by asset type and calculate percentages
    const grouped = assets.reduce<Record<string, number>>((acc, asset) => {
      const type = asset.type || 'Other';
      acc[type] = (acc[type] || 0) + asset.currentValue;
      return acc;
    }, {});

    const segs = Object.entries(grouped)
      .map(([type, value]) => ({
        type,
        value,
        percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
        color: getAssetColor(type),
      }))
      .sort((a, b) => b.percentage - a.percentage);

    return { total: totalValue, segments: segs };
  }, [assets]);

  // If no assets, show empty state
  if (assets.length === 0 || total === 0) {
    return (
      <View style={styles.emptyContainer}>
        <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
          No portfolio assets yet
        </ThemedText>
        <ThemedText style={[styles.emptyHint, { color: theme.textSecondary }]}>
          Tap the edit button to add your investments
        </ThemedText>
      </View>
    );
  }

  // Calculate pie chart segments as cumulative degrees
  let cumulativePercentage = 0;

  return (
    <View style={styles.container}>
      {/* Pie Chart Visual */}
      <View style={styles.chartRow}>
        {/* Simple CSS-based pie chart using conic gradient simulation */}
        <View style={[styles.pieContainer, { backgroundColor: theme.backgroundSecondary }]}>
          <View style={styles.pieChart}>
            {segments.map((segment, index) => {
              const startAngle = (cumulativePercentage / 100) * 360;
              const endAngle = ((cumulativePercentage + segment.percentage) / 100) * 360;
              cumulativePercentage += segment.percentage;

              // For React Native, we'll use a simplified bar chart instead
              return null;
            })}
            {/* Center circle for donut effect */}
            <View style={[styles.pieCenter, { backgroundColor: theme.card }]}>
              <ThemedText style={styles.totalLabel}>Total</ThemedText>
              <ThemedText style={styles.totalValue}>
                £{total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </ThemedText>
            </View>
          </View>
          
          {/* Simplified bar segments around the pie */}
          {segments.map((segment, index) => {
            const rotation = index * (360 / Math.max(segments.length, 1));
            const width = Math.max(segment.percentage * 3, 8);
            return (
              <View
                key={segment.type}
                style={[
                  styles.pieSegmentBar,
                  {
                    backgroundColor: segment.color,
                    width: width,
                    transform: [
                      { rotate: `${rotation}deg` },
                      { translateX: 40 },
                    ],
                  },
                ]}
              />
            );
          })}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          {segments.map((segment) => (
            <View key={segment.type} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: segment.color }]} />
              <View style={styles.legendText}>
                <ThemedText style={styles.legendLabel} numberOfLines={1}>
                  {segment.type}
                </ThemedText>
                <ThemedText style={[styles.legendValue, { color: theme.textSecondary }]}>
                  {segment.percentage.toFixed(1)}%
                </ThemedText>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Horizontal Bar Chart - clearer visualization */}
      <View style={styles.barChartContainer}>
        {segments.map((segment) => (
          <View key={segment.type} style={styles.barRow}>
            <View style={styles.barLabelContainer}>
              <View style={[styles.barDot, { backgroundColor: segment.color }]} />
              <ThemedText style={styles.barLabel} numberOfLines={1}>
                {segment.type}
              </ThemedText>
            </View>
            <View style={[styles.barTrack, { backgroundColor: theme.backgroundSecondary }]}>
              <View 
                style={[
                  styles.barFill, 
                  { 
                    width: `${segment.percentage}%`,
                    backgroundColor: segment.color,
                  }
                ]} 
              />
            </View>
            <ThemedText style={[styles.barPercent, { color: theme.textSecondary }]}>
              {segment.percentage.toFixed(0)}%
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: Spacing.lg,
  },
  emptyText: {
    ...Typography.body,
    textAlign: 'center',
  },
  emptyHint: {
    ...Typography.caption,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  pieContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  pieChart: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pieCenter: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
  },
  pieSegmentBar: {
    position: 'absolute',
    height: 8,
    borderRadius: 4,
  },
  totalLabel: {
    ...Typography.caption,
    fontSize: 10,
  },
  totalValue: {
    ...Typography.headline,
    fontSize: 12,
  },
  legend: {
    flex: 1,
    marginLeft: Spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.sm,
  },
  legendText: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  legendLabel: {
    ...Typography.caption,
    flex: 1,
  },
  legendValue: {
    ...Typography.caption,
    marginLeft: Spacing.sm,
  },
  barChartContainer: {
    width: '100%',
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.xs,
  },
  barLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 90,
  },
  barDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.sm,
  },
  barLabel: {
    ...Typography.caption,
    flex: 1,
  },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    marginHorizontal: Spacing.sm,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  barPercent: {
    ...Typography.caption,
    width: 35,
    textAlign: 'right',
  },
});

export default PortfolioPieChart;
