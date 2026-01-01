// =============================================================================
// TEST YOUR SKILL SCREEN
// =============================================================================
// 
// A standalone skill assessment that tests users on concepts across domains.
// Key features:
// - Questions drawn from concept tags database
// - Wrong answers are recorded in the WrongAnswerRegistry
// - Wrong answers feed back into lesson quizzes for remediation
// - Shows skill breakdown at the end
//
// This is separate from course progression - it's for self-testing
// and identifying weak areas.
//
// =============================================================================

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, StyleSheet, Pressable, Modal } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ProgressBar } from '@/components/ProgressBar';
import Spacer from '@/components/Spacer';
import { QuestionRenderer, QuestionResult } from '@/components/QuestionTypes';
import { useTheme } from '@/hooks/useTheme';
import { useGamification } from '@/hooks/useGamification';
import { useWrongAnswerRegistry } from '@/hooks/useWrongAnswerRegistry';
import { Spacing, BorderRadius, Typography } from '@/constants/theme';
import { Question, SkillDomain } from '../types';
import { courses } from '../mock/courses';
import { getConceptForQuestion } from '../mock/conceptTags';
import { LearnStackParamList } from '../navigation/LearnStackNavigator';

// =============================================================================
// TYPES
// =============================================================================

type TestYourSkillScreenProps = {
  navigation: NativeStackNavigationProp<LearnStackParamList, 'TestYourSkill'>;
};

interface DomainResult {
  domain: SkillDomain;
  correct: number;
  total: number;
  percentage: number;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

// Structure to hold question with its source lesson info
interface QuestionWithSource {
  question: Question;
  lessonId: string;
  courseId: string;
}

// Get random questions with their source lesson information
// This is critical for the remediation system - we need to know which lesson
// a question came from so we can inject remediation into that lesson's quiz
function getRandomQuestionsWithSource(count: number = 10): QuestionWithSource[] {
  const allQuestions: QuestionWithSource[] = [];
  
  courses.forEach(course => {
    course.lessons.forEach(lesson => {
      if (lesson.questions && lesson.questions.length > 0) {
        lesson.questions.forEach(q => {
          allQuestions.push({
            question: q,
            lessonId: lesson.id,
            courseId: course.id,
          });
        });
      }
    });
  });
  
  const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function TestYourSkillScreen({ navigation }: TestYourSkillScreenProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  
  const { gainXP, loseHeart, hearts } = useGamification();
  const { registerWrongAnswer } = useWrongAnswerRegistry();
  
  // Store questions WITH their source lesson info for proper remediation tracking
  const [questionsWithSource] = useState<QuestionWithSource[]>(() => getRandomQuestionsWithSource(10));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [showExplanation, setShowExplanation] = useState(false);
  const [currentExplanation, setCurrentExplanation] = useState('');
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  
  const progress = questionsWithSource.length > 0 ? (currentIndex + 1) / questionsWithSource.length : 0;
  const currentQuestionData = questionsWithSource[currentIndex];
  const currentQuestion = currentQuestionData?.question;
  
  const scale = useSharedValue(1);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  
  const handleAnswer = useCallback((result: QuestionResult) => {
    if (!currentQuestionData) return;
    
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: result.isCorrect }));
    setLastAnswerCorrect(result.isCorrect);
    setCurrentExplanation(currentQuestion.explanation || '');
    
    if (result.isCorrect) {
      const xp = currentQuestion.xpReward || 10;
      setXpEarned(prev => prev + xp);
      gainXP(xp);
      
      scale.value = withSequence(
        withSpring(1.05, { damping: 10 }),
        withSpring(1, { damping: 10 })
      );
    } else {
      loseHeart();
      
      // Register wrong answer with the ORIGINAL lesson ID
      // This is critical for remediation - the wrong answer will show up
      // when the user next plays this lesson's quiz
      const concept = getConceptForQuestion(currentQuestion.id);
      if (concept) {
        registerWrongAnswer(
          currentQuestion.id,
          concept.id,
          currentQuestion.type,
          currentQuestionData.lessonId, // Use actual lesson ID, not 'assessment'
          undefined
        );
      }
      
      scale.value = withSequence(
        withTiming(0.95, { duration: 100 }),
        withSpring(1, { damping: 10 })
      );
    }
    
    setShowExplanation(true);
  }, [currentQuestion, currentQuestionData, gainXP, loseHeart, registerWrongAnswer]);
  
  const handleContinue = useCallback(() => {
    setShowExplanation(false);
    
    if (currentIndex < questionsWithSource.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setShowResults(true);
    }
  }, [currentIndex, questionsWithSource.length]);
  
  const domainResults = useMemo((): DomainResult[] => {
    const domains: Record<SkillDomain, { correct: number; total: number }> = {
      budgeting: { correct: 0, total: 0 },
      saving: { correct: 0, total: 0 },
      debt: { correct: 0, total: 0 },
      investing: { correct: 0, total: 0 },
      credit: { correct: 0, total: 0 },
    };
    
    questionsWithSource.forEach(({ question }) => {
      const concept = getConceptForQuestion(question.id);
      if (concept && domains[concept.domain]) {
        domains[concept.domain].total++;
        if (answers[question.id]) {
          domains[concept.domain].correct++;
        }
      }
    });
    
    return Object.entries(domains)
      .filter(([_, data]) => data.total > 0)
      .map(([domain, data]) => ({
        domain: domain as SkillDomain,
        correct: data.correct,
        total: data.total,
        percentage: data.total > 0 ? (data.correct / data.total) * 100 : 0,
      }));
  }, [questionsWithSource, answers]);
  
  const overallScore = useMemo(() => {
    const correct = Object.values(answers).filter(Boolean).length;
    return questionsWithSource.length > 0 ? (correct / questionsWithSource.length) * 100 : 0;
  }, [answers, questionsWithSource.length]);
  
  const domainColors: Record<SkillDomain, string> = {
    budgeting: '#10B981',
    saving: '#3B82F6',
    debt: '#EF4444',
    investing: '#8B5CF6',
    credit: '#F59E0B',
  };
  
  if (showResults) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top + Spacing.lg }]}>
        <View style={styles.resultsHeader}>
          <ThemedText style={styles.resultsTitle}>Assessment Complete</ThemedText>
          <ThemedText style={[styles.resultsSubtitle, { color: theme.textSecondary }]}>
            Here's how you did
          </ThemedText>
        </View>
        
        <Spacer height={Spacing.xl} />
        
        <View style={[styles.overallScoreCard, { backgroundColor: theme.card }]}>
          <ThemedText style={[styles.overallScoreValue, { color: theme.primary }]}>
            {Math.round(overallScore)}%
          </ThemedText>
          <ThemedText style={styles.overallScoreLabel}>Overall Score</ThemedText>
          <Spacer height={Spacing.sm} />
          <View style={styles.xpBadge}>
            <Feather name="zap" size={16} color="#F59E0B" />
            <ThemedText style={styles.xpText}>+{xpEarned} XP earned</ThemedText>
          </View>
        </View>
        
        <Spacer height={Spacing.xl} />
        
        <ThemedText style={styles.sectionTitle}>By Skill</ThemedText>
        <Spacer height={Spacing.md} />
        
        {domainResults.map(result => (
          <View key={result.domain} style={styles.domainResultRow}>
            <View style={styles.domainInfo}>
              <ThemedText style={styles.domainName}>
                {result.domain.charAt(0).toUpperCase() + result.domain.slice(1)}
              </ThemedText>
              <ThemedText style={[styles.domainScore, { color: theme.textSecondary }]}>
                {result.correct}/{result.total}
              </ThemedText>
            </View>
            <View style={styles.domainProgressContainer}>
              <ProgressBar
                progress={result.percentage / 100}
                color={domainColors[result.domain]}
                height={8}
              />
            </View>
          </View>
        ))}
        
        <Spacer height={Spacing['2xl']} />
        
        {Object.values(answers).some(v => !v) && (
          <View style={[styles.remediationNote, { backgroundColor: theme.primary + '15' }]}>
            <Feather name="info" size={20} color={theme.primary} />
            <ThemedText style={[styles.remediationText, { color: theme.text }]}>
              Missed concepts will appear in your next lesson quizzes for extra practice.
            </ThemedText>
          </View>
        )}
        
        <Spacer height={Spacing.xl} />
        
        <Pressable
          style={[styles.finishButton, { backgroundColor: theme.primary }]}
          onPress={() => navigation.goBack()}
        >
          <ThemedText style={styles.finishButtonText}>Back to Learning</ThemedText>
        </Pressable>
        
        <Spacer height={insets.bottom + Spacing.xl} />
      </ThemedView>
    );
  }
  
  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.closeButton}>
          <Feather name="x" size={24} color={theme.text} />
        </Pressable>
        
        <View style={styles.heartsContainer}>
          <Feather name="heart" size={20} color="#EF4444" />
          <ThemedText style={[styles.heartsText, { color: '#EF4444' }]}>
            {hearts}
          </ThemedText>
        </View>
        
        <View style={styles.progressContainer}>
          <ThemedText style={[styles.progressText, { color: theme.textSecondary }]}>
            {currentIndex + 1}/{questionsWithSource.length}
          </ThemedText>
          <ProgressBar progress={progress} color={theme.primary} height={6} />
        </View>
      </View>
      
      <Spacer height={Spacing.xl} />
      
      {currentQuestion && (
        <Animated.View style={[styles.questionContainer, animatedStyle]}>
          <QuestionRenderer
            question={currentQuestion}
            onAnswer={handleAnswer}
            disabled={showExplanation}
          />
        </Animated.View>
      )}
      
      <Modal visible={showExplanation} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[
            styles.explanationModal, 
            { 
              backgroundColor: theme.card,
              paddingBottom: insets.bottom + Spacing.lg,
            }
          ]}>
            <View style={[
              styles.resultBadge,
              { backgroundColor: lastAnswerCorrect ? '#10B981' : '#EF4444' }
            ]}>
              <Feather 
                name={lastAnswerCorrect ? 'check' : 'x'} 
                size={24} 
                color="#FFFFFF" 
              />
            </View>
            
            <ThemedText style={styles.resultTitle}>
              {lastAnswerCorrect ? 'Correct!' : 'Not quite'}
            </ThemedText>
            
            <ThemedText style={[styles.explanationText, { color: theme.textSecondary }]}>
              {currentExplanation}
            </ThemedText>
            
            <Spacer height={Spacing.lg} />
            
            <Pressable
              style={[styles.continueButton, { backgroundColor: theme.primary }]}
              onPress={handleContinue}
            >
              <ThemedText style={styles.continueButtonText}>
                {currentIndex < questionsWithSource.length - 1 ? 'Continue' : 'See Results'}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeButton: {
    padding: Spacing.xs,
  },
  heartsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: Spacing.md,
  },
  heartsText: {
    ...Typography.headline,
    marginLeft: Spacing.xs,
  },
  progressContainer: {
    flex: 1,
    marginLeft: Spacing.lg,
  },
  progressText: {
    ...Typography.caption,
    marginBottom: Spacing.xs,
    textAlign: 'right',
  },
  questionContainer: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  explanationModal: {
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    padding: Spacing.xl,
    alignItems: 'center',
  },
  resultBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  resultTitle: {
    ...Typography.title,
    marginBottom: Spacing.md,
  },
  explanationText: {
    ...Typography.body,
    textAlign: 'center',
  },
  continueButton: {
    width: '100%',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  continueButtonText: {
    ...Typography.headline,
    color: '#FFFFFF',
  },
  resultsHeader: {
    alignItems: 'center',
  },
  resultsTitle: {
    ...Typography.title,
  },
  resultsSubtitle: {
    ...Typography.body,
    marginTop: Spacing.xs,
  },
  overallScoreCard: {
    alignItems: 'center',
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
  },
  overallScoreValue: {
    fontSize: 48,
    fontWeight: '700',
  },
  overallScoreLabel: {
    ...Typography.headline,
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  xpText: {
    ...Typography.subhead,
    marginLeft: Spacing.xs,
    color: '#F59E0B',
  },
  sectionTitle: {
    ...Typography.headline,
  },
  domainResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  domainInfo: {
    width: 100,
  },
  domainName: {
    ...Typography.subhead,
    fontWeight: '600',
  },
  domainScore: {
    ...Typography.caption,
  },
  domainProgressContainer: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  remediationNote: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  remediationText: {
    ...Typography.subhead,
    flex: 1,
  },
  finishButton: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  finishButtonText: {
    ...Typography.headline,
    color: '#FFFFFF',
  },
});
