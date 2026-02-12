// =============================================================================
// QUIZ MODULE SCREEN - ADAPTIVE DIFFICULTY WITH LinUCB CONTEXTUAL BANDIT
// =============================================================================
// 
// HARD-FIRST TESTING STRATEGY:
// This quiz implements an adaptive difficulty system designed for efficient
// mastery testing. The flow works as follows:
//
// 1. INITIAL HARD TEST: For each concept, show the HARD question first
//    - Efficient for advanced learners who can prove mastery quickly
//    - 4 concepts = 4 initial hard questions
//
// 2. PENALTY CASCADE: When user answers HARD incorrectly:
//    - Inject EASY → MEDIUM → HARD sequence (3 penalty questions)
//    - Forces review of foundational knowledge before retrying hard
//    - Ensures thorough understanding before progression
//
// 3. MASTERY TRACKING: User must correctly answer HARD for each concept
//    - Minimum path: 4 questions (all hard correct on first try)
//    - Maximum path: 4 × 3 = 12 questions (all concepts need cascade)
//
// 4. RESEARCH LOGGING: Every decision is logged for reproducibility:
//    - Concept shown, difficulty tier, user response, timing
//    - Bandit parameters at decision time
//    - Enables analysis of learning patterns
//
// =============================================================================

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  Pressable, 
  Modal,
  ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  FadeIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ProgressBar } from '@/components/ProgressBar';
import Spacer from '@/components/Spacer';
import { QuestionRenderer, QuestionResult } from '@/components/QuestionTypes';
import { useTheme } from '@/hooks/useTheme';
import { useModuleProgress } from '@/hooks/useModuleProgress';
import { useGamification } from '@/hooks/useGamification';
import { useWrongAnswerRegistry } from '@/hooks/useWrongAnswerRegistry';
import { useSkillAccuracy } from '@/hooks/useSkillAccuracy';
import { useAdaptiveLearning } from '@/hooks/useAdaptiveLearning';
import { useCourseCertificates } from '@/hooks/useCourseCertificates';
import { Spacing, BorderRadius, Typography } from '@/constants/theme';
import { QuizModule, Question, ConceptVariant, AdaptiveQuizState, ConceptResult, SkillDomain } from '../types';
import { LearnStackParamList } from '../navigation/LearnStackNavigator';
import { getConceptForQuestion, getVariantQuestions } from '../mock/conceptTags';
import { getQuestionById, getLessonById, getCourseById } from '../mock/courses';
import { Confetti } from '@/components/Confetti';
import * as Haptics from '@/utils/haptics';
import { recordQuizResult as recordQuizResultToBackend, syncLessonProgress } from '@/services/supabaseDataService';
import { generateConceptQuestion, canGenerateAIQuestions } from '@/services/aiQuestionService';
import { useUserDataContext } from '@/context/UserDataContext';
import { useLearningMode } from '@/hooks/useLearningMode';

// =============================================================================
// TYPES
// =============================================================================

type QuizModuleScreenProps = {
  navigation: NativeStackNavigationProp<LearnStackParamList, 'QuizModule'>;
  route: RouteProp<LearnStackParamList, 'QuizModule'>;
};

// Track question with adaptive difficulty info
interface QueuedQuestion {
  question: Question;
  isPenalty: boolean;              // Is this part of a penalty cascade?
  conceptId?: string;              // Which concept this question tests
  difficultyTier: 1 | 2 | 3;       // 1=easy, 2=medium, 3=hard
  isInitialHardTest: boolean;      // Is this the first hard test for a concept?
  penaltyPosition?: number;        // Position in cascade (0=easy, 1=medium, 2=hard)
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function QuizModuleScreen({ navigation, route }: QuizModuleScreenProps) {
  const { moduleId, lessonId, courseId, moduleIndex, totalModules } = route.params;
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  
  const { recordQuizAttempt, getModuleProgress } = useModuleProgress();
  const { gainXP, addHearts, streak, updateStreak } = useGamification();
  const { isAdaptive } = useLearningMode();
  
  const existingProgress = getModuleProgress(moduleId);
  // Freeze session mode on start so first-attempt runs don't flip into
  // "review mode" immediately after we save completion at the end.
  const [sessionStartAttempts, setSessionStartAttempts] = useState<number>(existingProgress?.attempts ?? 0);
  const [sessionStartWasCompleted, setSessionStartWasCompleted] = useState<boolean>(
    Boolean(existingProgress?.status === 'completed' && existingProgress?.masteryAchieved)
  );
  const isAlreadyCompleted = sessionStartWasCompleted;
  const isFirstQuizAttempt = sessionStartAttempts === 0;
  const { registerWrongAnswer, markRemediated } = useWrongAnswerRegistry();
  const { recordQuizResult } = useSkillAccuracy();
  const { recordLessonAttempt, completedLessons } = useAdaptiveLearning(streak);
  const { unlockCertificate } = useCourseCertificates();
  const { financial } = useUserDataContext();
  
  // Get module data from route params
  const module = route.params.module as QuizModule | undefined;
  
  // Get lesson domain for skill tracking
  const lessonData = getLessonById(lessonId);
  const lessonDomain = lessonData?.lesson?.domain as SkillDomain | undefined;
  
  // Reference to track question start time for research logging
  const questionStartTime = useRef<number>(Date.now());

  // ==========================================================================
  // STATE - Adaptive Difficulty Tracking
  // ==========================================================================

  // Dynamic question queue - built from hard-first testing with penalty cascades
  // FLOW: Start with 4 HARD questions (one per concept)
  //       Wrong answer → inject EASY → MEDIUM → HARD cascade
  const [questionQueue, setQuestionQueue] = useState<QueuedQuestion[]>([]);
  
  // Current position in queue
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentIndexRef = useRef(0);
  
  // Track concept mastery - user must correctly answer HARD for each concept
  // Key: conceptId, Value: whether the HARD question was answered correctly
  const [masteredConcepts, setMasteredConcepts] = useState<Set<string>>(new Set());
  
  // Track concepts currently in penalty cascade (prevents double-injection)
  const [conceptsInCascade, setConceptsInCascade] = useState<Set<string>>(new Set());
  
  // Detailed results per concept for research logging
  const [conceptResults, setConceptResults] = useState<Map<string, ConceptResult>>(new Map());
  
  // Current answer state
  const [isAnswered, setIsAnswered] = useState(false);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState(false);
  const [currentExplanation, setCurrentExplanation] = useState('');
  
  // Show completion modal
  const [showCompletion, setShowCompletion] = useState(false);
  
  // Stats tracking
  const [xpEarned, setXpEarned] = useState(0);
  const [heartsLost, setHeartsLost] = useState(0);
  const [heartsEarned, setHeartsEarned] = useState(0);
  const [attemptHearts, setAttemptHearts] = useState(5);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [newCertificateCourseId, setNewCertificateCourseId] = useState<string | null>(null);

  // AI-generated replacement questions (keyed by queue index)
  const [aiReplacements, setAiReplacements] = useState<Record<number, Question>>({});
  
  // Animation values
  const progressWidth = useSharedValue(0);
  const xpScale = useSharedValue(1);

  // ==========================================================================
  // INITIALIZATION - Build initial queue with HARD questions only
  // ==========================================================================
  // 
  // ADAPTIVE DIFFICULTY STRATEGY:
  // 1. Check if module has conceptVariants (new adaptive structure)
  // 2. If yes: Start with only HARD questions (one per concept)
  // 3. If no: Fall back to original behavior (all questions in order)
  //

  useEffect(() => {
    if (module && questionQueue.length === 0) {
      // Check if module uses the new adaptive structure
      if (isAdaptive && module.conceptVariants && module.conceptVariants.length > 0) {
        // =================================================================
        // NEW ADAPTIVE MODE: Hard-first testing
        // =================================================================
        // Initialize with ONLY the HARD questions for each concept
        // Penalty cascades (easy → medium → hard) injected on wrong answers
        
        const initialQueue: QueuedQuestion[] = [];
        
        module.conceptVariants.forEach(concept => {
          // Find the HARD question for this concept
          const hardQuestion = module.questions.find(q => q.id === concept.hardQuestionId);
          
          if (hardQuestion) {
            initialQueue.push({
              question: hardQuestion,
              isPenalty: false,
              conceptId: concept.conceptId,
              difficultyTier: 3,  // Hard
              isInitialHardTest: true,
            });
          }
        });
        
        // Initialize concept results for research tracking
        const initialResults = new Map<string, ConceptResult>();
        module.conceptVariants.forEach(concept => {
          initialResults.set(concept.conceptId, {
            conceptId: concept.conceptId,
            hardAttemptCorrect: null,
            penaltyCascadeTriggered: false,
            easyCorrect: null,
            mediumCorrect: null,
            hardRetryCorrect: null,
            totalAttempts: 0,
            mastered: false,
          });
        });
        setConceptResults(initialResults);
        setQuestionQueue(initialQueue);

        // Intentionally do NOT pre-generate AI questions here.
        // AI generation is only triggered after wrong answers (remediation),
        // so quota is preserved for moments where adaptation is actually needed.
        
      } else {
        // =================================================================
        // LEGACY MODE: Original behavior for backward compatibility
        // =================================================================
        // All questions shown in order without adaptive difficulty
        // Each question is treated as its own "concept" for mastery tracking
        
        const initialQueue = module.questions.map(q => ({
          question: q,
          isPenalty: false,
          conceptId: (q as any).conceptId || q.id,  // Prefer explicit concept grouping when available
          // In adaptive mode, treat initial pass as hard-first test.
          difficultyTier: (isAdaptive ? 3 : ((q as any).difficultyTier || 3)) as 1 | 2 | 3,
          // In adaptive mode, the first pass should be treated as initial hard test
          // so wrong answers trigger remediation flow for legacy modules too.
          isInitialHardTest: isAdaptive,
        }));
        setQuestionQueue(initialQueue);
      }
    }
  }, [module, questionQueue.length, isAdaptive]);

  // Current question - use AI replacement if available, otherwise pre-made
  const currentQueueItem = questionQueue[currentIndex];
  const currentQuestion = aiReplacements[currentIndex] || currentQueueItem?.question;
  
  // Count of concepts to master (or original question count for legacy mode)
  const totalConceptsToMaster = module?.conceptVariants?.length || module?.questions.length || 0;
  
  // Calculate progress based on concept mastery
  const progress = totalConceptsToMaster > 0 
    ? (masteredConcepts.size / totalConceptsToMaster) * 100 
    : 0;

  // Reset question timer when moving to new question
  useEffect(() => {
    questionStartTime.current = Date.now();
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  // Keep session-start flags in sync only before the first answer is submitted.
  useEffect(() => {
    if (totalAttempts > 0) return;
    setSessionStartAttempts(existingProgress?.attempts ?? 0);
    setSessionStartWasCompleted(
      Boolean(existingProgress?.status === 'completed' && existingProgress?.masteryAchieved)
    );
  }, [existingProgress, totalAttempts]);

  // Animate progress bar
  useEffect(() => {
    progressWidth.value = withSpring(progress);
  }, [progress, progressWidth]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  // ==========================================================================
  // HANDLE ANSWER - Adaptive difficulty with penalty cascade
  // ==========================================================================
  // 
  // CORRECT ANSWER FLOW:
  // - If HARD question (tier 3) answered correctly → mark concept mastered
  // - If penalty question → track progress through cascade
  // - Award XP (reduced for penalty questions)
  //
  // INCORRECT ANSWER FLOW:
  // - If initial HARD test failed → inject easy → medium → hard cascade
  // - If penalty question failed → just lose heart, continue cascade
  // - Track all attempts for research logging
  //
  
  const handleAnswer = useCallback((result: QuestionResult) => {
    if (!currentQuestion || !currentQueueItem) return;
    
    const responseTimeMs = Date.now() - questionStartTime.current;
    const conceptId = currentQueueItem.conceptId;
    
    setIsAnswered(true);
    setLastAnswerCorrect(result.isCorrect);
    setCurrentExplanation(currentQuestion.explanation);
    setTotalAttempts(prev => prev + 1);
    
    // Update concept results for research tracking
    if (conceptId) {
      setConceptResults(prev => {
        const newResults = new Map(prev);
        const existing = newResults.get(conceptId);
        if (existing) {
          const updated = { ...existing, totalAttempts: existing.totalAttempts + 1 };
          
          // Track which tier this was
          if (currentQueueItem.isInitialHardTest) {
            updated.hardAttemptCorrect = result.isCorrect;
          } else if (currentQueueItem.isPenalty) {
            if (currentQueueItem.difficultyTier === 1) updated.easyCorrect = result.isCorrect;
            if (currentQueueItem.difficultyTier === 2) updated.mediumCorrect = result.isCorrect;
            if (currentQueueItem.difficultyTier === 3) updated.hardRetryCorrect = result.isCorrect;
          }
          
          newResults.set(conceptId, updated);
        }
        return newResults;
      });
    }
    
    let heartsRemainingForLog = attemptHearts;

    if (result.isCorrect) {
      // =================================================================
      // CORRECT ANSWER
      // =================================================================
      Haptics.correctAnswer();
      setTotalCorrect(prev => prev + 1);
      
      // Award XP - reduced for penalty questions to incentivize first-try success
      // No XP on review (already completed)
      if (!isAlreadyCompleted) {
        const xpAmount = currentQueueItem.isPenalty 
          ? Math.round(result.xpEarned * 0.5)  // 50% XP for penalty questions
          : result.xpEarned;                    // Full XP for initial hard test
        setXpEarned(prev => prev + xpAmount);
        gainXP(xpAmount);
        Haptics.xpEarned();
      }
      
      // Animate XP gain
      xpScale.value = withSequence(
        withTiming(1.3, { duration: 150 }),
        withSpring(1)
      );
      
      // Check if this is a HARD question (tier 3) - marks concept as mastered
      if (currentQueueItem.difficultyTier === 3 && conceptId) {
        setMasteredConcepts(prev => new Set([...prev, conceptId]));
        
        // Update concept result to show mastery
        setConceptResults(prev => {
          const newResults = new Map(prev);
          const existing = newResults.get(conceptId);
          if (existing) {
            newResults.set(conceptId, { ...existing, mastered: true });
          }
          return newResults;
        });
        
        // Mark as remediated if it was in a cascade
        if (conceptsInCascade.has(conceptId)) {
          markRemediated(conceptId);
          setConceptsInCascade(prev => {
            const newSet = new Set(prev);
            newSet.delete(conceptId);
            return newSet;
          });
        }
      }
      
    } else {
      // =================================================================
      // WRONG ANSWER
      // =================================================================
      console.log('[AI] Wrong answer detected', {
        questionId: currentQuestion.id,
        conceptId,
        isAdaptive,
        canGenerate: canGenerateAIQuestions(),
      });
      Haptics.wrongAnswer();
      if (isFirstQuizAttempt) {
        const nextHearts = Math.max(0, attemptHearts - 1);
        setAttemptHearts(nextHearts);
        heartsRemainingForLog = nextHearts;
        setHeartsLost(prev => prev + 1);
      }
      
      // Check if this is an initial HARD test failure (triggers penalty cascade)
      if (isAdaptive && currentQueueItem.isInitialHardTest && conceptId && module?.conceptVariants) {
        // Find the concept variant to get easy/medium questions
        const conceptVariant = module.conceptVariants.find(c => c.conceptId === conceptId);
        
        if (conceptVariant && !conceptsInCascade.has(conceptId)) {
          // =============================================================
          // INJECT PENALTY CASCADE: easy → medium → hard
          // =============================================================
          // User failed the hard question, so they need to review
          // the concept from the beginning before retrying
          
          const penaltyQuestions: QueuedQuestion[] = [];
          
          // 1. EASY question (tier 1) - foundational knowledge
          const easyQ = module.questions.find(q => q.id === conceptVariant.easyQuestionId);
          if (easyQ) {
            penaltyQuestions.push({
              question: easyQ,
              isPenalty: true,
              conceptId,
              difficultyTier: 1,
              isInitialHardTest: false,
              penaltyPosition: 0,
            });
          }
          
          // 2. MEDIUM question (tier 2) - applied understanding
          const mediumQ = module.questions.find(q => q.id === conceptVariant.mediumQuestionId);
          if (mediumQ) {
            penaltyQuestions.push({
              question: mediumQ,
              isPenalty: true,
              conceptId,
              difficultyTier: 2,
              isInitialHardTest: false,
              penaltyPosition: 1,
            });
          }
          
          // 3. HARD question again (tier 3) - must pass to prove mastery
          const hardQ = module.questions.find(q => q.id === conceptVariant.hardQuestionId);
          if (hardQ) {
            penaltyQuestions.push({
              question: hardQ,
              isPenalty: true,
              conceptId,
              difficultyTier: 3,
              isInitialHardTest: false,
              penaltyPosition: 2,
            });
          }
          
          // Add penalty cascade to queue
          setQuestionQueue(prev => {
            const newQueue = [...prev, ...penaltyQuestions];
            
            // Try to generate AI replacements for penalty cascade questions in background
            if (canGenerateAIQuestions() && conceptVariant) {
              const userCtx = financial ? {
                monthlyIncome: financial.monthlyIncome,
                monthlyExpenses: financial.monthlyExpenses,
                savingsGoal: financial.savingsGoal,
                currentSavings: financial.currentSavings,
                monthlyDebt: financial.totalDebt,
              } : undefined;

              const difficulties: Array<'beginner' | 'intermediate'> = ['beginner', 'intermediate'];
              // Only replace EASY and MEDIUM remediation via AI.
              // HARD slot must remain the original retry question.
              penaltyQuestions.slice(0, 2).forEach((pq, i) => {
                const queueIdx = prev.length + i;
                generateConceptQuestion(
                  pq.question,
                  conceptId!,
                  conceptVariant.conceptName,
                  conceptVariant.domain as any,
                  difficulties[i] || 'intermediate',
                  userCtx
                ).then(aiQ => {
                  if (aiQ) {
                    if (currentIndexRef.current >= queueIdx) return;
                    console.log('[AI] Generated penalty replacement:', aiQ.id, 'for queue index', queueIdx);
                    setAiReplacements(prevR => ({ ...prevR, [queueIdx]: aiQ }));
                  }
                }).catch((error) => {
                  console.error('[AI] Failed penalty replacement generation:', error);
                });
              });
            } else {
              console.log('[AI] Skipping penalty replacement generation (Gemini unavailable or in cooldown)');
            }
            
            return newQueue;
          });
          
          // Mark concept as in cascade (prevent re-injection)
          setConceptsInCascade(prev => new Set([...prev, conceptId]));
          
          // Update concept result to show cascade was triggered
          setConceptResults(prev => {
            const newResults = new Map(prev);
            const existing = newResults.get(conceptId);
            if (existing) {
              newResults.set(conceptId, { ...existing, penaltyCascadeTriggered: true });
            }
            return newResults;
          });
          
          // Register wrong answer for remediation tracking
          registerWrongAnswer(
            currentQuestion.id,
            conceptId,
            currentQuestion.type,
            lessonId,
            conceptVariant.easyQuestionId
          );
        }
      } else if (isAdaptive && currentQueueItem.isPenalty && conceptId && currentQueueItem.difficultyTier === 3) {
        // Failed the HARD question in penalty cascade - add it back to retry
        // User must eventually get the hard question right to master the concept
        setQuestionQueue(prev => [...prev, {
          question: currentQuestion,
          isPenalty: true,
          conceptId,
          difficultyTier: 3,
          isInitialHardTest: false,
          penaltyPosition: 2,
        }]);
      } else if (isAdaptive && currentQueueItem.isInitialHardTest && conceptId && module && !module.conceptVariants) {
        // =============================================================
        // LEGACY MODE: Queue easy -> medium -> original retry
        // =============================================================
        setQuestionQueue(prev => {
          const queueStart = prev.length;

          const sameConceptQuestions = module.questions.filter(
            q => q.id !== currentQuestion.id && (q as any).conceptId === conceptId
          );

          const easyFallback = sameConceptQuestions.find(
            q => ((q as any).difficultyTier === 1) || q.difficulty === 'beginner'
          );

          const mediumFallback = sameConceptQuestions.find(
            q =>
              q.id !== easyFallback?.id &&
              (((q as any).difficultyTier === 2) || q.difficulty === 'intermediate')
          );

          const hasPremadeCascade = Boolean(easyFallback && mediumFallback);
          if (!hasPremadeCascade) {
            console.log('[AI] No same-concept easy/medium variants; using temporary placeholders and attempting AI replacements');
          }

          // Always queue easy -> medium -> original hard retry.
          // If premade variants are missing, placeholders are replaced by AI when available.
          const remediationQueue: QueuedQuestion[] = [
            {
              question: easyFallback || currentQuestion,
              isPenalty: true,
              conceptId,
              difficultyTier: 1,
              isInitialHardTest: false,
              penaltyPosition: 0,
            },
            {
              question: mediumFallback || currentQuestion,
              isPenalty: true,
              conceptId,
              difficultyTier: 2,
              isInitialHardTest: false,
              penaltyPosition: 1,
            },
            {
              question: currentQuestion,
              isPenalty: true,
              conceptId,
              difficultyTier: 3 as const,
              isInitialHardTest: false,
              penaltyPosition: 2,
            },
          ];

          const newQueue: QueuedQuestion[] = [...prev, ...remediationQueue];

          // Keep concept in cascade until hard retry is passed.
          setConceptsInCascade(prevCascade => new Set([...prevCascade, conceptId]));

          // Register wrong answer for remediation tracking.
          registerWrongAnswer(
            currentQuestion.id,
            conceptId,
            currentQuestion.type,
            lessonId
          );

          if (canGenerateAIQuestions()) {
            const userCtx = financial ? {
              monthlyIncome: financial.monthlyIncome,
              monthlyExpenses: financial.monthlyExpenses,
              savingsGoal: financial.savingsGoal,
              currentSavings: financial.currentSavings,
              monthlyDebt: financial.totalDebt,
            } : undefined;

            const domain = (lessonDomain || 'budgeting') as any;
            const conceptName = currentQuestion.question.substring(0, 50);

            generateConceptQuestion(
              currentQuestion,
              conceptId,
              conceptName,
              domain,
              'beginner',
              userCtx
            ).then(aiQ => {
              if (aiQ) {
                if (currentIndexRef.current >= queueStart) return;
                console.log('[AI] Generated legacy easy remediation:', aiQ.id);
                setAiReplacements(prevR => ({ ...prevR, [queueStart]: aiQ }));
              }
            }).catch((error) => {
              console.error('[AI] Failed legacy easy remediation generation:', error);
            });

            generateConceptQuestion(
              currentQuestion,
              conceptId,
              conceptName,
              domain,
              'intermediate',
              userCtx
            ).then(aiQ => {
              if (aiQ) {
                if (currentIndexRef.current >= queueStart + 1) return;
                console.log('[AI] Generated legacy medium remediation:', aiQ.id);
                setAiReplacements(prevR => ({ ...prevR, [queueStart + 1]: aiQ }));
              }
            }).catch((error) => {
              console.error('[AI] Failed legacy medium remediation generation:', error);
            });
          } else {
            console.log('[AI] Skipping legacy remediation generation (Gemini unavailable or in cooldown)');
          }

          return newQueue;
        });
      }
      // Note: Easy/Medium failures in cascade don't inject more questions,
      // user just continues to the next question in the cascade
    }
    
    // Log attempt for research (in development, this would be saved to storage)
    console.log('[ADAPTIVE QUIZ LOG]', {
      timestamp: new Date().toISOString(),
      conceptId,
      questionId: currentQuestion.id,
      difficultyTier: currentQueueItem.difficultyTier,
      isInitialHardTest: currentQueueItem.isInitialHardTest,
      isPenalty: currentQueueItem.isPenalty,
      penaltyPosition: currentQueueItem.penaltyPosition,
      correct: result.isCorrect,
      responseTimeMs,
      heartsRemaining: heartsRemainingForLog,
    });

    // Record quiz result to Supabase backend (fire-and-forget)
    recordQuizResultToBackend({
      lesson_id: lessonId,
      question_id: currentQuestion.id,
      concept_id: conceptId || null,
      domain: lessonDomain || 'budgeting',
      difficulty: currentQueueItem.difficultyTier === 1 ? 'beginner' : currentQueueItem.difficultyTier === 2 ? 'intermediate' : 'advanced',
      difficulty_tier: currentQueueItem.difficultyTier,
      is_correct: result.isCorrect,
      response_time_ms: responseTimeMs,
      attempt_number: currentQueueItem.isPenalty ? (currentQueueItem.penaltyPosition || 0) + 1 : 1,
      is_ai_generated: currentQuestion.id.startsWith('ai-'),
    }).catch(() => {});
    
  }, [currentQuestion, currentQueueItem, module, gainXP, xpScale, lessonId, 
      registerWrongAnswer, markRemediated, attemptHearts, conceptsInCascade, lessonDomain, financial, isFirstQuizAttempt, isAdaptive]);

  // ==========================================================================
  // HANDLE CONTINUE - Move to next question or complete quiz
  // ==========================================================================
  // 
  // COMPLETION CRITERIA:
  // - Adaptive mode: All concepts mastered (HARD answered correctly for each)
  // - Legacy mode: All questions answered correctly at least once
  //
  
  const maybeUnlockCourseCertificate = useCallback(async () => {
    if (!courseId) return;
    const course = getCourseById(courseId);
    if (!course) return;

    const completedSet = new Set(completedLessons);
    completedSet.add(lessonId);
    const isCourseComplete = course.lessons.every(lesson => completedSet.has(lesson.id));
    if (!isCourseComplete) return;

    const unlockedNow = await unlockCertificate(courseId);
    if (unlockedNow) {
      setNewCertificateCourseId(courseId);
      setShowCertificateModal(true);
    }
  }, [completedLessons, courseId, lessonId, unlockCertificate]);

  const handleContinue = useCallback(() => {
    setIsAnswered(false);

    const getHeartsRewardFromScore = (score: number): number => {
      if (score >= 100) return 5;
      if (score >= 80) return 4;
      if (score >= 70) return 3;
      if (score >= 50) return 2;
      if (score >= 30) return 1;
      return 0;
    };
    
    // Check if all concepts are mastered
    const allConceptsMastered = !isAdaptive ? true : module?.conceptVariants 
      ? module.conceptVariants.every(c => masteredConcepts.has(c.conceptId))
      : masteredConcepts.size >= (module?.questions.length || 0);
    
    const atEndOfQueue = currentIndex >= questionQueue.length - 1;
    
    if (allConceptsMastered && atEndOfQueue) {
      // =================================================================
      // QUIZ COMPLETE - All concepts mastered
      // =================================================================
      const score = Math.round((totalCorrect / totalAttempts) * 100);
      const accuracy = totalCorrect / totalAttempts;
      recordQuizAttempt(moduleId, score, module?.masteryThreshold);
      
      // Mark lesson as complete in adaptive learning system for course progress
      recordLessonAttempt(lessonId, accuracy, totalAttempts * 30, true, false);
      
      // Rewards are only granted on the first quiz attempt for this module.
      const earned = isFirstQuizAttempt ? getHeartsRewardFromScore(score) : 0;
      if (isFirstQuizAttempt) {
        if (earned > 0) {
          addHearts(earned);
        }
        updateStreak();
        void maybeUnlockCourseCertificate();
      }
      setHeartsEarned(earned);
      
      // Record skill accuracy for the lesson domain
      if (lessonDomain) {
        recordQuizResult(lessonDomain, totalCorrect, totalAttempts);
      }
      
      // Haptic celebration!
      Haptics.quizComplete();
      if (isFirstQuizAttempt && earned > 0) {
        Haptics.heartsEarned();
      }
      
      // Log final results for research
      console.log('[ADAPTIVE QUIZ COMPLETE]', {
        conceptsTeached: module?.conceptVariants?.length || 0,
        totalQuestions: totalAttempts,
        accuracy: score,
        conceptResults: Array.from(conceptResults.entries()),
        heartsEarned: earned,
        isReview: !isFirstQuizAttempt,
      });

      // Sync lesson progress to Supabase backend
      syncLessonProgress({
        lesson_id: lessonId,
        course_id: lessonId.split('-').slice(0, 2).join('-'),
        status: 'completed',
        score: xpEarned,
        accuracy,
        attempts: totalAttempts,
        completed_at: new Date().toISOString(),
      }).catch(() => {});
      
      setShowCompletion(true);
    } else if (atEndOfQueue && !allConceptsMastered) {
      // Edge case: Reached end but not all mastered
      // This shouldn't happen with proper cascade logic, but handle gracefully
      const score = Math.round((totalCorrect / totalAttempts) * 100);
      const accuracy = totalCorrect / totalAttempts;
      recordQuizAttempt(moduleId, score, module?.masteryThreshold);
      
      // Mark lesson as complete even if not all mastered
      recordLessonAttempt(lessonId, accuracy, totalAttempts * 30, true, false);
      
      // Rewards are only granted on the first quiz attempt for this module.
      const earned = isFirstQuizAttempt ? getHeartsRewardFromScore(score) : 0;
      if (isFirstQuizAttempt) {
        if (earned > 0) {
          addHearts(earned);
        }
        updateStreak();
        void maybeUnlockCourseCertificate();
      }
      setHeartsEarned(earned);
      
      // Record skill accuracy
      if (lessonDomain) {
        recordQuizResult(lessonDomain, totalCorrect, totalAttempts);
      }
      
      // Haptic celebration!
      Haptics.quizComplete();
      if (isFirstQuizAttempt && earned > 0) {
        Haptics.heartsEarned();
      }

      // Sync lesson progress to Supabase backend
      syncLessonProgress({
        lesson_id: lessonId,
        course_id: lessonId.split('-').slice(0, 2).join('-'),
        status: 'completed',
        score: xpEarned,
        accuracy,
        attempts: totalAttempts,
        completed_at: new Date().toISOString(),
      }).catch(() => {});
      
      setShowCompletion(true);
    } else {
      // Move to next question in queue
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, questionQueue, module, masteredConcepts, totalCorrect, totalAttempts, 
      moduleId, lessonId, recordQuizAttempt, recordLessonAttempt, conceptResults, addHearts, lessonDomain, recordQuizResult, xpEarned, isFirstQuizAttempt, isAdaptive, updateStreak, maybeUnlockCourseCertificate]);

  // Handle completion dismiss
  const handleCompletionClose = useCallback(() => {
    setShowCompletion(false);
    if (showCertificateModal) return;
    navigation.goBack();
  }, [navigation, showCertificateModal]);

  const handleCertificateClose = useCallback(() => {
    setShowCertificateModal(false);
    setNewCertificateCourseId(null);
    navigation.goBack();
  }, [navigation]);

  // ==========================================================================
  // ANIMATED STYLES
  // ==========================================================================

  const xpAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: xpScale.value }],
  }));

  // ==========================================================================
  // RENDER
  // ==========================================================================

  if (!module) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <ThemedText>Quiz not found</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      {/* ================================================================== */}
      {/* HEADER */}
      {/* ================================================================== */}
      <View style={styles.header}>
        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <ProgressBar progress={progress} height={10} />
        </View>

        {/* Hearts display */}
        <View style={styles.heartsContainer}>
          <Feather name="heart" size={20} color="#EF4444" />
          <ThemedText style={styles.heartsText}>{attemptHearts}</ThemedText>
        </View>
      </View>

      {/* Review mode notice or XP display */}
      {isAlreadyCompleted ? (
        <View style={[styles.reviewBanner, { backgroundColor: theme.primary + '15' }]}>
          <Feather name="refresh-cw" size={14} color={theme.primary} />
          <ThemedText style={[styles.reviewBannerText, { color: theme.primary }]}>
            Review Mode - No rewards
          </ThemedText>
        </View>
      ) : (
        <Animated.View style={[styles.xpContainer, xpAnimatedStyle]}>
          <ThemedText style={[styles.xpText, { color: theme.primary }]}>
            +{xpEarned} XP
          </ThemedText>
        </Animated.View>
      )}

      <Spacer height={Spacing.lg} />

      {/* ================================================================== */}
      {/* QUESTION CONTENT */}
      {/* ================================================================== */}
      <ScrollView 
        style={styles.questionScrollView}
        contentContainerStyle={styles.questionContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Question counter with difficulty indicator */}
        <View style={styles.questionHeaderRow}>
          <ThemedText style={[styles.questionCounter, { color: theme.textSecondary }]}>
            Question {currentIndex + 1} of {questionQueue.length}
          </ThemedText>
          
          {/* Difficulty tier badge for adaptive mode */}
          {currentQueueItem?.difficultyTier && (
            <View style={[
              styles.difficultyBadge,
              { 
                backgroundColor: currentQueueItem.difficultyTier === 1 
                  ? '#10B981'  // Green for easy
                  : currentQueueItem.difficultyTier === 2 
                    ? '#F59E0B'  // Yellow for medium
                    : '#EF4444', // Red for hard
              }
            ]}>
              <ThemedText style={styles.difficultyBadgeText}>
                {currentQueueItem.difficultyTier === 1 ? 'Easy' : 
                 currentQueueItem.difficultyTier === 2 ? 'Medium' : 'Hard'}
              </ThemedText>
            </View>
          )}
        </View>
        
        {/* Show concept mastery progress in adaptive mode */}
        {module?.conceptVariants && (
          <ThemedText style={[styles.conceptProgress, { color: theme.textSecondary }]}>
            {masteredConcepts.size} of {module.conceptVariants.length} concepts mastered
          </ThemedText>
        )}
        
        {/* Show practice indicator for penalty cascade */}
        {currentQueueItem?.isPenalty && (
          <ThemedText style={[styles.practiceLabel, { color: theme.primary }]}>
            Review Question
          </ThemedText>
        )}

        {/* AI-generated question indicator */}
        {currentQuestion && currentQuestion.id.startsWith('ai-') && (
          <View style={styles.aiBadgeContainer}>
            <View style={styles.aiBadge}>
              <Feather name="cpu" size={12} color="#FFFFFF" />
              <ThemedText style={styles.aiBadgeText}>AI Generated</ThemedText>
            </View>
          </View>
        )}

        <Spacer height={Spacing.lg} />

        {/* Question component */}
        {currentQuestion && (
          <QuestionRenderer
            key={`${currentIndex}-${currentQuestion.id}`}
            question={currentQuestion}
            onAnswer={handleAnswer}
            disabled={isAnswered}
            showResult={isAnswered}
            isCorrect={lastAnswerCorrect}
          />
        )}

        <Spacer height={Spacing['2xl']} />
      </ScrollView>

      {/* ================================================================== */}
      {/* EXPLANATION MODAL */}
      {/* ================================================================== */}
      <Modal
        visible={isAnswered}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={[
            styles.explanationModal, 
            { 
              backgroundColor: theme.card,
              borderTopColor: lastAnswerCorrect ? '#22C55E' : '#EF4444',
            }
          ]}>
            {/* Result icon */}
            <View style={[
              styles.resultIconContainer,
              { backgroundColor: lastAnswerCorrect ? '#22C55E' : '#EF4444' }
            ]}>
              <Feather 
                name={lastAnswerCorrect ? 'check' : 'x'} 
                size={32} 
                color="#FFFFFF" 
              />
            </View>

            <Spacer height={Spacing.md} />

            {/* Result text */}
            <ThemedText style={styles.resultTitle}>
              {lastAnswerCorrect ? 'Correct!' : 'Not quite...'}
            </ThemedText>

            {!lastAnswerCorrect && !currentQueueItem?.isPenalty && (
              <>
                <Spacer height={Spacing.sm} />
                <ThemedText style={[styles.penaltyNote, { color: '#EF4444' }]}>
                  2 practice questions added
                </ThemedText>
              </>
            )}

            <Spacer height={Spacing.md} />

            {/* Explanation */}
            <ThemedText style={[styles.explanationText, { color: theme.textSecondary }]}>
              {currentExplanation}
            </ThemedText>

            <Spacer height={Spacing.xl} />

            {/* Continue button */}
            <Pressable
              onPress={handleContinue}
              style={[
                styles.continueButton,
                { backgroundColor: lastAnswerCorrect ? '#22C55E' : theme.primary }
              ]}
            >
              <ThemedText style={styles.continueButtonText}>
                Continue
              </ThemedText>
            </Pressable>

            <Spacer height={insets.bottom + Spacing.lg} />
          </View>
        </View>
      </Modal>

      {/* ================================================================== */}
      {/* COMPLETION MODAL */}
      {/* ================================================================== */}
      <Modal
        visible={showCompletion}
        animationType="fade"
        transparent={true}
      >
        {/* Confetti celebration */}
        <Confetti visible={showCompletion} count={60} />
        
        <View style={styles.modalOverlay}>
          <View style={[styles.completionModal, { backgroundColor: theme.card }]}>
            {/* Celebration icon */}
            <View style={[styles.celebrationIcon, { backgroundColor: '#22C55E' }]}>
              <Feather name="award" size={48} color="#FFFFFF" />
            </View>

            <Spacer height={Spacing.lg} />

            <ThemedText style={styles.completionTitle}>
              {isAlreadyCompleted ? 'Review Complete!' : 'Quiz Complete!'}
            </ThemedText>

            <Spacer height={Spacing.sm} />

            <ThemedText style={[styles.completionSubtitle, { color: theme.textSecondary }]}>
              {module.title}
            </ThemedText>

            {isAlreadyCompleted ? (
              <>
                <Spacer height={Spacing.md} />
                <View style={[styles.reviewNotice, { backgroundColor: theme.primary + '15' }]}>
                  <Feather name="info" size={16} color={theme.primary} />
                  <ThemedText style={[styles.reviewNoticeText, { color: theme.primary }]}>
                    This is a review. No hearts or XP awarded for repeated quizzes.
                  </ThemedText>
                </View>
              </>
            ) : null}

            <Spacer height={Spacing.xl} />

            {/* Stats */}
            <View style={styles.statsContainer}>
              {/* Accuracy */}
              <View style={styles.statItem}>
                <Feather name="target" size={24} color={theme.primary} />
                <ThemedText style={styles.statValue}>
                  {Math.round((totalCorrect / totalAttempts) * 100)}%
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
                  Accuracy
                </ThemedText>
              </View>

              {!isAlreadyCompleted ? (
                <>
                  {/* XP Earned */}
                  <View style={styles.statItem}>
                    <Feather name="zap" size={24} color="#EAB308" />
                    <ThemedText style={styles.statValue}>
                      +{xpEarned}
                    </ThemedText>
                    <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
                      XP Earned
                    </ThemedText>
                  </View>

                  {/* Hearts Earned */}
                  <View style={styles.statItem}>
                    <Feather name="heart" size={24} color="#EF4444" />
                    <ThemedText style={styles.statValue}>
                      +{heartsEarned}
                    </ThemedText>
                    <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
                      Hearts
                    </ThemedText>
                  </View>
                </>
              ) : null}
            </View>

            <Spacer height={Spacing.xl} />

            {/* Perfect score message */}
            {totalCorrect === totalAttempts && !isAlreadyCompleted ? (
              <>
                <View style={[styles.perfectBadge, { backgroundColor: '#22C55E20' }]}>
                  <Feather name="star" size={20} color="#22C55E" />
                  <ThemedText style={{ color: '#22C55E', marginLeft: Spacing.sm, fontWeight: '600' }}>
                    Perfect Score!
                  </ThemedText>
                </View>
                <Spacer height={Spacing.lg} />
              </>
            ) : null}

            {/* Continue button */}
            <Pressable
              onPress={handleCompletionClose}
              style={[styles.completeButton, { backgroundColor: theme.primary }]}
            >
              <ThemedText style={styles.completeButtonText}>
                Continue
              </ThemedText>
            </Pressable>

            <Spacer height={insets.bottom} />
          </View>
        </View>
      </Modal>

      {/* ================================================================== */}
      {/* COURSE CERTIFICATE MODAL */}
      {/* ================================================================== */}
      <Modal
        visible={showCertificateModal}
        animationType="fade"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.certificateModal, { backgroundColor: theme.card }]}>
            {(() => {
              const course = newCertificateCourseId ? getCourseById(newCertificateCourseId) : undefined;
              if (!course) return null;
              return (
                <>
                  <View style={[styles.certificateIconBadge, { backgroundColor: course.color + '20' }]}>
                    <Feather name={course.icon as any} size={48} color={course.color} />
                  </View>
                  <Spacer height={Spacing.lg} />
                  <ThemedText style={styles.certificateTitle}>Certificate Unlocked!</ThemedText>
                  <Spacer height={Spacing.sm} />
                  <ThemedText style={[styles.certificateSubtitle, { color: theme.textSecondary }]}>
                    Congratulations! You completed
                  </ThemedText>
                  <ThemedText style={[styles.certificateCourseName, { color: course.color }]}>
                    {course.title}
                  </ThemedText>
                  <Spacer height={Spacing.lg} />
                  <Pressable
                    onPress={handleCertificateClose}
                    style={[styles.completeButton, { backgroundColor: theme.primary }]}
                  >
                    <ThemedText style={styles.completeButtonText}>Awesome</ThemedText>
                  </Pressable>
                </>
              );
            })()}
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  progressContainer: {
    flex: 1,
  },
  heartsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heartsText: {
    ...Typography.headline,
    fontWeight: '700',
  },
  xpContainer: {
    alignItems: 'center',
  },
  xpText: {
    ...Typography.headline,
    fontWeight: '700',
  },
  questionScrollView: {
    flex: 1,
  },
  questionContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['2xl'],
  },
  questionCounter: {
    ...Typography.footnote,
    textAlign: 'center',
  },
  questionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  difficultyBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  difficultyBadgeText: {
    ...Typography.caption,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 10,
  },
  conceptProgress: {
    ...Typography.caption,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  practiceLabel: {
    ...Typography.footnote,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  aiBadgeContainer: {
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  aiBadgeText: {
    ...Typography.caption,
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 11,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  explanationModal: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderTopWidth: 4,
    alignItems: 'center',
  },
  resultIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultTitle: {
    ...Typography.title,
    fontWeight: '700',
  },
  penaltyNote: {
    ...Typography.footnote,
    fontWeight: '600',
  },
  explanationText: {
    ...Typography.body,
    textAlign: 'center',
    lineHeight: 22,
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
    fontWeight: '600',
  },
  completionModal: {
    margin: Spacing.lg,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  certificateModal: {
    margin: Spacing.lg,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  certificateIconBadge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  certificateTitle: {
    ...Typography.largeTitle,
    fontWeight: '700',
    textAlign: 'center',
  },
  certificateSubtitle: {
    ...Typography.body,
    textAlign: 'center',
  },
  certificateCourseName: {
    ...Typography.title,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
  },
  celebrationIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completionTitle: {
    ...Typography.largeTitle,
    fontWeight: '700',
  },
  completionSubtitle: {
    ...Typography.body,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    ...Typography.title,
    fontWeight: '700',
    marginTop: Spacing.xs,
  },
  statLabel: {
    ...Typography.caption,
    marginTop: 2,
  },
  perfectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  completeButton: {
    width: '100%',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  completeButtonText: {
    ...Typography.headline,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  reviewNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  reviewNoticeText: {
    ...Typography.footnote,
    fontWeight: '500',
    flex: 1,
  },
  reviewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  reviewBannerText: {
    ...Typography.caption,
    fontWeight: '600',
  },
});
