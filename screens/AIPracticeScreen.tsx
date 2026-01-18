import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Pressable, ActivityIndicator, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, useSharedValue, useAnimatedStyle, withSpring, withSequence, withTiming } from 'react-native-reanimated';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import Spacer from '@/components/Spacer';
import { useTheme } from '@/hooks/useTheme';
import { useAI } from '@/hooks/useAI';
import { useUserData } from '@/hooks/useUserData';
import { useGamification } from '@/hooks/useGamification';
import { Spacing, Typography, BorderRadius } from '@/constants/theme';
import { Question, MCQQuestion, TrueFalseQuestion, CalculationQuestion, SkillDomain, DifficultyLevel } from '@/types';
type AIPracticeScreenProps = {
  navigation: any;
};

const TOPICS = [
  { id: 'budgeting', label: 'Budgeting', domain: 'budgeting' as SkillDomain, icon: 'pie-chart' },
  { id: 'saving', label: 'Saving', domain: 'saving' as SkillDomain, icon: 'target' },
  { id: 'debt', label: 'Debt Management', domain: 'debt' as SkillDomain, icon: 'credit-card' },
  { id: 'investing', label: 'Investing', domain: 'investing' as SkillDomain, icon: 'trending-up' },
  { id: 'credit', label: 'Credit Scores', domain: 'credit' as SkillDomain, icon: 'star' },
];

const DIFFICULTIES: { id: DifficultyLevel; label: string; color: string }[] = [
  { id: 'beginner', label: 'Easy', color: '#4CAF50' },
  { id: 'intermediate', label: 'Medium', color: '#FF9800' },
  { id: 'advanced', label: 'Hard', color: '#F44336' },
];

export default function AIPracticeScreen({ navigation }: AIPracticeScreenProps) {
  const { theme } = useTheme();
  const { isConfigured, isEnabled, generateQuestion, generateFeedback } = useAI();
  const { financial } = useUserData();
  const { gainXP, xp } = useGamification();

  const [selectedTopic, setSelectedTopic] = useState<typeof TOPICS[0] | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel>('intermediate');
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  const xpScale = useSharedValue(1);

  const xpAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: xpScale.value }],
  }));

  const handleGenerateQuestion = useCallback(async () => {
    if (!selectedTopic || !isConfigured || !isEnabled) return;

    setIsGenerating(true);
    setCurrentQuestion(null);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setFeedback('');

    try {
      const question = await generateQuestion(
        selectedTopic.label,
        selectedTopic.id,
        selectedDifficulty,
        selectedTopic.domain,
        financial || undefined,
        'mcq'
      );

      if (question) {
        setCurrentQuestion(question);
      }
    } catch (error) {
      console.error('Failed to generate question:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [selectedTopic, selectedDifficulty, isConfigured, isEnabled, generateQuestion, financial]);

  const handleSelectAnswer = useCallback(async (answerIndex: number) => {
    if (!currentQuestion || isAnswered) return;

    setSelectedAnswer(answerIndex);
    setIsAnswered(true);
    setQuestionsAnswered(prev => prev + 1);

    const mcqQuestion = currentQuestion as MCQQuestion;
    const correct = answerIndex === mcqQuestion.correctAnswer;
    setIsCorrect(correct);

    if (correct) {
      setCorrectCount(prev => prev + 1);
      const xpAmount = currentQuestion.xpReward;
      gainXP(xpAmount);
      xpScale.value = withSequence(
        withTiming(1.3, { duration: 150 }),
        withSpring(1)
      );
    }

    const feedbackText = await generateFeedback(
      correct,
      currentQuestion.question,
      mcqQuestion.options[answerIndex],
      mcqQuestion.options[mcqQuestion.correctAnswer],
      financial || undefined
    );
    setFeedback(feedbackText);
  }, [currentQuestion, isAnswered, gainXP, generateFeedback, financial, xpScale]);

  if (!isConfigured || !isEnabled) {
    return (
      <ScreenScrollView>
        <Spacer height={Spacing.xl} />
        <ThemedView style={[styles.emptyCard, { backgroundColor: theme.card }]}>
          <Feather name="cpu" size={48} color={theme.textSecondary} />
          <Spacer height={Spacing.md} />
          <ThemedText style={styles.emptyTitle}>AI Features Not Enabled</ThemedText>
          <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
            To use AI-powered practice questions, please configure your Gemini API key in the AI Features settings.
          </ThemedText>
          <Spacer height={Spacing.lg} />
          <Pressable
            style={[styles.setupButton, { backgroundColor: theme.primary }]}
            onPress={() => navigation.navigate('Profile' as any)}
          >
            <ThemedText style={styles.setupButtonText}>Go to Settings</ThemedText>
          </Pressable>
        </ThemedView>
      </ScreenScrollView>
    );
  }

  return (
    <ScreenScrollView>
      <Spacer height={Spacing.md} />
      
      <ThemedView style={[styles.statsRow, { backgroundColor: theme.card }]}>
        <ThemedView style={styles.stat}>
          <ThemedText style={[styles.statValue, { color: theme.primary }]}>{questionsAnswered}</ThemedText>
          <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>Answered</ThemedText>
        </ThemedView>
        <ThemedView style={[styles.statDivider, { backgroundColor: theme.border }]} />
        <ThemedView style={styles.stat}>
          <ThemedText style={[styles.statValue, { color: theme.success }]}>{correctCount}</ThemedText>
          <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>Correct</ThemedText>
        </ThemedView>
        <ThemedView style={[styles.statDivider, { backgroundColor: theme.border }]} />
        <Animated.View style={[styles.stat, xpAnimatedStyle]}>
          <ThemedText style={[styles.statValue, { color: theme.warning }]}>{xp}</ThemedText>
          <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>Total XP</ThemedText>
        </Animated.View>
      </ThemedView>

      <Spacer height={Spacing.lg} />

      {!currentQuestion ? (
        <>
          <ThemedText style={styles.sectionTitle}>Choose a Topic</ThemedText>
          <Spacer height={Spacing.sm} />
          <ThemedView style={styles.topicsGrid}>
            {TOPICS.map((topic) => (
              <Pressable
                key={topic.id}
                style={[
                  styles.topicCard,
                  { 
                    backgroundColor: selectedTopic?.id === topic.id ? theme.primary : theme.card,
                    borderColor: selectedTopic?.id === topic.id ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => setSelectedTopic(topic)}
              >
                <Feather 
                  name={topic.icon as any} 
                  size={24} 
                  color={selectedTopic?.id === topic.id ? '#FFFFFF' : theme.primary} 
                />
                <ThemedText 
                  style={[
                    styles.topicLabel,
                    { color: selectedTopic?.id === topic.id ? '#FFFFFF' : theme.text }
                  ]}
                >
                  {topic.label}
                </ThemedText>
              </Pressable>
            ))}
          </ThemedView>

          <Spacer height={Spacing.lg} />

          <ThemedText style={styles.sectionTitle}>Difficulty</ThemedText>
          <Spacer height={Spacing.sm} />
          <ThemedView style={styles.difficultyRow}>
            {DIFFICULTIES.map((diff) => (
              <Pressable
                key={diff.id}
                style={[
                  styles.difficultyButton,
                  { 
                    backgroundColor: selectedDifficulty === diff.id ? diff.color : theme.card,
                    borderColor: selectedDifficulty === diff.id ? diff.color : theme.border,
                  },
                ]}
                onPress={() => setSelectedDifficulty(diff.id)}
              >
                <ThemedText 
                  style={[
                    styles.difficultyLabel,
                    { color: selectedDifficulty === diff.id ? '#FFFFFF' : theme.text }
                  ]}
                >
                  {diff.label}
                </ThemedText>
              </Pressable>
            ))}
          </ThemedView>

          <Spacer height={Spacing.xl} />

          <Pressable
            style={[
              styles.generateButton,
              { 
                backgroundColor: selectedTopic ? theme.primary : theme.border,
                opacity: isGenerating ? 0.7 : 1,
              },
            ]}
            onPress={handleGenerateQuestion}
            disabled={!selectedTopic || isGenerating}
          >
            {isGenerating ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Feather name="zap" size={20} color="#FFFFFF" />
                <ThemedText style={styles.generateButtonText}>Generate Question</ThemedText>
              </>
            )}
          </Pressable>

          {selectedTopic && financial ? (
            <>
              <Spacer height={Spacing.lg} />
              <ThemedView style={[styles.personalizationNote, { backgroundColor: theme.primary + '15' }]}>
                <Feather name="user" size={16} color={theme.primary} />
                <ThemedText style={[styles.personalizationText, { color: theme.primary }]}>
                  Questions will use your financial data for personalization
                </ThemedText>
              </ThemedView>
            </>
          ) : null}
        </>
      ) : (
        <Animated.View entering={FadeInDown.duration(300)}>
          <ThemedView style={[styles.questionCard, { backgroundColor: theme.card }]}>
            <ThemedView style={styles.questionHeader}>
              <ThemedView style={[styles.aiTag, { backgroundColor: theme.primary + '20' }]}>
                <Feather name="cpu" size={12} color={theme.primary} />
                <ThemedText style={[styles.aiTagText, { color: theme.primary }]}>AI Generated</ThemedText>
              </ThemedView>
              <ThemedView style={[styles.difficultyTag, { backgroundColor: DIFFICULTIES.find(d => d.id === selectedDifficulty)?.color + '20' }]}>
                <ThemedText style={[styles.difficultyTagText, { color: DIFFICULTIES.find(d => d.id === selectedDifficulty)?.color }]}>
                  {DIFFICULTIES.find(d => d.id === selectedDifficulty)?.label}
                </ThemedText>
              </ThemedView>
            </ThemedView>

            <Spacer height={Spacing.md} />

            <ThemedText style={styles.questionText}>{currentQuestion.question}</ThemedText>

            <Spacer height={Spacing.lg} />

            {(currentQuestion as MCQQuestion).options?.map((option, index) => {
              const mcqQuestion = currentQuestion as MCQQuestion;
              const isSelected = selectedAnswer === index;
              const isCorrectAnswer = index === mcqQuestion.correctAnswer;
              
              let optionStyle = { backgroundColor: theme.background, borderColor: theme.border };
              if (isAnswered) {
                if (isCorrectAnswer) {
                  optionStyle = { backgroundColor: theme.success + '20', borderColor: theme.success };
                } else if (isSelected && !isCorrect) {
                  optionStyle = { backgroundColor: theme.error + '20', borderColor: theme.error };
                }
              } else if (isSelected) {
                optionStyle = { backgroundColor: theme.primary + '20', borderColor: theme.primary };
              }

              return (
                <Pressable
                  key={index}
                  style={[styles.optionButton, optionStyle]}
                  onPress={() => handleSelectAnswer(index)}
                  disabled={isAnswered}
                >
                  <ThemedView style={[styles.optionLetter, { backgroundColor: theme.card }]}>
                    <ThemedText style={[styles.optionLetterText, { color: theme.textSecondary }]}>
                      {String.fromCharCode(65 + index)}
                    </ThemedText>
                  </ThemedView>
                  <ThemedText style={[styles.optionText, { color: theme.text, flex: 1 }]}>
                    {option}
                  </ThemedText>
                  {isAnswered && isCorrectAnswer ? (
                    <Feather name="check-circle" size={20} color={theme.success} />
                  ) : isAnswered && isSelected && !isCorrect ? (
                    <Feather name="x-circle" size={20} color={theme.error} />
                  ) : null}
                </Pressable>
              );
            })}

            {isAnswered ? (
              <Animated.View entering={FadeIn.duration(300)}>
                <Spacer height={Spacing.lg} />
                <ThemedView 
                  style={[
                    styles.feedbackCard, 
                    { backgroundColor: isCorrect ? theme.success + '15' : theme.error + '15' }
                  ]}
                >
                  <ThemedView style={styles.feedbackHeader}>
                    <Feather 
                      name={isCorrect ? "check-circle" : "info"} 
                      size={20} 
                      color={isCorrect ? theme.success : theme.error} 
                    />
                    <ThemedText 
                      style={[
                        styles.feedbackTitle, 
                        { color: isCorrect ? theme.success : theme.error }
                      ]}
                    >
                      {isCorrect ? 'Correct!' : 'Not quite'}
                    </ThemedText>
                    {isCorrect ? (
                      <ThemedView style={[styles.xpBadge, { backgroundColor: theme.warning + '20' }]}>
                        <ThemedText style={[styles.xpBadgeText, { color: theme.warning }]}>
                          +{currentQuestion.xpReward} XP
                        </ThemedText>
                      </ThemedView>
                    ) : null}
                  </ThemedView>
                  <Spacer height={Spacing.sm} />
                  <ThemedText style={[styles.feedbackText, { color: theme.text }]}>
                    {feedback || currentQuestion.explanation}
                  </ThemedText>
                </ThemedView>
              </Animated.View>
            ) : null}
          </ThemedView>

          <Spacer height={Spacing.lg} />

          {isAnswered ? (
            <Pressable
              style={[styles.nextButton, { backgroundColor: theme.primary }]}
              onPress={handleGenerateQuestion}
            >
              <ThemedText style={styles.nextButtonText}>Next Question</ThemedText>
              <Feather name="arrow-right" size={20} color="#FFFFFF" />
            </Pressable>
          ) : null}

          <Spacer height={Spacing.md} />

          <Pressable
            style={[styles.backButton, { borderColor: theme.border }]}
            onPress={() => {
              setCurrentQuestion(null);
              setSelectedAnswer(null);
              setIsAnswered(false);
              setFeedback('');
            }}
          >
            <ThemedText style={[styles.backButtonText, { color: theme.textSecondary }]}>
              Choose Different Topic
            </ThemedText>
          </Pressable>
        </Animated.View>
      )}

      <Spacer height={Spacing.xl} />
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...Typography.title,
    fontWeight: '700',
  },
  statLabel: {
    ...Typography.caption,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    marginHorizontal: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.headline,
    fontWeight: '600',
    marginHorizontal: Spacing.lg,
  },
  topicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  topicCard: {
    width: '48%',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  topicLabel: {
    ...Typography.body,
    fontWeight: '500',
    textAlign: 'center',
  },
  difficultyRow: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  difficultyButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  difficultyLabel: {
    ...Typography.body,
    fontWeight: '500',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    minHeight: 52,
  },
  generateButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  personalizationNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  personalizationText: {
    ...Typography.caption,
    flex: 1,
  },
  questionCard: {
    marginHorizontal: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  questionHeader: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  aiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  aiTagText: {
    ...Typography.caption,
    fontWeight: '500',
  },
  difficultyTag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  difficultyTagText: {
    ...Typography.caption,
    fontWeight: '500',
  },
  questionText: {
    ...Typography.body,
    fontWeight: '500',
    lineHeight: 24,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  optionLetter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLetterText: {
    ...Typography.body,
    fontWeight: '600',
  },
  optionText: {
    ...Typography.body,
  },
  feedbackCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  feedbackTitle: {
    ...Typography.body,
    fontWeight: '600',
    flex: 1,
  },
  xpBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  xpBadgeText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  feedbackText: {
    ...Typography.body,
    lineHeight: 22,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  nextButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  backButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  backButtonText: {
    ...Typography.body,
  },
  emptyCard: {
    marginHorizontal: Spacing.lg,
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  emptyTitle: {
    ...Typography.headline,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyText: {
    ...Typography.body,
    textAlign: 'center',
    lineHeight: 22,
  },
  setupButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  setupButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
