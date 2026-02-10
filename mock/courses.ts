// =============================================================================
// QUANTARA COURSE DATA
// =============================================================================
// 
// This file contains the complete course curriculum for the Quantara app.
// Comprehensive courses with 11 lessons each, covering:
// 1. Money Foundations (Budgeting & Cashflow)
// 2. Credit & Debt Navigation
// 3. Investing Essentials
//
// Each lesson contains a mix of question types for engaging, Duolingo-style
// learning. Question types include MCQ, True/False, Fill-in-blank, Matching,
// Ordering, Scenarios, and Calculations.
//
// =============================================================================

import { 
  Course, 
  Lesson, 
  Question,
  MCQQuestion,
  TrueFalseQuestion,
  FillBlankQuestion,
  MatchingQuestion,
  OrderingQuestion,
  ScenarioQuestion,
  CalculationQuestion,
  LessonModule,
  ReadingModule,
  QuizModule,
  ContentBlock,
  ConceptVariant,
} from '../types';

type RawLesson = Omit<Lesson, 'modules'>;

// =============================================================================
// MODULE GENERATION HELPER
// =============================================================================
// Converts legacy lesson content/questions to the new Coursera-style modules.
// Each lesson gets 4 modules: 3 reading + 1 quiz
// 
// Content blocks support these types:
// - text: Regular paragraphs
// - highlight: Key points (yellow/primary accent)
// - tip: Pro tips (green accent)
// - warning: Important notes (red accent)
// - example: Practical examples (gray background)

function generateModulesForLesson(lesson: {
  id: string;
  title: string;
  content?: string;
  questions: Question[];
  domain: string;
}): LessonModule[] {
  const sanitizeReadingText = (text: string): string => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1')   // remove markdown bold markers
      .replace(/^-\s+/gm, '• ');         // normalize list bullets for mobile readability
  };

  const modules: LessonModule[] = [];
  
  // Parse content into sections for reading modules
  const contentSections = lesson.content?.split('\n## ') || [];
  const mainSection = contentSections[0] || '';
  const subSections = contentSections.slice(1);
  
  // Extract title from main section
  const mainContent = sanitizeReadingText(
    mainSection.replace(/^#\s+.*\n+/, '').trim()
  );
  
  // Reading Module 1: Introduction
  // Sets the stage with overview and why this topic matters
  const introBlocks: ContentBlock[] = [
    {
      type: 'text',
      content: mainContent || `Welcome to this lesson on ${lesson.title}. Let's explore the key concepts that will help you master this topic.`,
      animationPreset: 'fade_in',
    },
    // {
    //   type: 'image',
    //   content: 'Visual summary to anchor the key concept before you continue.',
    //   imageKey: lesson.domain === 'budgeting' ? 'welcome-hero' : 'app-logo',
    //   imageAlt: `${lesson.title} visual`,
    //   animationPreset: 'fade_in',
    // },
  ];
  
  // Add a highlight block if there's a first subsection
  if (subSections[0]) {
    const firstSub = sanitizeReadingText(subSections[0]).split('\n').filter(l => l.trim());
    introBlocks.push({
      type: 'highlight',
      content: firstSub.slice(1).join('\n\n') || firstSub[0],
      animationPreset: 'slide_up',
    });
  }
  
  modules.push({
    id: `${lesson.id}-mod-1`,
    type: 'reading',
    title: 'Introduction',
    estimatedMinutes: 3,
    xpReward: 10,
    contentBlocks: introBlocks,
    conceptTags: [`${lesson.id}-intro`],
  } as ReadingModule);
  
  // Reading Module 2: Key Concepts
  // Core knowledge with highlights and tips
  const conceptBlocks: ContentBlock[] = [];
  
  subSections.slice(1, 3).forEach((section, idx) => {
    const lines = sanitizeReadingText(section).split('\n').filter(l => l.trim());
    const title = lines[0] || '';
    const body = lines.slice(1).join('\n\n');
    
    conceptBlocks.push({
      type: idx === 0 ? 'highlight' : 'tip',
      content: `${title}\n\n${body}`,
      animationPreset: idx === 0 ? 'slide_up' : 'fade_in',
    });
  });
  
  // Add a practical tip if we have limited content
  if (conceptBlocks.length < 2) {
    conceptBlocks.push({
      type: 'tip',
      content: `Remember: Understanding ${lesson.title.toLowerCase()} is essential for building strong financial habits. Take your time with this material.`,
      animationPreset: 'fade_in',
    });
  }
  
  modules.push({
    id: `${lesson.id}-mod-2`,
    type: 'reading',
    title: 'Key Concepts',
    estimatedMinutes: 3,
    xpReward: 10,
    contentBlocks: conceptBlocks,
    conceptTags: [`${lesson.id}-concepts`],
  } as ReadingModule);
  
  // Reading Module 3: Practical Application
  // Examples and real-world application
  const practicalBlocks: ContentBlock[] = [];
  
  subSections.slice(3).forEach((section, idx) => {
    const lines = sanitizeReadingText(section).split('\n').filter(l => l.trim());
    const title = lines[0] || '';
    const body = lines.slice(1).join('\n\n');
    
    practicalBlocks.push({
      type: 'example',
      content: `${title}\n\n${body}`,
      animationPreset: 'scale_in',
    });
  });
  
  // Add practical summary
  practicalBlocks.push({
    type: 'text',
    content: `Now that you understand the core concepts of ${lesson.title.toLowerCase()}, you're ready to test your knowledge with a quiz!`,
    animationPreset: 'fade_in',
  });
  
  // Add important reminder
  practicalBlocks.push({
    type: 'warning',
    content: `Before moving on, make sure you understand all the key points. The quiz will test your comprehension of this material.`,
    animationPreset: 'fade_in',
  });
  
  modules.push({
    id: `${lesson.id}-mod-3`,
    type: 'reading',
    title: 'Practical Application',
    estimatedMinutes: 3,
    xpReward: 10,
    contentBlocks: practicalBlocks,
    conceptTags: [`${lesson.id}-practical`],
  } as ReadingModule);
  
  // Quiz Module: Test understanding with adaptive difficulty
  // 80% mastery required to pass
  // 
  // ADAPTIVE QUIZ FLOW:
  // 1. Questions are grouped by concept (conceptId field)
  // 2. Each concept has 3 difficulty tiers: easy (1), medium (2), hard (3)
  // 3. User is tested with HARD question first for efficiency
  // 4. If incorrect, penalty cascade: easy → medium → hard
  // 5. Total possible questions: 4 concepts × 3 tiers = 12
  
  // Build conceptVariants from the questions
  // Group questions by conceptId, then find easy/medium/hard variants
  const conceptMap = new Map<string, { easy?: string; medium?: string; hard?: string; name?: string }>();
  
  lesson.questions.forEach(q => {
    // Access adaptive fields if they exist
    const conceptId = (q as any).conceptId as string | undefined;
    const difficultyTier = (q as any).difficultyTier as 1 | 2 | 3 | undefined;
    
    if (conceptId && difficultyTier) {
      if (!conceptMap.has(conceptId)) {
        conceptMap.set(conceptId, {});
      }
      const entry = conceptMap.get(conceptId)!;
      
      // Map tier to easy/medium/hard
      if (difficultyTier === 1) entry.easy = q.id;
      if (difficultyTier === 2) entry.medium = q.id;
      if (difficultyTier === 3) entry.hard = q.id;
      
      // Extract concept name from ID (e.g., "budget-definition" → "Budget Definition")
      entry.name = conceptId
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
  });
  
  // Convert map to ConceptVariant array
  const conceptVariants: ConceptVariant[] = [];
  conceptMap.forEach((variants, conceptId) => {
    if (variants.easy && variants.medium && variants.hard) {
      conceptVariants.push({
        conceptId,
        conceptName: variants.name || conceptId,
        variantGroup: `${lesson.id}-${conceptId}`,
        domain: lesson.domain,
        easyQuestionId: variants.easy,
        mediumQuestionId: variants.medium,
        hardQuestionId: variants.hard,
      });
    }
  });
  
  modules.push({
    id: `${lesson.id}-quiz`,
    type: 'quiz',
    title: `Quiz: ${lesson.title}`,
    estimatedMinutes: 5,
    xpReward: 30,
    questions: lesson.questions,
    masteryThreshold: 0.7,
    conceptTags: lesson.questions.map(q => q.id),
    // Include concept variants for adaptive quiz flow
    conceptVariants: conceptVariants.length > 0 ? conceptVariants : undefined,
  } as QuizModule);
  
  return modules;
}

function normalizeQuestionsForAdaptive(
  lessonId: string,
  domain: string,
  questions: Question[]
): Question[] {
  const tierFromDifficulty: Record<string, 1 | 2 | 3> = {
    beginner: 1,
    intermediate: 2,
    advanced: 3,
  };

  return questions.map((question, index) => {
    const q = { ...(question as any) };
    const positionTier = ((index % 3) + 1) as 1 | 2 | 3;

    const conceptId =
      typeof q.conceptId === 'string' && q.conceptId.length > 0
        ? q.conceptId
        : `${lessonId}-${q.id}`;

    const difficultyTier: 1 | 2 | 3 =
      q.difficultyTier === 1 || q.difficultyTier === 2 || q.difficultyTier === 3
        ? q.difficultyTier
        : tierFromDifficulty[q.difficulty] || positionTier;

    const variantGroup =
      typeof q.variantGroup === 'string' && q.variantGroup.length > 0
        ? q.variantGroup
        : `${lessonId}-${conceptId}-v1`;

    const difficulty =
      q.difficulty ||
      (difficultyTier === 1 ? 'beginner' : difficultyTier === 2 ? 'intermediate' : 'advanced');

    return {
      ...q,
      conceptId,
      variantGroup,
      difficultyTier,
      difficulty,
    } as Question;
  });
}

// =============================================================================
// COURSE 1: MONEY FOUNDATIONS
// =============================================================================

const moneyFoundationsLessons: RawLesson[] = [
  // -------------------------------------------------------------------------
  // LESSON 1: What is a Budget?
  // -------------------------------------------------------------------------
  // 
  // ADAPTIVE QUIZ STRUCTURE:
  // - 4 concepts tested, each with 3 difficulty tiers (easy/medium/hard)
  // - Total questions: 4 × 3 = 12 possible questions
  // - Hard-first testing: user sees hard question first for each concept
  // - Penalty cascade: wrong answer triggers easy → medium → hard sequence
  // 
  // CONCEPTS FOR THIS LESSON:
  // 1. budget-definition - What a budget is and its purpose
  // 2. budget-benefits - Benefits of budgeting (savings, control)
  // 3. budget-equation - Income - Expenses = What's Left
  // 4. budget-timing - When to create and review a budget
  // -------------------------------------------------------------------------
  {
    id: 'mf-lesson-1',
    title: 'What is a Budget?',
    type: 'mixed',
    estimatedMinutes: 8,
    completionStatus: 'not_started',
    domain: 'budgeting',
    difficulty: 'beginner',
    xpReward: 50,
    content: `# What is a Budget?

A budget is your money's game plan. Think of it as a roadmap that shows exactly where your money comes from and where it should go each month. Unlike tracking spending after the fact, budgeting is about making intentional decisions BEFORE you spend.

## Why Budgeting Changes Everything

Studies consistently show that people who budget save approximately 20% more than those who don't. Why? Because awareness drives better decisions.

Here's what happens without a budget:
- Money "disappears" and you wonder where it went
- Small purchases add up without you noticing
- You're more likely to overspend on impulse buys
- Savings become an afterthought, not a priority

Here's what happens WITH a budget:
- You see exactly where every pound goes
- You catch spending leaks before they drain your account
- You make conscious choices aligned with your goals
- You pay yourself first by planning savings upfront

## The Fundamental Budget Equation

Every budget comes down to one simple equation:

**Income** - **Expenses** = **What's Left**

Your income is all money coming in: salary, wages, freelance work, gifts, or any other source. Your expenses are everything going out: rent, food, transport, entertainment, subscriptions, and more.

The goal is to make "What's Left" as large as possible - and then direct that surplus toward your goals, whether that's building an emergency fund, paying off debt, or investing for the future.

## When to Create Your Budget

The best time to create a budget is:
- At the start of each month (monthly budgeting)
- When you receive a paycheck (paycheck-to-paycheck budgeting)
- After any major life change (new job, moving, etc.)

Review your budget weekly to stay on track, and adjust as needed. Life happens, and your budget should be flexible enough to handle it.

## Common Budgeting Myths Debunked

**Myth:** "Budgets are restrictive and no fun"
**Reality:** Budgets give you PERMISSION to spend on what matters to you, guilt-free

**Myth:** "I don't make enough money to budget"
**Reality:** Budgeting is even MORE important when money is tight

**Myth:** "Budgeting is too time-consuming"
**Reality:** Once set up, maintaining a budget takes just 15-30 minutes per week`,
    questions: [
      // =====================================================================
      // CONCEPT 1: budget-definition - What a budget is
      // =====================================================================
      // EASY (Tier 1): Simple recall - what is a budget?
      {
        id: 'mf-1-c1-easy',
        type: 'true_false',
        question: 'A budget is a plan for how you will spend your money.',
        correctAnswer: true,
        explanation: 'Yes! A budget is simply a plan that helps you decide where your money goes.',
        xpReward: 5,
        difficulty: 'beginner',
        conceptId: 'budget-definition',
        variantGroup: 'mf-1-budget-definition',
        difficultyTier: 1,
      } as TrueFalseQuestion,
      // MEDIUM (Tier 2): Applied understanding - identify budget purpose
      {
        id: 'mf-1-c1-medium',
        type: 'mcq',
        question: 'What is the main purpose of creating a budget?',
        options: [
          'To restrict all your spending completely',
          'To plan where your money goes before you spend it',
          'To make you feel guilty about purchases',
          'To track only your savings account'
        ],
        correctAnswer: 1,
        explanation: 'A budget helps you decide where your money should go BEFORE you spend it. It\'s about planning, not restricting.',
        xpReward: 10,
        difficulty: 'beginner',
        conceptId: 'budget-definition',
        variantGroup: 'mf-1-budget-definition',
        difficultyTier: 2,
      } as MCQQuestion,
      // HARD (Tier 3): Analysis - distinguish budget from other tools
      {
        id: 'mf-1-c1-hard',
        type: 'mcq',
        question: 'Maria tracks every purchase she made last month. Is this the same as having a budget?',
        options: [
          'Yes, tracking spending is exactly what budgeting means',
          'No, budgeting is about planning BEFORE spending, not just tracking',
          'Yes, budgets are just records of past spending',
          'No, budgets only track income, not spending'
        ],
        correctAnswer: 1,
        explanation: 'Tracking spending shows where money WENT. Budgeting plans where money WILL GO. The key difference is planning ahead vs. looking back.',
        xpReward: 15,
        difficulty: 'intermediate',
        conceptId: 'budget-definition',
        variantGroup: 'mf-1-budget-definition',
        difficultyTier: 3,
      } as MCQQuestion,

      // =====================================================================
      // CONCEPT 2: budget-benefits - Why budgeting helps
      // =====================================================================
      // EASY (Tier 1): Simple recall - budgeting helps save
      {
        id: 'mf-1-c2-easy',
        type: 'true_false',
        question: 'People who budget tend to save more money than those who don\'t.',
        correctAnswer: true,
        explanation: 'Research shows budgeters save approximately 20% more because they have visibility into their spending.',
        xpReward: 5,
        difficulty: 'beginner',
        conceptId: 'budget-benefits',
        variantGroup: 'mf-1-budget-benefits',
        difficultyTier: 1,
      } as TrueFalseQuestion,
      // MEDIUM (Tier 2): Applied - identify specific benefit
      {
        id: 'mf-1-c2-medium',
        type: 'mcq',
        question: 'Studies show that people who budget save approximately how much more than non-budgeters?',
        options: [
          '5% more',
          '10% more',
          '20% more',
          '50% more'
        ],
        correctAnswer: 2,
        explanation: 'Research indicates budgeters save about 20% more than those who don\'t budget, because awareness leads to better decisions.',
        xpReward: 10,
        difficulty: 'beginner',
        conceptId: 'budget-benefits',
        variantGroup: 'mf-1-budget-benefits',
        difficultyTier: 2,
      } as MCQQuestion,
      // HARD (Tier 3): Scenario - analyze why budgeting helps
      {
        id: 'mf-1-c2-hard',
        type: 'scenario',
        question: 'Jake earns $3,000/month but always runs out of money by day 25. He starts budgeting and notices he spends $400/month on food delivery. What\'s the MAIN reason budgeting helps Jake?',
        scenario: 'Jake couldn\'t figure out where his money was going until he created a budget.',
        options: [
          { text: 'It forces him to spend less on everything', outcome: 'This restricts quality of life unnecessarily', impactScore: -20 },
          { text: 'It gives him visibility into spending patterns', outcome: 'Jake can now make informed decisions about his priorities', impactScore: 100 },
          { text: 'It automatically saves money for him', outcome: 'Budgets don\'t save automatically - they reveal opportunities', impactScore: 20 },
          { text: 'It prevents him from using delivery apps', outcome: 'Budgets don\'t restrict access, they inform choices', impactScore: -10 }
        ],
        bestOptionIndex: 1,
        explanation: 'Budgeting\'s primary benefit is VISIBILITY. When Jake sees where his money goes, he can make intentional choices rather than wondering where it went.',
        xpReward: 15,
        difficulty: 'intermediate',
        conceptId: 'budget-benefits',
        variantGroup: 'mf-1-budget-benefits',
        difficultyTier: 3,
      } as ScenarioQuestion,

      // =====================================================================
      // CONCEPT 3: budget-equation - The basic formula
      // =====================================================================
      // EASY (Tier 1): Recall - identify equation components
      {
        id: 'mf-1-c3-easy',
        type: 'fill_blank',
        question: 'Complete the budget equation:',
        blankedText: 'Income - ___ = What\'s Left',
        acceptedAnswers: ['expenses', 'Expenses', 'EXPENSES', 'spending', 'Spending'],
        explanation: 'The basic budget equation is: Income minus Expenses equals what you have left over.',
        xpReward: 5,
        difficulty: 'beginner',
        conceptId: 'budget-equation',
        variantGroup: 'mf-1-budget-equation',
        difficultyTier: 1,
      } as FillBlankQuestion,
      // MEDIUM (Tier 2): Applied - calculate leftover
      {
        id: 'mf-1-c3-medium',
        type: 'calculation',
        question: 'If your monthly income is $2,500 and your expenses are $2,100, how much is left over?',
        problemText: 'Income: $2,500\nExpenses: $2,100\nWhat\'s Left: ?',
        correctAnswer: 400,
        tolerance: 0,
        unit: '$',
        explanation: '$2,500 - $2,100 = $400. This leftover can go toward savings or paying off debt.',
        xpReward: 10,
        difficulty: 'beginner',
        conceptId: 'budget-equation',
        variantGroup: 'mf-1-budget-equation',
        difficultyTier: 2,
      } as CalculationQuestion,
      // HARD (Tier 3): Analysis - identify problem in equation
      {
        id: 'mf-1-c3-hard',
        type: 'mcq',
        question: 'Emma\'s income is $2,000/month and her expenses are $2,200/month. What does this budget equation tell us?',
        options: [
          'Emma is saving $200 per month',
          'Emma is going $200 into debt each month',
          'Emma needs to earn $200 less',
          'The equation is balanced correctly'
        ],
        correctAnswer: 1,
        explanation: '$2,000 - $2,200 = -$200. A negative result means spending exceeds income, creating debt. Emma needs to cut expenses or increase income.',
        xpReward: 15,
        difficulty: 'intermediate',
        conceptId: 'budget-equation',
        variantGroup: 'mf-1-budget-equation',
        difficultyTier: 3,
      } as MCQQuestion,

      // =====================================================================
      // CONCEPT 4: budget-timing - When to budget
      // =====================================================================
      // EASY (Tier 1): Recall - budget before spending
      {
        id: 'mf-1-c4-easy',
        type: 'true_false',
        question: 'You should create your budget BEFORE the month begins, not after.',
        correctAnswer: true,
        explanation: 'Creating a budget before the month means you\'re planning ahead, not just tracking what already happened.',
        xpReward: 5,
        difficulty: 'beginner',
        conceptId: 'budget-timing',
        variantGroup: 'mf-1-budget-timing',
        difficultyTier: 1,
      } as TrueFalseQuestion,
      // MEDIUM (Tier 2): Applied - identify correct timing
      {
        id: 'mf-1-c4-medium',
        type: 'mcq',
        question: 'When is the BEST time to create your monthly budget?',
        options: [
          'At the end of the month after spending',
          'Only when you\'re in debt',
          'Before the month begins',
          'Only once a year in January'
        ],
        correctAnswer: 2,
        explanation: 'A budget should be created BEFORE the month begins so you can plan your spending in advance and make intentional choices.',
        xpReward: 10,
        difficulty: 'beginner',
        conceptId: 'budget-timing',
        variantGroup: 'mf-1-budget-timing',
        difficultyTier: 2,
      } as MCQQuestion,
      // HARD (Tier 3): Analysis - evaluate approach
      {
        id: 'mf-1-c4-hard',
        type: 'scenario',
        question: 'Tom creates his budget on the 15th of each month, looking at what he spent in the first half. Is this an effective approach?',
        scenario: 'Tom waits until mid-month to budget because he wants to see his actual spending patterns first.',
        options: [
          { text: 'Yes, it\'s smart to see real spending before planning', outcome: 'By day 15, half the month\'s decisions were already unplanned', impactScore: 20 },
          { text: 'No, he should budget before the month starts', outcome: 'Planning ahead allows all 30 days of intentional spending', impactScore: 100 },
          { text: 'Yes, mid-month is the perfect time to adjust', outcome: 'Adjusting is fine, but initial plan should come earlier', impactScore: 40 },
          { text: 'It doesn\'t matter when you budget', outcome: 'Timing matters - planning ahead beats reacting to spending', impactScore: -20 }
        ],
        bestOptionIndex: 1,
        explanation: 'The best approach is to budget BEFORE the month starts, then review and adjust mid-month if needed. Tom\'s method leaves half the month unplanned.',
        xpReward: 15,
        difficulty: 'intermediate',
        conceptId: 'budget-timing',
        variantGroup: 'mf-1-budget-timing',
        difficultyTier: 3,
      } as ScenarioQuestion,
    ],
  },

  // -------------------------------------------------------------------------
  // LESSON 2: Income vs Expenses
  // -------------------------------------------------------------------------
  {
    id: 'mf-lesson-2',
    title: 'Income vs Expenses',
    type: 'mixed',
    estimatedMinutes: 10,
    completionStatus: 'not_started',
    domain: 'budgeting',
    difficulty: 'beginner',
    xpReward: 60,
    content: `# Income vs Expenses

Understanding the difference between what comes in and what goes out is the foundation of every financial decision you'll ever make. Let's break down these two categories in detail.

## Understanding Your Income

Income is any money flowing INTO your accounts. There are two main types:

**Active Income** is money you earn by trading your time and effort for payment. This includes:
- Salary or wages from your job
- Freelance or contract work
- Tips and commissions
- Bonuses and overtime pay

**Passive Income** is money that comes with minimal ongoing effort once set up. This includes:
- Investment dividends and interest
- Rental property income
- Royalties from creative work
- Income from businesses you own but don't actively manage

Most people start with only active income. The path to financial freedom often involves gradually building passive income streams over time.

## Understanding Your Expenses

Expenses are all the money flowing OUT of your accounts. They fall into two categories:

**Fixed Expenses** stay the same (or nearly the same) every month:
- Rent or mortgage payments
- Car payments or transport passes
- Insurance premiums
- Loan repayments
- Streaming subscriptions

**Variable Expenses** change from month to month:
- Groceries and household supplies
- Utilities (electricity, gas, water)
- Entertainment and dining out
- Clothing and personal care
- Unexpected costs and repairs

## The Golden Rule

Your primary financial goal should always be: **Income > Expenses**

When income exceeds expenses, you have a surplus. This surplus is your ticket to:
- Building an emergency fund
- Paying off debt faster
- Investing for the future
- Achieving financial goals

When expenses exceed income, you have a deficit. This leads to:
- Taking on debt
- Depleting savings
- Financial stress and worry

## Practical Tips

- Track both income and expenses for at least one full month to understand your patterns
- Look for "expense leaks" - small recurring costs that add up (unused subscriptions, bank fees)
- Try to convert some variable expenses to fixed ones for better predictability
- Aim to gradually increase the gap between income and expenses over time`,
    questions: [
      {
        id: 'mf-2-q1',
        type: 'matching',
        question: 'Match each item to its correct category:',
        leftItems: ['Monthly salary', 'Grocery shopping', 'Rent payment', 'Dividend from stocks'],
        rightItems: ['Active Income', 'Variable Expense', 'Fixed Expense', 'Passive Income'],
        correctMatches: [0, 1, 2, 3],
        explanation: 'Salary is active income (you work for it), groceries vary each month, rent is fixed, and dividends are passive income.',
        xpReward: 15,
        difficulty: 'beginner',
      } as MatchingQuestion,
      {
        id: 'mf-2-q2',
        type: 'mcq',
        question: 'Which of these is a FIXED expense?',
        options: [
          'Dining out',
          'Monthly gym membership',
          'Groceries',
          'Entertainment'
        ],
        correctAnswer: 1,
        explanation: 'A gym membership is a fixed expense because it\'s the same amount every month. The others vary based on your choices.',
        xpReward: 10,
        difficulty: 'beginner',
      } as MCQQuestion,
      {
        id: 'mf-2-q3',
        type: 'true_false',
        question: 'Passive income requires you to actively work for every payment.',
        correctAnswer: false,
        explanation: 'Passive income is money that comes with minimal ongoing effort, like investment dividends or rental income.',
        xpReward: 10,
        difficulty: 'beginner',
      } as TrueFalseQuestion,
      {
        id: 'mf-2-q4',
        type: 'calculation',
        question: 'If your monthly income is $3,000 and expenses are $2,400, how much do you have left?',
        problemText: '$3,000 - $2,400 = ?',
        correctAnswer: 600,
        tolerance: 0,
        unit: '$',
        explanation: 'Income minus expenses equals your surplus: $3,000 - $2,400 = $600 left over.',
        xpReward: 15,
        difficulty: 'beginner',
      } as CalculationQuestion,
    ],
  },

  // -------------------------------------------------------------------------
  // LESSON 3: Needs vs Wants
  // -------------------------------------------------------------------------
  {
    id: 'mf-lesson-3',
    title: 'Needs vs Wants',
    type: 'mixed',
    estimatedMinutes: 8,
    completionStatus: 'not_started',
    domain: 'budgeting',
    difficulty: 'beginner',
    xpReward: 55,
    content: `# Needs vs Wants

One of the most powerful budgeting skills is learning to distinguish between what you truly NEED and what you WANT. This distinction forms the basis of smart spending decisions and is essential for achieving your financial goals.

## What Are Needs?

Needs are expenses essential for your survival, health, and ability to earn income. They're non-negotiable requirements for basic functioning:

**Essential Needs:**
- Shelter (rent, mortgage, or housing costs)
- Food (groceries, not dining out)
- Utilities (electricity, water, heating)
- Healthcare (insurance, medications, essential care)
- Transportation to work (public transport, essential car costs)
- Basic clothing appropriate for work and weather

The key question: "Could I survive and maintain my job without this?" If no, it's a need.

## What Are Wants?

Wants are things that enhance your quality of life but aren't strictly necessary for survival. They make life more enjoyable, comfortable, or convenient:

**Common Wants:**
- Entertainment subscriptions (Netflix, Spotify, gaming)
- Dining out and takeaways
- The latest smartphone (vs. a basic functional phone)
- Designer or brand-name clothing
- Gym memberships (when free alternatives exist)
- Holidays and travel
- Hobbies and recreational activities

Wants aren't bad - they're an important part of a balanced life! The key is being honest about what category each expense falls into.

## The Grey Area: Where It Gets Tricky

Many expenses blur the line between needs and wants:

**Internet at home:** Need if you work remotely, want if purely for entertainment
**A car:** Need in rural areas with no public transport, want in cities with good transit
**Coffee:** A want (you don't need the coffee shop), but caffeine can feel like a need!

The context matters. Be honest with yourself about what's truly necessary versus what's convenient.

## Practical Framework: The 48-Hour Rule

When you're unsure if something is a need or want, try this:
- Wait 48 hours before purchasing
- If you still feel strongly it's necessary after 48 hours, it might be closer to a need
- Many "urgent needs" fade away when given time to reflect

## Wants in Disguise

Watch out for these common scenarios where wants pretend to be needs:
- "I NEED to upgrade my phone" (when your current one works fine)
- "I NEED this gym membership" (when you could exercise for free)
- "I NEED to eat out tonight" (when you have food at home)

The language of urgency ("I need it NOW!") is often a sign of an emotional want, not a true need.`,
    questions: [
      {
        id: 'mf-3-q1',
        type: 'ordering',
        question: 'Sort these items from MOST essential (need) to LEAST essential (want):',
        items: ['Rent payment', 'Basic groceries', 'Streaming subscriptions', 'Designer shoes'],
        instruction: 'Drag items to order from most to least essential',
        explanation: 'Rent and groceries are essential needs. Streaming is a want, and designer shoes are a luxury want.',
        xpReward: 15,
        difficulty: 'beginner',
      } as OrderingQuestion,
      {
        id: 'mf-3-q2',
        type: 'mcq',
        question: 'Which statement best describes a "want"?',
        options: [
          'Something you cannot live without',
          'Something that improves quality of life but isn\'t essential',
          'Something that is free',
          'Something everyone else has'
        ],
        correctAnswer: 1,
        explanation: 'Wants are things that make life better but aren\'t necessary for survival or basic functioning.',
        xpReward: 10,
        difficulty: 'beginner',
      } as MCQQuestion,
      {
        id: 'mf-3-q3',
        type: 'scenario',
        question: 'Your car breaks down and you need it for work. What do you do?',
        scenario: 'Your 10-year-old car needs a $500 repair. You have $1,000 in savings. A friend suggests buying a newer used car for $8,000 with a loan.',
        options: [
          { text: 'Pay $500 to fix your current car', outcome: 'Smart choice! You solve the problem without taking on debt.', impactScore: 100 },
          { text: 'Buy the $8,000 car with a loan', outcome: 'You now have a car payment, increasing your monthly expenses significantly.', impactScore: 30 },
          { text: 'Start taking the bus while you save more', outcome: 'Possible, but may affect your job reliability. Consider repair as priority.', impactScore: 50 },
          { text: 'Ignore it and hope it fixes itself', outcome: 'The problem will only get worse and more expensive.', impactScore: -20 },
        ],
        bestOptionIndex: 0,
        explanation: 'Fixing what you have is often more financially sound than taking on new debt for a "want" (newer car) when a "need" (working transportation) can be met more affordably.',
        xpReward: 20,
        difficulty: 'intermediate',
      } as ScenarioQuestion,
    ],
  },

  // -------------------------------------------------------------------------
  // LESSON 4: The 50/30/20 Rule
  // -------------------------------------------------------------------------
  {
    id: 'mf-lesson-4',
    title: 'The 50/30/20 Rule',
    type: 'mixed',
    estimatedMinutes: 10,
    completionStatus: 'not_started',
    domain: 'budgeting',
    difficulty: 'beginner',
    xpReward: 70,
    content: `# The 50/30/20 Rule

This simple formula gives you a framework for allocating your after-tax income:

## 50% - Needs
Housing, utilities, groceries, insurance, minimum debt payments, transportation

## 30% - Wants
Entertainment, dining out, hobbies, subscriptions, vacations

## 20% - Savings & Debt
Emergency fund, retirement, extra debt payments, investments

## Why It Works
It's simple to remember and flexible enough to adapt to most situations.`,
    questions: [
      {
        id: 'mf-4-q1',
        type: 'calculation',
        question: 'If you earn $4,000/month after taxes, how much should go to NEEDS under the 50/30/20 rule?',
        problemText: '$4,000 × 50% = ?',
        correctAnswer: 2000,
        tolerance: 0,
        unit: '$',
        explanation: '50% of $4,000 is $2,000, which should cover all your essential needs like rent, utilities, and groceries.',
        xpReward: 15,
        difficulty: 'beginner',
      } as CalculationQuestion,
      {
        id: 'mf-4-q2',
        type: 'calculation',
        question: 'Using the same $4,000 income, how much goes to SAVINGS under 50/30/20?',
        problemText: '$4,000 × 20% = ?',
        correctAnswer: 800,
        tolerance: 0,
        unit: '$',
        explanation: '20% of $4,000 is $800, which should go toward savings, investments, or extra debt payments.',
        xpReward: 15,
        difficulty: 'beginner',
      } as CalculationQuestion,
      {
        id: 'mf-4-q3',
        type: 'matching',
        question: 'Match each expense to its 50/30/20 category:',
        leftItems: ['Movie tickets', 'Rent payment', 'Retirement contribution', 'Electric bill'],
        rightItems: ['Wants (30%)', 'Needs (50%)', 'Savings (20%)', 'Needs (50%)'],
        correctMatches: [0, 1, 2, 3],
        explanation: 'Entertainment is a want, rent and utilities are needs, and retirement savings falls under the 20% savings category.',
        xpReward: 15,
        difficulty: 'beginner',
      } as MatchingQuestion,
      {
        id: 'mf-4-q4',
        type: 'mcq',
        question: 'What should you do if your needs take up 60% of your income?',
        options: [
          'Reduce your wants to 20% and keep savings at 20%',
          'Skip saving entirely',
          'Get a second credit card',
          'Ignore the budget completely'
        ],
        correctAnswer: 0,
        explanation: 'If needs are higher, adjust wants downward first. Always try to maintain some savings, even if you need to modify the percentages.',
        xpReward: 15,
        difficulty: 'intermediate',
      } as MCQQuestion,
    ],
  },

  // -------------------------------------------------------------------------
  // LESSON 5: Tracking Your Spending
  // -------------------------------------------------------------------------
  {
    id: 'mf-lesson-5',
    title: 'Tracking Your Spending',
    type: 'mixed',
    estimatedMinutes: 8,
    completionStatus: 'not_started',
    domain: 'budgeting',
    difficulty: 'beginner',
    xpReward: 55,
    content: `# Tracking Your Spending

You can't manage what you don't measure. Tracking spending reveals where your money actually goes.

## Why Track?
- Spot problem areas (overspending on coffee, subscriptions)
- Find "money leaks" (small expenses that add up)
- Make informed decisions

## Methods
1. **Apps**: Automatic categorization from bank feeds
2. **Spreadsheets**: Full control, customizable
3. **Envelope System**: Cash in labeled envelopes for each category
4. **Receipt Journal**: Save and review all receipts weekly`,
    questions: [
      {
        id: 'mf-5-q1',
        type: 'mcq',
        question: 'What is a "money leak"?',
        options: [
          'When someone steals from you',
          'Small recurring expenses you don\'t notice adding up',
          'A bank error',
          'A broken ATM'
        ],
        correctAnswer: 1,
        explanation: 'Money leaks are small, often unnoticed expenses that accumulate over time - like daily coffee runs or unused subscriptions.',
        xpReward: 10,
        difficulty: 'beginner',
      } as MCQQuestion,
      {
        id: 'mf-5-q2',
        type: 'calculation',
        question: 'If you buy a $5 coffee every workday, how much do you spend per month? (Assume 20 workdays)',
        problemText: '$5 × 20 days = ?',
        correctAnswer: 100,
        tolerance: 0,
        unit: '$',
        explanation: '$5 × 20 workdays = $100/month. That\'s $1,200/year on coffee - a significant "money leak"!',
        xpReward: 15,
        difficulty: 'beginner',
      } as CalculationQuestion,
      {
        id: 'mf-5-q3',
        type: 'true_false',
        question: 'Tracking spending for just one week gives you an accurate picture of your monthly habits.',
        correctAnswer: false,
        explanation: 'One week isn\'t enough. You need at least a full month to capture all recurring expenses and typical spending patterns.',
        xpReward: 10,
        difficulty: 'beginner',
      } as TrueFalseQuestion,
      {
        id: 'mf-5-q4',
        type: 'ordering',
        question: 'Put these spending tracking steps in the correct order:',
        items: ['Review and categorize expenses', 'Collect all receipts and transactions', 'Identify areas to cut back', 'Set new spending goals'],
        instruction: 'Order from first step to last step',
        explanation: 'First collect data, then categorize it, then analyze to find cuts, then set goals for improvement.',
        xpReward: 15,
        difficulty: 'beginner',
      } as OrderingQuestion,
    ],
  },

  // -------------------------------------------------------------------------
  // LESSON 6: Building Your First Budget
  // -------------------------------------------------------------------------
  {
    id: 'mf-lesson-6',
    title: 'Building Your First Budget',
    type: 'mixed',
    estimatedMinutes: 12,
    completionStatus: 'not_started',
    domain: 'budgeting',
    difficulty: 'intermediate',
    xpReward: 80,
    content: `# Building Your First Budget

Now let's put everything together and create an actual budget!

## Step 1: Calculate Total Monthly Income
Add up all sources: salary, side gigs, any regular money coming in.

## Step 2: List All Monthly Expenses
Go through bank statements. Don't forget annual expenses divided by 12.

## Step 3: Categorize Using 50/30/20
Sort each expense into Needs, Wants, or Savings.

## Step 4: Compare Income vs Expenses
If expenses > income, you need to cut or earn more.

## Step 5: Adjust and Balance
Make changes until the math works. Every dollar gets a job.`,
    questions: [
      {
        id: 'mf-6-q1',
        type: 'scenario',
        question: 'Help Alex create a budget with $3,500 monthly income.',
        scenario: 'Alex earns $3,500/month. Their expenses are: Rent $1,200, Utilities $150, Groceries $400, Car Payment $300, Insurance $100, Phone $80, Streaming $45, Dining Out $200, Gym $50. They currently save $0.',
        options: [
          { text: 'Keep everything the same', outcome: 'Total: $2,525 expenses. $975 left but no savings plan!', impactScore: 20 },
          { text: 'Cut dining to $100, streaming to $15, save $700', outcome: 'Great! You reduced wants and created a solid savings habit.', impactScore: 100 },
          { text: 'Cancel everything and save $1,500', outcome: 'Too extreme. You need some balance in life.', impactScore: 40 },
          { text: 'Get a credit card to cover overages', outcome: 'This creates debt, not a solution!', impactScore: -50 },
        ],
        bestOptionIndex: 1,
        explanation: 'A balanced approach: trim wants (dining, streaming) while keeping essentials. The savings ($700) is exactly 20% of income - matching the 50/30/20 rule!',
        xpReward: 25,
        difficulty: 'intermediate',
      } as ScenarioQuestion,
      {
        id: 'mf-6-q2',
        type: 'calculation',
        question: 'Your car insurance is $600 every 6 months. What should you budget monthly?',
        problemText: '$600 ÷ 6 months = ?',
        correctAnswer: 100,
        tolerance: 0,
        unit: '$',
        explanation: 'For expenses that aren\'t monthly, divide by the number of months. $600 ÷ 6 = $100/month to set aside.',
        xpReward: 15,
        difficulty: 'beginner',
      } as CalculationQuestion,
      {
        id: 'mf-6-q3',
        type: 'ordering',
        question: 'Order these budgeting steps correctly:',
        items: ['Calculate total income', 'List all expenses', 'Apply 50/30/20 categories', 'Adjust until balanced', 'Track and review weekly'],
        instruction: 'Put in order from first to last',
        explanation: 'Start with income, then expenses, categorize them, balance the budget, and finally maintain it with regular reviews.',
        xpReward: 20,
        difficulty: 'intermediate',
      } as OrderingQuestion,
    ],
  },

  // -------------------------------------------------------------------------
  // LESSON 7: Emergency Fund Basics
  // -------------------------------------------------------------------------
  {
    id: 'mf-lesson-7',
    title: 'Emergency Fund Basics',
    type: 'mixed',
    estimatedMinutes: 9,
    completionStatus: 'not_started',
    domain: 'saving',
    difficulty: 'beginner',
    xpReward: 60,
    content: `# Emergency Fund Basics

An emergency fund is money saved for unexpected expenses - your financial safety net.

## What Counts as an Emergency?
- Job loss
- Medical bills
- Major car repairs
- Emergency home repairs

## What's NOT an Emergency?
- Sales on things you want
- Vacations
- Predictable expenses (holidays, birthdays)

## How Much?
- **Starter Goal**: $1,000
- **Full Goal**: 3-6 months of expenses`,
    questions: [
      {
        id: 'mf-7-q1',
        type: 'mcq',
        question: 'Which of these is a TRUE emergency that warrants using emergency funds?',
        options: [
          'A 50% off sale at your favorite store',
          'Your water heater breaking in winter',
          'A friend\'s birthday party',
          'A new phone release'
        ],
        correctAnswer: 1,
        explanation: 'A broken water heater is an unexpected, essential repair - a true emergency. Sales, parties, and new phones are not emergencies.',
        xpReward: 10,
        difficulty: 'beginner',
      } as MCQQuestion,
      {
        id: 'mf-7-q2',
        type: 'calculation',
        question: 'If your monthly expenses are $2,500, how much is a 3-month emergency fund?',
        problemText: '$2,500 × 3 months = ?',
        correctAnswer: 7500,
        tolerance: 0,
        unit: '$',
        explanation: 'A 3-month emergency fund means 3 times your monthly expenses: $2,500 × 3 = $7,500.',
        xpReward: 15,
        difficulty: 'beginner',
      } as CalculationQuestion,
      {
        id: 'mf-7-q3',
        type: 'true_false',
        question: 'You should keep your emergency fund in the stock market for better returns.',
        correctAnswer: false,
        explanation: 'Emergency funds should be in a safe, easily accessible account like a high-yield savings account. The stock market is too risky for money you might need quickly.',
        xpReward: 10,
        difficulty: 'beginner',
      } as TrueFalseQuestion,
      {
        id: 'mf-7-q4',
        type: 'fill_blank',
        question: 'The starter emergency fund goal is:',
        blankedText: '$___',
        acceptedAnswers: ['1000', '1,000', '1000.00'],
        explanation: 'A $1,000 starter emergency fund provides a cushion while you work toward a larger 3-6 month fund.',
        xpReward: 10,
        difficulty: 'beginner',
      } as FillBlankQuestion,
    ],
  },

  // -------------------------------------------------------------------------
  // LESSON 8: Common Budget Mistakes
  // -------------------------------------------------------------------------
  {
    id: 'mf-lesson-8',
    title: 'Common Budget Mistakes',
    type: 'mixed',
    estimatedMinutes: 8,
    completionStatus: 'not_started',
    domain: 'budgeting',
    difficulty: 'intermediate',
    xpReward: 65,
    content: `# Common Budget Mistakes

Even experienced budgeters make these mistakes. Learning them helps you avoid them.

## Top Mistakes

1. **Being Too Restrictive**: Budgets that are too tight lead to burnout
2. **Forgetting Irregular Expenses**: Car registration, annual subscriptions
3. **Not Tracking Small Purchases**: Coffee and snacks add up
4. **No Fun Money**: You need guilt-free spending built in
5. **Giving Up After One Failure**: Budgeting is a skill that takes practice`,
    questions: [
      {
        id: 'mf-8-q1',
        type: 'true_false',
        question: 'A strict budget with zero fun money is the most effective approach.',
        correctAnswer: false,
        explanation: 'Too strict leads to burnout and giving up. Including some "fun money" makes budgets sustainable long-term.',
        xpReward: 10,
        difficulty: 'beginner',
      } as TrueFalseQuestion,
      {
        id: 'mf-8-q2',
        type: 'mcq',
        question: 'You overspent your dining budget this month. What should you do?',
        options: [
          'Give up on budgeting entirely',
          'Take money from next month\'s savings',
          'Adjust other categories this month and try again next month',
          'Pretend it didn\'t happen'
        ],
        correctAnswer: 2,
        explanation: 'Mistakes happen! Adjust other flexible categories, learn from it, and continue. Budgeting is a skill that improves with practice.',
        xpReward: 10,
        difficulty: 'intermediate',
      } as MCQQuestion,
      {
        id: 'mf-8-q3',
        type: 'matching',
        question: 'Match each budget mistake to its consequence:',
        leftItems: ['Too restrictive', 'Forgetting irregular expenses', 'No tracking', 'Giving up after failure'],
        rightItems: ['Burnout and quitting', 'Surprise bills that break the budget', 'Money leaks go unnoticed', 'Never building the budgeting skill'],
        correctMatches: [0, 1, 2, 3],
        explanation: 'Each mistake has a predictable consequence. Awareness helps you avoid these pitfalls.',
        xpReward: 15,
        difficulty: 'intermediate',
      } as MatchingQuestion,
      {
        id: 'mf-8-q4',
        type: 'scenario',
        question: 'Your car registration ($200) is due next month but isn\'t in your budget. What do you do?',
        scenario: 'You forgot to budget for your annual car registration. You have 30 days before it\'s due.',
        options: [
          { text: 'Put it on a credit card and worry later', outcome: 'Creates debt with interest - not ideal.', impactScore: 20 },
          { text: 'Reduce other spending this month to save $200', outcome: 'Perfect! You found the money within your budget.', impactScore: 100 },
          { text: 'Skip paying it and hope nobody notices', outcome: 'This leads to late fees and potential legal issues!', impactScore: -50 },
          { text: 'Add it to your budget for next year', outcome: 'Good for future, but doesn\'t solve the immediate problem.', impactScore: 50 },
        ],
        bestOptionIndex: 1,
        explanation: 'The best approach is to find the money now by adjusting current spending, AND add it to future budgets so you\'re prepared next time.',
        xpReward: 20,
        difficulty: 'intermediate',
      } as ScenarioQuestion,
    ],
  },

  // -------------------------------------------------------------------------
  // LESSON 9: Adjusting Your Budget
  // -------------------------------------------------------------------------
  {
    id: 'mf-lesson-9',
    title: 'Adjusting Your Budget',
    type: 'mixed',
    estimatedMinutes: 9,
    completionStatus: 'not_started',
    domain: 'budgeting',
    difficulty: 'intermediate',
    xpReward: 65,
    content: `# Adjusting Your Budget

Life changes, and your budget should change with it.

## When to Adjust
- Income changes (raise, job loss, new income source)
- Major life events (moving, marriage, baby)
- Goals change (saving for a house, paying off debt faster)
- You consistently over/under spend in categories

## How to Adjust
1. Review your spending data
2. Identify what's not working
3. Make small, sustainable changes
4. Give changes 2-3 months to work
5. Repeat as needed`,
    questions: [
      {
        id: 'mf-9-q1',
        type: 'mcq',
        question: 'You got a $300/month raise. What\'s the smartest first move?',
        options: [
          'Immediately increase your lifestyle spending',
          'Put it all toward savings or debt first',
          'Don\'t change anything and let it pile up',
          'Take out a loan since you can afford payments now'
        ],
        correctAnswer: 1,
        explanation: 'When income increases, prioritize savings or debt before lifestyle inflation. This builds wealth faster.',
        xpReward: 10,
        difficulty: 'intermediate',
      } as MCQQuestion,
      {
        id: 'mf-9-q2',
        type: 'calculation',
        question: 'Your rent increased from $1,200 to $1,350. How much must you cut from other categories?',
        problemText: '$1,350 - $1,200 = ?',
        correctAnswer: 150,
        tolerance: 0,
        unit: '$',
        explanation: 'When one expense increases, you need to cut the same amount from other areas to keep the budget balanced.',
        xpReward: 15,
        difficulty: 'beginner',
      } as CalculationQuestion,
      {
        id: 'mf-9-q3',
        type: 'true_false',
        question: 'You should adjust your budget categories every week for best results.',
        correctAnswer: false,
        explanation: 'Too frequent changes don\'t give you enough data. Adjust monthly or when major life changes occur.',
        xpReward: 10,
        difficulty: 'beginner',
      } as TrueFalseQuestion,
      {
        id: 'mf-9-q4',
        type: 'ordering',
        question: 'Order these steps for adjusting a budget that isn\'t working:',
        items: ['Review spending data for 2-3 months', 'Identify problem categories', 'Make small adjustments', 'Monitor results', 'Repeat if needed'],
        instruction: 'Put in order from first to last',
        explanation: 'Start with data, find problems, make small changes, watch the results, and iterate.',
        xpReward: 15,
        difficulty: 'intermediate',
      } as OrderingQuestion,
    ],
  },

  // -------------------------------------------------------------------------
  // LESSON 10: Automating Your Savings
  // -------------------------------------------------------------------------
  {
    id: 'mf-lesson-10',
    title: 'Automating Your Savings',
    type: 'mixed',
    estimatedMinutes: 8,
    completionStatus: 'not_started',
    domain: 'saving',
    difficulty: 'beginner',
    xpReward: 55,
    content: `# Automating Your Savings

The easiest way to save money is to make it automatic.

## Pay Yourself First
Set up automatic transfers on payday, BEFORE you see the money in your checking account.

## What to Automate
- Emergency fund contributions
- Retirement accounts (401k, IRA)
- Investment accounts
- Debt payments above minimum

## Benefits
- No willpower required
- No forgetting
- Consistency builds wealth
- Out of sight, out of mind`,
    questions: [
      {
        id: 'mf-10-q1',
        type: 'mcq',
        question: 'What does "pay yourself first" mean?',
        options: [
          'Buy something nice before paying bills',
          'Transfer to savings before spending on anything else',
          'Pay your taxes before other bills',
          'Give yourself a cash allowance'
        ],
        correctAnswer: 1,
        explanation: '"Pay yourself first" means prioritizing savings by transferring money before it can be spent on other things.',
        xpReward: 10,
        difficulty: 'beginner',
      } as MCQQuestion,
      {
        id: 'mf-10-q2',
        type: 'true_false',
        question: 'Automatic savings transfers should happen after you pay all your bills.',
        correctAnswer: false,
        explanation: 'Automatic savings should happen ON payday, before other spending. This is the "pay yourself first" principle.',
        xpReward: 10,
        difficulty: 'beginner',
      } as TrueFalseQuestion,
      {
        id: 'mf-10-q3',
        type: 'calculation',
        question: 'If you automate $200/month in savings, how much do you save in one year?',
        problemText: '$200 × 12 months = ?',
        correctAnswer: 2400,
        tolerance: 0,
        unit: '$',
        explanation: 'Consistent monthly savings add up: $200 × 12 = $2,400 per year, without even thinking about it!',
        xpReward: 15,
        difficulty: 'beginner',
      } as CalculationQuestion,
      {
        id: 'mf-10-q4',
        type: 'ordering',
        question: 'Order these items by priority for automation:',
        items: ['Emergency fund (until full)', '401k up to employer match', 'High-interest debt payments', 'Extra investment contributions'],
        instruction: 'Order from highest to lowest priority',
        explanation: 'Get the employer 401k match first (free money!), then emergency fund, then attack high-interest debt, then invest more.',
        xpReward: 15,
        difficulty: 'intermediate',
      } as OrderingQuestion,
    ],
  },

  // -------------------------------------------------------------------------
  // LESSON 11: Mastery Challenge
  // -------------------------------------------------------------------------
  {
    id: 'mf-lesson-11',
    title: 'Money Foundations: Mastery Challenge',
    type: 'quiz',
    estimatedMinutes: 12,
    completionStatus: 'not_started',
    domain: 'budgeting',
    difficulty: 'advanced',
    xpReward: 150,
    content: `# Mastery Challenge: Money Foundations

This final challenge tests everything you've learned about budgeting, tracking, saving, and managing your money.

Take your time and think through each question carefully. Good luck!`,
    questions: [
      {
        id: 'mf-11-q1',
        type: 'calculation',
        question: 'Jamie earns $5,000/month. Using 50/30/20, what\'s the maximum for wants AND minimum for savings?',
        problemText: 'Wants (30%): $5,000 × 0.30 = ? | Savings (20%): $5,000 × 0.20 = ?',
        correctAnswer: 1500,
        tolerance: 0,
        unit: '$',
        explanation: '30% of $5,000 = $1,500 for wants. 20% = $1,000 for savings. (This question asks for the wants amount.)',
        xpReward: 20,
        difficulty: 'intermediate',
      } as CalculationQuestion,
      {
        id: 'mf-11-q2',
        type: 'scenario',
        question: 'Complete scenario: Managing a financial emergency',
        scenario: 'Your car needs $800 in repairs. You have a $1,000 emergency fund, a $500 credit card limit (20% APR), and $300 in your checking account.',
        options: [
          { text: 'Use $800 from emergency fund', outcome: 'Smart! You used the fund for its purpose and avoided debt.', impactScore: 100 },
          { text: 'Put it on the credit card', outcome: 'You\'ll pay interest, and your emergency fund sits unused.', impactScore: 30 },
          { text: 'Use $500 credit + $300 checking', outcome: 'Drains your checking and creates debt. Emergency fund purpose ignored.', impactScore: 10 },
          { text: 'Don\'t fix the car', outcome: 'If you need the car, this isn\'t really an option.', impactScore: -20 },
        ],
        bestOptionIndex: 0,
        explanation: 'This is exactly what an emergency fund is for! Use it, then rebuild it.',
        xpReward: 25,
        difficulty: 'intermediate',
      } as ScenarioQuestion,
      {
        id: 'mf-11-q3',
        type: 'matching',
        question: 'Final matching: Connect each concept to its definition',
        leftItems: ['Fixed expense', 'Variable expense', 'Emergency fund', 'Pay yourself first'],
        rightItems: ['Costs the same each month', 'Costs change month to month', '3-6 months of expenses saved', 'Save before spending on other things'],
        correctMatches: [0, 1, 2, 3],
        explanation: 'These core concepts are the foundation of good money management.',
        xpReward: 20,
        difficulty: 'beginner',
      } as MatchingQuestion,
      {
        id: 'mf-11-q4',
        type: 'true_false',
        question: 'If you earn $3,000/month and spend $3,100, you have a surplus.',
        correctAnswer: false,
        explanation: 'Spending more than you earn is a DEFICIT, not a surplus. A surplus means you have money left over.',
        xpReward: 15,
        difficulty: 'beginner',
      } as TrueFalseQuestion,
      {
        id: 'mf-11-q5',
        type: 'calculation',
        question: 'You buy a $4 coffee every workday. What\'s your annual coffee spending? (260 workdays/year)',
        problemText: '$4 × 260 = ?',
        correctAnswer: 1040,
        tolerance: 0,
        unit: '$',
        explanation: '$4 × 260 workdays = $1,040/year on coffee. Small daily expenses add up significantly!',
        xpReward: 20,
        difficulty: 'intermediate',
      } as CalculationQuestion,
      {
        id: 'mf-11-q6',
        type: 'mcq',
        question: 'Which is the BEST reason to have a budget?',
        options: [
          'To restrict yourself from buying anything fun',
          'To tell your money where to go intentionally',
          'To impress other people with your discipline',
          'To avoid ever spending money on wants'
        ],
        correctAnswer: 1,
        explanation: 'A budget is about being intentional with your money, not restricting all enjoyment. It gives every dollar a purpose.',
        xpReward: 15,
        difficulty: 'beginner',
      } as MCQQuestion,
      {
        id: 'mf-11-q7',
        type: 'ordering',
        question: 'Put these financial priorities in the recommended order:',
        items: ['Build $1,000 starter emergency fund', 'Get employer 401k match', 'Pay off high-interest debt', 'Build full 3-6 month emergency fund', 'Invest beyond retirement'],
        instruction: 'Order from first priority to last',
        explanation: 'This is the standard "baby steps" approach: small emergency fund, get free employer money, attack bad debt, full emergency fund, then grow wealth.',
        xpReward: 25,
        difficulty: 'advanced',
      } as OrderingQuestion,
    ],
  },
];

// =============================================================================
// COURSE 2: CREDIT & DEBT NAVIGATION
// =============================================================================

const creditDebtLessons: RawLesson[] = [
  // -------------------------------------------------------------------------
  // LESSON 1: Understanding Credit Scores
  // -------------------------------------------------------------------------
  {
    id: 'cd-lesson-1',
    title: 'Understanding Credit Scores',
    type: 'mixed',
    estimatedMinutes: 9,
    completionStatus: 'not_started',
    domain: 'credit',
    difficulty: 'beginner',
    xpReward: 55,
    content: `# Understanding Credit Scores

Your credit score is a three-digit number that tells lenders how risky it is to lend you money.

## Score Ranges
- **800-850**: Exceptional
- **740-799**: Very Good
- **670-739**: Good
- **580-669**: Fair
- **300-579**: Poor

## What Affects Your Score
1. Payment History (35%)
2. Credit Utilization (30%)
3. Length of Credit History (15%)
4. Credit Mix (10%)
5. New Credit (10%)`,
    questions: [
      {
        id: 'cd-1-q1',
        type: 'mcq',
        question: 'What factor has the BIGGEST impact on your credit score?',
        options: [
          'How many credit cards you have',
          'Your payment history',
          'Your income level',
          'Your age'
        ],
        correctAnswer: 1,
        explanation: 'Payment history makes up 35% of your score - the largest factor. Paying on time is crucial!',
        xpReward: 10,
        difficulty: 'beginner',
      } as MCQQuestion,
      {
        id: 'cd-1-q2',
        type: 'matching',
        question: 'Match each credit score range to its rating:',
        leftItems: ['800-850', '670-739', '580-669', '300-579'],
        rightItems: ['Exceptional', 'Good', 'Fair', 'Poor'],
        correctMatches: [0, 1, 2, 3],
        explanation: 'Higher scores mean better credit. 670+ is generally considered good.',
        xpReward: 15,
        difficulty: 'beginner',
      } as MatchingQuestion,
      {
        id: 'cd-1-q3',
        type: 'true_false',
        question: 'Your income directly affects your credit score calculation.',
        correctAnswer: false,
        explanation: 'Income is NOT a factor in credit score calculations. The score focuses on how you manage credit, not how much you earn.',
        xpReward: 10,
        difficulty: 'beginner',
      } as TrueFalseQuestion,
      {
        id: 'cd-1-q4',
        type: 'fill_blank',
        question: 'Payment history accounts for what percentage of your credit score?',
        blankedText: '___% of your credit score',
        acceptedAnswers: ['35', '35%'],
        explanation: 'Payment history is the biggest factor at 35%. This is why paying on time is so important!',
        xpReward: 10,
        difficulty: 'beginner',
      } as FillBlankQuestion,
    ],
  },

  // -------------------------------------------------------------------------
  // LESSON 2: What is APR?
  // -------------------------------------------------------------------------
  {
    id: 'cd-lesson-2',
    title: 'What is APR?',
    type: 'mixed',
    estimatedMinutes: 10,
    completionStatus: 'not_started',
    domain: 'debt',
    difficulty: 'beginner',
    xpReward: 60,
    content: `# What is APR?

APR stands for Annual Percentage Rate - the yearly cost of borrowing money.

## Understanding APR
- Expressed as a percentage (e.g., 18% APR)
- Includes interest rate plus fees
- Higher APR = more expensive to borrow

## Common APR Ranges
- Credit Cards: 15-25% (can go higher!)
- Auto Loans: 4-10%
- Mortgages: 3-7%
- Personal Loans: 6-36%

## Why It Matters
A small difference in APR can cost you thousands over time!`,
    questions: [
      {
        id: 'cd-2-q1',
        type: 'mcq',
        question: 'What does APR stand for?',
        options: [
          'Automatic Payment Rate',
          'Annual Percentage Rate',
          'Average Payment Required',
          'Applied Principal Return'
        ],
        correctAnswer: 1,
        explanation: 'APR = Annual Percentage Rate, which represents the yearly cost of borrowing money.',
        xpReward: 10,
        difficulty: 'beginner',
      } as MCQQuestion,
      {
        id: 'cd-2-q2',
        type: 'ordering',
        question: 'Order these loan types from typically LOWEST APR to HIGHEST:',
        items: ['Mortgage', 'Auto loan', 'Personal loan', 'Credit card'],
        instruction: 'Drag from lowest APR to highest',
        explanation: 'Mortgages (3-7%), auto loans (4-10%), personal loans (6-36%), credit cards (15-25%+). Secured loans have lower rates.',
        xpReward: 15,
        difficulty: 'beginner',
      } as OrderingQuestion,
      {
        id: 'cd-2-q3',
        type: 'calculation',
        question: 'You owe $1,000 on a credit card with 24% APR. What\'s the annual interest cost (simplified)?',
        problemText: '$1,000 × 24% = ?',
        correctAnswer: 240,
        tolerance: 0,
        unit: '$',
        explanation: '$1,000 × 0.24 = $240 in interest per year. And that\'s if the balance stays the same!',
        xpReward: 15,
        difficulty: 'beginner',
      } as CalculationQuestion,
      {
        id: 'cd-2-q4',
        type: 'true_false',
        question: 'If two loans have the same interest rate, they always have the same APR.',
        correctAnswer: false,
        explanation: 'APR includes fees, not just interest. Two loans with the same rate but different fees will have different APRs.',
        xpReward: 10,
        difficulty: 'intermediate',
      } as TrueFalseQuestion,
    ],
  },

  // -------------------------------------------------------------------------
  // LESSON 3: How Interest Compounds
  // -------------------------------------------------------------------------
  {
    id: 'cd-lesson-3',
    title: 'How Interest Compounds',
    type: 'mixed',
    estimatedMinutes: 11,
    completionStatus: 'not_started',
    domain: 'debt',
    difficulty: 'intermediate',
    xpReward: 75,
    content: `# How Interest Compounds

Compound interest is when you earn (or owe) interest on your interest. It's either your best friend or your worst enemy.

## For Savings (Your Friend)
$1,000 at 5% for 10 years = $1,629 (not $1,500)
The extra $129 is interest on interest!

## For Debt (Your Enemy)
Credit card debt grows the same way - you pay interest on interest.

## The Rule of 72
Divide 72 by the interest rate to see how long until money doubles.
72 ÷ 6% = 12 years to double`,
    questions: [
      {
        id: 'cd-3-q1',
        type: 'mcq',
        question: 'What makes compound interest different from simple interest?',
        options: [
          'It\'s calculated only once',
          'You earn/owe interest on previously earned/owed interest',
          'It\'s always lower',
          'It only applies to savings accounts'
        ],
        correctAnswer: 1,
        explanation: 'Compound interest means interest accumulates on both the principal AND previously earned interest.',
        xpReward: 10,
        difficulty: 'beginner',
      } as MCQQuestion,
      {
        id: 'cd-3-q2',
        type: 'calculation',
        question: 'Using the Rule of 72: At 8% interest, roughly how many years until money doubles?',
        problemText: '72 ÷ 8 = ?',
        correctAnswer: 9,
        tolerance: 0,
        unit: 'years',
        explanation: '72 ÷ 8 = 9 years. The Rule of 72 is a quick way to estimate doubling time.',
        xpReward: 15,
        difficulty: 'intermediate',
      } as CalculationQuestion,
      {
        id: 'cd-3-q3',
        type: 'scenario',
        question: 'Two credit cards, same balance. Which costs more over time?',
        scenario: 'You have a $5,000 balance. Card A has 15% APR compounded monthly. Card B has 18% APR compounded monthly. You make minimum payments on both.',
        options: [
          { text: 'Card A (15% APR)', outcome: 'Lower rate means less interest over time.', impactScore: 100 },
          { text: 'Card B (18% APR)', outcome: 'Higher rate = more interest. This one costs more.', impactScore: 0 },
          { text: 'They cost the same', outcome: 'The APR difference matters a lot with compound interest!', impactScore: 0 },
          { text: 'Need more information', outcome: 'The APR tells you enough - higher rate = more cost.', impactScore: 30 },
        ],
        bestOptionIndex: 0,
        explanation: 'Card B with 18% APR will cost significantly more due to compounding. Even 3% higher can mean hundreds or thousands more in interest.',
        xpReward: 20,
        difficulty: 'intermediate',
      } as ScenarioQuestion,
      {
        id: 'cd-3-q4',
        type: 'true_false',
        question: 'Compound interest only benefits savers, not lenders.',
        correctAnswer: false,
        explanation: 'Compound interest works both ways! It benefits savers but also helps lenders earn more from borrowers.',
        xpReward: 10,
        difficulty: 'beginner',
      } as TrueFalseQuestion,
    ],
  },

  // -------------------------------------------------------------------------
  // LESSON 4: Good Debt vs Bad Debt
  // -------------------------------------------------------------------------
  {
    id: 'cd-lesson-4',
    title: 'Good Debt vs Bad Debt',
    type: 'mixed',
    estimatedMinutes: 9,
    completionStatus: 'not_started',
    domain: 'debt',
    difficulty: 'beginner',
    xpReward: 55,
    content: `# Good Debt vs Bad Debt

Not all debt is created equal. Some debt can actually help build wealth.

## "Good" Debt
- Mortgage (home typically appreciates)
- Student loans (increases earning potential)
- Business loans (generates income)
- Low-interest investments in yourself

## "Bad" Debt
- Credit card debt (high interest, depreciating purchases)
- Payday loans (extremely high interest)
- Car loans on expensive cars (car loses value)
- Debt for wants, not needs`,
    questions: [
      {
        id: 'cd-4-q1',
        type: 'matching',
        question: 'Classify each debt type as typically "good" or "bad":',
        leftItems: ['Mortgage for a home', 'Credit card for vacation', 'Student loan for degree', 'Payday loan for bills'],
        rightItems: ['Good debt', 'Bad debt', 'Good debt', 'Bad debt'],
        correctMatches: [0, 1, 2, 3],
        explanation: 'Mortgages and education can increase wealth. Credit cards for vacations and payday loans typically harm finances.',
        xpReward: 15,
        difficulty: 'beginner',
      } as MatchingQuestion,
      {
        id: 'cd-4-q2',
        type: 'mcq',
        question: 'What makes a debt "good"?',
        options: [
          'It has a low monthly payment',
          'It helps build wealth or increase earning potential',
          'It has a long repayment term',
          'It\'s easy to qualify for'
        ],
        correctAnswer: 1,
        explanation: '"Good" debt is typically an investment that can increase your net worth or income over time.',
        xpReward: 10,
        difficulty: 'beginner',
      } as MCQQuestion,
      {
        id: 'cd-4-q3',
        type: 'true_false',
        question: 'A car loan is always considered "bad" debt.',
        correctAnswer: false,
        explanation: 'It depends! A reasonable car loan for reliable transportation to work can be necessary. An expensive luxury car loan is typically "bad" debt.',
        xpReward: 10,
        difficulty: 'intermediate',
      } as TrueFalseQuestion,
      {
        id: 'cd-4-q4',
        type: 'scenario',
        question: 'Is this debt worth it?',
        scenario: 'You can take a $20,000 student loan at 5% interest for a degree that typically increases salary by $15,000/year.',
        options: [
          { text: 'Yes, this is likely worth it', outcome: 'The increased income quickly outpaces the loan cost.', impactScore: 100 },
          { text: 'No, all debt is bad', outcome: 'Not quite - this investment has positive expected return.', impactScore: 20 },
          { text: 'Need to see the exact payoff timeline', outcome: 'Fair point, but $15k/year extra vs $20k total loan is clearly positive.', impactScore: 60 },
          { text: 'Only if the payment is low', outcome: 'Monthly payment matters less than total value of the investment.', impactScore: 40 },
        ],
        bestOptionIndex: 0,
        explanation: 'With $15k/year salary increase, the loan pays for itself in under 2 years. This is a good investment.',
        xpReward: 20,
        difficulty: 'intermediate',
      } as ScenarioQuestion,
    ],
  },

  // -------------------------------------------------------------------------
  // LESSON 5: Credit Card Basics
  // -------------------------------------------------------------------------
  {
    id: 'cd-lesson-5',
    title: 'Credit Card Basics',
    type: 'mixed',
    estimatedMinutes: 10,
    completionStatus: 'not_started',
    domain: 'credit',
    difficulty: 'beginner',
    xpReward: 60,
    content: `# Credit Card Basics

Credit cards are powerful tools - they can build your credit or bury you in debt.

## Key Terms
- **Credit Limit**: Maximum you can borrow
- **Statement Balance**: What you owe for the billing period
- **Minimum Payment**: Smallest amount due to avoid late fees
- **Due Date**: When payment must arrive
- **Grace Period**: Time to pay without interest (if paid in full)

## The Golden Rules
1. Pay the FULL balance each month
2. Keep utilization under 30%
3. Never miss a payment`,
    questions: [
      {
        id: 'cd-5-q1',
        type: 'mcq',
        question: 'To avoid paying interest on a credit card, you should:',
        options: [
          'Make the minimum payment each month',
          'Pay the full statement balance by the due date',
          'Pay half the balance',
          'Skip one month, pay double the next'
        ],
        correctAnswer: 1,
        explanation: 'Paying the full statement balance by the due date uses the grace period to avoid interest charges.',
        xpReward: 10,
        difficulty: 'beginner',
      } as MCQQuestion,
      {
        id: 'cd-5-q2',
        type: 'calculation',
        question: 'Your credit limit is $5,000. To stay under 30% utilization, what\'s the max you should owe?',
        problemText: '$5,000 × 30% = ?',
        correctAnswer: 1500,
        tolerance: 0,
        unit: '$',
        explanation: '30% of $5,000 = $1,500. Keeping utilization below this helps your credit score.',
        xpReward: 15,
        difficulty: 'beginner',
      } as CalculationQuestion,
      {
        id: 'cd-5-q3',
        type: 'ordering',
        question: 'Order these credit card actions from BEST to WORST for your finances:',
        items: ['Pay full balance monthly', 'Pay more than minimum', 'Pay only minimum', 'Miss a payment'],
        instruction: 'Drag from best to worst',
        explanation: 'Paying in full avoids interest. More than minimum reduces debt faster. Minimum keeps you in debt. Missing payments damages credit.',
        xpReward: 15,
        difficulty: 'beginner',
      } as OrderingQuestion,
      {
        id: 'cd-5-q4',
        type: 'true_false',
        question: 'Making only the minimum payment will pay off your credit card balance quickly.',
        correctAnswer: false,
        explanation: 'Minimum payments mostly cover interest. It can take YEARS to pay off even small balances with minimum payments only.',
        xpReward: 10,
        difficulty: 'beginner',
      } as TrueFalseQuestion,
    ],
  },

  // -------------------------------------------------------------------------
  // LESSON 6: The Minimum Payment Trap
  // -------------------------------------------------------------------------
  {
    id: 'cd-lesson-6',
    title: 'The Minimum Payment Trap',
    type: 'mixed',
    estimatedMinutes: 10,
    completionStatus: 'not_started',
    domain: 'debt',
    difficulty: 'intermediate',
    xpReward: 70,
    content: `# The Minimum Payment Trap

Credit card companies want you to pay only the minimum. Here's why that's dangerous.

## The Math
$5,000 balance at 20% APR with 2% minimum payment:
- Minimum payment: ~$100/month (decreasing over time)
- Time to pay off: **30+ YEARS**
- Total interest paid: **$8,000+**

You'd pay $13,000 for a $5,000 purchase!

## The Solution
Always pay more than the minimum. Even $50 extra per month makes a huge difference.`,
    questions: [
      {
        id: 'cd-6-q1',
        type: 'mcq',
        question: 'Why do credit card companies set low minimum payments?',
        options: [
          'To help customers manage their money',
          'Because they legally have to',
          'To maximize the interest they earn from you',
          'To simplify billing'
        ],
        correctAnswer: 2,
        explanation: 'Low minimums keep you in debt longer, meaning more interest payments to the card company.',
        xpReward: 10,
        difficulty: 'intermediate',
      } as MCQQuestion,
      {
        id: 'cd-6-q2',
        type: 'calculation',
        question: 'A $3,000 balance at 18% APR. What\'s the monthly interest charge?',
        problemText: '$3,000 × 18% ÷ 12 months = ?',
        correctAnswer: 45,
        tolerance: 0,
        unit: '$',
        explanation: 'Monthly interest = $3,000 × 0.18 ÷ 12 = $45. If your minimum payment is $60, only $15 goes to principal!',
        xpReward: 15,
        difficulty: 'intermediate',
      } as CalculationQuestion,
      {
        id: 'cd-6-q3',
        type: 'scenario',
        question: 'How should you handle this credit card debt?',
        scenario: 'You have a $2,000 credit card balance at 22% APR. Minimum payment is $40/month. You have $100/month available.',
        options: [
          { text: 'Pay $100/month toward the card', outcome: 'Great! You\'ll pay it off in about 2 years and save hundreds in interest.', impactScore: 100 },
          { text: 'Pay $40 minimum, save $60', outcome: 'The interest you pay exceeds savings interest. Pay debt first!', impactScore: 30 },
          { text: 'Pay $40 minimum, invest $60', outcome: 'You won\'t beat 22% in the market reliably. Pay the debt.', impactScore: 20 },
          { text: 'Pay minimums, it\'ll work out eventually', outcome: 'You\'ll pay thousands in interest over many years.', impactScore: 0 },
        ],
        bestOptionIndex: 0,
        explanation: 'At 22% APR, paying off the debt is the best guaranteed return you can get. Attack it aggressively!',
        xpReward: 25,
        difficulty: 'intermediate',
      } as ScenarioQuestion,
      {
        id: 'cd-6-q4',
        type: 'true_false',
        question: 'Paying $50 extra per month on a credit card makes almost no difference.',
        correctAnswer: false,
        explanation: '$50 extra per month can cut years off your payoff time and save hundreds or thousands in interest!',
        xpReward: 10,
        difficulty: 'beginner',
      } as TrueFalseQuestion,
    ],
  },

  // -------------------------------------------------------------------------
  // LESSON 7: Debt Snowball Method
  // -------------------------------------------------------------------------
  {
    id: 'cd-lesson-7',
    title: 'Debt Snowball Method',
    type: 'mixed',
    estimatedMinutes: 10,
    completionStatus: 'not_started',
    domain: 'debt',
    difficulty: 'intermediate',
    xpReward: 70,
    content: `# Debt Snowball Method

The snowball method focuses on psychological wins to keep you motivated.

## How It Works
1. List all debts from smallest to largest balance
2. Pay minimums on all debts
3. Put ALL extra money toward the smallest debt
4. When smallest is paid, roll that payment to the next smallest
5. Repeat until debt-free!

## Why It Works
Quick wins build momentum. Paying off small debts first gives you motivation to keep going.`,
    questions: [
      {
        id: 'cd-7-q1',
        type: 'ordering',
        question: 'Using the snowball method, order which debts to pay first:',
        items: ['Credit card: $500', 'Medical bill: $1,200', 'Car loan: $5,000', 'Student loan: $15,000'],
        instruction: 'Order from pay first to pay last',
        explanation: 'Snowball = smallest balance first. Pay the $500 credit card, then $1,200 medical, then $5,000 car, finally student loan.',
        xpReward: 15,
        difficulty: 'beginner',
      } as OrderingQuestion,
      {
        id: 'cd-7-q2',
        type: 'mcq',
        question: 'What\'s the main advantage of the debt snowball method?',
        options: [
          'It minimizes total interest paid',
          'It provides quick wins that build motivation',
          'It\'s the fastest method mathematically',
          'Banks recommend it'
        ],
        correctAnswer: 1,
        explanation: 'The snowball method\'s power is psychological - quick wins keep you motivated to continue.',
        xpReward: 10,
        difficulty: 'beginner',
      } as MCQQuestion,
      {
        id: 'cd-7-q3',
        type: 'calculation',
        question: 'You pay off a $300 debt that had a $25 minimum. You were also paying $150 extra. What\'s your new payment for the next debt?',
        problemText: '$25 + $150 = ?',
        correctAnswer: 175,
        tolerance: 0,
        unit: '$',
        explanation: 'The "snowball" grows! Your previous $25 minimum + $150 extra = $175 now attacks the next debt.',
        xpReward: 15,
        difficulty: 'beginner',
      } as CalculationQuestion,
      {
        id: 'cd-7-q4',
        type: 'true_false',
        question: 'The debt snowball method always saves you the most money in interest.',
        correctAnswer: false,
        explanation: 'The avalanche method (highest interest first) saves more in interest. Snowball prioritizes motivation over pure math.',
        xpReward: 10,
        difficulty: 'intermediate',
      } as TrueFalseQuestion,
    ],
  },

  // -------------------------------------------------------------------------
  // LESSON 8: Debt Avalanche Method
  // -------------------------------------------------------------------------
  {
    id: 'cd-lesson-8',
    title: 'Debt Avalanche Method',
    type: 'mixed',
    estimatedMinutes: 10,
    completionStatus: 'not_started',
    domain: 'debt',
    difficulty: 'intermediate',
    xpReward: 70,
    content: `# Debt Avalanche Method

The avalanche method is mathematically optimal - it minimizes total interest paid.

## How It Works
1. List all debts from highest to lowest INTEREST RATE
2. Pay minimums on all debts
3. Put ALL extra money toward the highest interest debt
4. When it's paid, roll that payment to the next highest rate
5. Repeat until debt-free!

## Snowball vs Avalanche
- **Snowball**: Fastest small wins, more interest paid overall
- **Avalanche**: Saves the most money, but may take longer to see progress`,
    questions: [
      {
        id: 'cd-8-q1',
        type: 'ordering',
        question: 'Using the avalanche method, order which debts to pay first:',
        items: ['Credit card at 24% APR', 'Car loan at 6% APR', 'Personal loan at 12% APR', 'Student loan at 5% APR'],
        instruction: 'Order from pay first to pay last',
        explanation: 'Avalanche = highest interest first. 24% credit card, then 12% personal, then 6% car, finally 5% student.',
        xpReward: 15,
        difficulty: 'beginner',
      } as OrderingQuestion,
      {
        id: 'cd-8-q2',
        type: 'mcq',
        question: 'When is the avalanche method best?',
        options: [
          'When you need quick wins for motivation',
          'When you want to minimize total interest paid',
          'When all your debts have the same interest rate',
          'When you have only one debt'
        ],
        correctAnswer: 1,
        explanation: 'Avalanche minimizes interest. If you\'re disciplined and don\'t need quick wins, it\'s mathematically the best approach.',
        xpReward: 10,
        difficulty: 'beginner',
      } as MCQQuestion,
      {
        id: 'cd-8-q3',
        type: 'scenario',
        question: 'Which method should Sarah use?',
        scenario: 'Sarah has: Card A: $8,000 at 22% APR, Card B: $500 at 15% APR, Student loan: $20,000 at 5%. Sarah gets discouraged easily.',
        options: [
          { text: 'Snowball: Pay Card B ($500) first', outcome: 'Quick win helps motivation! She\'ll then tackle Card A.', impactScore: 80 },
          { text: 'Avalanche: Pay Card A (22%) first', outcome: 'Saves the most money, but $8,000 takes a while to see progress.', impactScore: 60 },
          { text: 'Pay the student loan first', outcome: 'Lowest rate - this should be last on either method!', impactScore: 0 },
          { text: 'Pay equal amounts to all debts', outcome: 'Not strategic - you pay more interest this way.', impactScore: 20 },
        ],
        bestOptionIndex: 0,
        explanation: 'For someone who gets discouraged easily, the quick win from paying off $500 Card B first provides motivation to continue.',
        xpReward: 25,
        difficulty: 'intermediate',
      } as ScenarioQuestion,
      {
        id: 'cd-8-q4',
        type: 'true_false',
        question: 'You can combine snowball and avalanche methods.',
        correctAnswer: true,
        explanation: 'Yes! Some people start with snowball for quick wins, then switch to avalanche. Choose what works for you.',
        xpReward: 10,
        difficulty: 'intermediate',
      } as TrueFalseQuestion,
    ],
  },

  // -------------------------------------------------------------------------
  // LESSON 9: Building Credit History
  // -------------------------------------------------------------------------
  {
    id: 'cd-lesson-9',
    title: 'Building Credit History',
    type: 'mixed',
    estimatedMinutes: 9,
    completionStatus: 'not_started',
    domain: 'credit',
    difficulty: 'beginner',
    xpReward: 55,
    content: `# Building Credit History

Good credit opens doors: better loan rates, easier apartment rentals, even some jobs check credit.

## How to Build Credit
1. **Get a starter card**: Secured card or student card
2. **Use it lightly**: Small purchases, pay in full
3. **Pay on time**: Every single month
4. **Keep cards open**: Length of history matters
5. **Don't apply for too many**: Each application can hurt score

## Time Is Your Friend
Credit history length matters. The earlier you start building good habits, the better.`,
    questions: [
      {
        id: 'cd-9-q1',
        type: 'mcq',
        question: 'What\'s the best first credit card for someone with no credit history?',
        options: [
          'A rewards card with high spending limits',
          'A secured credit card or student card',
          'A store credit card with 25% APR',
          'Borrowing someone else\'s card'
        ],
        correctAnswer: 1,
        explanation: 'Secured or student cards are designed for those building credit and are easier to qualify for.',
        xpReward: 10,
        difficulty: 'beginner',
      } as MCQQuestion,
      {
        id: 'cd-9-q2',
        type: 'ordering',
        question: 'Order these credit-building steps correctly:',
        items: ['Get approved for a starter card', 'Make small purchases monthly', 'Pay full balance on time', 'Watch credit score improve over months'],
        instruction: 'Put in order from first to last',
        explanation: 'Get a card, use it responsibly with small purchases, pay in full each month, and watch your score grow!',
        xpReward: 15,
        difficulty: 'beginner',
      } as OrderingQuestion,
      {
        id: 'cd-9-q3',
        type: 'true_false',
        question: 'Closing old credit cards helps improve your credit score.',
        correctAnswer: false,
        explanation: 'Closing old cards can HURT your score by reducing credit history length and increasing utilization ratio.',
        xpReward: 10,
        difficulty: 'intermediate',
      } as TrueFalseQuestion,
      {
        id: 'cd-9-q4',
        type: 'mcq',
        question: 'How often should you use your credit card to build history?',
        options: [
          'Never - just having it builds credit',
          'Max it out every month',
          'Small purchases monthly, paid in full',
          'Only for emergencies'
        ],
        correctAnswer: 2,
        explanation: 'Regular small purchases that you pay in full show responsible use and build positive history.',
        xpReward: 10,
        difficulty: 'beginner',
      } as MCQQuestion,
    ],
  },

  // -------------------------------------------------------------------------
  // LESSON 10: Avoiding Debt Traps
  // -------------------------------------------------------------------------
  {
    id: 'cd-lesson-10',
    title: 'Avoiding Debt Traps',
    type: 'mixed',
    estimatedMinutes: 10,
    completionStatus: 'not_started',
    domain: 'debt',
    difficulty: 'intermediate',
    xpReward: 70,
    content: `# Avoiding Debt Traps

Some lending products are designed to trap you in a cycle of debt. Learn to spot them.

## Common Debt Traps
1. **Payday Loans**: 400%+ APR, creates borrowing cycle
2. **Rent-to-Own**: You pay 2-3x the item's value
3. **Buy Now Pay Later**: Easy to over-commit
4. **0% APR Traps**: Deferred interest means ALL interest due if not paid in time

## Warning Signs
- "Easy approval" 
- No credit check
- Very high fees
- Pressure to decide quickly`,
    questions: [
      {
        id: 'cd-10-q1',
        type: 'matching',
        question: 'Match each debt trap to its danger:',
        leftItems: ['Payday loans', 'Rent-to-own', '0% APR (deferred)', 'Buy now pay later'],
        rightItems: ['400%+ APR rates', 'Pay 2-3x item value', 'All interest charged if not paid by deadline', 'Easy to overcommit on purchases'],
        correctMatches: [0, 1, 2, 3],
        explanation: 'Each type has specific risks. Understanding them helps you avoid these traps.',
        xpReward: 15,
        difficulty: 'intermediate',
      } as MatchingQuestion,
      {
        id: 'cd-10-q2',
        type: 'scenario',
        question: 'Should you take this payday loan?',
        scenario: 'Your car needs a $300 repair. Your paycheck is in 5 days. A payday lender offers $300 with a $50 fee due in 2 weeks.',
        options: [
          { text: 'Take the loan, it\'s only $50', outcome: '$50 on $300 for 2 weeks = 434% APR! Many people can\'t pay back and reborrow.', impactScore: -50 },
          { text: 'Ask your employer for a paycheck advance', outcome: 'Many employers offer this - usually free or low cost.', impactScore: 90 },
          { text: 'Put it on a credit card if you have one', outcome: 'Even 24% APR is way better than 434% APR.', impactScore: 70 },
          { text: 'Wait 5 days and pay cash from paycheck', outcome: 'Best option if you can get by without the car for 5 days.', impactScore: 100 },
        ],
        bestOptionIndex: 3,
        explanation: 'A $50 fee on $300 for 2 weeks equals 434% APR! Exhaust every other option before payday loans.',
        xpReward: 25,
        difficulty: 'intermediate',
      } as ScenarioQuestion,
      {
        id: 'cd-10-q3',
        type: 'true_false',
        question: '"No credit check" loans usually have your best interests in mind.',
        correctAnswer: false,
        explanation: '"No credit check" means they don\'t care if you can repay - the terms are usually predatory.',
        xpReward: 10,
        difficulty: 'beginner',
      } as TrueFalseQuestion,
      {
        id: 'cd-10-q4',
        type: 'mcq',
        question: 'What happens with deferred interest if you don\'t pay off a 0% APR purchase in time?',
        options: [
          'You start paying interest from that point forward',
          'All the interest from the entire period is charged at once',
          'The interest is forgiven',
          'Your credit score drops but you owe nothing extra'
        ],
        correctAnswer: 1,
        explanation: 'Deferred interest means ALL the interest (often at 25%+) from the entire period is charged if you don\'t pay in full by the deadline.',
        xpReward: 10,
        difficulty: 'intermediate',
      } as MCQQuestion,
    ],
  },

  // -------------------------------------------------------------------------
  // LESSON 11: Mastery Challenge
  // -------------------------------------------------------------------------
  {
    id: 'cd-lesson-11',
    title: 'Credit & Debt: Mastery Challenge',
    type: 'quiz',
    estimatedMinutes: 12,
    completionStatus: 'not_started',
    domain: 'debt',
    difficulty: 'advanced',
    xpReward: 150,
    content: `# Mastery Challenge: Credit & Debt

This comprehensive quiz tests everything you've learned about credit scores, interest, debt strategies, and avoiding traps.

Apply your knowledge carefully. You've got this!`,
    questions: [
      {
        id: 'cd-11-q1',
        type: 'calculation',
        question: 'Your credit limit is $3,000. You owe $1,200. What\'s your credit utilization percentage?',
        problemText: '($1,200 ÷ $3,000) × 100 = ?',
        correctAnswer: 40,
        tolerance: 0,
        unit: '%',
        explanation: '$1,200 ÷ $3,000 = 0.40 = 40%. This is above the recommended 30%, which may impact your score.',
        xpReward: 20,
        difficulty: 'intermediate',
      } as CalculationQuestion,
      {
        id: 'cd-11-q2',
        type: 'ordering',
        question: 'Using the AVALANCHE method, order these debts for payment:',
        items: ['$2,000 at 24% APR', '$5,000 at 8% APR', '$1,000 at 18% APR', '$3,000 at 12% APR'],
        instruction: 'Order from pay first to pay last',
        explanation: 'Avalanche = highest interest first: 24%, then 18%, then 12%, finally 8%.',
        xpReward: 20,
        difficulty: 'intermediate',
      } as OrderingQuestion,
      {
        id: 'cd-11-q3',
        type: 'scenario',
        question: 'Make the best financial decision:',
        scenario: 'You have $2,000 in savings and $2,000 in credit card debt at 22% APR. Your emergency fund target is $1,000.',
        options: [
          { text: 'Pay off all $2,000 debt, rebuild emergency fund after', outcome: 'Risky - no emergency fund. But you stop 22% interest.', impactScore: 60 },
          { text: 'Keep $1,000 emergency fund, pay $1,000 toward debt', outcome: 'Balanced approach! You have a safety net while reducing debt.', impactScore: 100 },
          { text: 'Keep all savings, pay minimums on debt', outcome: 'Savings earn ~2%, debt costs 22%. The math doesn\'t work.', impactScore: 20 },
          { text: 'Invest the $2,000 instead', outcome: 'Guaranteed 22% return (paying off debt) beats uncertain investments.', impactScore: 10 },
        ],
        bestOptionIndex: 1,
        explanation: 'Keep a small emergency fund ($1,000) while aggressively paying debt. This balances safety with debt reduction.',
        xpReward: 25,
        difficulty: 'advanced',
      } as ScenarioQuestion,
      {
        id: 'cd-11-q4',
        type: 'matching',
        question: 'Match the credit score factor to its weight:',
        leftItems: ['Payment history', 'Credit utilization', 'Length of history', 'Credit mix'],
        rightItems: ['35%', '30%', '15%', '10%'],
        correctMatches: [0, 1, 2, 3],
        explanation: 'Payment history (35%) and utilization (30%) together make up 65% of your score - focus there!',
        xpReward: 20,
        difficulty: 'intermediate',
      } as MatchingQuestion,
      {
        id: 'cd-11-q5',
        type: 'calculation',
        question: 'Using Rule of 72: At 6% interest, how many years until an investment doubles?',
        problemText: '72 ÷ 6 = ?',
        correctAnswer: 12,
        tolerance: 0,
        unit: 'years',
        explanation: '72 ÷ 6 = 12 years. The Rule of 72 is a quick way to estimate doubling time at any interest rate.',
        xpReward: 15,
        difficulty: 'beginner',
      } as CalculationQuestion,
      {
        id: 'cd-11-q6',
        type: 'mcq',
        question: 'Which debt repayment method saves the MOST money in interest?',
        options: [
          'Debt snowball (smallest balance first)',
          'Debt avalanche (highest interest first)',
          'Paying equal amounts to all debts',
          'Paying only minimums'
        ],
        correctAnswer: 1,
        explanation: 'Avalanche (highest interest first) always minimizes total interest paid. Snowball focuses on motivation instead.',
        xpReward: 15,
        difficulty: 'beginner',
      } as MCQQuestion,
      {
        id: 'cd-11-q7',
        type: 'true_false',
        question: 'A mortgage is generally considered "good debt" because homes typically appreciate in value.',
        correctAnswer: true,
        explanation: 'Mortgages are usually "good debt" because: low interest rates, potential appreciation, and you need housing anyway.',
        xpReward: 10,
        difficulty: 'beginner',
      } as TrueFalseQuestion,
    ],
  },
];

// =============================================================================
// COURSE 3: INVESTING ESSENTIALS
// =============================================================================

type InvestingConceptTemplate = {
  conceptId: string;
  conceptName: string;
  easyStatement: string;
  easyAnswer: boolean;
  easyExplanation: string;
  mediumQuestion: string;
  mediumOptions: string[];
  mediumCorrectAnswer: number;
  mediumExplanation: string;
  hardQuestion: string;
  hardOptions: string[];
  hardCorrectAnswer: number;
  hardExplanation: string;
};

function buildInvestingConceptQuestions(
  lessonTag: string,
  template: InvestingConceptTemplate
): Question[] {
  const variantGroup = `${lessonTag}-${template.conceptId}`;

  return [
    {
      id: `${lessonTag}-${template.conceptId}-easy`,
      type: 'true_false',
      question: template.easyStatement,
      correctAnswer: template.easyAnswer,
      explanation: template.easyExplanation,
      xpReward: 5,
      difficulty: 'beginner',
      conceptId: template.conceptId,
      variantGroup,
      difficultyTier: 1,
    } as TrueFalseQuestion,
    {
      id: `${lessonTag}-${template.conceptId}-medium`,
      type: 'mcq',
      question: template.mediumQuestion,
      options: template.mediumOptions,
      correctAnswer: template.mediumCorrectAnswer,
      explanation: template.mediumExplanation,
      xpReward: 10,
      difficulty: 'intermediate',
      conceptId: template.conceptId,
      variantGroup,
      difficultyTier: 2,
    } as MCQQuestion,
    {
      id: `${lessonTag}-${template.conceptId}-hard`,
      type: 'mcq',
      question: template.hardQuestion,
      options: template.hardOptions,
      correctAnswer: template.hardCorrectAnswer,
      explanation: template.hardExplanation,
      xpReward: 15,
      difficulty: 'advanced',
      conceptId: template.conceptId,
      variantGroup,
      difficultyTier: 3,
    } as MCQQuestion,
  ];
}

function buildInvestingLesson(
  lessonTag: string,
  lesson: Omit<RawLesson, 'type' | 'completionStatus' | 'domain' | 'xpReward' | 'questions'> & {
    concepts: InvestingConceptTemplate[];
  }
): RawLesson {
  return {
    id: lesson.id,
    title: lesson.title,
    type: 'mixed',
    estimatedMinutes: lesson.estimatedMinutes,
    completionStatus: 'not_started',
    domain: 'investing',
    difficulty: lesson.difficulty,
    xpReward: 50,
    content: lesson.content,
    questions: lesson.concepts.flatMap((concept) =>
      buildInvestingConceptQuestions(lessonTag, concept)
    ),
  };
}

const investingLessons: RawLesson[] = [
  buildInvestingLesson('inv-f1', {
    id: 'inv-lesson-f1',
    title: 'Assets, Liabilities, and Net Worth',
    estimatedMinutes: 10,
    difficulty: 'beginner',
    content: `# Assets, Liabilities, and Net Worth

Before investing, you need to understand your financial position.

## Asset vs Liability

An asset is something that adds value to your finances (cash, investments, property that generates value).  
A liability is something you owe (credit card balance, loan, mortgage debt).

## Net Worth Formula

Net worth = Total Assets - Total Liabilities.  
Growing net worth over time is a core financial goal.

## Why This Matters for Investors

Investing works best when your cash flow and balance sheet are healthy.  
You need to know what you own, what you owe, and what can grow.`,
    concepts: [
      {
        conceptId: 'asset-liability-basics',
        conceptName: 'Asset and liability basics',
        easyStatement: 'A credit card balance is a liability.',
        easyAnswer: true,
        easyExplanation: 'Correct. It is money you owe, so it is a liability.',
        mediumQuestion: 'Which is most clearly an asset?',
        mediumOptions: ['Unpaid credit card bill', 'Car loan balance', 'Cash in your savings account', 'Late utility payment'],
        mediumCorrectAnswer: 2,
        mediumExplanation: 'Cash you own is an asset.',
        hardQuestion: 'A house you live in with a mortgage is best described as:',
        hardOptions: ['Only an asset', 'Only a liability', 'A property asset with an associated loan liability', 'Neither asset nor liability'],
        hardCorrectAnswer: 2,
        hardExplanation: 'The property is an asset; the mortgage is a liability.',
      },
      {
        conceptId: 'net-worth-foundation',
        conceptName: 'Net worth calculation',
        easyStatement: 'Net worth is assets minus liabilities.',
        easyAnswer: true,
        easyExplanation: 'Correct. This is the core balance-sheet equation.',
        mediumQuestion: 'If assets are $30,000 and liabilities are $12,000, net worth is:',
        mediumOptions: ['$18,000', '$42,000', '$12,000', '$30,000'],
        mediumCorrectAnswer: 0,
        mediumExplanation: '$30,000 - $12,000 = $18,000.',
        hardQuestion: 'Which action most directly improves net worth?',
        hardOptions: ['Taking on high-interest debt for consumption', 'Paying down liabilities while growing investments', 'Ignoring debt statements', 'Buying random assets with borrowed money'],
        hardCorrectAnswer: 1,
        hardExplanation: 'Reducing liabilities and increasing productive assets improves net worth fastest.',
      },
    ],
  }),
  buildInvestingLesson('inv-f2', {
    id: 'inv-lesson-f2',
    title: 'Active Income vs Passive Income',
    estimatedMinutes: 10,
    difficulty: 'beginner',
    content: `# Active Income vs Passive Income

Income quality matters as much as income amount.

## Active Income

Active income usually requires your ongoing time (salary, freelance, hourly work).

## Passive Income

Passive income comes from systems or assets (dividends, interest, rental cash flow, royalties, businesses with operators).

## Investor Mindset

Use active income to build capital.  
Then allocate capital into assets that can generate more passive income over time.`,
    concepts: [
      {
        conceptId: 'active-passive-basics',
        conceptName: 'Active and passive income basics',
        easyStatement: 'Salary from your day job is typically active income.',
        easyAnswer: true,
        easyExplanation: 'Correct. It usually depends on your ongoing labor.',
        mediumQuestion: 'Which is most likely passive income?',
        mediumOptions: ['Overtime pay', 'Freelance project payment', 'Dividend payout from ETF shares', 'Hourly consulting'],
        mediumCorrectAnswer: 2,
        mediumExplanation: 'Dividends are paid by assets you own, not direct hourly labor.',
        hardQuestion: 'Best long-term strategy for most beginners?',
        hardOptions: ['Rely only on one income source forever', 'Use active income to build diversified income-producing assets', 'Avoid saving and invest randomly', 'Use debt for lifestyle expansion'],
        hardCorrectAnswer: 1,
        hardExplanation: 'Active income can fund investments that later produce passive cash flow.',
      },
      {
        conceptId: 'income-systems-thinking',
        conceptName: 'Building income systems',
        easyStatement: 'Building passive income generally takes time and upfront effort or capital.',
        easyAnswer: true,
        easyExplanation: 'Correct. Passive systems are usually built, not instant.',
        mediumQuestion: 'Why is passive income valuable for investors?',
        mediumOptions: ['It removes all risk', 'It can reduce dependence on trading time for money', 'It guarantees fast wealth', 'It replaces budgeting'],
        mediumCorrectAnswer: 1,
        mediumExplanation: 'Passive income can improve resilience and financial flexibility.',
        hardQuestion: 'If passive income is low today, what is a practical first move?',
        hardOptions: ['Quit your active job immediately', 'Increase savings rate and automate investment contributions', 'Trade leveraged products daily', 'Ignore cash flow tracking'],
        hardCorrectAnswer: 1,
        hardExplanation: 'Consistency in saving and investing is the practical bridge to future passive income.',
      },
    ],
  }),
  buildInvestingLesson('inv-f3', {
    id: 'inv-lesson-f3',
    title: 'Inflation, Purchasing Power, and Why We Invest',
    estimatedMinutes: 11,
    difficulty: 'beginner',
    content: `# Inflation, Purchasing Power, and Why We Invest

One core reason to invest: cash can lose purchasing power over time.

## Inflation Basics

If inflation is 5% and your cash earns 1%, your real purchasing power declines.

## Monetary Expansion and Liquidity

Central banks can increase liquidity (for example during quantitative easing) to support credit and economic activity.  
Over long periods, increases in money supply and demand conditions can contribute to price pressures.

## Investor Takeaway

You invest to seek returns above inflation over the long run, while managing risk and staying diversified.`,
    concepts: [
      {
        conceptId: 'inflation-real-return',
        conceptName: 'Inflation and real return',
        easyStatement: 'If your return is lower than inflation, your purchasing power may shrink.',
        easyAnswer: true,
        easyExplanation: 'Correct. Real return is roughly nominal return minus inflation.',
        mediumQuestion: 'If inflation is 5% and your cash return is 1%, your approximate real return is:',
        mediumOptions: ['+4%', '0%', '-4%', '+6%'],
        mediumCorrectAnswer: 2,
        mediumExplanation: '1% - 5% = about -4% real return.',
        hardQuestion: 'Main long-term reason to invest instead of holding all cash?',
        hardOptions: ['To eliminate all uncertainty', 'To improve chance of beating inflation over time', 'To avoid budgeting', 'To guarantee short-term profits'],
        hardCorrectAnswer: 1,
        hardExplanation: 'Investing aims to preserve and grow purchasing power over long horizons.',
      },
      {
        conceptId: 'qe-liquidity-context',
        conceptName: 'QE and liquidity context',
        easyStatement: 'Central banks may inject liquidity to support economic activity during weak periods.',
        easyAnswer: true,
        easyExplanation: 'Correct. Policy can influence credit conditions and demand.',
        mediumQuestion: 'Which statement is most accurate?',
        mediumOptions: ['QE always causes identical inflation instantly', 'Policy, supply, and demand all interact in inflation outcomes', 'Money supply never affects prices', 'Inflation is only caused by wages'],
        mediumCorrectAnswer: 1,
        mediumExplanation: 'Inflation outcomes are multi-factor and context-dependent.',
        hardQuestion: 'What should a beginner do with this macro knowledge?',
        hardOptions: ['Trade news every hour', 'Build a long-term diversified plan and focus on real returns', 'Stop investing completely', 'Use leverage because inflation exists'],
        hardCorrectAnswer: 1,
        hardExplanation: 'Macro context is useful, but disciplined long-term execution matters more than reactive trading.',
      },
    ],
  }),
  buildInvestingLesson('inv-f4', {
    id: 'inv-lesson-f4',
    title: 'Goals, Time Horizon, and Retirement Targets',
    estimatedMinutes: 11,
    difficulty: 'beginner',
    content: `# Goals, Time Horizon, and Retirement Targets

Investing without a target is guesswork.

## Define the Goal

Example: "Retire in 30 years with enough income to cover annual expenses."

## Time Horizon

Your horizon shapes risk level: longer horizons can typically accept more volatility.

## Backward Planning

Estimate future annual spending, expected portfolio withdrawal rate, and required capital.  
Then estimate monthly savings/investment contributions needed to get there.`,
    concepts: [
      {
        conceptId: 'goal-time-horizon-link',
        conceptName: 'Goal and horizon alignment',
        easyStatement: 'Your investment strategy should depend on when you need the money.',
        easyAnswer: true,
        easyExplanation: 'Correct. Time horizon strongly affects suitable risk.',
        mediumQuestion: 'Which goal usually allows more equity exposure?',
        mediumOptions: ['Vacation in 6 months', 'Down payment in 1 year', 'Retirement in 30 years', 'Emergency fund for this year'],
        mediumCorrectAnswer: 2,
        mediumExplanation: 'Longer horizons generally support higher volatility assets.',
        hardQuestion: 'Best first step before choosing funds?',
        hardOptions: ['Copy someone else portfolio', 'Define goal amount and timeline', 'Trade trending assets', 'Focus only on daily market news'],
        hardCorrectAnswer: 1,
        hardExplanation: 'Clear targets and timeline should drive portfolio design.',
      },
      {
        conceptId: 'retirement-target-math',
        conceptName: 'Retirement target basics',
        easyStatement: 'Retirement planning includes estimating the capital you need.',
        easyAnswer: true,
        easyExplanation: 'Correct. You need a target to calculate required saving pace.',
        mediumQuestion: 'If annual retirement spending target is $40,000 and you use a 4% rule estimate, target capital is closest to:',
        mediumOptions: ['$160,000', '$400,000', '$1,000,000', '$4,000,000'],
        mediumCorrectAnswer: 2,
        mediumExplanation: '$40,000 / 0.04 = $1,000,000 (simplified planning estimate).',
        hardQuestion: 'If you are behind your retirement target, which is most controllable now?',
        hardOptions: ['Past market returns', 'Increase contribution rate and optimize asset allocation to your profile', 'Guaranteed high returns', 'Completely eliminating market volatility'],
        hardCorrectAnswer: 1,
        hardExplanation: 'Contribution rate, timeline, and allocation discipline are practical levers you control.',
      },
    ],
  }),
  buildInvestingLesson('inv-f5', {
    id: 'inv-lesson-f5',
    title: 'Index Funds, S&P 500, and the Magnificent 7',
    estimatedMinutes: 12,
    difficulty: 'beginner',
    content: `# Index Funds, S&P 500, and the Magnificent 7

For many people, a broad index fund is the simplest high-quality starting point.

## What Is an Index Fund?

An index fund aims to track an index rather than beat it by stock-picking.  
This gives broad diversification, low cost, and less decision fatigue.

## What Is the S&P 500?

The S&P 500 tracks 500 large U.S. companies.  
Inclusion generally requires large market size, sufficient liquidity, U.S. listing standards, and profitability criteria set by the index committee.

## Why This Matters

You do not need to manually rotate capital between winners and losers.  
The index methodology updates constituents over time.

## Magnificent 7 and Concentration

The "Mag 7" can represent a large share of index weight during certain periods.  
That can boost returns, but it also means concentration risk is real.

## Practical Takeaway

A broad S&P 500 index fund can be a strong baseline, but many investors also add international diversification and align allocation with their risk profile.`,
    concepts: [
      {
        conceptId: 'index-fund-baseline',
        conceptName: 'Index fund baseline concept',
        easyStatement: 'An index fund usually tracks an index instead of relying on one manager to pick stocks.',
        easyAnswer: true,
        easyExplanation: 'Correct. Index investing is typically rules-based and broad.',
        mediumQuestion: 'Why do many beginners start with broad index funds?',
        mediumOptions: [
          'They remove all risk',
          'They offer diversification and usually lower fees',
          'They guarantee outperformance every year',
          'They only hold small private companies'
        ],
        mediumCorrectAnswer: 1,
        mediumExplanation: 'Diversification and low cost are key reasons index funds are common starting points.',
        hardQuestion: 'What is the strongest argument for index funds as a baseline?',
        hardOptions: [
          'They always beat every active fund in every year',
          'They combine broad market exposure, simplicity, and cost efficiency',
          'They avoid any market drawdowns',
          'They remove the need for any plan'
        ],
        hardCorrectAnswer: 1,
        hardExplanation: 'Index funds are strong because they are broad, simple, and usually inexpensive.',
      },
      {
        conceptId: 'sp500-selection-reality',
        conceptName: 'S&P 500 inclusion reality',
        easyStatement: 'S&P 500 membership is based on index rules and committee decisions, not social media popularity.',
        easyAnswer: true,
        easyExplanation: 'Correct. Inclusion follows methodology standards, including size and profitability requirements.',
        mediumQuestion: 'Which statement about S&P 500 inclusion is most accurate?',
        mediumOptions: [
          'Any company with exactly $1B revenue is automatically included',
          'Companies are screened by methodology factors such as size, liquidity, and profitability',
          'Only tech companies can join',
          'Members are permanent forever once included'
        ],
        mediumCorrectAnswer: 1,
        mediumExplanation: 'Inclusion is criteria-based. It is not a simple fixed revenue threshold.',
        hardQuestion: 'If a company no longer fits the index standards, what can happen?',
        hardOptions: [
          'It must stay forever',
          'It can be removed and replaced under index methodology',
          'The whole index is deleted',
          'All funds stop operating'
        ],
        hardCorrectAnswer: 1,
        hardExplanation: 'Indices are maintained over time; constituents can be replaced.',
      },
      {
        conceptId: 'mag7-concentration-risk',
        conceptName: 'Mag 7 concentration tradeoff',
        easyStatement: 'Even diversified indices can become concentrated in a few mega-cap companies.',
        easyAnswer: true,
        easyExplanation: 'Correct. Weight concentration can rise when a few companies dominate market cap.',
        mediumQuestion: 'What is a key risk when a few large companies dominate index weight?',
        mediumOptions: [
          'No risk increase at all',
          'Portfolio becomes more sensitive to those few companies',
          'The index becomes a bond fund',
          'All smaller firms are removed immediately'
        ],
        mediumCorrectAnswer: 1,
        mediumExplanation: 'Higher concentration means outcomes depend more on fewer names.',
        hardQuestion: 'A prudent response to concentration concern is usually:',
        hardOptions: [
          'Panic-sell all index funds',
          'Review allocation and consider broader diversification (for example global exposure)',
          'Use maximum leverage on top holdings',
          'Stop investing permanently'
        ],
        hardCorrectAnswer: 1,
        hardExplanation: 'Better diversification decisions are generally stronger than emotional exits.',
      },
    ],
  }),
  buildInvestingLesson('inv-1', {
    id: 'inv-lesson-1',
    title: 'What Is Investing and Why It Matters',
    estimatedMinutes: 9,
    difficulty: 'beginner',
    content: `# What Is Investing and Why It Matters

Investing means putting money into assets that can grow over time. Saving protects money; investing helps it compound.

## Saving vs Investing

Saving is for short-term goals and emergencies. Investing is for long-term goals such as retirement or future freedom.

## Return and Risk

Higher potential return usually comes with higher risk. The goal is to choose risk you can handle and stay consistent.

## Time in the Market

Starting early matters more than being perfect. Small monthly investments over years can become meaningful wealth.`,
    concepts: [
      {
        conceptId: 'investing-purpose',
        conceptName: 'Purpose of investing',
        easyStatement: 'Investing is mainly for long-term growth, not next week spending.',
        easyAnswer: true,
        easyExplanation: 'Correct. Investing works best for long-term goals where short-term market swings are acceptable.',
        mediumQuestion: 'Which goal is most appropriate for investing?',
        mediumOptions: ['Rent due next month', 'Emergency medical bill', 'Retirement in 25 years', 'Phone bill next week'],
        mediumCorrectAnswer: 2,
        mediumExplanation: 'Long-term goals like retirement are better suited for investing.',
        hardQuestion: 'A beginner says, "I will invest my emergency fund to earn more." What is the best response?',
        hardOptions: ['Great idea, emergencies are rare', 'Keep emergency fund in cash-like savings and invest separate money', 'Put all cash into one stock', 'Use leverage to grow faster'],
        hardCorrectAnswer: 1,
        hardExplanation: 'Emergency funds should stay liquid and stable. Invest separate long-term money.',
      },
      {
        conceptId: 'risk-return-basics',
        conceptName: 'Risk and return basics',
        easyStatement: 'Higher expected investment returns usually involve taking more risk.',
        easyAnswer: true,
        easyExplanation: 'Correct. Risk and expected return are linked in investing.',
        mediumQuestion: 'Which option is generally the highest risk?',
        mediumOptions: ['Broad market ETF', 'Government bond fund', 'Single small-cap stock', 'Savings account'],
        mediumCorrectAnswer: 2,
        mediumExplanation: 'Single small-cap stocks are typically more volatile than diversified funds.',
        hardQuestion: 'If you panic-sell during market drops, what should you likely change first?',
        hardOptions: ['Increase trading frequency', 'Reduce risk level to match your tolerance', 'Buy only random stocks', 'Ignore diversification'],
        hardCorrectAnswer: 1,
        hardExplanation: 'Your portfolio risk should match behavior. A lower-risk allocation helps you stay invested.',
      },
    ],
  }),
  buildInvestingLesson('inv-2', {
    id: 'inv-lesson-2',
    title: 'Risk, Volatility, and Your Investor Profile',
    estimatedMinutes: 9,
    difficulty: 'beginner',
    content: `# Risk, Volatility, and Your Investor Profile

Volatility means prices move up and down. Risk is the chance you do not reach your goal.

## Know Your Time Horizon

If you need money soon, reduce risk. If your goal is far away, you can often accept more volatility.

## Risk Tolerance vs Risk Capacity

Tolerance is emotional comfort. Capacity is your financial ability to absorb losses. You need both aligned.`,
    concepts: [
      {
        conceptId: 'volatility-vs-risk',
        conceptName: 'Volatility versus real risk',
        easyStatement: 'Volatility and risk are exactly the same thing.',
        easyAnswer: false,
        easyExplanation: 'Not exactly. Volatility is price movement; risk is failing your financial objective.',
        mediumQuestion: 'For a 2-year goal, which approach is usually safer?',
        mediumOptions: ['100% equities', 'Mostly cash and short-term bonds', 'Leveraged ETFs', 'Crypto-only portfolio'],
        mediumCorrectAnswer: 1,
        mediumExplanation: 'Shorter goals usually need lower-volatility assets.',
        hardQuestion: 'Who can typically hold more equity risk?',
        hardOptions: ['Someone with unstable income and no emergency fund', 'Someone retiring next year', 'Someone with a 25-year horizon and stable cash flow', 'Someone who needs down payment in 12 months'],
        hardCorrectAnswer: 2,
        hardExplanation: 'Long horizon plus financial stability increases risk capacity.',
      },
      {
        conceptId: 'risk-profile-fit',
        conceptName: 'Matching portfolio to profile',
        easyStatement: 'Your investment plan should match both your goals and your behavior.',
        easyAnswer: true,
        easyExplanation: 'Correct. A good plan is one you can stick with through market cycles.',
        mediumQuestion: 'What is a warning sign your portfolio risk is too high?',
        mediumOptions: ['You invest automatically each month', 'You check balance monthly', 'You panic and sell after normal dips', 'You diversify across assets'],
        mediumCorrectAnswer: 2,
        mediumExplanation: 'Panic selling often means risk is above your tolerance.',
        hardQuestion: 'Best fix for an anxious investor with long-term goals?',
        hardOptions: ['Stop investing completely', 'Use diversified funds and slightly lower equity allocation', 'Trade daily to gain control', 'Concentrate in one hot stock'],
        hardCorrectAnswer: 1,
        hardExplanation: 'A diversified, slightly lower-risk plan improves consistency without quitting.',
      },
    ],
  }),
  buildInvestingLesson('inv-3', {
    id: 'inv-lesson-3',
    title: 'Compound Growth and Time in Market',
    estimatedMinutes: 10,
    difficulty: 'beginner',
    content: `# Compound Growth and Time in Market

Compounding means returns can earn returns. Time is the engine behind wealth growth.

## Why Starting Early Wins

A smaller amount invested early can outperform larger amounts started late.

## Consistency Beats Perfection

Regular contributions matter more than trying to perfectly predict market tops and bottoms.`,
    concepts: [
      {
        conceptId: 'compounding-mechanic',
        conceptName: 'How compounding works',
        easyStatement: 'Compounding means you can earn returns on past returns.',
        easyAnswer: true,
        easyExplanation: 'Correct. Growth builds on itself over time.',
        mediumQuestion: 'What most improves compounding outcomes?',
        mediumOptions: ['Frequent panic selling', 'Longer holding period and consistent contributions', 'Waiting for perfect market timing', 'Withdrawing gains every month'],
        mediumCorrectAnswer: 1,
        mediumExplanation: 'Time and consistency are core compounding drivers.',
        hardQuestion: 'Rule of 72: if return is 8%, doubling time is closest to:',
        hardOptions: ['6 years', '9 years', '12 years', '18 years'],
        hardCorrectAnswer: 1,
        hardExplanation: '72/8 = 9 years (approximate).',
      },
      {
        conceptId: 'time-vs-timing',
        conceptName: 'Time in market versus timing',
        easyStatement: 'Trying to perfectly time every market move is usually hard and unreliable.',
        easyAnswer: true,
        easyExplanation: 'Correct. Most investors do better with disciplined long-term plans.',
        mediumQuestion: 'Best long-term habit for most beginners?',
        mediumOptions: ['All-in only after crashes', 'Automated monthly investing', 'Daily leverage trades', 'Hold cash forever'],
        mediumCorrectAnswer: 1,
        mediumExplanation: 'Automation reduces emotional decisions and supports consistency.',
        hardQuestion: 'Missing a few best market days often leads to:',
        hardOptions: ['Much lower long-term returns', 'Higher guaranteed returns', 'No impact on outcomes', 'Lower volatility and higher growth always'],
        hardCorrectAnswer: 0,
        hardExplanation: 'A handful of strong days can drive a large share of long-term gains.',
      },
    ],
  }),
  buildInvestingLesson('inv-4', {
    id: 'inv-lesson-4',
    title: 'Stocks, ETFs, and Mutual Funds',
    estimatedMinutes: 10,
    difficulty: 'beginner',
    content: `# Stocks, ETFs, and Mutual Funds

A stock is ownership in one company. Funds hold many assets and offer diversification.

## ETF Basics

ETFs trade like stocks during market hours and often track an index with low fees.

## Why Diversification Matters

Owning many companies can reduce single-company risk.`,
    concepts: [
      {
        conceptId: 'asset-vehicle-choice',
        conceptName: 'Choosing investment vehicle',
        easyStatement: 'An ETF can hold many stocks in one product.',
        easyAnswer: true,
        easyExplanation: 'Correct. ETFs are often diversified baskets.',
        mediumQuestion: 'Which is usually most diversified?',
        mediumOptions: ['One tech stock', 'Broad global index ETF', 'One meme stock', 'One sector stock'],
        mediumCorrectAnswer: 1,
        mediumExplanation: 'Broad index ETFs spread risk across many companies.',
        hardQuestion: 'A beginner wants simplicity and diversification. Best first option?',
        hardOptions: ['Concentrate in one high-volatility stock', 'Broad low-cost index ETF', 'Daily options trading', 'Leveraged inverse ETF'],
        hardCorrectAnswer: 1,
        hardExplanation: 'A broad, low-cost index ETF is usually a strong beginner base.',
      },
      {
        conceptId: 'fees-and-costs',
        conceptName: 'Fees and cost drag',
        easyStatement: 'Higher annual fees can reduce long-term net returns.',
        easyAnswer: true,
        easyExplanation: 'Correct. Small fee differences compound over many years.',
        mediumQuestion: 'Which expense ratio is generally better all else equal?',
        mediumOptions: ['0.05%', '0.90%', '1.50%', '2.20%'],
        mediumCorrectAnswer: 0,
        mediumExplanation: 'Lower costs leave more return for the investor.',
        hardQuestion: 'Why can a 1% fee difference matter so much?',
        hardOptions: ['Fees are paid once only', 'Fees compound as a drag every year', 'Fees only affect taxes', 'Fees increase diversification automatically'],
        hardCorrectAnswer: 1,
        hardExplanation: 'Annual fee drag compounds, reducing wealth over time.',
      },
    ],
  }),
  buildInvestingLesson('inv-5', {
    id: 'inv-lesson-5',
    title: 'Bonds and Defensive Assets',
    estimatedMinutes: 9,
    difficulty: 'intermediate',
    content: `# Bonds and Defensive Assets

Bonds are loans to governments or companies. They generally provide lower expected return than stocks but can reduce volatility.

## Role of Bonds

Bonds can provide income and portfolio stability, especially for shorter horizons or lower risk tolerance.

## Interest Rate Impact

When rates rise, existing bond prices often fall. Duration helps estimate sensitivity.`,
    concepts: [
      {
        conceptId: 'bond-role',
        conceptName: 'Role of bonds in portfolio',
        easyStatement: 'Bonds are commonly used to reduce overall portfolio volatility.',
        easyAnswer: true,
        easyExplanation: 'Correct. Bonds can smooth returns relative to equity-only portfolios.',
        mediumQuestion: 'Who usually benefits most from adding bonds?',
        mediumOptions: ['Investor needing money in 2 years', 'Investor with 40-year horizon and high tolerance only', 'Day trader with leverage', 'Speculator in penny stocks'],
        mediumCorrectAnswer: 0,
        mediumExplanation: 'Near-term goals often require lower volatility assets.',
        hardQuestion: 'Which mix is typically less volatile?',
        hardOptions: ['100% stocks', '80% stocks / 20% bonds', '100% crypto', 'Single-stock portfolio'],
        hardCorrectAnswer: 1,
        hardExplanation: 'Adding bonds generally lowers volatility compared with 100% stocks.',
      },
      {
        conceptId: 'interest-rate-risk',
        conceptName: 'Interest rate risk in bonds',
        easyStatement: 'When interest rates rise, existing bond prices often decline.',
        easyAnswer: true,
        easyExplanation: 'Correct. New bonds issue at higher yields, making old lower-yield bonds less attractive.',
        mediumQuestion: 'Which bonds are usually more rate-sensitive?',
        mediumOptions: ['Short-duration bonds', 'Long-duration bonds', 'Cash savings', 'No-asset portfolio'],
        mediumCorrectAnswer: 1,
        mediumExplanation: 'Longer duration typically means higher sensitivity to rate changes.',
        hardQuestion: 'If rates fall, existing longer-duration bonds often:',
        hardOptions: ['Lose more value than short bonds', 'Gain more value than short bonds', 'Stay exactly flat', 'Become cash'],
        hardCorrectAnswer: 1,
        hardExplanation: 'Longer-duration bonds usually rise more when rates decline.',
      },
    ],
  }),
  buildInvestingLesson('inv-6', {
    id: 'inv-lesson-6',
    title: 'Asset Allocation Fundamentals',
    estimatedMinutes: 10,
    difficulty: 'intermediate',
    content: `# Asset Allocation Fundamentals

Asset allocation is how you split money across equities, bonds, and cash-like assets.

## Allocation Drives Outcomes

Your allocation often matters more than picking one perfect stock.

## Build for Goal and Timeline

Longer timelines can usually hold more equities. Short timelines need more stability.`,
    concepts: [
      {
        conceptId: 'allocation-principle',
        conceptName: 'Allocation as core decision',
        easyStatement: 'Asset allocation is a key driver of long-term portfolio behavior.',
        easyAnswer: true,
        easyExplanation: 'Correct. Allocation strongly influences risk and return profile.',
        mediumQuestion: 'Which is an allocation decision?',
        mediumOptions: ['Buy one random stock', 'Choose 70% equity and 30% bonds', 'Predict tomorrow market open', 'Refresh app theme'],
        mediumCorrectAnswer: 1,
        mediumExplanation: 'Allocation sets strategic percentages by asset class.',
        hardQuestion: 'A new investor with 30-year horizon and stable income likely starts with:',
        hardOptions: ['Mostly cash forever', 'Higher equity allocation with diversification', 'All in one micro-cap stock', 'No plan and frequent switches'],
        hardCorrectAnswer: 1,
        hardExplanation: 'Long horizon often supports higher equity exposure, diversified appropriately.',
      },
      {
        conceptId: 'allocation-fit',
        conceptName: 'Fit allocation to personal context',
        easyStatement: 'Two investors can need different allocations even if returns are similar.',
        easyAnswer: true,
        easyExplanation: 'Correct. Horizon, stability, and behavior differ by person.',
        mediumQuestion: 'What should you prioritize when choosing allocation?',
        mediumOptions: ['Social media hype', 'Your goals, time horizon, and risk tolerance', 'Only past one-month returns', 'Friend recommendations only'],
        mediumCorrectAnswer: 1,
        mediumExplanation: 'Personal context is the right anchor for allocation decisions.',
        hardQuestion: 'Best adjustment when goals become shorter-term?',
        hardOptions: ['Increase speculative assets', 'Gradually reduce risk and increase stability', 'Ignore timeline changes', 'Concentrate portfolio further'],
        hardCorrectAnswer: 1,
        hardExplanation: 'Shorter timelines usually call for lower volatility allocation.',
      },
    ],
  }),
  buildInvestingLesson('inv-7', {
    id: 'inv-lesson-7',
    title: 'Dollar-Cost Averaging and Contribution Strategy',
    estimatedMinutes: 9,
    difficulty: 'intermediate',
    content: `# Dollar-Cost Averaging and Contribution Strategy

Dollar-cost averaging (DCA) means investing a fixed amount at regular intervals.

## Why DCA Helps Behavior

DCA reduces emotional timing decisions and builds consistency.

## Build an Automatic System

Automate contributions after payday and increase as income grows.`,
    concepts: [
      {
        conceptId: 'dca-basics',
        conceptName: 'DCA mechanics',
        easyStatement: 'Dollar-cost averaging means investing the same amount regularly.',
        easyAnswer: true,
        easyExplanation: 'Correct. DCA buys more shares at lower prices and fewer at higher prices.',
        mediumQuestion: 'Main benefit of DCA for most people:',
        mediumOptions: ['Guaranteed higher return always', 'Perfect market timing', 'Reduces emotional timing decisions', 'Eliminates all risk'],
        mediumCorrectAnswer: 2,
        mediumExplanation: 'DCA primarily improves discipline and behavior.',
        hardQuestion: 'If markets drop during DCA period, what usually happens?',
        hardOptions: ['You buy fewer units each month', 'You buy more units with same amount', 'DCA stops working permanently', 'All prior gains are erased automatically'],
        hardCorrectAnswer: 1,
        hardExplanation: 'Same contribution buys more units when prices are lower.',
      },
      {
        conceptId: 'automation-habit',
        conceptName: 'Automation and scaling contributions',
        easyStatement: 'Automating investments can improve consistency.',
        easyAnswer: true,
        easyExplanation: 'Correct. Automation removes friction and forgetfulness.',
        mediumQuestion: 'Best time to schedule automatic investing?',
        mediumOptions: ['After payday', 'Randomly each quarter', 'Only after headlines', 'Never automate'],
        mediumCorrectAnswer: 0,
        mediumExplanation: 'After payday is practical and consistent for cash flow.',
        hardQuestion: 'When income rises, what is a smart upgrade?',
        hardOptions: ['Increase spending only', 'Increase automatic contribution rate gradually', 'Stop tracking portfolio', 'Concentrate in one risky asset'],
        hardCorrectAnswer: 1,
        hardExplanation: 'Raising automated contributions strengthens long-term growth.',
      },
    ],
  }),
  buildInvestingLesson('inv-8', {
    id: 'inv-lesson-8',
    title: 'Tax-Efficient Investing Accounts',
    estimatedMinutes: 10,
    difficulty: 'intermediate',
    content: `# Tax-Efficient Investing Accounts

Where you invest can matter as much as what you invest in.

## Tax Wrappers

Retirement and tax-advantaged accounts can reduce tax drag and accelerate growth.

## Match and Allowances

If your employer offers matching, that is often high-priority "free money".`,
    concepts: [
      {
        conceptId: 'tax-wrapper-value',
        conceptName: 'Value of tax-efficient accounts',
        easyStatement: 'Tax-efficient accounts can improve net long-term returns.',
        easyAnswer: true,
        easyExplanation: 'Correct. Lower tax drag means more compounding stays invested.',
        mediumQuestion: 'Why prioritize tax-advantaged accounts?',
        mediumOptions: ['They remove all market risk', 'They can reduce taxes and improve compounding', 'They guarantee stock selection', 'They replace emergency fund'],
        mediumCorrectAnswer: 1,
        mediumExplanation: 'Tax efficiency boosts net outcomes over time.',
        hardQuestion: 'Best general order when employer match exists?',
        hardOptions: ['Ignore match and buy random stocks', 'Capture match first, then continue broader plan', 'Only hold cash forever', 'Use high-interest debt first always'],
        hardCorrectAnswer: 1,
        hardExplanation: 'Employer match is typically a high-priority benefit.',
      },
      {
        conceptId: 'tax-location-basics',
        conceptName: 'Tax location basics',
        easyStatement: 'Placing assets in suitable account types can improve after-tax results.',
        easyAnswer: true,
        easyExplanation: 'Correct. Asset location can reduce tax drag.',
        mediumQuestion: 'What is tax drag?',
        mediumOptions: ['Broker app lag', 'Reduction in returns due to taxes', 'Market index growth', 'Lower volatility due to bonds'],
        mediumCorrectAnswer: 1,
        mediumExplanation: 'Taxes reduce what remains invested and compounding.',
        hardQuestion: 'Which mindset is best?',
        hardOptions: ['Only pre-tax return matters', 'After-tax return and account choice both matter', 'Taxes are irrelevant for investors', 'Never use retirement accounts'],
        hardCorrectAnswer: 1,
        hardExplanation: 'After-tax outcomes and account strategy should be considered together.',
      },
    ],
  }),
  buildInvestingLesson('inv-9', {
    id: 'inv-lesson-9',
    title: 'How to Evaluate Investments',
    estimatedMinutes: 10,
    difficulty: 'intermediate',
    content: `# How to Evaluate Investments

Evaluation starts with purpose, cost, risk, and fit with your plan.

## Start with Basics

Understand what you own, how it makes return, and the key risks.

## Avoid Hype-Driven Decisions

A good investment is not just "popular"; it should match your strategy.`,
    concepts: [
      {
        conceptId: 'evaluation-checklist',
        conceptName: 'Investment evaluation checklist',
        easyStatement: 'Before investing, you should understand fees, risks, and what the asset does.',
        easyAnswer: true,
        easyExplanation: 'Correct. A simple checklist prevents blind decisions.',
        mediumQuestion: 'Which is a strong first question?',
        mediumOptions: ['Is it trending online?', 'What role does this asset play in my plan?', 'Did a friend buy it?', 'Can it double next week?'],
        mediumCorrectAnswer: 1,
        mediumExplanation: 'Role in plan is more important than hype.',
        hardQuestion: 'If two funds track similar indexes, what can be a deciding factor?',
        hardOptions: ['Ticker popularity only', 'Lower cost and tracking quality', 'More social media mentions', 'Higher turnover without reason'],
        hardCorrectAnswer: 1,
        hardExplanation: 'Lower costs and better tracking often improve long-term net returns.',
      },
      {
        conceptId: 'single-stock-caution',
        conceptName: 'Single-stock concentration risk',
        easyStatement: 'Putting all your money in one stock increases concentration risk.',
        easyAnswer: true,
        easyExplanation: 'Correct. Single-company shocks can heavily damage your portfolio.',
        mediumQuestion: 'Safer default for most beginners?',
        mediumOptions: ['One speculative stock', 'Diversified broad market fund', 'Leverage on one company', 'No diversification'],
        mediumCorrectAnswer: 1,
        mediumExplanation: 'Diversification lowers company-specific risk.',
        hardQuestion: 'If you want some stock-picking, what is prudent?',
        hardOptions: ['Use 100% of portfolio', 'Keep a small satellite portion while core stays diversified', 'Borrow money to buy one stock', 'Ignore position sizing'],
        hardCorrectAnswer: 1,
        hardExplanation: 'A core-satellite approach controls concentration risk.',
      },
    ],
  }),
  buildInvestingLesson('inv-10', {
    id: 'inv-lesson-10',
    title: 'Behavioral Mistakes and Market Psychology',
    estimatedMinutes: 9,
    difficulty: 'advanced',
    content: `# Behavioral Mistakes and Market Psychology

Many investing mistakes are emotional, not technical.

## Common Traps

Fear, greed, overconfidence, and recency bias can lead to bad decisions.

## Process Over Prediction

A repeatable system beats emotional reaction to headlines.`,
    concepts: [
      {
        conceptId: 'behavioral-bias',
        conceptName: 'Behavioral bias awareness',
        easyStatement: 'Emotions can hurt investment results if decisions are impulsive.',
        easyAnswer: true,
        easyExplanation: 'Correct. Behavioral discipline is a major edge.',
        mediumQuestion: 'What is recency bias?',
        mediumOptions: ['Ignoring all new data', 'Assuming recent performance will continue forever', 'Investing monthly automatically', 'Diversifying portfolio'],
        mediumCorrectAnswer: 1,
        mediumExplanation: 'Recency bias overweights recent events.',
        hardQuestion: 'Best defense against panic selling?',
        hardOptions: ['Check portfolio every hour', 'Predefined plan with target allocation and rebalancing rules', 'Follow social media sentiment', 'Hold only one volatile asset'],
        hardCorrectAnswer: 1,
        hardExplanation: 'A written process reduces emotional overrides.',
      },
      {
        conceptId: 'discipline-system',
        conceptName: 'Discipline and rules',
        easyStatement: 'A simple written investing plan can improve consistency.',
        easyAnswer: true,
        easyExplanation: 'Correct. Rules reduce impulsive actions.',
        mediumQuestion: 'Which rule is most useful?',
        mediumOptions: ['Buy only after viral posts', 'Review monthly and rebalance by threshold', 'Trade whenever anxious', 'Change strategy weekly'],
        mediumCorrectAnswer: 1,
        mediumExplanation: 'Scheduled reviews and thresholds support disciplined behavior.',
        hardQuestion: 'During a sharp market drop, a disciplined investor usually:',
        hardOptions: ['Sells entire portfolio instantly', 'Follows plan and continues contributions if appropriate', 'Switches strategy daily', 'Chases inverse leveraged products'],
        hardCorrectAnswer: 1,
        hardExplanation: 'Sticking to plan is generally better than emotional reaction.',
      },
    ],
  }),
  buildInvestingLesson('inv-11', {
    id: 'inv-lesson-11',
    title: 'Building and Rebalancing Your Portfolio',
    estimatedMinutes: 11,
    difficulty: 'advanced',
    content: `# Building and Rebalancing Your Portfolio

Portfolio construction combines allocation, diversification, contribution rhythm, and review cadence.

## Rebalancing

Rebalancing restores target weights when markets drift your allocation.

## Complete Beginner Framework

Choose target allocation, automate contributions, review periodically, and rebalance with rules.`,
    concepts: [
      {
        conceptId: 'rebalancing-purpose',
        conceptName: 'Purpose of rebalancing',
        easyStatement: 'Rebalancing helps keep portfolio risk aligned with your target allocation.',
        easyAnswer: true,
        easyExplanation: 'Correct. Rebalancing restores intended risk profile.',
        mediumQuestion: 'When should you rebalance?',
        mediumOptions: ['Every day without reason', 'Based on schedule or drift threshold', 'Only after big headlines', 'Never rebalance'],
        mediumCorrectAnswer: 1,
        mediumExplanation: 'Scheduled or threshold-based rebalancing is a practical method.',
        hardQuestion: 'If equities run up and exceed your target weight, rebalancing usually means:',
        hardOptions: ['Buying even more equities only', 'Trimming equities or directing new money to underweight assets', 'Deleting all bonds', 'Ignoring drift permanently'],
        hardCorrectAnswer: 1,
        hardExplanation: 'Rebalancing reduces overweight exposure and restores target mix.',
      },
      {
        conceptId: 'portfolio-workflow',
        conceptName: 'Beginner portfolio workflow',
        easyStatement: 'A repeatable workflow is better than random investment actions.',
        easyAnswer: true,
        easyExplanation: 'Correct. Process improves long-term consistency.',
        mediumQuestion: 'Which sequence is strongest?',
        mediumOptions: ['Pick hot stock, then plan later', 'Set goals, choose allocation, automate contributions, review and rebalance', 'Trade news daily, then diversify someday', 'Only check gains'],
        mediumCorrectAnswer: 1,
        mediumExplanation: 'Goal-first, allocation-led process is robust for beginners.',
        hardQuestion: 'What best describes a sustainable investing system?',
        hardOptions: ['High complexity and constant prediction', 'Simple rules you can follow for years', 'No emergency fund and maximum risk', 'Frequent strategy changes'],
        hardCorrectAnswer: 1,
        hardExplanation: 'Long-term success depends on consistent execution, not constant prediction.',
      },
    ],
  }),
];

// =============================================================================
// COURSE EXPORTS
// =============================================================================

// Process lessons to add module structure
function processLessonsWithModules(lessons: RawLesson[]): Lesson[] {
  return lessons.map(lesson => {
    const normalizedQuestions = normalizeQuestionsForAdaptive(
      lesson.id,
      lesson.domain,
      lesson.questions
    );

    const normalizedLesson: RawLesson = {
      ...lesson,
      questions: normalizedQuestions,
    };

    return {
      ...normalizedLesson,
      modules: generateModulesForLesson(normalizedLesson),
    };
  });
}

// Course 1: Money Foundations
export const moneyFoundationsCourse: Course = {
  id: 'course-money-foundations',
  title: 'Money Foundations',
  description: 'Master budgeting, tracking expenses, and building your savings. The essential first steps to financial literacy.',
  icon: 'dollar-sign',
  color: '#10B981',  // Green
  domain: 'budgeting',
  lessons: processLessonsWithModules(moneyFoundationsLessons),
  totalXP: moneyFoundationsLessons.reduce((sum, l) => sum + l.xpReward, 0),
  estimatedHours: Math.round(moneyFoundationsLessons.reduce((sum, l) => sum + l.estimatedMinutes, 0) / 60 * 10) / 10,
};

// Course 2: Credit & Debt Navigation
export const creditDebtCourse: Course = {
  id: 'course-credit-debt',
  title: 'Credit & Debt Navigation',
  description: 'Understand credit scores, master interest, and learn strategies to become debt-free.',
  icon: 'credit-card',
  color: '#3B82F6',  // Blue
  domain: 'debt',
  lessons: processLessonsWithModules(creditDebtLessons),
  totalXP: creditDebtLessons.reduce((sum, l) => sum + l.xpReward, 0),
  estimatedHours: Math.round(creditDebtLessons.reduce((sum, l) => sum + l.estimatedMinutes, 0) / 60 * 10) / 10,
};

// Course 3: Investing Essentials
export const investingCourse: Course = {
  id: 'course-investing-essentials',
  title: 'Investing Essentials',
  description: 'Learn investing from zero to confident portfolio building: risk, ETFs, allocation, behavior, and rebalancing.',
  icon: 'trending-up',
  color: '#F97316',  // Orange
  domain: 'investing',
  lessons: processLessonsWithModules(investingLessons),
  totalXP: investingLessons.reduce((sum, l) => sum + l.xpReward, 0),
  estimatedHours: Math.round(investingLessons.reduce((sum, l) => sum + l.estimatedMinutes, 0) / 60 * 10) / 10,
};

// All courses array
export const courses: Course[] = [
  moneyFoundationsCourse,
  creditDebtCourse,
  investingCourse,
];

// Export helper to get a course by ID
export function getCourseById(id: string): Course | undefined {
  return courses.find(course => course.id === id);
}

// Export helper to get a lesson by ID across all courses
export function getLessonById(lessonId: string): { lesson: Lesson; course: Course } | undefined {
  for (const course of courses) {
    const lesson = course.lessons.find(l => l.id === lessonId);
    if (lesson) {
      return { lesson, course };
    }
  }
  return undefined;
}

// Export helper to get a question by ID across all courses
export function getQuestionById(questionId: string): Question | undefined {
  for (const course of courses) {
    for (const lesson of course.lessons) {
      // Check legacy questions array
      const legacyQuestion = lesson.questions.find(q => q.id === questionId);
      if (legacyQuestion) return legacyQuestion;
      
      // Check module questions
      if (lesson.modules) {
        for (const module of lesson.modules) {
          if (module.type === 'quiz' && 'questions' in module) {
            const moduleQuestion = module.questions.find(q => q.id === questionId);
            if (moduleQuestion) return moduleQuestion;
          }
        }
      }
    }
  }
  return undefined;
}

// Export total stats
export const courseStats = {
  totalCourses: courses.length,
  totalLessons: courses.reduce((sum, c) => sum + c.lessons.length, 0),
  totalXP: courses.reduce((sum, c) => sum + c.totalXP, 0),
  totalHours: courses.reduce((sum, c) => sum + c.estimatedHours, 0),
};
