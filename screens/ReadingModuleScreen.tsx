// =============================================================================
// READING MODULE SCREEN
// =============================================================================
// 
// Displays a reading module with:
// - Animated content blocks (text, highlights, examples, tips)
// - "Mark as Complete" button at the bottom
// - Progress indicator showing position in lesson
// - XP reward on completion
//
// Users must tap "Mark as Complete" to advance to the next module.
// This ensures engagement with the reading material before quizzes.
//
// =============================================================================

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  Pressable,
  ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import Animated, { 
  FadeIn, 
  FadeInUp, 
  SlideInUp,
  ZoomIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import Spacer from '@/components/Spacer';
import { useTheme } from '@/hooks/useTheme';
import { useModuleProgress } from '@/hooks/useModuleProgress';
import { useGamification } from '@/hooks/useGamification';
import { Spacing, BorderRadius, Typography } from '@/constants/theme';
import { ReadingModule, ContentBlock } from '../types';
import { LearnStackParamList } from '../navigation/LearnStackNavigator';

// =============================================================================
// TYPES
// =============================================================================

type ReadingModuleScreenProps = {
  navigation: NativeStackNavigationProp<LearnStackParamList, 'ReadingModule'>;
  route: RouteProp<LearnStackParamList, 'ReadingModule'>;
};

// =============================================================================
// CONTENT BLOCK COMPONENT
// =============================================================================
// Renders individual content blocks with appropriate styling and animations

interface ContentBlockRendererProps {
  block: ContentBlock;
  index: number;
  theme: any;
}

function ContentBlockRenderer({ block, index, theme }: ContentBlockRendererProps) {
  const getAnimation = () => {
    switch (block.animationPreset) {
      case 'slide_up':
        return SlideInUp.delay(index * 200).springify();
      case 'scale_in':
        return ZoomIn.delay(index * 200).springify();
      case 'fade_in':
      default:
        return FadeInUp.delay(index * 200).springify();
    }
  };

  const getBlockStyle = () => {
    switch (block.type) {
      case 'highlight':
        return [styles.contentBlock, styles.highlightBlock, { backgroundColor: theme.primary + '15', borderColor: theme.primary }];
      case 'example':
        return [styles.contentBlock, styles.exampleBlock, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }];
      case 'tip':
        return [styles.contentBlock, styles.tipBlock, { backgroundColor: '#22C55E15', borderColor: '#22C55E' }];
      case 'warning':
        return [styles.contentBlock, styles.warningBlock, { backgroundColor: '#EF444415', borderColor: '#EF4444' }];
      case 'interactive':
        return [styles.contentBlock, styles.interactiveBlock, { backgroundColor: theme.backgroundSecondary, borderColor: theme.primary }];
      default:
        return [styles.contentBlock, { backgroundColor: 'transparent' }];
    }
  };

  const getIcon = () => {
    switch (block.type) {
      case 'tip':
        return <Feather name="star" size={16} color="#22C55E" />;
      case 'warning':
        return <Feather name="alert-triangle" size={16} color="#EF4444" />;
      case 'example':
        return <Feather name="book-open" size={16} color={theme.textSecondary} />;
      case 'highlight':
        return <Feather name="zap" size={16} color={theme.primary} />;
      default:
        return null;
    }
  };

  return (
    <Animated.View entering={getAnimation()} style={getBlockStyle()}>
      {getIcon() && (
        <View style={styles.blockHeader}>
          {getIcon()}
          <ThemedText style={[styles.blockLabel, { color: theme.textSecondary }]}>
            {block.type.charAt(0).toUpperCase() + block.type.slice(1)}
          </ThemedText>
        </View>
      )}
      <ThemedText style={styles.contentText}>
        {block.content}
      </ThemedText>
    </Animated.View>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function ReadingModuleScreen({ navigation, route }: ReadingModuleScreenProps) {
  const { moduleId, lessonId, courseId, moduleIndex, totalModules } = route.params;
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  
  const { completeReadingModule, getModuleProgress } = useModuleProgress();
  const { gainXP } = useGamification();
  
  const [isCompleted, setIsCompleted] = useState(false);
  
  // Get module data from route params or mock data
  const module = route.params.module as ReadingModule | undefined;
  
  // Check if already completed
  const existingProgress = getModuleProgress(moduleId);
  
  useEffect(() => {
    if (existingProgress?.status === 'completed') {
      setIsCompleted(true);
    }
  }, [existingProgress]);
  
  // Handle marking module as complete
  const handleMarkComplete = useCallback(() => {
    if (!module) return;
    
    completeReadingModule(moduleId, module.xpReward);
    gainXP(module.xpReward);
    setIsCompleted(true);
    
    // Navigate back to lesson detail after short delay
    setTimeout(() => {
      navigation.goBack();
    }, 500);
  }, [moduleId, module, completeReadingModule, gainXP, navigation]);
  
  // Handle back navigation
  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  if (!module) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <ThemedText>Module not found</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      {/* ================================================================== */}
      {/* HEADER */}
      {/* ================================================================== */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        
        <View style={styles.headerInfo}>
          <ThemedText style={styles.modulePosition}>
            Module {moduleIndex + 1} of {totalModules}
          </ThemedText>
          <ThemedText style={[styles.moduleType, { color: theme.textSecondary }]}>
            Reading
          </ThemedText>
        </View>
        
        <View style={[styles.xpBadge, { backgroundColor: theme.primary + '20' }]}>
          <Feather name="zap" size={14} color={theme.primary} />
          <ThemedText style={[styles.xpText, { color: theme.primary }]}>
            {module.xpReward} XP
          </ThemedText>
        </View>
      </View>
      
      {/* ================================================================== */}
      {/* CONTENT */}
      {/* ================================================================== */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.Text 
          entering={FadeIn.duration(400)}
          style={[styles.moduleTitle, { color: theme.text }]}
        >
          {module.title}
        </Animated.Text>
        
        <Spacer height={Spacing.md} />
        
        <View style={styles.metaRow}>
          <Feather name="clock" size={14} color={theme.textSecondary} />
          <ThemedText style={[styles.metaText, { color: theme.textSecondary }]}>
            {module.estimatedMinutes} min read
          </ThemedText>
        </View>
        
        <Spacer height={Spacing.xl} />
        
        {/* Render content blocks with animations */}
        {module.contentBlocks.map((block, index) => (
          <ContentBlockRenderer 
            key={index}
            block={block}
            index={index}
            theme={theme}
          />
        ))}
      </ScrollView>
      
      {/* ================================================================== */}
      {/* MARK COMPLETE BUTTON */}
      {/* ================================================================== */}
      <View style={[
        styles.bottomBar,
        { 
          backgroundColor: theme.background,
          paddingBottom: insets.bottom + Spacing.md,
          borderTopColor: theme.border,
        }
      ]}>
        {isCompleted ? (
          <View style={[styles.completedBadge, { backgroundColor: '#22C55E20' }]}>
            <Feather name="check-circle" size={20} color="#22C55E" />
            <ThemedText style={styles.completedText}>Completed</ThemedText>
          </View>
        ) : (
          <Pressable
            onPress={handleMarkComplete}
            style={({ pressed }) => [
              styles.completeButton,
              { backgroundColor: theme.primary, opacity: pressed ? 0.8 : 1 }
            ]}
          >
            <Feather name="check" size={20} color="#FFFFFF" />
            <ThemedText style={styles.completeButtonText}>
              Mark as Complete
            </ThemedText>
          </Pressable>
        )}
      </View>
    </ThemedView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  modulePosition: {
    ...Typography.footnote,
    fontWeight: '600',
  },
  moduleType: {
    ...Typography.caption,
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  xpText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  moduleTitle: {
    ...Typography.title,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  metaText: {
    ...Typography.caption,
  },
  contentBlock: {
    marginBottom: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  highlightBlock: {
    borderLeftWidth: 3,
  },
  exampleBlock: {
    borderWidth: 1,
  },
  tipBlock: {
    borderLeftWidth: 3,
  },
  warningBlock: {
    borderLeftWidth: 3,
  },
  interactiveBlock: {
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  blockLabel: {
    ...Typography.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  contentText: {
    ...Typography.body,
    lineHeight: 24,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  completeButtonText: {
    ...Typography.headline,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  completedText: {
    ...Typography.headline,
    color: '#22C55E',
    fontWeight: '600',
  },
});
