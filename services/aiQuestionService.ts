import { generateJSON, isGeminiConfigured } from '@/lib/gemini';
import { 
  Question, 
  MCQQuestion, 
  TrueFalseQuestion, 
  CalculationQuestion,
  ScenarioQuestion,
  DifficultyLevel,
  SkillDomain
} from '@/types';

export interface UserFinancialContext {
  monthlyIncome?: number;
  monthlyExpenses?: number;
  savingsGoal?: number;
  currentSavings?: number;
  monthlyDebt?: number;
  subscriptionCount?: number;
}

export interface QuestionGenerationRequest {
  conceptId: string;
  conceptName: string;
  domain: SkillDomain;
  difficulty: DifficultyLevel;
  lessonTitle: string;
  lessonContent: string;
  userContext?: UserFinancialContext;
  existingQuestionIds: string[];
}

interface GeneratedMCQ {
  type: 'mcq';
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface GeneratedTrueFalse {
  type: 'true_false';
  question: string;
  correctAnswer: boolean;
  explanation: string;
}

interface GeneratedCalculation {
  type: 'calculation';
  question: string;
  problemText: string;
  correctAnswer: number;
  unit: string;
  explanation: string;
}

interface GeneratedScenario {
  type: 'scenario';
  question: string;
  scenario: string;
  options: Array<{
    text: string;
    outcome: string;
    impactScore: number;
  }>;
  bestOptionIndex: number;
  explanation: string;
}

type GeneratedQuestion = GeneratedMCQ | GeneratedTrueFalse | GeneratedCalculation | GeneratedScenario;

function getDifficultyTier(difficulty: DifficultyLevel): 1 | 2 | 3 {
  switch (difficulty) {
    case 'beginner': return 1;
    case 'intermediate': return 2;
    case 'advanced': return 3;
  }
}

export async function generatePersonalizedQuestion(
  request: QuestionGenerationRequest
): Promise<Question | null> {
  if (!isGeminiConfigured()) {
    console.log('Gemini not configured, skipping AI question generation');
    return null;
  }

  const { conceptId, conceptName, domain, difficulty, lessonTitle, lessonContent, userContext } = request;

  const userContextString = userContext
    ? `
User's Financial Context (use these real numbers to personalize the question):
- Monthly Income: ${userContext.monthlyIncome ? `$${userContext.monthlyIncome}` : 'Not specified'}
- Monthly Expenses: ${userContext.monthlyExpenses ? `$${userContext.monthlyExpenses}` : 'Not specified'}
- Savings Goal: ${userContext.savingsGoal ? `$${userContext.savingsGoal}` : 'Not specified'}
- Current Savings: ${userContext.currentSavings ? `$${userContext.currentSavings}` : 'Not specified'}
- Monthly Debt Payments: ${userContext.monthlyDebt ? `$${userContext.monthlyDebt}` : 'Not specified'}
- Number of Subscriptions: ${userContext.subscriptionCount ?? 'Not specified'}
`
    : 'No specific user financial data available. Use realistic example numbers.';

  const questionType = selectQuestionType(difficulty, domain);

  const prompt = buildPrompt(questionType, {
    conceptId,
    conceptName,
    domain,
    difficulty,
    lessonTitle,
    lessonContent,
    userContextString,
  });

  try {
    const generated = await generateJSON<GeneratedQuestion>(prompt);
    if (!generated) {
      console.error('Failed to generate question');
      return null;
    }

    const questionId = `ai-${conceptId}-${Date.now()}`;
    const difficultyTier = getDifficultyTier(difficulty);

    return formatQuestion(generated, {
      id: questionId,
      conceptId,
      variantGroup: `ai-${conceptId}`,
      difficultyTier,
      difficulty,
      xpReward: difficultyTier * 5,
    });
  } catch (error) {
    console.error('Error generating question:', error);
    return null;
  }
}

function selectQuestionType(difficulty: DifficultyLevel, domain: SkillDomain): 'mcq' | 'true_false' | 'calculation' | 'scenario' {
  if (difficulty === 'beginner') {
    return Math.random() > 0.5 ? 'true_false' : 'mcq';
  }
  if (difficulty === 'intermediate') {
    if (domain === 'budgeting' || domain === 'debt' || domain === 'saving') {
      return Math.random() > 0.5 ? 'calculation' : 'mcq';
    }
    return 'mcq';
  }
  return 'scenario';
}

interface PromptContext {
  conceptId: string;
  conceptName: string;
  domain: SkillDomain;
  difficulty: DifficultyLevel;
  lessonTitle: string;
  lessonContent: string;
  userContextString: string;
}

function buildPrompt(
  questionType: 'mcq' | 'true_false' | 'calculation' | 'scenario',
  context: PromptContext
): string {
  const baseContext = `
You are an expert financial literacy educator creating personalized quiz questions for a mobile learning app.

Topic: ${context.lessonTitle}
Concept being tested: ${context.conceptName} (ID: ${context.conceptId})
Domain: ${context.domain}
Difficulty: ${context.difficulty}

Lesson Content Summary:
${context.lessonContent.substring(0, 1000)}

${context.userContextString}

Guidelines:
- Make the question practical and relatable
- If user financial data is provided, personalize the question using their actual numbers
- Ensure the question tests understanding, not just memorization
- The explanation should teach why the answer is correct
- Use simple, clear language
`;

  switch (questionType) {
    case 'mcq':
      return `${baseContext}

Generate a multiple choice question with 4 options where exactly ONE is correct.
Respond with JSON in this exact format:
\`\`\`json
{
  "type": "mcq",
  "question": "The question text here?",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": 0,
  "explanation": "Brief explanation of why this is correct"
}
\`\`\`
The correctAnswer is the 0-based index of the correct option.`;

    case 'true_false':
      return `${baseContext}

Generate a true/false question that tests understanding of the concept.
Make sure the statement is clearly true OR clearly false, not ambiguous.
Respond with JSON in this exact format:
\`\`\`json
{
  "type": "true_false",
  "question": "A statement that is either true or false.",
  "correctAnswer": true,
  "explanation": "Brief explanation of why this is true/false"
}
\`\`\``;

    case 'calculation':
      return `${baseContext}

Generate a practical calculation question related to personal finance.
Use simple numbers that can be solved mentally or with basic arithmetic.
If user financial data is provided, use those exact numbers.
Respond with JSON in this exact format:
\`\`\`json
{
  "type": "calculation",
  "question": "The question asking for a numerical answer",
  "problemText": "Setup showing the numbers involved",
  "correctAnswer": 150,
  "unit": "$",
  "explanation": "Brief explanation of the calculation"
}
\`\`\``;

    case 'scenario':
      return `${baseContext}

Generate a scenario-based decision question with 4 choices.
Each choice should have a realistic outcome and impact score (-100 to +100).
One choice should be clearly the best financial decision.
Respond with JSON in this exact format:
\`\`\`json
{
  "type": "scenario",
  "question": "What should you do in this situation?",
  "scenario": "Description of the financial situation the user faces",
  "options": [
    {"text": "Choice 1", "outcome": "What happens if they choose this", "impactScore": 50},
    {"text": "Choice 2", "outcome": "What happens if they choose this", "impactScore": -30},
    {"text": "Choice 3", "outcome": "What happens if they choose this", "impactScore": 100},
    {"text": "Choice 4", "outcome": "What happens if they choose this", "impactScore": -50}
  ],
  "bestOptionIndex": 2,
  "explanation": "Why the best choice is optimal"
}
\`\`\``;
  }
}

interface QuestionMeta {
  id: string;
  conceptId: string;
  variantGroup: string;
  difficultyTier: 1 | 2 | 3;
  difficulty: DifficultyLevel;
  xpReward: number;
}

function formatQuestion(generated: GeneratedQuestion, meta: QuestionMeta): Question {
  const base = {
    id: meta.id,
    conceptId: meta.conceptId,
    variantGroup: meta.variantGroup,
    difficultyTier: meta.difficultyTier,
    difficulty: meta.difficulty,
    xpReward: meta.xpReward,
  };

  switch (generated.type) {
    case 'mcq':
      return {
        ...base,
        type: 'mcq',
        question: generated.question,
        options: generated.options,
        correctAnswer: generated.correctAnswer,
        explanation: generated.explanation,
      } as MCQQuestion;

    case 'true_false':
      return {
        ...base,
        type: 'true_false',
        question: generated.question,
        correctAnswer: generated.correctAnswer,
        explanation: generated.explanation,
      } as TrueFalseQuestion;

    case 'calculation':
      return {
        ...base,
        type: 'calculation',
        question: generated.question,
        problemText: generated.problemText,
        correctAnswer: generated.correctAnswer,
        tolerance: 0,
        unit: generated.unit,
        explanation: generated.explanation,
      } as CalculationQuestion;

    case 'scenario':
      return {
        ...base,
        type: 'scenario',
        question: generated.question,
        scenario: generated.scenario,
        options: generated.options,
        bestOptionIndex: generated.bestOptionIndex,
        explanation: generated.explanation,
      } as ScenarioQuestion;
  }
}

export async function generatePersonalizedInsight(
  userContext: UserFinancialContext,
  topic: string
): Promise<string | null> {
  if (!isGeminiConfigured()) {
    return null;
  }

  const prompt = `
You are a friendly financial advisor giving personalized advice.

User's Financial Snapshot:
- Monthly Income: ${userContext.monthlyIncome ? `$${userContext.monthlyIncome}` : 'Not specified'}
- Monthly Expenses: ${userContext.monthlyExpenses ? `$${userContext.monthlyExpenses}` : 'Not specified'}
- Savings Goal: ${userContext.savingsGoal ? `$${userContext.savingsGoal}` : 'Not specified'}
- Current Savings: ${userContext.currentSavings ? `$${userContext.currentSavings}` : 'Not specified'}
- Monthly Debt Payments: ${userContext.monthlyDebt ? `$${userContext.monthlyDebt}` : 'Not specified'}

Topic: ${topic}

Provide ONE short, personalized financial insight or tip (2-3 sentences max) based on their data.
Be encouraging but realistic. Use their actual numbers if available.
Respond with just the insight text, no JSON or formatting.
`;

  try {
    const { generateContent } = await import('@/lib/gemini');
    const insight = await generateContent(prompt);
    return insight?.trim() || null;
  } catch (error) {
    console.error('Error generating insight:', error);
    return null;
  }
}

export function canGenerateAIQuestions(): boolean {
  return isGeminiConfigured();
}
