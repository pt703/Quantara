import { generateContent, isGeminiConfigured, isRateLimited } from '@/lib/gemini';
import { UserFinancialContext } from '@/services/aiQuestionService';
import { getUserPerformanceSummary } from '@/services/supabaseDataService';

export interface CoachMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface CoachRequest {
  userMessage: string;
  history: CoachMessage[];
  userContext?: UserFinancialContext;
  userName?: string;
}

function formatMoney(value?: number): string {
  if (value === undefined || value === null) return 'Not provided';
  return `$${Number(value).toLocaleString()}`;
}

function buildHistorySnippet(history: CoachMessage[]): string {
  if (!history.length) return 'No prior chat context.';
  return history
    .slice(-8)
    .map((m) => `${m.role === 'assistant' ? 'Coach' : 'User'}: ${m.content}`)
    .join('\n');
}

export async function generateFinancialCoachReply({
  userMessage,
  history,
  userContext,
  userName,
}: CoachRequest): Promise<string | null> {
  if (!isGeminiConfigured()) {
    return null;
  }

  const perf = await getUserPerformanceSummary();
  const weak = perf?.weakDomains?.length ? perf.weakDomains.join(', ') : 'None identified';
  const strong = perf?.strongDomains?.length ? perf.strongDomains.join(', ') : 'None identified';
  const overallAccuracy = perf?.overallAccuracy ?? 0;

  const prompt = `
You are Quantara AI Financial Coach. Give clear, practical money guidance.
User name: ${userName || 'User'}

User financial snapshot:
- Monthly income: ${formatMoney(userContext?.monthlyIncome)}
- Monthly expenses: ${formatMoney(userContext?.monthlyExpenses)}
- Savings goal: ${formatMoney(userContext?.savingsGoal)}
- Current savings: ${formatMoney(userContext?.currentSavings)}
- Monthly debt payments: ${formatMoney(userContext?.monthlyDebt)}
- Subscription count: ${userContext?.subscriptionCount ?? 'Not provided'}

User learning performance:
- Overall quiz accuracy: ${overallAccuracy}%
- Weak domains: ${weak}
- Strong domains: ${strong}
- Total quizzes answered: ${perf?.totalQuizzesTaken ?? 0}
- Lessons completed: ${perf?.lessonsCompleted ?? 0}

Conversation context:
${buildHistorySnippet(history)}

Current user question:
${userMessage}

Output rules:
- Keep response under 180 words.
- Start with a direct answer in 1 sentence.
- Then provide a short numbered action plan (2-4 steps).
- Tone should be friendly and human. You may use 1-2 relevant emojis total.
- Do not use markdown formatting such as **bold**, headers, or code blocks.
- If the question is high-risk (legal/tax/investing certainty), include "Not financial advice" and suggest checking a professional.
- Use plain language and concrete numbers when possible.
`;

  const response = await generateContent(prompt);
  if (!response) return null;
  return sanitizeCoachText(response);
}

export function getFinancialCoachFallback(userMessage: string): string {
  if (isRateLimited()) {
    return "I am temporarily rate-limited right now. Please try again in about 60 seconds. In the meantime, start with: 1) list essential monthly expenses, 2) set an emergency fund target, 3) automate a fixed weekly savings transfer.";
  }

  const q = userMessage.toLowerCase();
  if (q.includes('debt') && q.includes('save')) {
    return "Prioritize high-interest debt first while still saving a small emergency buffer. 1) Build a starter emergency fund (for example $500-$1,000). 2) Pay extra toward the highest-interest debt. 3) Keep minimum payments on all other debts. 4) Increase savings rate after expensive debt is cleared.";
  }

  return "I could not generate a personalized response right now. 1) Track your last 30 days of spending. 2) Cut one non-essential category by 10%. 3) Auto-transfer a fixed amount to savings after payday. 4) Ask me again in a minute for a personalized plan.";
}

function sanitizeCoachText(text: string): string {
  return text
    .replace(/\*\*/g, '')
    .replace(/__/g, '')
    .replace(/`/g, '')
    .trim();
}
