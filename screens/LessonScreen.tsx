import React, { useState, useMemo, useRef } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { MarkdownText } from '@/components/MarkdownText';
import Spacer from '@/components/Spacer';
import { Spacing, Typography, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useLearningProgress } from '@/hooks/useLearningProgress';
import { useContextualBandit } from '@/hooks/useContextualBandit';
import { modules } from '../mock/modules';
import { LearnStackParamList } from '../navigation/LearnStackNavigator';
import { SkillDomain } from '../types';

const DOMAIN_MAPPING: Record<string, SkillDomain> = {
  'module-1': 'budgeting',
  'module-2': 'debt',
  'module-3': 'investing',
  'module-4': 'saving',
  'module-5': 'credit',
};

export default function LessonScreen() {
  const route = useRoute<RouteProp<LearnStackParamList, 'Lesson'>>();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { getLessonStatus, setLessonStatus } = useLearningProgress();
  const { recordOutcome } = useContextualBandit();
  const { lessonId, moduleId } = route.params;
  const startTime = useRef(Date.now());

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [quizComplete, setQuizComplete] = useState(false);
  const [score, setScore] = useState(0);

  const domain = DOMAIN_MAPPING[moduleId] || 'budgeting';

  const lesson = useMemo(() => {
    const module = modules.find((m) => m.id === moduleId);
    return module?.lessons.find((l) => l.id === lessonId);
  }, [lessonId, moduleId]);

  if (!lesson) {
    return (
      <View style={styles.errorContainer}>
        <ThemedText>Lesson not found</ThemedText>
      </View>
    );
  }

  const isQuiz = lesson.type === 'quiz';
  const status = getLessonStatus(lessonId);

  const handleMarkComplete = async () => {
    await setLessonStatus(lessonId, 'completed');
    const timeSpent = Math.round((Date.now() - startTime.current) / 1000);
    await recordOutcome(domain, 1.0, true, timeSpent);
    navigation.goBack();
  };

  const handleQuizAnswer = (answerIndex: number) => {
    if (showFeedback) return;
    setSelectedAnswer(answerIndex);
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null || !lesson.quiz) return;

    const currentQuestion = lesson.quiz.questions[currentQuestionIndex];
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;

    if (isCorrect) {
      setScore(score + 1);
    }

    setShowFeedback(true);
  };

  const handleNextQuestion = async () => {
    if (!lesson.quiz) return;

    if (currentQuestionIndex < lesson.quiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setShowFeedback(false);
    } else {
      setQuizComplete(true);
      await setLessonStatus(lessonId, 'completed');
      const finalScore = (score + (selectedAnswer === lesson.quiz.questions[currentQuestionIndex].correctAnswer ? 1 : 0)) / lesson.quiz.questions.length;
      const passed = finalScore >= 0.7;
      const timeSpent = Math.round((Date.now() - startTime.current) / 1000);
      await recordOutcome(domain, finalScore, passed, timeSpent);
    }
  };

  const handleRetryQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setShowFeedback(false);
    setQuizComplete(false);
    setScore(0);
  };

  if (isQuiz && lesson.quiz) {
    if (quizComplete) {
      const percentage = Math.round((score / lesson.quiz.questions.length) * 100);
      const passed = percentage >= 70;

      return (
        <ScreenScrollView>
          <Spacer height={Spacing['2xl']} />

          <View style={styles.quizCompleteContainer}>
            <View
              style={[
                styles.scoreCircle,
                { backgroundColor: passed ? theme.success + '20' : theme.warning + '20' },
              ]}
            >
              <ThemedText
                style={[styles.scoreText, { color: passed ? theme.success : theme.warning }]}
              >
                {percentage}%
              </ThemedText>
            </View>

            <Spacer height={Spacing.xl} />

            <ThemedText style={styles.quizCompleteTitle}>
              {passed ? 'Great job!' : 'Keep learning!'}
            </ThemedText>
            <ThemedText style={[styles.quizCompleteMessage, { color: theme.textSecondary }]}>
              You scored {score} out of {lesson.quiz.questions.length}
            </ThemedText>

            <Spacer height={Spacing['2xl']} />

            <Pressable
              style={[styles.primaryButton, { backgroundColor: theme.primary }]}
              onPress={() => navigation.goBack()}
            >
              <ThemedText style={[styles.primaryButtonText, { color: theme.buttonText }]}>
                Continue Learning
              </ThemedText>
            </Pressable>

            <Spacer height={Spacing.md} />

            <Pressable
              style={[styles.secondaryButton, { borderColor: theme.primary }]}
              onPress={handleRetryQuiz}
            >
              <ThemedText style={[styles.secondaryButtonText, { color: theme.primary }]}>
                Retry Quiz
              </ThemedText>
            </Pressable>
          </View>
        </ScreenScrollView>
      );
    }

    const currentQuestion = lesson.quiz.questions[currentQuestionIndex];
    const isCorrect = showFeedback && selectedAnswer === currentQuestion.correctAnswer;

    return (
      <ScreenScrollView>
        <Spacer height={Spacing.md} />

        <View style={styles.quizHeader}>
          <ThemedText style={[styles.quizProgress, { color: theme.textSecondary }]}>
            Question {currentQuestionIndex + 1} of {lesson.quiz.questions.length}
          </ThemedText>
        </View>

        <Spacer height={Spacing.xl} />

        <View style={styles.questionContainer}>
          <ThemedText style={styles.questionText}>{currentQuestion.question}</ThemedText>
        </View>

        <Spacer height={Spacing.xl} />

        {currentQuestion.options.map((option, index) => (
          <React.Fragment key={index}>
            <Pressable
              style={[
                styles.optionButton,
                {
                  backgroundColor: theme.card,
                  borderColor:
                    selectedAnswer === index
                      ? showFeedback
                        ? isCorrect
                          ? theme.success
                          : theme.error
                        : theme.primary
                      : theme.border,
                  borderWidth: selectedAnswer === index ? 2 : 1,
                },
              ]}
              onPress={() => handleQuizAnswer(index)}
              disabled={showFeedback}
            >
              <ThemedText style={styles.optionText}>{option}</ThemedText>
              {showFeedback && selectedAnswer === index ? (
                <Feather
                  name={isCorrect ? 'check-circle' : 'x-circle'}
                  size={24}
                  color={isCorrect ? theme.success : theme.error}
                />
              ) : null}
            </Pressable>
            <Spacer height={Spacing.md} />
          </React.Fragment>
        ))}

        <Spacer height={Spacing.xl} />

        <View style={styles.buttonContainer}>
          {showFeedback ? (
            <Pressable
              style={[styles.primaryButton, { backgroundColor: theme.primary }]}
              onPress={handleNextQuestion}
            >
              <ThemedText style={[styles.primaryButtonText, { color: theme.buttonText }]}>
                {currentQuestionIndex < lesson.quiz.questions.length - 1
                  ? 'Next Question'
                  : 'See Results'}
              </ThemedText>
            </Pressable>
          ) : (
            <Pressable
              style={[
                styles.primaryButton,
                {
                  backgroundColor: selectedAnswer !== null ? theme.primary : theme.border,
                },
              ]}
              onPress={handleSubmitAnswer}
              disabled={selectedAnswer === null}
            >
              <ThemedText style={[styles.primaryButtonText, { color: theme.buttonText }]}>
                Submit Answer
              </ThemedText>
            </Pressable>
          )}
        </View>
      </ScreenScrollView>
    );
  }

  return (
    <ScreenScrollView>
      <Spacer height={Spacing.md} />

      <View style={styles.lessonContent}>
        <MarkdownText content={lesson.content || ''} />
      </View>

      <Spacer height={Spacing.xl} />

      {status !== 'completed' ? (
        <View style={styles.buttonContainer}>
          <Pressable
            style={[styles.primaryButton, { backgroundColor: theme.primary }]}
            onPress={handleMarkComplete}
          >
            <ThemedText style={[styles.primaryButtonText, { color: theme.buttonText }]}>
              Mark as Complete
            </ThemedText>
          </Pressable>
        </View>
      ) : (
        <View style={[styles.completedBadge, { backgroundColor: theme.success + '20' }]}>
          <Feather name="check-circle" size={24} color={theme.success} />
          <Spacer width={Spacing.sm} />
          <ThemedText style={[styles.completedText, { color: theme.success }]}>
            Lesson Completed
          </ThemedText>
        </View>
      )}

      <Spacer height={Spacing.xl} />
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lessonContent: {
    paddingHorizontal: Spacing.lg,
  },
  heading1: {
    ...Typography.title,
  },
  heading2: {
    ...Typography.headline,
    fontWeight: '600',
  },
  bold: {
    ...Typography.body,
    fontWeight: '600',
  },
  paragraph: {
    ...Typography.body,
  },
  bulletPoint: {
    flexDirection: 'row',
    paddingLeft: Spacing.md,
  },
  bullet: {
    ...Typography.body,
    marginRight: Spacing.sm,
  },
  bulletText: {
    ...Typography.body,
    flex: 1,
  },
  buttonContainer: {
    paddingHorizontal: Spacing.lg,
  },
  primaryButton: {
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    ...Typography.headline,
  },
  secondaryButton: {
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    ...Typography.headline,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  completedText: {
    ...Typography.headline,
  },
  quizHeader: {
    paddingHorizontal: Spacing.lg,
  },
  quizProgress: {
    ...Typography.footnote,
    textAlign: 'center',
  },
  questionContainer: {
    paddingHorizontal: Spacing.lg,
  },
  questionText: {
    ...Typography.title,
  },
  optionButton: {
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionText: {
    ...Typography.body,
    flex: 1,
  },
  quizCompleteContainer: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 36,
    fontWeight: '700',
  },
  quizCompleteTitle: {
    ...Typography.title,
    textAlign: 'center',
  },
  quizCompleteMessage: {
    ...Typography.body,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});
