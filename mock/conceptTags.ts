// =============================================================================
// CONCEPT TAGS - LINKING QUESTIONS ACROSS FORMATS
// =============================================================================
// 
// Concept tags connect related questions that test the same underlying concept.
// When a user fails a question, they must answer a variant (different format)
// testing the same concept before they can proceed.
//
// This enables mastery-based learning where users prove understanding
// through multiple question formats, not just memorization.
//
// =============================================================================

import { ConceptTag, SkillDomain } from '../types';

// =============================================================================
// BUDGETING CONCEPTS
// =============================================================================

export const budgetingConcepts: ConceptTag[] = [
  {
    id: 'budget-definition',
    name: 'What is a budget',
    domain: 'budgeting',
    relatedQuestionIds: ['mf-1-q1', 'mf-1-q2', 'mf-1-q3'],
  },
  {
    id: 'budget-timing',
    name: 'When to create a budget',
    domain: 'budgeting',
    relatedQuestionIds: ['mf-1-q4'],
  },
  {
    id: 'income-vs-expenses',
    name: 'Income versus expenses',
    domain: 'budgeting',
    relatedQuestionIds: ['mf-2-q1', 'mf-2-q2', 'mf-2-q3'],
  },
  {
    id: 'fixed-vs-variable',
    name: 'Fixed versus variable expenses',
    domain: 'budgeting',
    relatedQuestionIds: ['mf-2-q4', 'mf-2-q5'],
  },
  {
    id: 'needs-vs-wants',
    name: 'Needs versus wants',
    domain: 'budgeting',
    relatedQuestionIds: ['mf-3-q1', 'mf-3-q2', 'mf-3-q3'],
  },
  {
    id: '50-30-20-rule',
    name: 'The 50/30/20 budget rule',
    domain: 'budgeting',
    relatedQuestionIds: ['mf-4-q1', 'mf-4-q2', 'mf-4-q3', 'mf-4-q4'],
  },
  {
    id: 'tracking-spending',
    name: 'Tracking your spending',
    domain: 'budgeting',
    relatedQuestionIds: ['mf-5-q1', 'mf-5-q2', 'mf-5-q3'],
  },
  {
    id: 'cash-flow',
    name: 'Understanding cash flow',
    domain: 'budgeting',
    relatedQuestionIds: ['mf-6-q1', 'mf-6-q2', 'mf-6-q3'],
  },
  {
    id: 'irregular-expenses',
    name: 'Planning for irregular expenses',
    domain: 'budgeting',
    relatedQuestionIds: ['mf-7-q1', 'mf-7-q2', 'mf-7-q3'],
  },
  {
    id: 'budget-adjustment',
    name: 'Adjusting your budget',
    domain: 'budgeting',
    relatedQuestionIds: ['mf-8-q1', 'mf-8-q2', 'mf-8-q3'],
  },
];

// =============================================================================
// SAVING CONCEPTS
// =============================================================================

export const savingConcepts: ConceptTag[] = [
  {
    id: 'emergency-fund',
    name: 'Emergency fund basics',
    domain: 'saving',
    relatedQuestionIds: ['mf-9-q1', 'mf-9-q2', 'mf-9-q3'],
  },
  {
    id: 'savings-goals',
    name: 'Setting savings goals',
    domain: 'saving',
    relatedQuestionIds: ['mf-10-q1', 'mf-10-q2', 'mf-10-q3'],
  },
  {
    id: 'pay-yourself-first',
    name: 'Pay yourself first strategy',
    domain: 'saving',
    relatedQuestionIds: ['mf-11-q1', 'mf-11-q2', 'mf-11-q3'],
  },
];

// =============================================================================
// DEBT CONCEPTS
// =============================================================================

export const debtConcepts: ConceptTag[] = [
  {
    id: 'what-is-debt',
    name: 'Understanding debt',
    domain: 'debt',
    relatedQuestionIds: ['cd-1-q1', 'cd-1-q2', 'cd-1-q3'],
  },
  {
    id: 'good-vs-bad-debt',
    name: 'Good debt versus bad debt',
    domain: 'debt',
    relatedQuestionIds: ['cd-2-q1', 'cd-2-q2', 'cd-2-q3'],
  },
  {
    id: 'interest-rates',
    name: 'How interest rates work',
    domain: 'debt',
    relatedQuestionIds: ['cd-3-q1', 'cd-3-q2', 'cd-3-q3', 'cd-3-q4'],
  },
  {
    id: 'compound-interest-debt',
    name: 'Compound interest on debt',
    domain: 'debt',
    relatedQuestionIds: ['cd-4-q1', 'cd-4-q2', 'cd-4-q3'],
  },
  {
    id: 'minimum-payments',
    name: 'Minimum payment trap',
    domain: 'debt',
    relatedQuestionIds: ['cd-5-q1', 'cd-5-q2', 'cd-5-q3'],
  },
  {
    id: 'debt-avalanche',
    name: 'Debt avalanche method',
    domain: 'debt',
    relatedQuestionIds: ['cd-6-q1', 'cd-6-q2', 'cd-6-q3'],
  },
  {
    id: 'debt-snowball',
    name: 'Debt snowball method',
    domain: 'debt',
    relatedQuestionIds: ['cd-7-q1', 'cd-7-q2', 'cd-7-q3'],
  },
];

// =============================================================================
// CREDIT CONCEPTS
// =============================================================================

export const creditConcepts: ConceptTag[] = [
  {
    id: 'what-is-credit',
    name: 'What is credit',
    domain: 'credit',
    relatedQuestionIds: ['cd-8-q1', 'cd-8-q2', 'cd-8-q3'],
  },
  {
    id: 'credit-score',
    name: 'Credit score basics',
    domain: 'credit',
    relatedQuestionIds: ['cd-9-q1', 'cd-9-q2', 'cd-9-q3', 'cd-9-q4'],
  },
  {
    id: 'credit-utilization',
    name: 'Credit utilization ratio',
    domain: 'credit',
    relatedQuestionIds: ['cd-10-q1', 'cd-10-q2', 'cd-10-q3'],
  },
  {
    id: 'building-credit',
    name: 'Building credit history',
    domain: 'credit',
    relatedQuestionIds: ['cd-11-q1', 'cd-11-q2', 'cd-11-q3'],
  },
];

// =============================================================================
// ALL CONCEPTS - Combined lookup
// =============================================================================

export const allConcepts: ConceptTag[] = [
  ...budgetingConcepts,
  ...savingConcepts,
  ...debtConcepts,
  ...creditConcepts,
];

// Helper function to get concept by ID
export function getConceptById(conceptId: string): ConceptTag | undefined {
  return allConcepts.find(c => c.id === conceptId);
}

// Helper function to get concept for a question
export function getConceptForQuestion(questionId: string): ConceptTag | undefined {
  return allConcepts.find(c => c.relatedQuestionIds.includes(questionId));
}

// Helper function to get variant question IDs for a concept
export function getVariantQuestions(
  conceptId: string, 
  excludeQuestionId: string
): string[] {
  const concept = getConceptById(conceptId);
  if (!concept) return [];
  return concept.relatedQuestionIds.filter(id => id !== excludeQuestionId);
}

// Helper function to get all concepts for a domain
export function getConceptsForDomain(domain: SkillDomain): ConceptTag[] {
  return allConcepts.filter(c => c.domain === domain);
}
