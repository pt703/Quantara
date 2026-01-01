// =============================================================================
// PORTFOLIO PIE CHART COMPONENT
// =============================================================================
// 
// Displays a proper proportional pie chart of the user's portfolio allocation.
// Shows the percentage composition of different asset classes like:
// - Stocks (AAPL, GOOGL, etc.)
// - Cash (savings, money market funds)
// - Bonds
// - Crypto
// - ETFs
// - Real Estate
// 
// The pie chart is drawn as a true pizza-pie with segments proportional to
// the percentage of total portfolio value each asset type represents.
//
// =============================================================================

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle, G } from 'react-native-svg';
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

interface PieSegment {
  type: string;
  value: number;
  percentage: number;
  color: string;
  startAngle: number;
  endAngle: number;
}

// Color palette for pie chart segments - matches asset types
const ASSET_COLORS: Record<string, string> = {
  stock: '#3B82F6',      // Blue
  stocks: '#3B82F6',
  etf: '#8B5CF6',        // Purple
  crypto: '#F59E0B',     // Amber
  bond: '#10B981',       // Green
  bonds: '#10B981',
  cash: '#6B7280',       // Gray
  property: '#EC4899',   // Pink
  'real estate': '#EC4899',
  other: '#6366F1',      // Indigo
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

// Get color for asset type
function getAssetColor(assetType: string): string {
  const lowerType = assetType.toLowerCase();
  return ASSET_COLORS[lowerType] || ASSET_COLORS.other;
}

// Format asset type for display
function formatAssetType(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

// Convert polar coordinates to cartesian
function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number
): { x: number; y: number } {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

// Create SVG arc path
function createArcPath(
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  endAngle: number
): string {
  const start = polarToCartesian(centerX, centerY, radius, endAngle);
  const end = polarToCartesian(centerX, centerY, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

  return [
    'M', centerX, centerY,
    'L', start.x, start.y,
    'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
    'Z',
  ].join(' ');
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function PortfolioPieChart({ assets }: PortfolioPieChartProps) {
  const { theme } = useTheme();
  
  // Ensure assets is always an array to prevent crashes
  const safeAssets = assets || [];

  // Calculate total portfolio value and create pie segments
  const { total, segments } = useMemo(() => {
    // Calculate total value: just sum currentValue for each asset (simplified)
    const totalValue = safeAssets.reduce(
      (sum, asset) => sum + asset.currentValue, 
      0
    );
    
    // Group assets by type and sum values
    const grouped = safeAssets.reduce<Record<string, number>>((acc, asset) => {
      const type = asset.type || 'other';
      const assetValue = asset.currentValue;
      acc[type] = (acc[type] || 0) + assetValue;
      return acc;
    }, {});

    // Create segments with angles for pie chart
    let currentAngle = 0;
    const segs: PieSegment[] = Object.entries(grouped)
      .map(([type, value]) => {
        const percentage = totalValue > 0 ? (value / totalValue) * 100 : 0;
        const sweepAngle = (percentage / 100) * 360;
        const segment: PieSegment = {
          type,
          value,
          percentage,
          color: getAssetColor(type),
          startAngle: currentAngle,
          endAngle: currentAngle + sweepAngle,
        };
        currentAngle += sweepAngle;
        return segment;
      })
      .sort((a, b) => b.percentage - a.percentage);

    return { total: totalValue, segments: segs };
  }, [safeAssets]);

  // If no assets, show empty state
  if (safeAssets.length === 0 || total === 0) {
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

  // Chart dimensions
  const size = 120;
  const center = size / 2;
  const radius = 50;
  const innerRadius = 30; // For donut effect

  return (
    <View style={styles.container}>
      {/* Chart and Legend Row */}
      <View style={styles.chartRow}>
        {/* SVG Pie Chart */}
        <View style={styles.chartContainer}>
          <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <G>
              {segments.map((segment, index) => {
                // Handle case where one segment is 100%
                if (segment.percentage >= 99.9) {
                  return (
                    <Circle
                      key={segment.type}
                      cx={center}
                      cy={center}
                      r={radius}
                      fill={segment.color}
                    />
                  );
                }
                
                // Skip tiny segments
                if (segment.percentage < 0.5) return null;
                
                return (
                  <Path
                    key={segment.type}
                    d={createArcPath(
                      center,
                      center,
                      radius,
                      segment.startAngle,
                      segment.endAngle
                    )}
                    fill={segment.color}
                  />
                );
              })}
              {/* Center circle for donut effect */}
              <Circle cx={center} cy={center} r={innerRadius} fill={theme.card} />
            </G>
          </Svg>
          
          {/* Center text overlay */}
          <View style={styles.centerOverlay}>
            <ThemedText style={[styles.totalLabel, { color: theme.textSecondary }]}>
              Total
            </ThemedText>
            <ThemedText style={styles.totalValue}>
              £{total >= 1000 
                ? `${(total / 1000).toFixed(0)}k` 
                : total.toFixed(0)}
            </ThemedText>
          </View>
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          {segments.map((segment) => (
            <View key={segment.type} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: segment.color }]} />
              <ThemedText style={styles.legendLabel} numberOfLines={1}>
                {formatAssetType(segment.type)}
              </ThemedText>
              <ThemedText style={[styles.legendPercent, { color: theme.textSecondary }]}>
                {segment.percentage.toFixed(0)}%
              </ThemedText>
            </View>
          ))}
        </View>
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
  },
  chartContainer: {
    width: 120,
    height: 120,
    position: 'relative',
  },
  centerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  totalLabel: {
    ...Typography.caption,
    fontSize: 10,
  },
  totalValue: {
    ...Typography.headline,
    fontSize: 14,
    fontWeight: 'bold',
  },
  legend: {
    flex: 1,
    marginLeft: Spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 3,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: Spacing.sm,
  },
  legendLabel: {
    ...Typography.caption,
    flex: 1,
  },
  legendPercent: {
    ...Typography.caption,
    fontWeight: '600',
    marginLeft: Spacing.sm,
  },
});

export default PortfolioPieChart;
