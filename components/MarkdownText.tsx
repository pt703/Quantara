import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, Typography } from '@/constants/theme';

interface MarkdownTextProps {
  content: string;
  style?: any;
}

export function MarkdownText({ content, style }: MarkdownTextProps) {
  const { theme } = useTheme();
  
  const renderLine = (line: string, lineIndex: number) => {
    if (line.startsWith('# ')) {
      return (
        <ThemedText key={lineIndex} style={[styles.h1, style]}>
          {line.slice(2)}
        </ThemedText>
      );
    }
    
    if (line.startsWith('## ')) {
      return (
        <ThemedText key={lineIndex} style={[styles.h2, style]}>
          {line.slice(3)}
        </ThemedText>
      );
    }
    
    if (line.startsWith('### ')) {
      return (
        <ThemedText key={lineIndex} style={[styles.h3, style]}>
          {line.slice(4)}
        </ThemedText>
      );
    }
    
    if (line.startsWith('- ') || line.startsWith('* ')) {
      return (
        <View key={lineIndex} style={styles.bulletItem}>
          <View style={[styles.bulletDot, { backgroundColor: theme.primary }]} />
          <ThemedText style={[styles.bulletText, style]}>
            {renderInlineFormatting(line.slice(2))}
          </ThemedText>
        </View>
      );
    }
    
    if (line.trim() === '') {
      return <View key={lineIndex} style={styles.emptyLine} />;
    }
    
    return (
      <ThemedText key={lineIndex} style={[styles.paragraph, style]}>
        {renderInlineFormatting(line)}
      </ThemedText>
    );
  };

  const renderInlineFormatting = (text: string) => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    
    const boldPattern = /\*\*(.+?)\*\*/g;
    let match;
    
    while ((match = boldPattern.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      
      parts.push(
        <Text key={match.index} style={styles.bold}>
          {match[1]}
        </Text>
      );
      
      lastIndex = match.index + match[0].length;
    }
    
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }
    
    return parts.length > 0 ? parts : text;
  };

  const lines = content.split('\n');
  
  return (
    <View style={styles.container}>
      {lines.map((line, index) => renderLine(line, index))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  h1: {
    ...Typography.largeTitle,
    fontWeight: '700',
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  h2: {
    ...Typography.title,
    fontWeight: '600',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  h3: {
    ...Typography.headline,
    fontWeight: '600',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  paragraph: {
    ...Typography.body,
    lineHeight: 24,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: Spacing.sm,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
    marginRight: Spacing.sm,
  },
  bulletText: {
    ...Typography.body,
    flex: 1,
    lineHeight: 24,
  },
  emptyLine: {
    height: Spacing.sm,
  },
  bold: {
    fontWeight: '700',
  },
});
