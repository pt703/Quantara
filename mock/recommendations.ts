import { Recommendation } from '../types';

export const recommendations: Recommendation[] = [
  {
    id: 'rec-1',
    title: 'Student Loans Basics',
    kind: 'lesson',
    shortDescription: 'Learn how student loans work and create a repayment strategy',
    linkedId: 'lesson-2-1',
  },
  {
    id: 'rec-2',
    title: 'Cancel one unused subscription',
    kind: 'challenge',
    shortDescription: 'Save money by cutting services you no longer use',
    linkedId: 'challenge-2',
  },
  {
    id: 'rec-3',
    title: 'Understanding Interest Rates',
    kind: 'lesson',
    shortDescription: 'Master the math behind loans and savings to make better decisions',
    linkedId: 'lesson-2-2',
  },
];
