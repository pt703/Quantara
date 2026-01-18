import { FinancialSnapshot, Question, MCQQuestion, TrueFalseQuestion, CalculationQuestion, ScenarioQuestion, DifficultyLevel, SkillDomain } from '@/types';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

interface GeneratedQuestion {
  type: 'mcq' | 'true_false' | 'calculation' | 'scenario';
  question: string;
  explanation: string;
  options?: string[];
  correctAnswer: number | boolean;
  scenario?: string;
  problemText?: string;
  tolerance?: number;
  unit?: string;
}

class GeminiService {
  private apiKey: string | null = null;

  setApiKey(key: string) {
    this.apiKey = key;
  }

  getApiKey(): string | null {
    return this.apiKey;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  private async callGemini(prompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured');
    }

    const response = await fetch(`${GEMINI_API_URL}?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${error}`);
    }

    const data: GeminiResponse = await response.json();
    return data.candidates[0]?.content?.parts[0]?.text || '';
  }

  private parseJsonFromResponse(response: string): any {
    const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }
    const cleanedResponse = response.replace(/```/g, '').trim();
    return JSON.parse(cleanedResponse);
  }

  async generatePersonalizedQuestion(
    topic: string,
    conceptId: string,
    difficulty: DifficultyLevel,
    domain: SkillDomain,
    financialSnapshot?: FinancialSnapshot,
    questionType: 'mcq' | 'true_false' | 'calculation' | 'scenario' = 'mcq'
  ): Promise<Question> {
    const contextInfo = financialSnapshot ? `
User's Financial Context (use these real numbers in the question):
- Monthly Income: $${financialSnapshot.monthlyIncome || 3500}
- Monthly Expenses: $${financialSnapshot.monthlyExpenses || 2800}
- Total Debt: $${financialSnapshot.totalDebt || 15000}
- Savings Goal: $${financialSnapshot.savingsGoal || 10000}
- Current Savings: $${financialSnapshot.currentSavings || 2000}
- Number of Subscriptions: ${financialSnapshot.subscriptions?.length || 3}
` : 'Use realistic example numbers for a young adult (income around $3,500/month)';

    const difficultyGuide = {
      beginner: 'Simple, foundational concepts. Direct questions with obvious answers.',
      intermediate: 'Applied understanding. Requires some calculation or reasoning.',
      advanced: 'Complex scenarios requiring analysis, multiple steps, or synthesis of concepts.'
    };

    const typeInstructions = {
      mcq: `Generate a multiple choice question with exactly 4 options. Return JSON:
{
  "type": "mcq",
  "question": "Question text using user's real numbers",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": 0,
  "explanation": "Clear explanation of why this answer is correct"
}`,
      true_false: `Generate a true/false statement. Return JSON:
{
  "type": "true_false",
  "question": "Statement that is either true or false",
  "correctAnswer": true,
  "explanation": "Why this is true/false"
}`,
      calculation: `Generate a calculation problem using the user's numbers. Return JSON:
{
  "type": "calculation",
  "question": "What is the calculation question",
  "problemText": "Show the math problem clearly",
  "correctAnswer": 1234.56,
  "tolerance": 0.01,
  "unit": "$",
  "explanation": "Step by step solution"
}`,
      scenario: `Generate a financial decision scenario. Return JSON:
{
  "type": "scenario",
  "question": "What should the user do?",
  "scenario": "Detailed scenario description using user's real numbers",
  "options": [
    {"text": "Option 1", "outcome": "What happens", "impactScore": 50},
    {"text": "Option 2", "outcome": "What happens", "impactScore": -20},
    {"text": "Option 3", "outcome": "What happens", "impactScore": 100}
  ],
  "correctAnswer": 2,
  "explanation": "Why option 3 is best"
}`
    };

    const prompt = `You are a financial literacy educator creating quiz questions for a learning app.

Topic: ${topic}
Concept: ${conceptId}
Domain: ${domain}
Difficulty: ${difficulty} - ${difficultyGuide[difficulty]}

${contextInfo}

${typeInstructions[questionType]}

IMPORTANT RULES:
1. Use the user's ACTUAL financial numbers in the question to make it personal
2. The question must be educational and teach good financial habits
3. All wrong options must be plausible but clearly wrong for the right reasons
4. The explanation should teach, not just state the answer
5. Keep language simple and accessible
6. Return ONLY valid JSON, no other text`;

    try {
      const response = await this.callGemini(prompt);
      const parsed = this.parseJsonFromResponse(response);
      
      const questionId = `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const baseQuestion = {
        id: questionId,
        question: parsed.question,
        explanation: parsed.explanation,
        xpReward: difficulty === 'beginner' ? 10 : difficulty === 'intermediate' ? 15 : 20,
        difficulty,
        conceptId,
        variantGroup: `ai-${conceptId}`,
        difficultyTier: (difficulty === 'beginner' ? 1 : difficulty === 'intermediate' ? 2 : 3) as 1 | 2 | 3,
      };

      if (questionType === 'mcq' || parsed.type === 'mcq') {
        return {
          ...baseQuestion,
          type: 'mcq',
          options: parsed.options,
          correctAnswer: parsed.correctAnswer,
        } as MCQQuestion;
      } else if (questionType === 'true_false' || parsed.type === 'true_false') {
        return {
          ...baseQuestion,
          type: 'true_false',
          correctAnswer: parsed.correctAnswer,
        } as TrueFalseQuestion;
      } else if (questionType === 'calculation' || parsed.type === 'calculation') {
        return {
          ...baseQuestion,
          type: 'calculation',
          problemText: parsed.problemText || parsed.question,
          correctAnswer: parsed.correctAnswer,
          tolerance: parsed.tolerance || 0.01,
          unit: parsed.unit,
        } as CalculationQuestion;
      } else if (questionType === 'scenario' || parsed.type === 'scenario') {
        return {
          ...baseQuestion,
          type: 'scenario',
          scenario: parsed.scenario,
          options: parsed.options,
          bestOptionIndex: parsed.correctAnswer,
        } as ScenarioQuestion;
      }

      return {
        ...baseQuestion,
        type: 'mcq',
        options: parsed.options || ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswer: parsed.correctAnswer || 0,
      } as MCQQuestion;
    } catch (error) {
      console.error('Error generating question:', error);
      throw error;
    }
  }

  async generateQuizQuestions(
    topic: string,
    conceptId: string,
    domain: SkillDomain,
    financialSnapshot?: FinancialSnapshot,
    count: number = 3
  ): Promise<Question[]> {
    const difficulties: DifficultyLevel[] = ['beginner', 'intermediate', 'advanced'];
    const types: ('mcq' | 'true_false' | 'calculation' | 'scenario')[] = ['mcq', 'true_false', 'calculation', 'scenario'];
    
    const questions: Question[] = [];
    
    for (let i = 0; i < count; i++) {
      const difficulty = difficulties[i % 3];
      const questionType = types[i % 4];
      
      try {
        const question = await this.generatePersonalizedQuestion(
          topic,
          conceptId,
          difficulty,
          domain,
          financialSnapshot,
          questionType
        );
        questions.push(question);
      } catch (error) {
        console.error(`Failed to generate question ${i + 1}:`, error);
      }
    }
    
    return questions;
  }

  async generatePersonalizedInsight(
    lessonTopic: string,
    financialSnapshot: FinancialSnapshot
  ): Promise<string> {
    const prompt = `You are a friendly financial coach. Based on the user's financial situation, write a brief (2-3 sentences) personalized insight about why the lesson topic matters to them specifically.

Lesson Topic: ${lessonTopic}

User's Financial Situation:
- Monthly Income: $${financialSnapshot.monthlyIncome || 0}
- Monthly Expenses: $${financialSnapshot.monthlyExpenses || 0}
- Total Debt: $${financialSnapshot.totalDebt || 0}
- Savings Goal: $${financialSnapshot.savingsGoal || 0}
- Current Savings: $${financialSnapshot.currentSavings || 0}

Write a warm, encouraging message that:
1. References their specific numbers
2. Explains why this lesson is relevant to THEIR situation
3. Gives them hope and motivation

Keep it under 50 words. Don't use bullet points. Just natural, conversational text.`;

    try {
      const response = await this.callGemini(prompt);
      return response.trim();
    } catch (error) {
      console.error('Error generating insight:', error);
      return `This lesson on ${lessonTopic} will help you build better financial habits.`;
    }
  }

  async generateAdaptiveFeedback(
    wasCorrect: boolean,
    question: string,
    userAnswer: string,
    correctAnswer: string,
    financialSnapshot?: FinancialSnapshot
  ): Promise<string> {
    const context = financialSnapshot 
      ? `The user has $${financialSnapshot.currentSavings} saved toward a $${financialSnapshot.savingsGoal} goal.`
      : '';

    const prompt = `You are an encouraging financial literacy tutor.

Question: ${question}
User's Answer: ${userAnswer}
Correct Answer: ${correctAnswer}
Was Correct: ${wasCorrect}
${context}

${wasCorrect 
  ? 'Write a brief (1-2 sentences) encouraging response that reinforces why this answer is correct and how it applies to their financial journey.'
  : 'Write a brief (2-3 sentences) supportive response that explains the correct answer without being condescending. Connect it to real-life application.'}

Keep it warm, brief, and educational. No more than 40 words.`;

    try {
      const response = await this.callGemini(prompt);
      return response.trim();
    } catch (error) {
      console.error('Error generating feedback:', error);
      return wasCorrect 
        ? 'Great job! You got it right!' 
        : `The correct answer was ${correctAnswer}. Keep learning!`;
    }
  }
}

export const geminiService = new GeminiService();
export default geminiService;
