import {
  Course,
  Lesson,
  Question,
  MCQQuestion,
  ScenarioQuestion,
  CalculationQuestion,
  ContentBlock,
  SkillDomain,
  ConceptVariant,
} from '@/types';

type LessonSeed = {
  id: string;
  title: string;
  domain: SkillDomain;
  cards: [string, string, string];
  workedExample: string;
  questions: Question[];
};

function normalizeBullets(text: string): string {
  return text
    .replace(/^•\s+/gm, '- ')
    .replace(/\n•\s+/g, '\n- ');
}

function splitCardIntoBlocks(card: string, primaryType: 'text' | 'highlight' | 'tip'): ContentBlock[] {
  const normalized = normalizeBullets(card).trim();
  const paragraphs = normalized
    .split('\n\n')
    .map(p => p.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) return [];

  const blocks: ContentBlock[] = [];

  // If card starts with objectives, make it a dedicated highlight block for quick scanning.
  const first = paragraphs[0];
  if (first.toLowerCase().startsWith('objectives:')) {
    const objectiveLines = first
      .split('\n')
      .slice(1)
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => (line.startsWith('- ') ? line : `- ${line.replace(/^[-•]\s*/, '')}`))
      .join('\n');

    blocks.push({
      type: 'highlight',
      content: `Objectives\n\n${objectiveLines}`,
      animationPreset: 'slide_up',
    });
  } else {
    blocks.push({
      type: primaryType,
      content: first,
      animationPreset: primaryType === 'highlight' ? 'slide_up' : 'fade_in',
    });
  }

  // Remaining paragraphs become short cards, alternating visual emphasis.
  const remaining = first.toLowerCase().startsWith('objectives:') ? paragraphs.slice(1) : paragraphs.slice(1);
  remaining.forEach((paragraph, index) => {
    blocks.push({
      type: index % 2 === 0 ? 'text' : 'tip',
      content: paragraph,
      animationPreset: index % 2 === 0 ? 'fade_in' : 'slide_up',
    });
  });

  return blocks;
}

function formatWorkedExample(example: string): string {
  const cleaned = normalizeBullets(example.replace(/^Worked example:\s*/i, '').trim());
  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(Boolean);

  const lines = sentences.map((sentence) => `- ${sentence.replace(/[.!?]$/, '').trim()}`);

  return `Worked Example\n\n${lines.join('\n')}`;
}

function buildReadingModules(lesson: LessonSeed) {
  const m1Blocks: ContentBlock[] = splitCardIntoBlocks(lesson.cards[0], 'text');
  const m2Blocks: ContentBlock[] = splitCardIntoBlocks(lesson.cards[1], 'highlight');
  const m3Blocks: ContentBlock[] = [
    ...splitCardIntoBlocks(lesson.cards[2], 'tip'),
    {
      type: 'example',
      content: formatWorkedExample(lesson.workedExample),
      animationPreset: 'scale_in',
    },
  ];

  return [
    {
      id: `${lesson.id}-mod-1`,
      type: 'reading' as const,
      title: 'Core Idea',
      estimatedMinutes: 1,
      xpReward: 5,
      contentBlocks: m1Blocks,
      conceptTags: [`${lesson.id}-c1`],
    },
    {
      id: `${lesson.id}-mod-2`,
      type: 'reading' as const,
      title: 'How It Works',
      estimatedMinutes: 1,
      xpReward: 5,
      contentBlocks: m2Blocks,
      conceptTags: [`${lesson.id}-c2`],
    },
    {
      id: `${lesson.id}-mod-3`,
      type: 'reading' as const,
      title: 'Applied Example',
      estimatedMinutes: 1,
      xpReward: 5,
      contentBlocks: m3Blocks,
      conceptTags: [`${lesson.id}-c3`],
    },
    (() => {
      const conceptMap = new Map<string, { easy?: string; medium?: string; hard?: string }>();
      lesson.questions.forEach(q => {
        const cId = (q as any).conceptId as string | undefined;
        const tier = (q as any).difficultyTier as 1 | 2 | 3 | undefined;
        if (cId && tier) {
          if (!conceptMap.has(cId)) conceptMap.set(cId, {});
          const entry = conceptMap.get(cId)!;
          if (tier === 1) entry.easy = q.id;
          if (tier === 2) entry.medium = q.id;
          if (tier === 3) entry.hard = q.id;
        }
      });
      const conceptVariants: ConceptVariant[] = [];
      conceptMap.forEach((variants, cId) => {
        if (variants.easy && variants.medium && variants.hard) {
          conceptVariants.push({
            conceptId: cId,
            conceptName: cId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
            variantGroup: `${cId}-v1`,
            domain: lesson.domain,
            easyQuestionId: variants.easy,
            mediumQuestionId: variants.medium,
            hardQuestionId: variants.hard,
          });
        }
      });
      return {
        id: `${lesson.id}-quiz`,
        type: 'quiz' as const,
        title: `Quiz: ${lesson.title}`,
        estimatedMinutes: 2,
        xpReward: 15,
        questions: lesson.questions,
        masteryThreshold: 0.7,
        conceptTags: lesson.questions.map(q => (q as any).conceptId),
        conceptVariants: conceptVariants.length > 0 ? conceptVariants : undefined,
      };
    })(),
  ];
}

function createLesson(seed: LessonSeed): Lesson {
  return {
    id: seed.id,
    title: seed.title,
    type: 'mixed',
    estimatedMinutes: 2,
    completionStatus: 'not_started',
    domain: seed.domain,
    difficulty: 'beginner',
    xpReward: 30,
    content: '',
    questions: seed.questions,
    modules: buildReadingModules(seed),
  };
}

function mcq(
  id: string,
  conceptId: string,
  question: string,
  options: string[],
  correctAnswer: number,
  explanation: string,
  difficultyTier: 1 | 2 | 3
): MCQQuestion {
  return {
    id,
    type: 'mcq',
    question,
    options,
    correctAnswer,
    explanation,
    xpReward: difficultyTier === 1 ? 5 : difficultyTier === 2 ? 8 : 10,
    difficulty: difficultyTier === 1 ? 'beginner' : difficultyTier === 2 ? 'intermediate' : 'advanced',
    conceptId,
    variantGroup: `${conceptId}-v1`,
    difficultyTier,
  };
}

function scenario(
  id: string,
  conceptId: string,
  question: string,
  scenarioText: string,
  options: { text: string; outcome: string; impactScore: number }[],
  bestOptionIndex: number,
  explanation: string,
  difficultyTier: 1 | 2 | 3 = 3
): ScenarioQuestion {
  return {
    id,
    type: 'scenario',
    question,
    scenario: scenarioText,
    options,
    bestOptionIndex,
    explanation,
    xpReward: 12,
    difficulty: 'advanced',
    conceptId,
    variantGroup: `${conceptId}-v1`,
    difficultyTier,
  };
}

function calc(
  id: string,
  conceptId: string,
  question: string,
  problemText: string,
  correctAnswer: number,
  unit: string,
  explanation: string,
  difficultyTier: 1 | 2 | 3 = 3
): CalculationQuestion {
  return {
    id,
    type: 'calculation',
    question,
    problemText,
    correctAnswer,
    tolerance: 0,
    unit,
    explanation,
    xpReward: 12,
    difficulty: 'advanced',
    conceptId,
    variantGroup: `${conceptId}-v1`,
    difficultyTier,
  };
}

const moneyLessons: Lesson[] = [
  createLesson({
    id: 'mf-compact-1',
    title: 'Budget Targets That Actually Work',
    domain: 'budgeting',
    cards: [
      `Objectives:\n• Convert a savings goal into a spending target.\n• Separate fixed and variable costs clearly.\n• Identify which spending category can be adjusted fastest.\n\nA budget is a decision tool, not a punishment tool. Start with income, then fixed costs, then variable costs, then target savings. If the target does not fit, you do not “fail”; you adjust the variable part first. This keeps the plan realistic and repeatable. A strong budget answers one question: what exact behaviour changes this month create the savings amount you want?`,
      `Use this structure:\n\nEquation: Income - Fixed expenses - Variable expenses = Remaining cash\n\nThen compare remaining cash with your savings target.\n\nIf remaining cash is lower, calculate the gap and close it by reducing flexible categories first (delivery, leisure, impulse buys).\n\nAvoid cutting fixed essentials first because that makes plans unstable.\n\nUse specific actions like “reduce eating out by £120,” not vague goals like “spend less.”`,
      `A budget should be reviewed weekly, not only month-end. Weekly checks prevent small overspends from compounding into a missed target. If week one is above plan, rebalance in weeks two to four early. This “small correction” method is easier than dramatic late-month cuts. Budgeting quality improves when decisions are made in advance and reviewed often with numbers, not guesswork.`,
    ],
    workedExample: `Worked example: Income £3,000. Fixed £1,800. Variable £900. Savings target 20% of income = £600. Current remaining cash is £3,000 - £1,800 - £900 = £300. Gap to target is £300. So variable spending must fall by £300 to make savings feasible this month.`,
    questions: [
      mcq(
        'mf-c1-q1',
        'mf-c1-savings-gap',
        'If your savings target is higher than your remaining cash, what should you calculate first?',
        ['Your tax bracket', 'The exact budget gap', 'Your credit score', 'Your investment return'],
        1,
        'First compute the numeric gap between current remaining cash and target savings, then adjust spending to close it.',
        1
      ),
      mcq(
        'mf-c1-q2',
        'mf-c1-variable-cut',
        'Which expense type is usually adjusted first to close a monthly savings gap?',
        ['Fixed rent', 'Variable discretionary spending', 'Insurance premiums', 'Student loan interest'],
        1,
        'Variable discretionary categories are typically more flexible and can be changed quickly without breaking essentials.',
        2
      ),
      mcq(
        'mf-c1-q3',
        'mf-c1-target-math',
        'Income £3,200, fixed £1,700, variable £1,000, target savings 25%. By how much must variable spending fall?',
        ['£200', '£300', '£400', '£500'],
        1,
        'Target savings is £800. Current remaining is £500, so the gap is £300.',
        3
      ),
      calc(
        'mf-c1-q4',
        'mf-c1-application',
        'A learner earns £2,800, has fixed costs £1,600 and variable £900. Target savings are 20% of income. What variable reduction is needed?',
        'Target savings = 20% × £2,800. Current remaining = £2,800 - £1,600 - £900.',
        260,
        '£',
        'Target savings are £560, current remaining is £300, so variable spending must drop by £260.',
        3
      ),
    ],
  }),
  createLesson({
    id: 'mf-compact-2',
    title: 'Inflation and Emergency Fund Reality',
    domain: 'saving',
    cards: [
      `Objectives:\n• Explain why fixed emergency targets can lose protection over time.\n• Connect inflation to months-of-cover.\n• Refresh fund targets using updated expenses.\n\nEmergency funds are measured in “months of essential expenses,” not in a random fixed amount. Inflation raises rent, food, transport, and utilities over time. If your fund stays unchanged while costs rise, your real protection declines. You still hold the same pounds, but those pounds buy fewer months of safety.`,
      `A practical rule: set your emergency fund target as a moving number, not a permanent one. Recalculate every 3-6 months using current essential monthly expenses. Many learners make the mistake of hitting one target once and never revisiting it. Financial resilience requires updating protection as living costs change. Inflation does not destroy the fund instantly; it gradually reduces coverage.`,
      `Think in terms of “coverage duration.” If you once had 5 months of cover, inflation can silently reduce this to 4 or less even when account balance looks unchanged. This is why emergency planning should include periodic recalibration. A stable-looking balance can hide declining safety.`,
    ],
    workedExample: `Worked example: Emergency fund = £8,000. Essential expenses were £1,600/month, so cover was 5 months. After inflation, essentials rise to £2,000/month. New cover is £8,000 ÷ £2,000 = 4 months. Protection dropped by one full month without any withdrawal.`,
    questions: [
      mcq(
        'mf-c2-q1',
        'mf-c2-real-protection',
        'If inflation rises but your emergency fund amount is unchanged, what happens to real protection?',
        ['It increases', 'It stays identical', 'It decreases', 'It eliminates risk'],
        2,
        'Rising living costs reduce how long the same cash balance can support essential spending.',
        1
      ),
      mcq(
        'mf-c2-q2',
        'mf-c2-measure',
        'What is the most useful way to measure whether your emergency fund is adequate?',
        ['As a fixed pound amount forever', 'As months of essential expenses', 'As a percentage of annual salary only', 'As your current account balance'],
        1,
        'Months of essentials adjusts protection to actual spending needs and inflation changes.',
        2
      ),
      mcq(
        'mf-c2-q3',
        'mf-c2-coverage-change',
        'Your emergency fund stays at £8,000, but monthly essential expenses rise from £1,600 to £2,000. How do your months of coverage change?',
        ['5 to 6', '5 to 5', '5 to 4', '4 to 5'],
        2,
        'Coverage drops because denominator (monthly essentials) increased.',
        3
      ),
      scenario(
        'mf-c2-q4',
        'mf-c2-application',
        'A user says: “My emergency fund amount is unchanged, so my safety is unchanged.” What is the best correction?',
        'Monthly essentials rose 12% this year, but the emergency account stayed flat.',
        [
          { text: 'Correct, unchanged amount means unchanged safety', outcome: 'Ignores inflation impact on purchasing power', impactScore: -40 },
          { text: 'Partly true, because inflation affects only investments', outcome: 'Inflation affects everyday essentials too', impactScore: -20 },
          { text: 'Not accurate; recalculate months-of-cover using updated expenses', outcome: 'This captures real protection correctly', impactScore: 100 },
          { text: 'Only income growth matters for emergency planning', outcome: 'Expense growth matters directly for cover duration', impactScore: -10 },
        ],
        2,
        'Emergency funds should be reviewed against current essential expenses, not treated as a static nominal amount.',
        3
      ),
    ],
  }),
  createLesson({
    id: 'mf-compact-3',
    title: 'Forecasting Expenses with Better Data',
    domain: 'budgeting',
    cards: [
      `Objectives:\n• Improve expense forecasts using averaging.\n• Reduce planning noise from irregular spending.\n• Build more reliable monthly budgets.\n\nForecasting fails when it is based on one month only. A single month may be unusually high or low and can mislead your next budget. Better forecasts use multiple months of data to smooth volatility. The goal is not perfect prediction; the goal is stable planning that reduces surprise overspending.`,
      `Use rolling averages for variable categories. For example, average your last 3-6 months of discretionary spending. Include irregular categories like gifts, travel, or repairs so they are not “forgotten” and then treated as emergencies. Forecasting improves when spending history is broad enough to capture normal variation.`,
      `Do not cherry-pick only low months or ignore outliers without reason. If an outlier reflects a real recurring pattern, it should influence planning. Good forecasting is honest: it includes realistic variation and gives you a baseline to adjust from.`,
    ],
    workedExample: `Worked example: Discretionary spending over 4 months: £620, £510, £760, £610. Forecast using average = (£620+£510+£760+£610) ÷ 4 = £625. A one-month method could understate or overstate by over £100.`,
    questions: [
      mcq(
        'mf-c3-q1',
        'mf-c3-method',
        'Which method usually gives the most stable discretionary-spending forecast?',
        ['Use only last month', 'Use a multi-month average', 'Ignore high months', 'Set equal to income'],
        1,
        'Averaging several months smooths noise and improves reliability.',
        1
      ),
      mcq(
        'mf-c3-q2',
        'mf-c3-outlier',
        'Why is it risky to use a single unusually low-spending month as your budget baseline?',
        ['It guarantees extra savings', 'It can understate your typical spending', 'It increases inflation', 'It removes seasonality'],
        1,
        'A single unusually low month may not reflect your typical spending and can lead to an unrealistic budget baseline.',
        2
      ),
      mcq(
        'mf-c3-q3',
        'mf-c3-average-calc',
        'Your spending over the last three months was £500, £700, and £600. What is the best forecast baseline for next month?',
        ['£500', '£550', '£600', '£700'],
        2,
        'Average is (£500+£700+£600)/3 = £600.',
        3
      ),
      scenario(
        'mf-c3-q4',
        'mf-c3-application',
        'Which forecast policy is strongest for a student with irregular monthly spending?',
        'Spending jumps during exam periods and holidays.',
        [
          { text: 'Plan from the cheapest month only', outcome: 'Likely underestimates normal spending', impactScore: -30 },
          { text: 'Average several recent months and include irregular categories', outcome: 'Most reliable planning baseline', impactScore: 100 },
          { text: 'Ignore irregular categories as rare events', outcome: 'Creates recurring budget shocks', impactScore: -20 },
          { text: 'Set expenses equal to income every month', outcome: 'Not a forecast; removes budgeting signal', impactScore: -10 },
        ],
        1,
        'Robust forecasts use multiple months and include irregular costs explicitly.',
        3
      ),
    ],
  }),
  createLesson({
    id: 'mf-compact-4',
    title: 'Fast Cashflow Planning',
    domain: 'saving',
    cards: [
      `Objectives:\n• Build a quick monthly cashflow plan.\n• Add a realistic spending buffer.\n• Link forecast quality to savings consistency.\n\nCashflow planning combines your expected inflows and outflows before the month starts. A useful plan includes a small uncertainty buffer so unexpected costs do not immediately break your savings target. This turns budgeting from rigid to resilient.`,
      `Use three numbers: expected income, planned expenses, and planned savings. If uncertainty is high, include a 5-10% variable-spending buffer. This allows normal variation without abandoning the plan. If the month ends below budget, sweep leftover cash into savings rather than letting it drift into unplanned spending.`,
      `Strong plans are iterative. Compare forecast versus actual, note the largest misses, and improve next month’s assumptions. Over time, this feedback loop reduces error and improves confidence in decisions.`,
    ],
    workedExample: `Worked example: Income £2,600. Planned expenses £2,050. Planned savings £400. Remaining slack = £150. If you reserve £100 as uncertainty buffer, you still keep £50 flexibility while protecting savings consistency.`,
    questions: [
      mcq(
        'mf-c4-q1',
        'mf-c4-buffer',
        'What is the purpose of a budget buffer?',
        ['To replace all savings', 'To absorb normal spending uncertainty', 'To increase fixed expenses', 'To remove need for tracking'],
        1,
        'A buffer helps protect the plan when costs vary slightly from forecasts.',
        1
      ),
      mcq(
        'mf-c4-q2',
        'mf-c4-feedback',
        'What improves cashflow planning most month-to-month?',
        ['Never revisiting assumptions', 'Comparing forecast vs actual and adjusting', 'Copying one old budget forever', 'Ignoring misses'],
        1,
        'Feedback from actual results is essential to improve future forecasts.',
        2
      ),
      mcq(
        'mf-c4-q3',
        'mf-c4-slack',
        'If income is £2,600 and planned expenses are £2,050 with savings £400, how much slack remains?',
        ['£50', '£100', '£150', '£200'],
        2,
        '£2,600 - £2,050 - £400 = £150 slack.',
        3
      ),
      scenario(
        'mf-c4-q4',
        'mf-c4-application',
        'A user overspends by £80 in week one. What is the best adaptive response?',
        'The month still has three weeks left and savings target matters.',
        [
          { text: 'Abandon the budget entirely', outcome: 'Loses control early', impactScore: -40 },
          { text: 'Use buffer and rebalance later weeks', outcome: 'Maintains plan quality with small correction', impactScore: 100 },
          { text: 'Increase variable spending to reduce stress', outcome: 'Makes variance worse', impactScore: -20 },
          { text: 'Stop tracking until month-end', outcome: 'Delays corrective action', impactScore: -15 },
        ],
        1,
        'Early correction is more effective than end-month reaction.',
        3
      ),
    ],
  }),
];

const debtLessons: Lesson[] = [
  createLesson({
    id: 'cd-compact-1',
    title: 'APR and Compounding in Plain English',
    domain: 'debt',
    cards: [
      `Objectives:\n• Distinguish simple interest from compounding.\n• Explain why monthly compounding raises total cost.\n• Link compounding to repayment urgency.\n\nAPR is the annual rate, but credit card interest often compounds monthly or daily. Compounding means interest is charged on previous interest as balances persist. This can increase total repayment versus simple annual interest assumptions. The key behavioural takeaway: high-rate revolving debt is expensive mainly because time and compounding work against you.`,
      `Simple interest applies the rate to original principal only. Compounding applies interest to the growing balance. Even with the same APR headline, compounding frequency changes outcome. That is why “I’ll pay it slowly” can become costly. Understanding mechanism matters more than memorising formulas.`,
      `When comparing debt options, ask: what is the rate and how does interest accrue? Higher APR with frequent compounding should usually be prioritised if your goal is minimising total interest cost.`,
    ],
    workedExample: `Worked example: £4,000 at 20% APR. Under simple annual framing, one-year interest estimate is £800. With monthly compounding and unpaid balance carry, effective total cost is higher than simple estimate because interest is repeatedly added to balance.`,
    questions: [
      mcq(
        'cd-c1-q1',
        'cd-c1-compound-effect',
        'Compared with simple annual interest, monthly compounding usually makes debt:',
        ['Cheaper', 'Unchanged', 'More expensive over time', 'Interest-free if paid monthly minimum'],
        2,
        'Compounding adds interest onto balance repeatedly, increasing total cost.',
        1
      ),
      mcq(
        'cd-c1-q2',
        'cd-c1-apr-meaning',
        'Why can two debts with similar APR labels still differ in total cost?',
        ['APR never matters', 'Compounding method and repayment pattern differ', 'Only credit score matters', 'Only debt size matters'],
        1,
        'Cost depends on both rate structure and how long balance remains unpaid.',
        2
      ),
      mcq(
        'cd-c1-q3',
        'cd-c1-priority',
        'Which type of debt should you pay off first to cut your total interest costs as quickly as possible?',
        ['Low APR, low compounding impact', 'High APR, compounding balance', '0% promotional balance', 'Fully paid balance'],
        1,
        'High APR with compounding and carried balance creates fastest cost growth.',
        3
      ),
      scenario(
        'cd-c1-q4',
        'cd-c1-application',
        'A learner says “20% APR means exactly 20% once per year no matter what.” Best correction?',
        'They carry revolving card debt month to month.',
        [
          { text: 'Correct, APR cost is fixed regardless of balance behaviour', outcome: 'Ignores compounding and carry-over effects', impactScore: -30 },
          { text: 'Not complete: compounding and repayment timing can raise effective cost', outcome: 'This reflects real credit-card mechanics', impactScore: 100 },
          { text: 'APR applies only to new purchases, not existing balance', outcome: 'Incorrect in general', impactScore: -20 },
          { text: 'Compounding matters only above 30% APR', outcome: 'False; compounding matters at many rates', impactScore: -10 },
        ],
        1,
        'APR headline alone does not capture full repayment cost when balances persist.',
        3
      ),
    ],
  }),
  createLesson({
    id: 'cd-compact-2',
    title: 'Debt Avalanche: Minimise Interest First',
    domain: 'debt',
    cards: [
      `Objectives:\n• Apply avalanche logic correctly.\n• Distinguish interest minimisation from psychological methods.\n• Sequence repayments with constrained cash.\n\nDebt avalanche means paying minimums on all debts, then directing extra payment to the highest APR debt first. This method minimises total interest paid mathematically. It is different from snowball (smallest balance first), which can help motivation but usually costs more in interest.`,
      `When balances are similar, APR difference becomes the deciding factor. Even when balances differ, high APR debt can still be the correct first target if objective is cost minimisation. Strategy should match objective explicitly: “fastest behavioural momentum” vs “lowest total interest.”`,
      `Use a simple rule each month: minimums everywhere, extra on highest APR, repeat after payoff. Recalculate priorities only when debt set changes.`,
    ],
    workedExample: `Worked example: Debt A £2,500 at 24% APR, Debt B £2,500 at 9% APR. With same balance and different APR, extra payments should go to Debt A first to minimise total interest.`,
    questions: [
      mcq(
        'cd-c2-q1',
        'cd-c2-logic',
        'What is the core rule of debt avalanche?',
        ['Pay smallest balance first', 'Pay highest APR debt first after minimums', 'Split all payments equally forever', 'Delay repayment to invest'],
        1,
        'Avalanche targets highest interest rate debt first to reduce cost.',
        1
      ),
      mcq(
        'cd-c2-q2',
        'cd-c2-objective',
        'Which goal does avalanche optimise?',
        ['Motivation speed', 'Total interest minimisation', 'Credit limit increase', 'Monthly income growth'],
        1,
        'Avalanche is the mathematically cost-efficient repayment order.',
        2
      ),
      mcq(
        'cd-c2-q3',
        'cd-c2-priority-case',
        'You owe £3,000 at 22% APR and another £3,000 at 7% APR. Where should your extra payment go?',
        ['The 7% debt', 'The 22% debt', 'Split equally between both', 'Neither — wait for rates to fall'],
        1,
        'Higher APR debt should be prioritised when minimising interest.',
        3
      ),
      scenario(
        'cd-c2-q4',
        'cd-c2-application',
        'A user splits extra payments equally because “it feels fair.” Best advice if goal is lower total interest?',
        'They can only add £200 above minimums monthly.',
        [
          { text: 'Keep equal split; fairness beats math', outcome: 'Likely pays more interest overall', impactScore: -20 },
          { text: 'Direct extra to highest APR until cleared, then roll over', outcome: 'Standard avalanche implementation', impactScore: 100 },
          { text: 'Pause debt payments during volatile markets', outcome: 'Increases debt carry cost risk', impactScore: -30 },
          { text: 'Pay whichever lender calls first', outcome: 'Not strategy-driven', impactScore: -10 },
        ],
        1,
        'Repayment allocation should follow objective; for cost minimisation, APR priority wins.',
        3
      ),
    ],
  }),
  createLesson({
    id: 'cd-compact-3',
    title: 'Minimum Payments and the Long Tail',
    domain: 'debt',
    cards: [
      `Objectives:\n• Explain why minimum-only payment is costly.\n• Connect repayment speed to total interest.\n• Build urgency without panic.\n\nMinimum payments are designed to keep accounts current, not to clear debt quickly. On high-interest balances, minimum-only behaviour can stretch repayment over long periods and dramatically increase total interest. This is a structural issue, not a personal failure.`,
      `When most of your payment goes to interest instead of principal, progress slows. Even modest overpayments can materially shorten payoff time and reduce total cost. The first objective is to create repayment acceleration, even if small initially.`,
      `Use minimums as a floor, not a plan. Build a consistent “above-minimum” amount and protect it in your monthly budget.`,
    ],
    workedExample: `Worked example: Card balance £4,000 at high APR. Paying only minimum might clear slowly with large cumulative interest. Increasing payment by even £75-£100 monthly can cut duration and total interest significantly.`,
    questions: [
      mcq(
        'cd-c3-q1',
        'cd-c3-outcome',
        'What is the most likely long-term result of only ever making minimum payments on a high-interest credit card?',
        ['Quick payoff', 'Higher total interest paid', 'No compounding effect', 'Automatic score boost'],
        1,
        'Minimum-only repayment usually extends payoff and increases total interest.',
        1
      ),
      mcq(
        'cd-c3-q2',
        'cd-c3-floor',
        'Which statement best describes the role of a minimum payment?',
        ['A complete strategy', 'A legal floor, not an optimal plan', 'A signal to invest more first', 'A debt elimination shortcut'],
        1,
        'Minimum is the minimum required to stay current, not cost-optimal repayment.',
        2
      ),
      mcq(
        'cd-c3-q3',
        'cd-c3-improvement',
        'Which action usually improves high-interest debt outcomes fastest?',
        ['Pause all payments', 'Pay exactly minimum forever', 'Add consistent amount above minimum', 'Wait for inflation'],
        2,
        'Consistent extra principal repayment reduces balance life and interest cost.',
        3
      ),
      scenario(
        'cd-c3-q4',
        'cd-c3-application',
        'A borrower says “I’m current, so I’m fine” while paying minimum-only at high APR. Best response?',
        'They have no missed payments but balance barely falls.',
        [
          { text: 'Being current means debt is no longer risky', outcome: 'Current status does not remove cost drag', impactScore: -20 },
          { text: 'Current is good, but increase payment above minimum to cut total cost', outcome: 'Balanced and actionable correction', impactScore: 100 },
          { text: 'Ignore APR and focus only on balance size', outcome: 'Misses key cost driver', impactScore: -15 },
          { text: 'Stop paying to negotiate later', outcome: 'Creates additional credit harm risk', impactScore: -40 },
        ],
        1,
        'Payment status and cost optimisation are different; you need both.',
        3
      ),
    ],
  }),
  createLesson({
    id: 'cd-compact-4',
    title: 'Build a Debt Repayment Sequence',
    domain: 'debt',
    cards: [
      `Objectives:\n• Create a realistic repayment sequence.\n• Blend budgeting and debt strategy.\n• Track progress with simple metrics.\n\nDebt plans fail when they are mathematically good but behaviourally impossible. Build a sequence you can execute monthly: minimums covered, extra payment amount fixed, highest APR targeted. Keep plan short and operational.`,
      `Track three numbers: total debt, weighted average APR trend, and months to payoff estimate. As the highest-rate balance falls, interest drag eases and progress accelerates. Seeing this progression helps maintain adherence.`,
      `If income is variable, set a baseline overpayment and add “top-ups” in high-income months. Consistency matters more than occasional large one-off payments.`,
    ],
    workedExample: `Worked example: Minimums total £220. Budget allows additional £180 monthly. Plan: pay £400 total each month, direct extra £180 to highest APR debt. After each payoff, roll freed minimum to next debt.`,
    questions: [
      mcq(
        'cd-c4-q1',
        'cd-c4-sequence',
        'What should happen after the highest APR debt is fully repaid?',
        ['Stop repayments for one month', 'Roll freed payment into next target debt', 'Split equally to all debts again', 'Close all credit lines immediately'],
        1,
        'Rolling payments keeps repayment momentum and shortens total payoff horizon.',
        1
      ),
      mcq(
        'cd-c4-q2',
        'cd-c4-metrics',
        'Which metric set is most useful for tracking debt-plan quality?',
        ['Only credit score', 'Debt balance, APR exposure, payoff timeline', 'Only monthly income', 'Only number of cards'],
        1,
        'Good tracking combines amount, cost, and time progression.',
        2
      ),
      mcq(
        'cd-c4-q3',
        'cd-c4-variable-income',
        'When your income varies month to month, what is the best approach to debt repayment?',
        ['No fixed plan, random amounts', 'Baseline overpayment plus top-ups in strong months', 'Minimum-only in all months', 'Delay until income stabilises'],
        1,
        'Baseline consistency with upside top-ups improves execution reliability.',
        3
      ),
      scenario(
        'cd-c4-q4',
        'cd-c4-application',
        'A user can pay £160 above their minimums this month and £240 above next month. What is the strongest strategy?',
        'They want low total interest and realistic adherence.',
        [
          { text: 'Wait and make one large future payment only', outcome: 'Delays principal reduction unnecessarily', impactScore: -25 },
          { text: 'Apply available extra each month to highest APR debt', outcome: 'Consistent avalanche execution', impactScore: 100 },
          { text: 'Use extra only on lowest APR debt for confidence', outcome: 'Usually higher cost over time', impactScore: -10 },
          { text: 'Split extra equally across debts indefinitely', outcome: 'Often slower and costlier', impactScore: -5 },
        ],
        1,
        'Execute with available cash each month; do not wait for perfect conditions.',
        3
      ),
    ],
  }),
];

const investingLessons: Lesson[] = [
  createLesson({
    id: 'inv-compact-1',
    title: 'Time Horizon vs Short-Term Volatility',
    domain: 'investing',
    cards: [
      `Objectives:\n• Separate short-term volatility from long-term thesis.\n• Avoid “drawdown = permanent loss” misconception.\n• Use horizon to frame decisions.\n\nMarket prices move in the short term even when long-term fundamentals are broadly unchanged. For long-horizon investors, temporary drawdowns are expected risk events, not automatic permanent wealth destruction. The key is to distinguish volatility (path variation) from impairment (lasting loss of value drivers).`,
      `Long horizon does not remove volatility. It changes how you interpret it. If your plan horizon is 20-30 years, short-term swings should be judged against long-term objectives, allocation fit, and risk tolerance, not daily headlines.`,
      `Poor behaviour often comes from misinterpreting temporary decline as thesis failure. Strong behaviour uses predetermined rules: diversification, rebalancing bands, and contribution discipline.`,
    ],
    workedExample: `Worked example: A portfolio falls 25% in a broad market drawdown, but long-term earning power assumptions remain intact. This is a volatility event. It may feel severe, but conceptually it is not automatically permanent capital destruction.`,
    questions: [
      mcq(
        'inv-c1-q1',
        'inv-c1-volatility',
        'For a 25+ year investor, a sudden market drop is most directly:',
        ['Proof of permanent wealth destruction', 'Short-term volatility risk', 'Elimination of compounding', 'A risk-free buying signal'],
        1,
        'Short-term drawdowns are volatility events unless fundamentals are permanently impaired.',
        1
      ),
      mcq(
        'inv-c1-q2',
        'inv-c1-interpretation',
        'Which interpretation is strongest when fundamentals are broadly unchanged during a drawdown?',
        ['Long-term plan is automatically invalid', 'Volatility has increased, but long-term thesis may remain intact', 'Market risk is gone', 'Diversification no longer matters'],
        1,
        'A drop alone does not prove thesis failure if core long-term drivers are unchanged.',
        2
      ),
      mcq(
        'inv-c1-q3',
        'inv-c1-behaviour',
        'What behaviour best aligns with long-horizon discipline?',
        ['React to each headline', 'Use pre-set allocation and rebalance rules', 'Exit after every large down day', 'Trade daily to avoid volatility'],
        1,
        'Rule-based behaviour reduces emotional timing errors.',
        3
      ),
      scenario(
        'inv-c1-q4',
        'inv-c1-application',
        'Your portfolio is down 25%, your investment horizon is 30 years, and your goals are unchanged. What is the best response?',
        'Investor is anxious but plan assumptions remain similar.',
        [
          { text: 'Treat decline as guaranteed permanent loss', outcome: 'Conflates volatility with permanent impairment', impactScore: -30 },
          { text: 'Review plan fit, then continue disciplined allocation process', outcome: 'Balanced long-horizon response', impactScore: 100 },
          { text: 'Assume volatility has disappeared after the drop', outcome: 'Incorrect risk view', impactScore: -15 },
          { text: 'Stop investing permanently', outcome: 'May lock in behavioural regret', impactScore: -25 },
        ],
        1,
        'Plan-consistent review beats panic reaction for long-horizon frameworks.',
        3
      ),
    ],
  }),
  createLesson({
    id: 'inv-compact-2',
    title: 'Diversification Depth and Hidden Concentration',
    domain: 'investing',
    cards: [
      `Objectives:\n• Differentiate true diversification from cosmetic diversification.\n• Detect sector concentration risk.\n• Evaluate underlying economic exposure.\n\nHolding many stocks does not always mean diversified risk. If most holdings are from one sector, economic exposure can still be concentrated. True diversification spreads exposure across sectors, geographies, and risk drivers.`,
      `A broad global index usually has better diversification depth than a set of many companies in one theme. Country spread alone is not enough if all firms respond to the same economic shocks. Ask: what common risk factor links these assets?`,
      `Diversification does not eliminate losses, but it reduces dependence on one narrow outcome. Better diversification improves resilience to single-sector drawdowns.`,
    ],
    workedExample: `Worked example: Portfolio A = 15 technology companies across countries. Portfolio B = broad global index. Portfolio A has many holdings but concentrated sector risk. Portfolio B has wider underlying exposure.`,
    questions: [
      mcq(
        'inv-c2-q1',
        'inv-c2-concentration',
        'Which is least diversified by underlying economic exposure?',
        ['Global index ETF', 'Balanced stock-bond portfolio', '15 firms in one sector across countries', 'Broad international ETF'],
        2,
        'Cross-country holdings can still be concentrated if sector exposure is narrow.',
        1
      ),
      mcq(
        'inv-c2-q2',
        'inv-c2-factor',
        'What is the best way to test whether your portfolio is truly diversified?',
        ['Number of ticker symbols only', 'Common risk factors and sector dependence', 'Broker app design', 'Dividend payment date'],
        1,
        'Diversification quality depends on independence of underlying exposures.',
        2
      ),
      mcq(
        'inv-c2-q3',
        'inv-c2-impact',
        'What is the main benefit of diversification?',
        ['Guarantees positive returns', 'Reduces reliance on one narrow outcome', 'Removes all volatility', 'Prevents inflation'],
        1,
        'Diversification is risk-distribution, not return guarantee.',
        3
      ),
      scenario(
        'inv-c2-q4',
        'inv-c2-application',
        'A user says: “I hold 12 renewable firms in 8 countries, so I’m fully diversified.” Best response?',
        'Holdings are all tied to one sector driver.',
        [
          { text: 'Correct, country count alone ensures full diversification', outcome: 'Misses sector concentration risk', impactScore: -30 },
          { text: 'Partly diversified geographically, but still sector-concentrated', outcome: 'Most accurate risk framing', impactScore: 100 },
          { text: 'Diversification only matters for bonds', outcome: 'Incorrect', impactScore: -20 },
          { text: 'Add more names in same sector to eliminate concentration', outcome: 'Name count alone may not fix factor concentration', impactScore: -10 },
        ],
        1,
        'Diversification depth requires broader economic drivers, not just more names.',
        3
      ),
    ],
  }),
  createLesson({
    id: 'inv-compact-3',
    title: 'Risk-Adjusted Thinking for Real Users',
    domain: 'investing',
    cards: [
      `Objectives:\n• Compare return with volatility jointly.\n• Explain why moderate risk aversion may choose lower-volatility portfolios.\n• Avoid “higher return always better” errors.\n\nPortfolio evaluation should consider both expected return and volatility. A higher expected return with much higher volatility may be less attractive for moderate risk-averse users. Risk-adjusted preference is about return quality per unit of uncertainty, not return in isolation.`,
      `No portfolio is risk-free. Better decision-making aligns portfolio risk with behavioural tolerance and time horizon. If volatility exceeds tolerance, users may abandon plans at the worst time, harming real outcomes.`,
      `A useful mindset: choose a strategy you can stick with through normal drawdowns. Behavioural fit is part of risk-adjusted suitability.`,
    ],
    workedExample: `Worked example: Portfolio X expected return 12%, volatility 30%. Portfolio Y expected return 9%, volatility 14%. A moderate risk-averse investor may rationally choose Y because uncertainty is materially lower relative to expected return.`,
    questions: [
      mcq(
        'inv-c3-q1',
        'inv-c3-risk-adjusted',
        'Portfolio X offers 12% expected return with 30% volatility. Portfolio Y offers 9% return with 14% volatility. Why might a moderately risk-averse investor rationally choose Y?',
        ['Y guarantees positive returns', 'Y has meaningfully lower volatility relative to its expected return', 'Y removes all market risk', 'Y avoids diversification'],
        1,
        'Choosing Y can be rational when the reduction in uncertainty outweighs the lower expected return for a risk-averse investor.',
        1
      ),
      mcq(
        'inv-c3-q2',
        'inv-c3-misconception',
        'Which statement best describes good portfolio decision-making?',
        ['Highest expected return is always best', 'Portfolio choice should consider both volatility and your behavioural tolerance', 'Risk tolerance never matters', 'Volatility is irrelevant over the long term'],
        1,
        'Suitability depends on risk-return tradeoff and user behaviour under stress.',
        2
      ),
      mcq(
        'inv-c3-q3',
        'inv-c3-fit',
        'How would you describe a portfolio strategy you are likely to abandon during a market downturn?',
        ['Behaviourally fragile even if mathematically appealing', 'Always optimal', 'Risk-free', 'More diversified automatically'],
        0,
        'A strategy you cannot stick with has lower real-world quality.',
        3
      ),
      scenario(
        'inv-c3-q4',
        'inv-c3-application',
        'Portfolio A has an expected return of 11% with volatility of 28%. Portfolio B has an expected return of 8% with volatility of 12%. Which is likely better for a moderately risk-averse investor?',
        'Investor values growth but dislikes extreme fluctuations.',
        [
          { text: 'A only, because highest return dominates all considerations', outcome: 'Ignores risk-adjusted preference', impactScore: -20 },
          { text: 'B can be preferable due to lower volatility per expected return', outcome: 'Most aligned with risk-adjusted logic', impactScore: 100 },
          { text: 'Either is identical because both are diversified', outcome: 'Risk characteristics still differ', impactScore: -5 },
          { text: 'Neither; volatility means investing is invalid', outcome: 'Overly absolute and impractical', impactScore: -15 },
        ],
        1,
        'Risk-adjusted choice depends on both expected return and uncertainty tolerance.',
        3
      ),
    ],
  }),
  createLesson({
    id: 'inv-compact-4',
    title: 'Portfolio Exposure and Strategy Choice',
    domain: 'investing',
    cards: [
      `Objectives:\n• Identify major risks that remain in domestic-heavy portfolios.\n• Compare DCA and lump-sum behaviourally.\n• Separate risk reduction from risk elimination claims.\n\nA domestic equity-plus-bond portfolio still faces domestic downturn risk, rate risk, equity volatility, and inflation risk. “Domestic only” reduces direct currency exposure but does not remove core macro and market risks.`,
      `Lump-sum investing often benefits more from long-term upward market drift, but can feel psychologically difficult during volatility. Dollar-Cost Averaging (DCA) may reduce emotional stress by spreading entry timing, but it does not remove market risk.`,
      `Good strategy selection includes both expected outcome and behavioural fit. A technically efficient strategy fails if the user cannot stick with it.`,
    ],
    workedExample: `Worked example: Portfolio = 70% domestic equities, 20% domestic government bonds, 10% domestic corporate bonds. Still exposed to domestic economy, interest-rate moves, equity volatility, and inflation. Low direct FX exposure does not mean low total risk.`,
    questions: [
      mcq(
        'inv-c4-q1',
        'inv-c4-risk-exposure',
        'What significant risks remain in a portfolio made up mostly of domestic stocks and bonds?',
        ['Domestic downturn and interest-rate risk', 'No macro risk', 'Only currency risk', 'Only dividend risk'],
        0,
        'Domestic economy and rates still matter strongly even without foreign assets.',
        1
      ),
      mcq(
        'inv-c4-q2',
        'inv-c4-dca-lumpsum',
        'Which statement is most accurate about DCA vs lump-sum?',
        ['DCA removes market risk', 'Lump-sum always eliminates volatility', 'Choice includes behavioural comfort and risk tolerance', 'Both strategies guarantee equal outcomes'],
        2,
        'DCA can help behaviour; lump-sum may benefit from time-in-market, but neither removes risk.',
        2
      ),
      mcq(
        'inv-c4-q3',
        'inv-c4-select-all-style',
        'A portfolio holds 70% domestic equities, 20% domestic government bonds, and 10% domestic corporate bonds. Which set best describes its main remaining risks?',
        [
          'Domestic downturn, rate risk, equity volatility, and inflation risk',
          'Only currency risk and dividend risk',
          'Only stock-picking risk in one company',
          'No major risk because bonds remove most risk',
        ],
        0,
        'Major remaining risks include domestic downturn, interest-rate risk, equity volatility, and inflation risk.',
        3
      ),
      scenario(
        'inv-c4-q4',
        'inv-c4-application',
        'An investor has received a lump sum and is deciding whether to invest it all at once or spread it out using DCA. What is the best guidance?',
        'They are long-term focused but worry about short-term regret.',
        [
          { text: 'Use DCA because it eliminates market risk', outcome: 'False premise; risk remains', impactScore: -20 },
          { text: 'Use lump-sum because volatility disappears over time', outcome: 'Volatility still exists', impactScore: -10 },
          { text: 'Choose strategy balancing expected efficiency and behavioural adherence', outcome: 'Most realistic decision framework', impactScore: 100 },
          { text: 'Delay all investing until volatility ends permanently', outcome: 'Timing assumption is unrealistic', impactScore: -15 },
        ],
        2,
        'Behavioural sustainability is part of strategy quality, not separate from it.',
        3
      ),
    ],
  }),
];

function toCourse(
  id: string,
  title: string,
  description: string,
  icon: string,
  color: string,
  domain: SkillDomain,
  lessons: Lesson[]
): Course {
  const totalMinutes = lessons.reduce((sum, l) => sum + l.estimatedMinutes, 0);
  return {
    id,
    title,
    description,
    icon,
    color,
    domain,
    lessons,
    totalXP: lessons.reduce((sum, l) => sum + l.xpReward, 0),
    estimatedHours: Math.round((totalMinutes / 60) * 10) / 10,
  };
}

export const compactMoneyFoundationsCourse = toCourse(
  'course-money-foundations',
  'Money Foundations',
  'Build budgeting accuracy, forecasting skill, and resilient savings decisions in under 10 minutes.',
  'dollar-sign',
  '#10B981',
  'budgeting',
  moneyLessons
);

export const compactCreditDebtCourse = toCourse(
  'course-credit-debt',
  'Credit & Debt Navigation',
  'Understand compounding cost, debt prioritisation, and repayment behaviour with practical decisions.',
  'credit-card',
  '#3B82F6',
  'debt',
  debtLessons
);

export const compactInvestingCourse = toCourse(
  'course-investing-essentials',
  'Investing Essentials',
  'Master volatility, diversification, risk-adjusted choice, and strategy behaviour quickly.',
  'trending-up',
  '#F97316',
  'investing',
  investingLessons
);

export const compactCourses: Course[] = [
  compactMoneyFoundationsCourse,
  compactCreditDebtCourse,
  compactInvestingCourse,
];
