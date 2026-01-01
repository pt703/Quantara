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
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
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
  // Animation varies by block type for visual interest
  const getAnimation = () => {
    switch (block.animationPreset) {
      case 'slide_up':
        return SlideInUp.delay(index * 150).springify();
      case 'scale_in':
        return ZoomIn.delay(index * 150).springify();
      case 'fade_in':
      default:
        return FadeInUp.delay(index * 150).springify();
    }
  };

  // Different visual styling per content type
  const getBlockStyle = () => {
    switch (block.type) {
      case 'highlight':
        return [styles.contentBlock, styles.highlightBlock, { backgroundColor: theme.primary + '10', borderColor: theme.primary }];
      case 'example':
        return [styles.contentBlock, styles.exampleBlock, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }];
      case 'tip':
        return [styles.contentBlock, styles.tipBlock, { backgroundColor: '#22C55E10', borderColor: '#22C55E' }];
      case 'warning':
        return [styles.contentBlock, styles.warningBlock, { backgroundColor: '#EF444410', borderColor: '#EF4444' }];
      case 'interactive':
        return [styles.contentBlock, styles.interactiveBlock, { backgroundColor: theme.backgroundSecondary, borderColor: theme.primary }];
      default:
        // Plain text blocks have clean styling
        return [styles.contentBlock, styles.textBlock];
    }
  };

  // Icons help distinguish block types visually
  const getBlockInfo = () => {
    switch (block.type) {
      case 'tip':
        return { icon: 'star' as const, color: '#22C55E', label: 'Pro Tip' };
      case 'warning':
        return { icon: 'alert-triangle' as const, color: '#EF4444', label: 'Important' };
      case 'example':
        return { icon: 'book-open' as const, color: theme.textSecondary, label: 'Example' };
      case 'highlight':
        return { icon: 'zap' as const, color: theme.primary, label: 'Key Point' };
      default:
        return null;
    }
  };

  const blockInfo = getBlockInfo();

  // Parse content to handle markdown-like formatting
  const renderContent = (content: string) => {
    // Split content into paragraphs
    const paragraphs = content.split('\n\n').filter(p => p.trim());
    
    return paragraphs.map((paragraph, pIndex) => {
      // Check for bullet points
      if (paragraph.trim().startsWith('- ') || paragraph.trim().startsWith('* ')) {
        const items = paragraph.split('\n').filter(line => line.trim());
        return (
          <View key={pIndex} style={styles.bulletList}>
            {items.map((item, iIndex) => (
              <View key={iIndex} style={styles.bulletItem}>
                <View style={[styles.bulletDot, { backgroundColor: theme.primary }]} />
                <ThemedText style={styles.bulletText}>
                  {item.replace(/^[-*]\s*/, '')}
                </ThemedText>
              </View>
            ))}
          </View>
        );
      }
      
      // Regular paragraph
      return (
        <ThemedText key={pIndex} style={[styles.contentText, pIndex > 0 && styles.paragraphSpacing]}>
          {paragraph}
        </ThemedText>
      );
    });
  };

  return (
    <Animated.View entering={getAnimation()} style={getBlockStyle()}>
      {blockInfo ? (
        <View style={styles.blockHeader}>
          <View style={[styles.iconWrapper, { backgroundColor: blockInfo.color + '20' }]}>
            <Feather name={blockInfo.icon} size={14} color={blockInfo.color} />
          </View>
          <ThemedText style={[styles.blockLabel, { color: blockInfo.color }]}>
            {blockInfo.label}
          </ThemedText>
        </View>
      ) : null}
      <View style={styles.contentContainer}>
        {renderContent(block.content)}
      </View>
    </Animated.View>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function ReadingModuleScreen({ navigation, route }: ReadingModuleScreenProps) {
  const { moduleId, lessonId, courseId, moduleIndex, totalModules, allModules } = route.params;
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  
  const { completeReadingModule, getModuleProgress } = useModuleProgress();
  const { gainXP } = useGamification();
  
  // Track two states:
  // - wasAlreadyCompleted: true if module was completed before user entered screen
  // - isMarkedComplete: true if user pressed Mark as Complete during this session
  const [wasAlreadyCompleted, setWasAlreadyCompleted] = useState(false);
  const [isMarkedComplete, setIsMarkedComplete] = useState(false);
  
  // Get module data from route params
  const module = route.params.module as ReadingModule | undefined;
  
  // Check if already completed from previous session
  const existingProgress = getModuleProgress(moduleId);
  
  // Determine if there's a next module
  const hasNextModule = moduleIndex < totalModules - 1;
  const nextModule = hasNextModule && allModules ? allModules[moduleIndex + 1] : null;
  
  // User can proceed if they either:
  // 1. Just marked this module complete (isMarkedComplete = true)
  // 2. Already completed it in a previous session (wasAlreadyCompleted = true)
  const canProceed = isMarkedComplete || wasAlreadyCompleted;
  
  useEffect(() => {
    if (existingProgress?.status === 'completed') {
      setWasAlreadyCompleted(true);
    }
  }, [existingProgress]);
  
  // Handle marking module as complete
  // This ONLY sets local state and persists completion - does not navigate
  const handleMarkComplete = useCallback(() => {
    if (!module) return;
    
    // Persist completion to storage
    completeReadingModule(moduleId, module.xpReward);
    gainXP(module.xpReward);
    
    // Update local state to show Next button
    setIsMarkedComplete(true);
  }, [moduleId, module, completeReadingModule, gainXP]);
  
  // Handle navigation to next module
  const handleNext = useCallback(() => {
    if (!nextModule || !allModules) {
      // No next module, go back to course detail
      navigation.goBack();
      return;
    }
    
    // Navigate to next module based on type
    if (nextModule.type === 'reading') {
      navigation.replace('ReadingModule', {
        moduleId: nextModule.id,
        lessonId: lessonId,
        courseId: courseId,
        moduleIndex: moduleIndex + 1,
        totalModules: totalModules,
        module: nextModule as ReadingModule,
        allModules: allModules,
      });
    } else if (nextModule.type === 'quiz') {
      navigation.replace('QuizModule', {
        moduleId: nextModule.id,
        lessonId: lessonId,
        courseId: courseId,
        moduleIndex: moduleIndex + 1,
        totalModules: totalModules,
        module: nextModule as any,
        allModules: allModules,
      });
    }
  }, [nextModule, allModules, navigation, lessonId, courseId, moduleIndex, totalModules]);
  
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
          { paddingBottom: tabBarHeight + 80 }
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
      {/* BOTTOM ACTION BAR */}
      {/* ================================================================== */}
      {/* Shows Mark as Complete first, then Next button after completion */}
      <View style={[
        styles.bottomBar,
        { 
          backgroundColor: theme.background,
          bottom: tabBarHeight,
          borderTopColor: theme.border,
        }
      ]}>
        {!canProceed ? (
          // Step 1: Mark as Complete button (shown when not yet completed)
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
        ) : (
          // Step 2: Show completion status + Next button (after marking complete or revisiting)
          <View style={styles.bottomActions}>
            <View style={[styles.completedBadge, { backgroundColor: '#22C55E20' }]}>
              <Feather name="check-circle" size={16} color="#22C55E" />
              <ThemedText style={styles.completedText}>
                {wasAlreadyCompleted && !isMarkedComplete ? 'Review Complete' : 'Completed'}
              </ThemedText>
            </View>
            
            <Pressable
              onPress={handleNext}
              style={({ pressed }) => [
                styles.nextButton,
                { backgroundColor: theme.primary, opacity: pressed ? 0.8 : 1 }
              ]}
            >
              <ThemedText style={styles.nextButtonText}>
                {nextModule?.type === 'quiz' ? 'Start Quiz' : hasNextModule ? 'Next' : 'Done'}
              </ThemedText>
              <Feather 
                name={nextModule?.type === 'quiz' ? 'help-circle' : 'arrow-right'} 
                size={18} 
                color="#FFFFFF" 
              />
            </Pressable>
          </View>
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
  textBlock: {
    backgroundColor: 'transparent',
    padding: 0,
    marginBottom: Spacing.md,
  },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  iconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockLabel: {
    ...Typography.footnote,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  contentContainer: {
    gap: Spacing.sm,
  },
  contentText: {
    ...Typography.body,
    lineHeight: 26,
  },
  paragraphSpacing: {
    marginTop: Spacing.sm,
  },
  bulletList: {
    marginVertical: Spacing.xs,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 9,
    marginRight: Spacing.sm,
  },
  bulletText: {
    ...Typography.body,
    flex: 1,
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
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  completedText: {
    ...Typography.footnote,
    color: '#22C55E',
    fontWeight: '600',
  },
  bottomActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  nextButtonText: {
    ...Typography.headline,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
