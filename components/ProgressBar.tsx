import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { BorderRadius } from '@/constants/theme';

interface ProgressBarProps {
  progress: number;
  height?: number;
  color?: string;
}

export function ProgressBar({ progress, height = 6, color }: ProgressBarProps) {
  const { theme } = useTheme();
  
  const clampedProgress = Math.min(Math.max(progress, 0), 1);
  const fillColor = color || theme.primary;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.surface,
          height,
          borderRadius: height / 2,
        },
      ]}
    >
      <View
        style={[
          styles.fill,
          {
            width: `${clampedProgress * 100}%`,
            backgroundColor: fillColor,
            borderRadius: height / 2,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});
