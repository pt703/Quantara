# Quantara - Adaptive Financial Literacy App

An adaptive financial literacy learning application built with React Native and Expo. Quantara helps young adults build financial knowledge and better money habits through bite-sized lessons, interactive quizzes, behavioral challenges, and personalized recommendations.

## Features

- **Coursera-Style Learning Structure**: Course > Lesson (11 lessons) > Module (4 modules: 3 reading + 1 quiz)
- **Mastery-Based Progression**: Blocks advancement until concepts are mastered (80% threshold)
- **Adaptive Learning**: Wrong answers feed into lesson quizzes with variant questions for remediation
- **Test Your Skill Assessment**: Standalone 10-question assessment across all domains with XP rewards
- **Gamification**: Hearts system, XP rewards, streaks, and leaderboards
- **Financial Snapshot**: Track income, expenses, debt, savings goals, and subscriptions
- **Supabase Authentication**: Email/password sign-up and login with session persistence

## Tech Stack

- **Framework**: React Native 0.81.5 with Expo 54
- **Navigation**: React Navigation 7 (native-stack, bottom-tabs)
- **Authentication**: Supabase
- **Storage**: AsyncStorage for local data persistence
- **Animations**: React Native Reanimated 4
- **UI**: iOS 26 Liquid Glass design with expo-blur and expo-glass-effect

## Project Structure
├── app/ # App entry point
├── components/ # Reusable UI components
├── constants/ # Theme, colors, spacing
├── contexts/ # React contexts (Auth, Theme)
├── hooks/ # Custom hooks
│ ├── useAuth.ts # Authentication hook
│ ├── useUserData.ts # Profile & financial data
│ ├── useLearningProgress.ts # Lesson completion tracking
│ ├── useModuleProgress.ts # Module-level progress
│ ├── useWrongAnswerRegistry.ts # Tracks missed concepts for remediation
│ └── useChallengeProgress.ts # Challenge status
├── lib/ # External service configs (Supabase)
├── mock/ # Mock data
│ ├── courses.ts # Learning content with lessons/modules
│ ├── conceptTags.ts # Question variants for adaptive learning
│ └── challenges.ts # Behavioral challenges
├── navigation/ # React Navigation setup
├── screens/ # Screen components
└── types/ # TypeScript type definition

## Environment Variables
Create a `.env` file with:
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

## Getting Started
1. Install dependencies:
   ```bash
   npm install
Start the development server:
npx expo start
Scan the QR code with Expo Go app on your device
Key Concepts
Wrong Answer Registry
Tracks questions users get wrong during assessments. When a user misses a concept in "Test Your Skill", variant questions appear in the relevant lesson quizzes for extra practice.

# Use Git
1. clone repo
2. git add . , git commit -m "what i worked on", git push origin main, 
3. git pull --rebase origin main (dont forget npm install after pulling)
4. check status: Git status, git log -1 
5. (do this once git config --global pull.rebase true)
 

Module Progress & Gating
Each lesson has 4 modules (3 reading + 1 quiz). Users must achieve 80% mastery on quiz modules before advancing. Progress is tracked per-module with completion status and mastery scores.

Concept Tags
Links related questions together. When a user struggles with a concept, the system can surface alternative questions testing the same concept from different angles.

License
Private - All rights reserved
