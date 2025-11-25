import { Module } from '../types';

export const modules: Module[] = [
  {
    id: 'module-1',
    title: 'Foundations: Budgeting & Saving',
    description: 'Master the basics of personal finance, from creating your first budget to building an emergency fund.',
    progress: 40,
    lessons: [
      {
        id: 'lesson-1-1',
        title: 'Understanding Your Income and Expenses',
        type: 'lesson',
        estimatedMinutes: 8,
        completionStatus: 'completed',
        content: `# Understanding Your Income and Expenses

The foundation of financial literacy starts with knowing exactly where your money comes from and where it goes.

## Track Your Income

Your income includes all money you receive: salary, freelance work, side hustles, or passive income. Knowing your total monthly income helps you make informed spending decisions.

## Monitor Your Expenses

Expenses fall into two categories:

**Fixed Expenses:** Rent, loan payments, subscriptions - costs that stay the same each month.

**Variable Expenses:** Groceries, entertainment, dining out - costs that change month to month.

## The 50/30/20 Rule

A simple budgeting framework:
- 50% for needs (housing, food, utilities)
- 30% for wants (entertainment, hobbies)
- 20% for savings and debt repayment

Understanding this balance is your first step toward financial freedom.`,
      },
      {
        id: 'lesson-1-2',
        title: 'Creating Your First Budget',
        type: 'lesson',
        estimatedMinutes: 10,
        completionStatus: 'in_progress',
        content: `# Creating Your First Budget

A budget is simply a plan for your money. It tells your money where to go instead of wondering where it went.

## Step 1: List All Income Sources

Write down every source of income you have. Include your regular salary, any side income, and other reliable sources.

## Step 2: Track Every Expense

For one month, track everything you spend. Use your bank statements, receipts, or a budgeting app.

## Step 3: Categorize Your Spending

Group expenses into categories like housing, food, transportation, entertainment, and savings.

## Step 4: Set Realistic Limits

Based on your tracking, set spending limits for each category. Be realistic - a budget you can't follow won't help you.

## Step 5: Review and Adjust

Check your budget weekly. Life changes, and your budget should too. Adjust as needed to reflect your real spending patterns.

Remember: A budget isn't about restriction, it's about intention with your money.`,
      },
      {
        id: 'lesson-1-3',
        title: 'Building an Emergency Fund',
        type: 'lesson',
        estimatedMinutes: 7,
        completionStatus: 'not_started',
        content: `# Building an Emergency Fund

An emergency fund is money set aside for unexpected expenses like medical bills, car repairs, or job loss.

## Why You Need One

Life is unpredictable. Without savings, emergencies lead to debt. With an emergency fund, you have a financial cushion.

## How Much to Save

Start with £1,000 as a mini emergency fund. Then work toward 3-6 months of expenses.

## Where to Keep It

Keep your emergency fund in a high-yield savings account - separate from your checking account but easily accessible when needed.

## How to Build It

Start small. Even £20 per week adds up to over £1,000 in a year. Set up automatic transfers on payday.

Think of your emergency fund as insurance you pay yourself.`,
      },
      {
        id: 'lesson-1-4',
        title: 'Budgeting Basics Quiz',
        type: 'quiz',
        estimatedMinutes: 5,
        completionStatus: 'not_started',
        quiz: {
          questions: [
            {
              id: 'q1',
              question: 'According to the 50/30/20 rule, what percentage of your income should go to savings and debt repayment?',
              options: ['10%', '20%', '30%', '50%'],
              correctAnswer: 1,
            },
            {
              id: 'q2',
              question: 'Which of these is a fixed expense?',
              options: ['Dining out', 'Groceries', 'Monthly rent', 'Entertainment'],
              correctAnswer: 2,
            },
            {
              id: 'q3',
              question: 'What is the recommended first goal for an emergency fund?',
              options: ['£500', '£1,000', '£5,000', '6 months of expenses'],
              correctAnswer: 1,
            },
            {
              id: 'q4',
              question: 'Where should you keep your emergency fund?',
              options: ['Under your mattress', 'In your checking account', 'In a high-yield savings account', 'Invested in stocks'],
              correctAnswer: 2,
            },
          ],
        },
      },
    ],
  },
  {
    id: 'module-2',
    title: 'Debt & Interest',
    description: 'Learn how debt works, understand interest rates, and develop strategies to become debt-free.',
    progress: 15,
    lessons: [
      {
        id: 'lesson-2-1',
        title: 'Student Loans Basics',
        type: 'lesson',
        estimatedMinutes: 12,
        completionStatus: 'completed',
        content: `# Student Loans Basics

Student loans help you invest in education, but understanding how they work is crucial for managing them effectively.

## Types of Student Loans

**Government Loans:** Lower interest rates, income-based repayment options, more flexible terms.

**Private Loans:** Higher interest rates, less flexible repayment options, may require a co-signer.

## How Repayment Works

Most student loans have a grace period after graduation before repayment begins. Know when yours starts.

## Interest Accrual

Interest may accrue while you're in school. Subsidized loans don't charge interest during school; unsubsidized loans do.

## Repayment Strategies

- Pay more than the minimum when possible
- Consider making payments during school
- Look into income-driven repayment plans if needed

Your student loan doesn't have to be a burden if you understand and plan for it.`,
      },
      {
        id: 'lesson-2-2',
        title: 'Understanding Interest Rates',
        type: 'lesson',
        estimatedMinutes: 10,
        completionStatus: 'not_started',
        content: `# Understanding Interest Rates

Interest is the cost of borrowing money - or the reward for saving it.

## Simple vs. Compound Interest

**Simple Interest:** Calculated only on the principal amount. Straightforward but less common.

**Compound Interest:** Calculated on principal plus accumulated interest. This is what most loans and savings use.

## APR vs. APY

**APR (Annual Percentage Rate):** The yearly interest rate on loans. Lower is better for borrowing.

**APY (Annual Percentage Yield):** The effective annual rate for savings, including compound interest. Higher is better for saving.

## The Power of Compounding

Small differences in interest rates create big differences over time. A 1% difference on a £20,000 loan over 10 years can mean thousands of pounds.

Understanding interest helps you make better decisions about both borrowing and saving.`,
      },
      {
        id: 'lesson-2-3',
        title: 'Credit Cards: Friend or Foe?',
        type: 'lesson',
        estimatedMinutes: 9,
        completionStatus: 'not_started',
        content: `# Credit Cards: Friend or Foe?

Credit cards can be powerful financial tools or dangerous debt traps. The difference is how you use them.

## The Benefits

- Build credit history
- Earn rewards and cashback
- Purchase protection
- Convenience and security

## The Dangers

- High interest rates (often 18-24% APR)
- Easy to overspend
- Minimum payments trap you in debt
- Late fees add up quickly

## Using Credit Cards Wisely

**Rule 1:** Only charge what you can afford to pay off that month.

**Rule 2:** Always pay the full balance, not just the minimum.

**Rule 3:** Set up automatic payments to avoid late fees.

**Rule 4:** Use for planned purchases, not impulse buys.

Treat your credit card like a debit card - if you don't have the money now, don't charge it.`,
      },
      {
        id: 'lesson-2-4',
        title: 'Debt Management Quiz',
        type: 'quiz',
        estimatedMinutes: 5,
        completionStatus: 'not_started',
        quiz: {
          questions: [
            {
              id: 'q1',
              question: 'Which type of interest is calculated on both principal and accumulated interest?',
              options: ['Simple interest', 'Compound interest', 'Fixed interest', 'Variable interest'],
              correctAnswer: 1,
            },
            {
              id: 'q2',
              question: 'What should you aim to pay on your credit card each month?',
              options: ['Minimum payment', 'Half the balance', 'Full balance', 'Whatever you can afford'],
              correctAnswer: 2,
            },
            {
              id: 'q3',
              question: 'Which type of student loan typically has lower interest rates?',
              options: ['Private loans', 'Government loans', 'Credit card advances', 'Personal loans'],
              correctAnswer: 1,
            },
          ],
        },
      },
    ],
  },
  {
    id: 'module-3',
    title: 'Investing Basics',
    description: 'Start your investment journey with the fundamentals of growing wealth over time.',
    progress: 0,
    lessons: [
      {
        id: 'lesson-3-1',
        title: 'Why Invest?',
        type: 'lesson',
        estimatedMinutes: 8,
        completionStatus: 'not_started',
        content: `# Why Invest?

Saving is important, but investing helps your money grow faster than inflation.

## The Problem with Just Saving

Money in a regular savings account grows slowly. With inflation at 2-3% annually, your purchasing power actually decreases if your savings don't grow faster than inflation.

## How Investing Helps

Historically, investments in stocks and bonds have returned 7-10% annually on average. While there's more risk, there's also more growth potential.

## The Power of Time

The earlier you start investing, the more time compound growth has to work. Even small amounts invested young can grow into significant wealth.

## Start Where You Are

You don't need to be rich to invest. Many platforms let you start with as little as £10.

Investing isn't about timing the market - it's about time in the market.`,
      },
      {
        id: 'lesson-3-2',
        title: 'Types of Investments',
        type: 'lesson',
        estimatedMinutes: 11,
        completionStatus: 'not_started',
        content: `# Types of Investments

Different investments serve different goals. Understanding your options helps you build a balanced portfolio.

## Stocks

Buying shares of a company. Higher potential returns, but also higher risk. Best for long-term growth.

## Bonds

Lending money to governments or corporations. Lower returns than stocks, but more stable. Good for income and stability.

## Index Funds

A collection of many stocks or bonds that tracks a market index. Instant diversification, lower fees. Great for beginners.

## Real Estate

Property investing. Can provide rental income and appreciation. Requires more capital and management.

## Start with Index Funds

For most beginners, low-cost index funds offer the best balance of growth potential, diversification, and simplicity.

Remember: diversification reduces risk. Don't put all your money in one investment.`,
      },
      {
        id: 'lesson-3-3',
        title: 'Investment Basics Quiz',
        type: 'quiz',
        estimatedMinutes: 5,
        completionStatus: 'not_started',
        quiz: {
          questions: [
            {
              id: 'q1',
              question: 'What is the main advantage of investing over just saving?',
              options: ['No risk involved', 'Higher potential returns', 'Guaranteed profits', 'Instant access to money'],
              correctAnswer: 1,
            },
            {
              id: 'q2',
              question: 'Which investment type is generally recommended for beginners?',
              options: ['Individual stocks', 'Cryptocurrency', 'Index funds', 'Real estate'],
              correctAnswer: 2,
            },
            {
              id: 'q3',
              question: 'What does diversification help reduce?',
              options: ['Returns', 'Risk', 'Fees', 'Time commitment'],
              correctAnswer: 1,
            },
          ],
        },
      },
    ],
  },
];
