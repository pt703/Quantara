import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { UserProfile, FinancialSnapshot, SkillDomain } from '@/types';

export interface QuizResultRecord {
  lesson_id: string;
  question_id: string;
  concept_id: string | null;
  domain: string;
  difficulty: string;
  difficulty_tier: number | null;
  is_correct: boolean;
  response_time_ms: number | null;
  attempt_number: number;
  is_ai_generated: boolean;
}

export interface LearningProgressRecord {
  lesson_id: string;
  course_id: string;
  status: string;
  score: number;
  accuracy: number;
  attempts: number;
  completed_at: string | null;
}

export interface GamificationRecord {
  hearts: number;
  total_xp: number;
  today_xp: number;
  level: number;
  streak: number;
  last_activity_date: string | null;
  today_date: string | null;
}

export interface SkillAccuracyRecord {
  domain: string;
  correct: number;
  total: number;
}

export interface BadgeProgressRecord {
  unlocked_badges: string[];
  lesson_count: number;
  quiz_count: number;
  perfect_quiz_count: number;
  total_xp: number;
  max_streak: number;
}

export interface UserPerformanceSummary {
  totalQuizzesTaken: number;
  overallAccuracy: number;
  domainAccuracy: Record<string, { correct: number; total: number }>;
  weakDomains: string[];
  strongDomains: string[];
  recentMistakes: Array<{
    conceptId: string;
    domain: string;
    difficulty: string;
    questionText?: string;
  }>;
  lessonsCompleted: number;
  streak: number;
  totalXp: number;
}

async function getAuthUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id || null;
}

// =============================================================================
// PROFILE
// =============================================================================

export async function syncProfile(profile: UserProfile): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const userId = await getAuthUserId();
  if (!userId) return false;

  try {
    const { error } = await supabase
      .from('user_profiles')
      .upsert({
        id: userId,
        name: profile.name,
        avatar: profile.avatar,
        updated_at: new Date().toISOString(),
      });
    
    if (error) {
      console.log('[Supabase] Profile sync skipped:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.log('[Supabase] Profile sync error:', err);
    return false;
  }
}

export async function fetchProfile(): Promise<UserProfile | null> {
  if (!isSupabaseConfigured) return null;
  const userId = await getAuthUserId();
  if (!userId) return null;

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('name, avatar')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) return null;
    return { name: data.name, avatar: data.avatar };
  } catch {
    return null;
  }
}

// =============================================================================
// FINANCIAL SNAPSHOT
// =============================================================================

export async function syncFinancialSnapshot(snapshot: FinancialSnapshot): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const userId = await getAuthUserId();
  if (!userId) return false;

  try {
    const { error } = await supabase
      .from('financial_snapshots')
      .upsert({
        id: userId,
        monthly_income: snapshot.monthlyIncome,
        monthly_expenses: snapshot.monthlyExpenses,
        total_debt: snapshot.totalDebt,
        savings_goal: snapshot.savingsGoal,
        current_savings: snapshot.currentSavings,
        subscriptions: JSON.stringify(snapshot.subscriptions || []),
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.log('[Supabase] Financial sync skipped:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.log('[Supabase] Financial sync error:', err);
    return false;
  }
}

export async function fetchFinancialSnapshot(): Promise<FinancialSnapshot | null> {
  if (!isSupabaseConfigured) return null;
  const userId = await getAuthUserId();
  if (!userId) return null;

  try {
    const { data, error } = await supabase
      .from('financial_snapshots')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) return null;

    let subscriptions = [];
    try {
      subscriptions = typeof data.subscriptions === 'string' 
        ? JSON.parse(data.subscriptions) 
        : data.subscriptions || [];
    } catch {
      subscriptions = [];
    }

    return {
      monthlyIncome: Number(data.monthly_income) || 0,
      monthlyExpenses: Number(data.monthly_expenses) || 0,
      totalDebt: Number(data.total_debt) || 0,
      savingsGoal: Number(data.savings_goal) || 0,
      currentSavings: Number(data.current_savings) || 0,
      subscriptions,
      debtItems: [],
      portfolioAssets: [],
    };
  } catch {
    return null;
  }
}

// =============================================================================
// GAMIFICATION
// =============================================================================

export async function syncGamification(stats: GamificationRecord): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const userId = await getAuthUserId();
  if (!userId) return false;

  try {
    const { error } = await supabase
      .from('gamification_stats')
      .upsert({
        id: userId,
        ...stats,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.log('[Supabase] Gamification sync skipped:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.log('[Supabase] Gamification sync error:', err);
    return false;
  }
}

export async function fetchGamification(): Promise<GamificationRecord | null> {
  if (!isSupabaseConfigured) return null;
  const userId = await getAuthUserId();
  if (!userId) return null;

  try {
    const { data, error } = await supabase
      .from('gamification_stats')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) return null;
    return {
      hearts: data.hearts,
      total_xp: data.total_xp,
      today_xp: data.today_xp,
      level: data.level,
      streak: data.streak,
      last_activity_date: data.last_activity_date,
      today_date: data.today_date,
    };
  } catch {
    return null;
  }
}

// =============================================================================
// QUIZ RESULTS
// =============================================================================

export async function recordQuizResult(result: QuizResultRecord): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const userId = await getAuthUserId();
  if (!userId) return false;

  try {
    const { error } = await supabase
      .from('quiz_results')
      .insert({
        user_id: userId,
        ...result,
      });

    if (error) {
      console.log('[Supabase] Quiz result skipped:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.log('[Supabase] Quiz result error:', err);
    return false;
  }
}

export async function recordQuizResults(results: QuizResultRecord[]): Promise<boolean> {
  if (!isSupabaseConfigured || results.length === 0) return false;
  const userId = await getAuthUserId();
  if (!userId) return false;

  try {
    const { error } = await supabase
      .from('quiz_results')
      .insert(results.map(r => ({ user_id: userId, ...r })));

    if (error) {
      console.log('[Supabase] Batch quiz results skipped:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.log('[Supabase] Batch quiz results error:', err);
    return false;
  }
}

// =============================================================================
// LEARNING PROGRESS
// =============================================================================

export async function syncLessonProgress(progress: LearningProgressRecord): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const userId = await getAuthUserId();
  if (!userId) return false;

  try {
    const { error } = await supabase
      .from('learning_progress')
      .upsert({
        user_id: userId,
        lesson_id: progress.lesson_id,
        course_id: progress.course_id,
        status: progress.status,
        score: progress.score,
        accuracy: progress.accuracy,
        attempts: progress.attempts,
        completed_at: progress.completed_at,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,lesson_id',
      });

    if (error) {
      console.log('[Supabase] Learning progress skipped:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.log('[Supabase] Learning progress error:', err);
    return false;
  }
}

// =============================================================================
// SKILL ACCURACY
// =============================================================================

export async function syncSkillAccuracy(domain: string, correct: number, total: number): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const userId = await getAuthUserId();
  if (!userId) return false;

  try {
    const { error } = await supabase
      .from('skill_accuracy')
      .upsert({
        user_id: userId,
        domain,
        correct,
        total,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,domain',
      });

    if (error) {
      console.log('[Supabase] Skill accuracy skipped:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.log('[Supabase] Skill accuracy error:', err);
    return false;
  }
}

export async function fetchSkillAccuracy(): Promise<Record<string, { correct: number; total: number }> | null> {
  if (!isSupabaseConfigured) return null;
  const userId = await getAuthUserId();
  if (!userId) return null;

  try {
    const { data, error } = await supabase
      .from('skill_accuracy')
      .select('domain, correct, total')
      .eq('user_id', userId);

    if (error || !data) return null;

    const result: Record<string, { correct: number; total: number }> = {};
    data.forEach((row: any) => {
      result[row.domain] = { correct: row.correct, total: row.total };
    });
    return result;
  } catch {
    return null;
  }
}

// =============================================================================
// BADGE PROGRESS
// =============================================================================

export async function syncBadgeProgress(progress: BadgeProgressRecord): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const userId = await getAuthUserId();
  if (!userId) return false;

  try {
    const { error } = await supabase
      .from('badge_progress')
      .upsert({
        id: userId,
        unlocked_badges: JSON.stringify(progress.unlocked_badges),
        lesson_count: progress.lesson_count,
        quiz_count: progress.quiz_count,
        perfect_quiz_count: progress.perfect_quiz_count,
        total_xp: progress.total_xp,
        max_streak: progress.max_streak,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.log('[Supabase] Badge progress skipped:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.log('[Supabase] Badge progress error:', err);
    return false;
  }
}

// =============================================================================
// AI PERSONALIZATION DATA
// =============================================================================

export async function getUserPerformanceSummary(): Promise<UserPerformanceSummary | null> {
  if (!isSupabaseConfigured) return null;
  const userId = await getAuthUserId();
  if (!userId) return null;

  try {
    const [quizRes, skillRes, gamRes, progressRes] = await Promise.all([
      supabase
        .from('quiz_results')
        .select('concept_id, domain, difficulty, is_correct, difficulty_tier')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(200),
      supabase
        .from('skill_accuracy')
        .select('domain, correct, total')
        .eq('user_id', userId),
      supabase
        .from('gamification_stats')
        .select('streak, total_xp')
        .eq('id', userId)
        .maybeSingle(),
      supabase
        .from('learning_progress')
        .select('lesson_id, status')
        .eq('user_id', userId)
        .eq('status', 'completed'),
    ]);

    const quizData = quizRes.data || [];
    const skillData = skillRes.data || [];
    const gamData = gamRes.data;
    const progressData = progressRes.data || [];

    const totalQuizzes = quizData.length;
    const correctQuizzes = quizData.filter((q: any) => q.is_correct).length;
    const overallAccuracy = totalQuizzes > 0 ? Math.round((correctQuizzes / totalQuizzes) * 100) : 0;

    const domainAccuracy: Record<string, { correct: number; total: number }> = {};
    skillData.forEach((s: any) => {
      domainAccuracy[s.domain] = { correct: s.correct, total: s.total };
    });

    const weakDomains: string[] = [];
    const strongDomains: string[] = [];
    Object.entries(domainAccuracy).forEach(([domain, acc]) => {
      if (acc.total >= 3) {
        const pct = (acc.correct / acc.total) * 100;
        if (pct < 60) weakDomains.push(domain);
        else if (pct >= 80) strongDomains.push(domain);
      }
    });

    const recentMistakes = quizData
      .filter((q: any) => !q.is_correct)
      .slice(0, 10)
      .map((q: any) => ({
        conceptId: q.concept_id || 'unknown',
        domain: q.domain,
        difficulty: q.difficulty,
      }));

    return {
      totalQuizzesTaken: totalQuizzes,
      overallAccuracy,
      domainAccuracy,
      weakDomains,
      strongDomains,
      recentMistakes,
      lessonsCompleted: progressData.length,
      streak: gamData?.streak || 0,
      totalXp: gamData?.total_xp || 0,
    };
  } catch (err) {
    console.log('[Supabase] Performance summary error:', err);
    return null;
  }
}
