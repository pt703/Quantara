// =============================================================================
// PRE-ASSESSMENT SCREEN
// =============================================================================
// 
// This screen evaluates a user's baseline financial literacy when they first
// enter a course. The assessment covers:
// - Budgeting skills (50/30/20 rule, expense tracking)
// - Saving fundamentals (emergency funds, savings vehicles)
// - Assets vs Liabilities (what appreciates, what depreciates)
// - Banking basics (where to store money, account types)
//
// After completing the assessment:
// 1. Skill levels are updated based on performance per category
// 2. The LinUCB algorithm uses these as initial context features
// 3. Lessons are personalized toward areas of weakness
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
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ProgressBar } from '@/components/ProgressBar';
import Spacer from '@/components/Spacer';
import { QuestionRenderer, QuestionResult } from '@/components/QuestionTypes';
import { useTheme } from '@/hooks/useTheme';
import { useAdaptiveLearning } from '@/hooks/useAdaptiveLearning';
import { useGamification } from '@/hooks/useGamification';
import { Spacing, BorderRadius, Typography } from '@/constants/theme';
import { Question, SkillDomain, MCQQuestion, TrueFalseQuestion, ScenarioQuestion } from '../types';
import { LearnStackParamList } from '../navigation/LearnStackNavigator';
import { getCourseById } from '../mock/courses';

// =============================================================================
// TYPES
// =============================================================================

type PreAssessmentScreenProps = {
  navigation: NativeStackNavigationProp<LearnStackParamList, 'PreAssessment'>;
  route: RouteProp<LearnStackParamList, 'PreAssessment'>;
};

type AssessmentQuestion = (MCQQuestion | TrueFalseQuestion | ScenarioQuestion) & {
  skillDomain: SkillDomain;
};

interface SkillResult {
  domain: SkillDomain;
  correct: number;
  total: number;
  percentage: number;
}

// =============================================================================
// ASSESSMENT QUESTIONS
// =============================================================================
// These questions test baseline knowledge across all skill domains.
// Each question is tagged with a skillDomain for tracking.

const GENERAL_ASSESSMENT_QUESTIONS: AssessmentQuestion[] = [
  // BUDGETING QUESTIONS
  {
    id: 'assess-budget-1',
    type: 'mcq',
    skillDomain: 'budgeting',
    question: 'In the 50/30/20 budgeting rule, what does the 50% represent?',
    options: [
      'Wants and entertainment',
      'Needs like rent, utilities, groceries',
      'Savings and debt payments',
      'Emergency fund contributions',
    ],
    correctAnswer: 1,
    explanation: 'The 50/30/20 rule allocates 50% to needs (essentials like housing, food, utilities), 30% to wants (entertainment, dining out), and 20% to savings/debt.',
    xpReward: 15,
    difficulty: 'beginner',
  } as AssessmentQuestion & MCQQuestion,
  {
    id: 'assess-budget-2',
    type: 'true_false',
    skillDomain: 'budgeting',
    question: 'A budget should only account for fixed expenses, not variable ones.',
    correctAnswer: false,
    explanation: 'A complete budget includes both fixed expenses (rent, insurance) AND variable expenses (groceries, entertainment) to give you a full picture of your spending.',
    xpReward: 10,
    difficulty: 'beginner',
  } as AssessmentQuestion & TrueFalseQuestion,
  {
    id: 'assess-budget-3',
    type: 'mcq',
    skillDomain: 'budgeting',
    question: 'Which expense category typically takes the largest portion of a household budget?',
    options: [
      'Entertainment',
      'Food and groceries',
      'Housing (rent/mortgage)',
      'Transportation',
    ],
    correctAnswer: 2,
    explanation: 'Housing (rent or mortgage payments) is typically the largest expense, often consuming 25-35% of household income. This is why keeping housing costs reasonable is crucial for financial health.',
    xpReward: 15,
    difficulty: 'beginner',
  } as AssessmentQuestion & MCQQuestion,

  // SAVING QUESTIONS
  {
    id: 'assess-save-1',
    type: 'mcq',
    skillDomain: 'saving',
    question: 'How many months of expenses should an ideal emergency fund cover?',
    options: [
      '1-2 months',
      '3-6 months',
      '1 year',
      '2 years',
    ],
    correctAnswer: 1,
    explanation: 'Financial experts recommend having 3-6 months of living expenses saved in an emergency fund. This provides a safety net for job loss, medical emergencies, or unexpected repairs.',
    xpReward: 15,
    difficulty: 'beginner',
  } as AssessmentQuestion & MCQQuestion,
  {
    id: 'assess-save-2',
    type: 'scenario',
    skillDomain: 'saving',
    question: 'Choose where to keep your emergency fund:',
    scenario: 'You have $10,000 saved for emergencies. You need this money to be safe and accessible at any time. Where should you put it?',
    options: [
      { text: 'Stock market for higher returns', outcome: 'Stocks can lose value quickly. You might need the money when the market is down.', impactScore: -50 },
      { text: 'High-yield savings account', outcome: 'Perfect! Your money is FDIC insured, earns interest, and is accessible anytime.', impactScore: 100 },
      { text: 'Under your mattress at home', outcome: 'Cash at home earns no interest and could be lost to theft or fire.', impactScore: -30 },
      { text: 'Cryptocurrency', outcome: 'Crypto is highly volatile. Your $10K could become $5K overnight.', impactScore: -70 },
    ],
    bestOptionIndex: 1,
    explanation: 'Emergency funds should be in a high-yield savings account: FDIC insured (up to $250K), earns some interest, and instantly accessible when needed.',
    xpReward: 25,
    difficulty: 'intermediate',
  } as AssessmentQuestion & ScenarioQuestion,

  // ASSETS VS LIABILITIES
  {
    id: 'assess-asset-1',
    type: 'mcq',
    skillDomain: 'investing',
    question: 'Which of these is considered an ASSET?',
    options: [
      'Car loan',
      'Credit card balance',
      'Rental property generating income',
      'Student loan',
    ],
    correctAnswer: 2,
    explanation: 'An asset is something that puts money IN your pocket. A rental property that generates income is an asset. Loans and debts are liabilities because they take money OUT of your pocket.',
    xpReward: 15,
    difficulty: 'beginner',
  } as AssessmentQuestion & MCQQuestion,
  {
    id: 'assess-asset-2',
    type: 'true_false',
    skillDomain: 'investing',
    question: 'Your personal car that you drive to work is typically considered an asset that appreciates in value.',
    correctAnswer: false,
    explanation: 'Cars typically DEPRECIATE (lose value) over time. A new car can lose 20% of its value in the first year alone. While technically an asset on your balance sheet, it loses value rather than building wealth.',
    xpReward: 15,
    difficulty: 'beginner',
  } as AssessmentQuestion & TrueFalseQuestion,
  {
    id: 'assess-asset-3',
    type: 'mcq',
    skillDomain: 'investing',
    question: 'Which of these typically APPRECIATES (gains value) over time?',
    options: [
      'Electronics and gadgets',
      'New car',
      'Diversified stock index fund',
      'Designer clothing',
    ],
    correctAnswer: 2,
    explanation: 'Historically, diversified stock index funds have appreciated an average of 7-10% per year over long periods. Electronics, cars, and clothing typically lose value over time.',
    xpReward: 15,
    difficulty: 'intermediate',
  } as AssessmentQuestion & MCQQuestion,

  // BANKING BASICS
  {
    id: 'assess-bank-1',
    type: 'scenario',
    skillDomain: 'saving',
    question: 'Choose the best place for your savings:',
    scenario: 'You have $5,000 that you want to save for a down payment on a car in 2 years. You want your money to be safe and grow a little. Where do you put it?',
    options: [
      { text: 'Checking account (0.01% APY)', outcome: 'Safe but earns almost nothing. After 2 years, you earn about $1 in interest.', impactScore: 20 },
      { text: 'High-yield savings (4.5% APY)', outcome: 'Great choice! After 2 years, you earn about $450 in interest while staying safe.', impactScore: 100 },
      { text: 'Individual stocks', outcome: 'Too risky for a 2-year goal. The market could be down when you need the money.', impactScore: -40 },
      { text: 'Certificate of Deposit (CD)', outcome: 'Good choice! CDs offer guaranteed returns but your money is locked up.', impactScore: 70 },
    ],
    bestOptionIndex: 1,
    explanation: 'For short-term savings goals (1-3 years), a high-yield savings account offers the best balance of safety, accessibility, and returns.',
    xpReward: 25,
    difficulty: 'intermediate',
  } as AssessmentQuestion & ScenarioQuestion,
  {
    id: 'assess-bank-2',
    type: 'mcq',
    skillDomain: 'saving',
    question: 'What does FDIC insurance protect?',
    options: [
      'Your stock investments',
      'Your cryptocurrency holdings',
      'Bank deposits up to $250,000',
      'Your retirement accounts only',
    ],
    correctAnswer: 2,
    explanation: 'FDIC insurance protects bank deposits (checking, savings, CDs) up to $250,000 per depositor per bank. It does NOT cover stocks, crypto, or other investments.',
    xpReward: 15,
    difficulty: 'beginner',
  } as AssessmentQuestion & MCQQuestion,

  // CREDIT QUESTIONS
  {
    id: 'assess-credit-1',
    type: 'mcq',
    skillDomain: 'credit',
    question: 'What factor has the BIGGEST impact on your credit score?',
    options: [
      'How much money you have in savings',
      'Your payment history (paying on time)',
      'Your income level',
      'The number of bank accounts you have',
    ],
    correctAnswer: 1,
    explanation: 'Payment history accounts for about 35% of your credit score - the largest single factor. Paying bills on time consistently is the best way to build good credit.',
    xpReward: 15,
    difficulty: 'beginner',
  } as AssessmentQuestion & MCQQuestion,
  {
    id: 'assess-credit-2',
    type: 'true_false',
    skillDomain: 'credit',
    question: 'Closing old credit cards always improves your credit score.',
    correctAnswer: false,
    explanation: 'Closing old cards can HURT your score because it: 1) Reduces your total available credit (increasing utilization), and 2) Shortens your credit history length. Keep old cards open with small occasional purchases.',
    xpReward: 15,
    difficulty: 'intermediate',
  } as AssessmentQuestion & TrueFalseQuestion,

  // DEBT QUESTIONS
  {
    id: 'assess-debt-1',
    type: 'mcq',
    skillDomain: 'debt',
    question: 'Which debt payoff strategy focuses on paying the smallest balance first?',
    options: [
      'Avalanche method',
      'Snowball method',
      'Waterfall method',
      'Minimum payment method',
    ],
    correctAnswer: 1,
    explanation: 'The Snowball method pays off the smallest debt first for quick wins and motivation. The Avalanche method pays highest interest first to minimize total interest paid.',
    xpReward: 15,
    difficulty: 'intermediate',
  } as AssessmentQuestion & MCQQuestion,
  {
    id: 'assess-debt-2',
    type: 'scenario',
    skillDomain: 'debt',
    question: 'Choose how to handle multiple debts:',
    scenario: 'You have 3 debts: Credit card at 22% APR ($2,000), Car loan at 6% APR ($8,000), Student loan at 4% APR ($15,000). You have extra $200/month to put toward debt. Which debt should you prioritize?',
    options: [
      { text: 'Student loan (largest balance)', outcome: 'Paying the largest balance feels productive but costs you more in high-interest debt.', impactScore: 10 },
      { text: 'Car loan (medium balance)', outcome: 'Not the best choice. You are paying more interest on your credit card.', impactScore: 20 },
      { text: 'Credit card (highest interest)', outcome: 'Smart! Paying off high-interest debt first saves you the most money over time.', impactScore: 100 },
      { text: 'Split equally between all three', outcome: 'This approach pays more total interest than focusing on high-rate debt first.', impactScore: 30 },
    ],
    bestOptionIndex: 2,
    explanation: 'The Avalanche method (highest interest first) saves the most money. A 22% credit card costs much more than a 4% student loan, so focus extra payments there.',
    xpReward: 25,
    difficulty: 'intermediate',
  } as AssessmentQuestion & ScenarioQuestion,
];

const INVESTING_ASSESSMENT_QUESTIONS: AssessmentQuestion[] = [
  {
    id: 'assess-inv-1',
    type: 'mcq',
    skillDomain: 'investing',
    question: 'What is the primary long-term reason people invest?',
    options: [
      'To guarantee no losses',
      'To try to grow purchasing power above inflation',
      'To avoid having any budget',
      'To make money every single day',
    ],
    correctAnswer: 1,
    explanation: 'Correct. Investing aims to grow wealth over time and preserve purchasing power against inflation.',
    xpReward: 15,
    difficulty: 'beginner',
  } as AssessmentQuestion & MCQQuestion,
  {
    id: 'assess-inv-2',
    type: 'true_false',
    skillDomain: 'investing',
    question: 'A broad index fund usually gives more diversification than buying one stock.',
    correctAnswer: true,
    explanation: 'Correct. Index funds hold many companies, reducing single-company risk.',
    xpReward: 10,
    difficulty: 'beginner',
  } as AssessmentQuestion & TrueFalseQuestion,
  {
    id: 'assess-inv-3',
    type: 'mcq',
    skillDomain: 'investing',
    question: 'If inflation is 5% and your cash earns 1%, your approximate real return is:',
    options: ['+4%', '0%', '-4%', '+6%'],
    correctAnswer: 2,
    explanation: 'Approximate real return is nominal return minus inflation: 1% - 5% = -4%.',
    xpReward: 15,
    difficulty: 'beginner',
  } as AssessmentQuestion & MCQQuestion,
  {
    id: 'assess-inv-4',
    type: 'mcq',
    skillDomain: 'investing',
    question: 'Which is generally best for an emergency fund?',
    options: [
      'High-yield savings account',
      'Single growth stock',
      'Cryptocurrency',
      'Leveraged ETF',
    ],
    correctAnswer: 0,
    explanation: 'Emergency funds should be safe and liquid, typically in high-yield savings.',
    xpReward: 15,
    difficulty: 'beginner',
  } as AssessmentQuestion & MCQQuestion,
  {
    id: 'assess-inv-5',
    type: 'scenario',
    skillDomain: 'investing',
    question: 'Choose the best beginner investing approach:',
    scenario: 'You are new to investing, have stable income, emergency fund in place, and want long-term growth.',
    options: [
      { text: 'Put all money in one popular stock', outcome: 'High concentration risk for a beginner.', impactScore: 20 },
      { text: 'Use a diversified low-cost index fund with monthly auto-investing', outcome: 'Strong beginner framework with discipline and diversification.', impactScore: 100 },
      { text: 'Trade options daily', outcome: 'Too advanced and high-risk for most beginners.', impactScore: -40 },
      { text: 'Wait forever for perfect entry', outcome: 'Delays compounding and creates timing paralysis.', impactScore: 10 },
    ],
    bestOptionIndex: 1,
    explanation: 'A diversified, low-cost, automated approach is usually a strong beginner baseline.',
    xpReward: 25,
    difficulty: 'intermediate',
  } as AssessmentQuestion & ScenarioQuestion,
  {
    id: 'assess-inv-6',
    type: 'mcq',
    skillDomain: 'investing',
    question: 'What does asset allocation mean?',
    options: [
      'Choosing only one stock',
      'Splitting money across asset classes like stocks and bonds',
      'Timing daily market movements',
      'Only maximizing dividend yield',
    ],
    correctAnswer: 1,
    explanation: 'Asset allocation is the strategic split across asset classes and is a key risk/return driver.',
    xpReward: 15,
    difficulty: 'intermediate',
  } as AssessmentQuestion & MCQQuestion,
  {
    id: 'assess-inv-7',
    type: 'true_false',
    skillDomain: 'investing',
    question: 'Dollar-cost averaging means investing a fixed amount on a regular schedule.',
    correctAnswer: true,
    explanation: 'Correct. DCA supports consistency and reduces emotional timing decisions.',
    xpReward: 10,
    difficulty: 'beginner',
  } as AssessmentQuestion & TrueFalseQuestion,
  {
    id: 'assess-inv-8',
    type: 'mcq',
    skillDomain: 'investing',
    question: 'What is a key risk when a few mega-cap stocks dominate an index?',
    options: [
      'No risk increase at all',
      'Portfolio becomes more sensitive to those few names',
      'Index becomes a bond fund',
      'It automatically guarantees higher returns',
    ],
    correctAnswer: 1,
    explanation: 'Higher concentration means performance depends more on fewer companies.',
    xpReward: 15,
    difficulty: 'intermediate',
  } as AssessmentQuestion & MCQQuestion,
  {
    id: 'assess-inv-9',
    type: 'mcq',
    skillDomain: 'investing',
    question: 'Which is typically active income?',
    options: [
      'Salary from your job',
      'Dividend payout',
      'Bond coupon from holdings',
      'Rental income from paid-off property',
    ],
    correctAnswer: 0,
    explanation: 'Salary is usually active income because it requires your ongoing time/labor.',
    xpReward: 15,
    difficulty: 'beginner',
  } as AssessmentQuestion & MCQQuestion,
  {
    id: 'assess-inv-10',
    type: 'mcq',
    skillDomain: 'investing',
    question: 'A house with a mortgage is best viewed as:',
    options: [
      'Only a liability',
      'Only an asset',
      'A property asset with a loan liability',
      'Neither',
    ],
    correctAnswer: 2,
    explanation: 'The property is an asset while the mortgage is a liability.',
    xpReward: 15,
    difficulty: 'beginner',
  } as AssessmentQuestion & MCQQuestion,
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function PreAssessmentScreen({ navigation, route }: PreAssessmentScreenProps) {
  const { courseId } = route.params;
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  
  const course = useMemo(() => getCourseById(courseId), [courseId]);
  
  const { markCourseAssessed, storeBaselineAssessment } = useAdaptiveLearning(0);
  const { gainXP } = useGamification();

  // ==========================================================================
  // STATE
  // ==========================================================================

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [showIntro, setShowIntro] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  
  // Domain selector - users can choose which skill area to focus on first
  // After completing assessment, this lets users pick their learning path
  const [selectedDomain, setSelectedDomain] = useState<SkillDomain | null>(null);

  const assessmentQuestions = useMemo(() => {
    return courseId === 'course-investing-essentials'
      ? INVESTING_ASSESSMENT_QUESTIONS
      : GENERAL_ASSESSMENT_QUESTIONS;
  }, [courseId]);

  const currentQuestion = assessmentQuestions[currentQuestionIndex];
  const totalQuestions = assessmentQuestions.length;
  const progress = ((currentQuestionIndex) / totalQuestions) * 100;

  // ==========================================================================
  // CALCULATE RESULTS BY SKILL DOMAIN
  // ==========================================================================

  const skillResults = useMemo((): SkillResult[] => {
    const domains: SkillDomain[] = ['budgeting', 'saving', 'debt', 'credit', 'investing'];
    
    return domains.map(domain => {
      const domainQuestions = assessmentQuestions.filter(q => q.skillDomain === domain);
      const correct = domainQuestions.filter(q => answers[q.id] === true).length;
      const total = domainQuestions.length;
      const percentage = total > 0 ? (correct / total) * 100 : 0;
      
      return { domain, correct, total, percentage };
    });
  }, [answers, assessmentQuestions]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleStartAssessment = useCallback(() => {
    setShowIntro(false);
  }, []);

  const handleAnswer = useCallback((result: QuestionResult) => {
    if (!currentQuestion) return;
    const questionId = currentQuestion.id;
    
    setAnswers(prev => ({
      ...prev,
      [questionId]: result.isCorrect,
    }));

    if (result.isCorrect) {
      setXpEarned(prev => prev + result.xpEarned);
    }

    setTimeout(() => {
      if (currentQuestionIndex >= totalQuestions - 1) {
        setShowResults(true);
      } else {
        setCurrentQuestionIndex(prev => prev + 1);
      }
    }, 1500);
  }, [currentQuestion, currentQuestionIndex, totalQuestions]);

  // Complete assessment - stores baseline for bandit but does NOT update displayed skills
  // Displayed skills only update from actual lesson completion
  const handleComplete = useCallback(() => {
    // Store baseline assessment results for the contextual bandit
    // This influences recommendations but doesn't show as progress
    storeBaselineAssessment(courseId, skillResults);

    markCourseAssessed(courseId);
    gainXP(xpEarned);

    // Navigate to first lesson in the course
    if (course && course.lessons.length > 0) {
      navigation.replace('LessonPlayer', {
        courseId: courseId,
        lessonId: course.lessons[0].id,
      });
    } else {
      navigation.replace('Learn');
    }
  }, [skillResults, storeBaselineAssessment, markCourseAssessed, courseId, course, gainXP, xpEarned, navigation]);

  // Skip assessment - go to course overview (CourseDetail)
  const handleSkip = useCallback(() => {
    markCourseAssessed(courseId);
    navigation.replace('CourseDetail', {
      courseId,
    });
  }, [markCourseAssessed, courseId, navigation]);

  // ==========================================================================
  // RENDER INTRO SCREEN
  // ==========================================================================

  if (showIntro) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <Animated.View 
          entering={FadeIn}
          style={styles.introContainer}
        >
          <View style={[styles.iconContainer, { backgroundColor: theme.primary + '20' }]}>
            <Feather name="clipboard" size={48} color={theme.primary} />
          </View>

          <Spacer height={Spacing.xl} />

          <ThemedText style={styles.introTitle}>
            Test Your Skills
          </ThemedText>

          <Spacer height={Spacing.md} />

          <ThemedText style={[styles.introSubtitle, { color: theme.textSecondary }]}>
            Before starting {course?.title || 'this course'}, let us see what you already know. This helps us personalize your learning.
          </ThemedText>

          <Spacer height={Spacing.xl} />

          <View style={styles.infoBox}>
            <View style={styles.infoItem}>
              <Feather name="help-circle" size={20} color={theme.primary} />
              <ThemedText style={styles.infoText}>
                {totalQuestions} questions
              </ThemedText>
            </View>
            <View style={styles.infoItem}>
              <Feather name="clock" size={20} color={theme.primary} />
              <ThemedText style={styles.infoText}>
                About 5 minutes
              </ThemedText>
            </View>
            <View style={styles.infoItem}>
              <Feather name="zap" size={20} color={theme.primary} />
              <ThemedText style={styles.infoText}>
                Earn XP for correct answers
              </ThemedText>
            </View>
          </View>

          <Spacer height={Spacing['2xl']} />

          <Pressable
            onPress={handleStartAssessment}
            style={[styles.startButton, { backgroundColor: theme.primary }]}
          >
            <ThemedText style={styles.startButtonText}>
              Start Assessment
            </ThemedText>
          </Pressable>

          <Spacer height={Spacing.lg} />

          <Pressable onPress={handleSkip}>
            <ThemedText style={[styles.skipText, { color: theme.textSecondary }]}>
              Skip for now
            </ThemedText>
          </Pressable>
        </Animated.View>
      </ThemedView>
    );
  }

  // ==========================================================================
  // RENDER RESULTS SCREEN
  // ==========================================================================

  if (showResults) {
    const overallScore = skillResults.reduce((sum, r) => sum + r.percentage, 0) / skillResults.length;
    const weakAreas = skillResults.filter(r => r.percentage < 60);
    const strongAreas = skillResults.filter(r => r.percentage >= 80);

    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <ScrollView 
          contentContainerStyle={styles.resultsContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.iconContainer, { backgroundColor: '#22C55E20' }]}>
            <Feather name="check-circle" size={48} color="#22C55E" />
          </View>

          <Spacer height={Spacing.lg} />

          <ThemedText style={styles.resultsTitle}>
            Assessment Complete!
          </ThemedText>

          <Spacer height={Spacing.sm} />

          <ThemedText style={[styles.resultsSubtitle, { color: theme.textSecondary }]}>
            Your overall score: {Math.round(overallScore)}%
          </ThemedText>

          <Spacer height={Spacing.lg} />

          <View style={[styles.xpBadge, { backgroundColor: theme.primary + '20' }]}>
            <Feather name="zap" size={20} color={theme.primary} />
            <ThemedText style={[styles.xpBadgeText, { color: theme.primary }]}>
              +{xpEarned} XP earned
            </ThemedText>
          </View>

          <Spacer height={Spacing.xl} />

          <ThemedText style={styles.sectionTitle}>Your Skills</ThemedText>

          <Spacer height={Spacing.md} />

          {skillResults.map(result => (
            <View key={result.domain} style={styles.skillRow}>
              <View style={styles.skillInfo}>
                <ThemedText style={styles.skillName}>
                  {result.domain.charAt(0).toUpperCase() + result.domain.slice(1)}
                </ThemedText>
                <ThemedText style={[styles.skillScore, { color: theme.textSecondary }]}>
                  {result.correct}/{result.total} correct
                </ThemedText>
              </View>
              <View style={styles.skillBarContainer}>
                <View 
                  style={[
                    styles.skillBar, 
                    { 
                      width: `${result.percentage}%`,
                      backgroundColor: result.percentage >= 80 ? '#22C55E' :
                        result.percentage >= 60 ? '#EAB308' : '#EF4444',
                    }
                  ]} 
                />
              </View>
              <ThemedText style={styles.skillPercentage}>
                {Math.round(result.percentage)}%
              </ThemedText>
            </View>
          ))}

          <Spacer height={Spacing.xl} />

          {weakAreas.length > 0 && (
            <>
              <View style={[styles.insightBox, { backgroundColor: '#EF444420', borderColor: '#EF4444' }]}>
                <Feather name="target" size={20} color="#EF4444" />
                <View style={styles.insightContent}>
                  <ThemedText style={[styles.insightTitle, { color: '#EF4444' }]}>
                    Areas to Focus On
                  </ThemedText>
                  <ThemedText style={styles.insightText}>
                    {weakAreas.map(a => a.domain.charAt(0).toUpperCase() + a.domain.slice(1)).join(', ')}
                  </ThemedText>
                </View>
              </View>
              <Spacer height={Spacing.md} />
            </>
          )}

          {strongAreas.length > 0 && (
            <>
              <View style={[styles.insightBox, { backgroundColor: '#22C55E20', borderColor: '#22C55E' }]}>
                <Feather name="star" size={20} color="#22C55E" />
                <View style={styles.insightContent}>
                  <ThemedText style={[styles.insightTitle, { color: '#22C55E' }]}>
                    Your Strengths
                  </ThemedText>
                  <ThemedText style={styles.insightText}>
                    {strongAreas.map(a => a.domain.charAt(0).toUpperCase() + a.domain.slice(1)).join(', ')}
                  </ThemedText>
                </View>
              </View>
              <Spacer height={Spacing.md} />
            </>
          )}

          <Spacer height={Spacing.lg} />

          <ThemedText style={[styles.personalizationText, { color: theme.textSecondary }]}>
            Your lessons will now be personalized based on these results.
          </ThemedText>

          <Spacer height={Spacing.xl} />

          {/* Domain Selector - Let users choose their focus area */}
          <ThemedText style={styles.sectionTitle}>Choose Your Focus</ThemedText>
          <Spacer height={Spacing.sm} />
          <ThemedText style={[styles.domainSelectorSubtitle, { color: theme.textSecondary }]}>
            Select which skill you want to improve first:
          </ThemedText>
          <Spacer height={Spacing.md} />

          <View style={styles.domainSelectorGrid}>
            {skillResults.map(result => {
              const isSelected = selectedDomain === result.domain;
              const isWeak = result.percentage < 60;
              
              return (
                <Pressable
                  key={result.domain}
                  onPress={() => setSelectedDomain(result.domain)}
                  style={[
                    styles.domainCard,
                    { 
                      backgroundColor: isSelected ? theme.primary + '20' : theme.card,
                      borderColor: isSelected ? theme.primary : theme.border,
                    }
                  ]}
                >
                  <View style={styles.domainCardHeader}>
                    <ThemedText style={[
                      styles.domainCardTitle,
                      isSelected && { color: theme.primary }
                    ]}>
                      {result.domain.charAt(0).toUpperCase() + result.domain.slice(1)}
                    </ThemedText>
                    {isWeak && (
                      <View style={[styles.recommendedBadge, { backgroundColor: '#EF444420' }]}>
                        <ThemedText style={[styles.recommendedText, { color: '#EF4444' }]}>
                          Needs Work
                        </ThemedText>
                      </View>
                    )}
                  </View>
                  <View style={[styles.domainCardProgress, { backgroundColor: theme.backgroundSecondary }]}>
                    <View 
                      style={[
                        styles.domainCardProgressFill,
                        { 
                          width: `${result.percentage}%`,
                          backgroundColor: isSelected ? theme.primary :
                            result.percentage >= 80 ? '#22C55E' :
                            result.percentage >= 60 ? '#EAB308' : '#EF4444',
                        }
                      ]} 
                    />
                  </View>
                  <ThemedText style={[styles.domainCardScore, { color: theme.textSecondary }]}>
                    {Math.round(result.percentage)}% mastery
                  </ThemedText>
                  {isSelected && (
                    <View style={styles.selectedCheck}>
                      <Feather name="check-circle" size={20} color={theme.primary} />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>

          <Spacer height={Spacing.xl} />

          <Pressable
            onPress={handleComplete}
            style={[
              styles.startButton, 
              { 
                backgroundColor: selectedDomain ? theme.primary : theme.textSecondary,
                opacity: selectedDomain ? 1 : 0.6,
              }
            ]}
            disabled={!selectedDomain}
          >
            <ThemedText style={styles.startButtonText}>
              {selectedDomain 
                ? `Start with ${selectedDomain.charAt(0).toUpperCase() + selectedDomain.slice(1)}`
                : 'Select a Focus Area'}
            </ThemedText>
          </Pressable>
          
          <Spacer height={Spacing.sm} />
          
          <Pressable onPress={handleComplete} style={styles.skipFocusButton}>
            <ThemedText style={[styles.skipFocusText, { color: theme.textSecondary }]}>
              or let the app decide for me
            </ThemedText>
          </Pressable>

          <Spacer height={insets.bottom + Spacing.xl} />
        </ScrollView>
      </ThemedView>
    );
  }

  // ==========================================================================
  // RENDER QUESTION
  // ==========================================================================

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={handleSkip} style={styles.skipButton}>
          <ThemedText style={[styles.skipButtonText, { color: theme.textSecondary }]}>
            Skip
          </ThemedText>
        </Pressable>

        <View style={styles.progressContainer}>
          <ProgressBar progress={progress} height={8} />
        </View>

        <View style={styles.xpDisplay}>
          <Feather name="zap" size={16} color={theme.primary} />
          <ThemedText style={[styles.xpText, { color: theme.primary }]}>
            {xpEarned}
          </ThemedText>
        </View>
      </View>

      <ScrollView 
        style={styles.questionScrollView}
        contentContainerStyle={styles.questionContent}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText style={[styles.questionCounter, { color: theme.textSecondary }]}>
          Question {currentQuestionIndex + 1} of {totalQuestions}
        </ThemedText>

        <Spacer height={Spacing.sm} />

        <View style={[styles.domainBadge, { backgroundColor: theme.primary + '20' }]}>
          <ThemedText style={[styles.domainText, { color: theme.primary }]}>
            {currentQuestion.skillDomain.charAt(0).toUpperCase() + currentQuestion.skillDomain.slice(1)}
          </ThemedText>
        </View>

        <Spacer height={Spacing.lg} />

        <QuestionRenderer
          question={currentQuestion}
          onAnswer={handleAnswer}
          disabled={answers[currentQuestion.id] !== undefined}
          showResult={answers[currentQuestion.id] !== undefined}
          isCorrect={answers[currentQuestion.id] === true}
        />

        <Spacer height={Spacing['3xl']} />
      </ScrollView>
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
  introContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  introTitle: {
    ...Typography.largeTitle,
    textAlign: 'center',
  },
  introSubtitle: {
    ...Typography.body,
    textAlign: 'center',
    maxWidth: 300,
  },
  infoBox: {
    width: '100%',
    maxWidth: 280,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.sm,
  },
  infoText: {
    ...Typography.body,
    marginLeft: Spacing.md,
  },
  startButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing['2xl'],
    borderRadius: BorderRadius.md,
    width: '100%',
    maxWidth: 280,
    alignItems: 'center',
  },
  startButtonText: {
    ...Typography.headline,
    color: '#FFFFFF',
  },
  skipText: {
    ...Typography.body,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  skipButton: {
    marginRight: Spacing.md,
  },
  skipButtonText: {
    ...Typography.body,
  },
  progressContainer: {
    flex: 1,
  },
  xpDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: Spacing.md,
  },
  xpText: {
    ...Typography.headline,
    fontSize: 14,
    marginLeft: Spacing.xs,
  },
  questionScrollView: {
    flex: 1,
  },
  questionContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing['3xl'],
  },
  questionCounter: {
    ...Typography.subhead,
    textAlign: 'center',
  },
  domainBadge: {
    alignSelf: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  domainText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  resultsContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  resultsTitle: {
    ...Typography.largeTitle,
    textAlign: 'center',
  },
  resultsSubtitle: {
    ...Typography.headline,
    textAlign: 'center',
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
  },
  xpBadgeText: {
    ...Typography.headline,
    marginLeft: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.headline,
    alignSelf: 'flex-start',
  },
  skillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.sm,
    width: '100%',
  },
  skillInfo: {
    width: 80,
  },
  skillName: {
    ...Typography.subhead,
    fontSize: 12,
  },
  skillScore: {
    ...Typography.caption,
    fontSize: 10,
  },
  skillBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E5E5',
    borderRadius: 4,
    marginHorizontal: Spacing.sm,
    overflow: 'hidden',
  },
  skillBar: {
    height: '100%',
    borderRadius: 4,
  },
  skillPercentage: {
    ...Typography.subhead,
    width: 40,
    textAlign: 'right',
  },
  insightBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    width: '100%',
  },
  insightContent: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  insightTitle: {
    ...Typography.headline,
    fontSize: 14,
  },
  insightText: {
    ...Typography.body,
    marginTop: Spacing.xs,
  },
  personalizationText: {
    ...Typography.body,
    textAlign: 'center',
  },
  // Domain Selector styles
  domainSelectorSubtitle: {
    ...Typography.body,
    textAlign: 'center',
    alignSelf: 'center',
  },
  domainSelectorGrid: {
    width: '100%',
    gap: Spacing.md,
  },
  domainCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    position: 'relative',
  },
  domainCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  domainCardTitle: {
    ...Typography.headline,
    fontSize: 16,
  },
  recommendedBadge: {
    paddingVertical: 2,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  recommendedText: {
    ...Typography.caption,
    fontSize: 10,
    fontWeight: '600',
  },
  domainCardProgress: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginVertical: Spacing.xs,
  },
  domainCardProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  domainCardScore: {
    ...Typography.caption,
    marginTop: Spacing.xs,
  },
  selectedCheck: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
  },
  skipFocusButton: {
    padding: Spacing.sm,
    alignItems: 'center',
  },
  skipFocusText: {
    ...Typography.body,
    fontSize: 14,
  },
});
