# Quantara — Adaptive Financial Literacy App

Quantara is a mobile-first financial literacy app built with React Native and Expo. It helps young adults build financial knowledge through adaptive lessons, AI-powered quizzes, behavioral challenges, and personalized recommendations.

---

## Features

- **Coursera-Style Learning** — Course → Lesson → Module structure (3 reading + 1 quiz per lesson)
- **Mastery-Based Progression** — Users must achieve 80% on quiz modules before advancing
- **Adaptive Quiz Engine** — Hard-first questioning with penalty cascades for missed concepts
- **Contextual Bandit Recommendations** — LinUCB algorithm personalizes lesson order based on skill profile
- **AI Question Generation** — Gemini generates quiz questions contextualized to the user's finances
- **AI Financial Coach** — Chat-based financial advisor powered by Gemini
- **Gamification** — Hearts, XP, streaks, level system, and 19 achievement badges
- **Financial Snapshot** — Track income, expenses, debts, subscriptions, and portfolio
- **Behavioral Challenges** — Real-world money habit challenges (e.g., cancel a subscription, track spending)
- **Supabase Backend** — Email/password auth, Google OAuth, and cloud sync for progress

---

## Tech Stack

| Category | Technology |
|---|---|
| Framework | React Native 0.81.5, Expo 54 |
| Language | TypeScript |
| Navigation | React Navigation 7 (native-stack, bottom-tabs) |
| Authentication | Supabase |
| AI / ML | Google Gemini API, LinUCB Contextual Bandit |
| Storage | AsyncStorage (local), Supabase (cloud sync) |
| Animations | React Native Reanimated 4 |
| UI | iOS 26 Liquid Glass (expo-blur, expo-glass-effect) |
| Notifications | expo-notifications |

---

## Project Structure

```
├── App.tsx                    # App entry point with providers
├── app.json                   # Expo configuration
│
├── assets/                    # Images and icons
│
├── components/                # Reusable UI components
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Confetti.tsx
│   ├── MarkdownText.tsx
│   ├── PortfolioPieChart.tsx
│   ├── ProgressBar.tsx
│   ├── QuestionTypes.tsx      # Renders all question formats (MCQ, T/F, etc.)
│   ├── ScreenScrollView.tsx
│   ├── ThemedText.tsx
│   └── ThemedView.tsx
│
├── constants/
│   └── theme.ts               # Colors, spacing, typography
│
├── context/
│   ├── AuthContext.tsx         # Auth state + Supabase methods
│   └── UserDataContext.tsx     # User profile + financial snapshot
│
├── hooks/                     # Custom React hooks
│   ├── useGamification.ts     # Hearts, XP, streaks, levels
│   ├── useModuleProgress.ts   # Module completion + mastery gating
│   ├── useLearningProgress.ts # Lesson-level progress
│   ├── useAdaptiveLearning.ts # Skill tracking + bandit integration
│   ├── useAdaptiveRecommendations.ts
│   ├── useContextualBandit.ts # LinUCB hook
│   ├── useAIQuestions.ts      # AI question generation
│   ├── useWrongAnswerRegistry.ts
│   ├── useSkillAccuracy.ts
│   ├── useBadges.ts
│   ├── useCourseCertificates.ts
│   ├── useNotifications.ts
│   └── useUserData.ts
│
├── lib/
│   ├── gemini.ts              # Gemini API client
│   └── supabase.ts            # Supabase client
│
├── mock/
│   ├── courses.ts             # Curriculum: 3 courses × 11 lessons × 4 modules
│   ├── conceptTags.ts         # Concept → question variant mapping
│   ├── challenges.ts          # 8 behavioral challenges
│   ├── badges.ts              # 19 achievement badges
│   └── recommendations.ts
│
├── navigation/
│   ├── RootNavigator.tsx      # Auth vs. main navigation switch
│   ├── MainTabNavigator.tsx   # Bottom tab bar (5 tabs)
│   ├── HomeStackNavigator.tsx
│   ├── LearnStackNavigator.tsx
│   ├── ChallengesStackNavigator.tsx
│   ├── SocialStackNavigator.tsx
│   └── ProfileStackNavigator.tsx
│
├── screens/                   # All screen components
│   ├── WelcomeScreen.tsx
│   ├── LoginScreen.tsx
│   ├── SignUpScreen.tsx
│   ├── HomeScreen.tsx
│   ├── LearnScreen.tsx
│   ├── CourseDetailScreen.tsx
│   ├── LessonPlayerScreen.tsx
│   ├── ReadingModuleScreen.tsx
│   ├── QuizModuleScreen.tsx
│   ├── TestYourSkillScreen.tsx
│   ├── ChallengesScreen.tsx
│   ├── AnalyticsScreen.tsx
│   ├── AIFinancialCoachScreen.tsx
│   ├── FinancialEditScreen.tsx
│   ├── DebtTrackerScreen.tsx
│   ├── PortfolioTrackerScreen.tsx
│   ├── SubscriptionManagerScreen.tsx
│   ├── ProfileScreen.tsx
│   ├── NotificationSettingsScreen.tsx
│   └── SocialScreen.tsx
│
├── services/
│   ├── ContextualBandit.ts    # LinUCB algorithm implementation
│   ├── aiQuestionService.ts   # Gemini question generation + rate limiting
│   ├── aiCoachService.ts      # Gemini financial coach chat
│   └── supabaseDataService.ts # Cloud sync operations
│
└── types/
    └── index.ts               # All TypeScript type definitions
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- [Expo Go](https://expo.dev/client) on your iOS or Android device

### Installation

1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd Quantara
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```

4. Fill in your environment variables (see [Environment Variables](#environment-variables)).

5. Start the development server:
   ```bash
   npx expo start
   ```

6. Scan the QR code with Expo Go on your device.

---

## Environment Variables

Create a `.env` file in the project root:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
EXPO_PUBLIC_USE_LEGACY_CURRICULUM=false
```

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous public key |
| `EXPO_PUBLIC_GEMINI_API_KEY` | Google Gemini API key for AI features |
| `EXPO_PUBLIC_USE_LEGACY_CURRICULUM` | Set to `true` to use the legacy compact course data |

---

## Key Concepts

### Learning Structure

Each course follows a Coursera-style hierarchy:

```
Course
└── Lesson (11 per course)
    ├── Reading Module 1
    ├── Reading Module 2
    ├── Reading Module 3
    └── Quiz Module (mastery-gated)
```

### Adaptive Quiz Engine

The quiz system uses a **hard-first approach** with penalty cascades:

1. Each quiz covers 4 concepts, each with 3 difficulty tiers (Easy → Medium → Hard)
2. The user is shown the **Hard** question first for each concept
3. **Correct** → move to next concept (efficient path)
4. **Incorrect** → trigger penalty cascade: Easy → Medium → Hard
5. Users must demonstrate mastery on all 4 concepts (≥80%) to pass

### Contextual Bandit Recommendations

Lesson recommendations use the **LinUCB algorithm**, which balances exploration and exploitation. The feature vector includes:

- Skill levels across 5 domains (budgeting, saving, debt, investing, credit)
- Current streak and engagement patterns
- Time of day and session number
- Last lesson difficulty and performance

### Wrong Answer Registry

When a user misses a concept, it's recorded and surfaced as a variant question in subsequent lessons. Questions are linked by `conceptId` — the same concept is tested from a different angle to reinforce retention.

### Gamification

| Element | Details |
|---|---|
| Hearts | 0–10, earned through learning |
| XP | 1,000 XP per level |
| Streaks | Consecutive daily activity; streak bonuses up to 2× XP multiplier |
| Badges | 19 achievements across learning, streak, mastery, and special categories |

---

## Database Setup

The database schema is in `supabase-setup.sql`. Run this in your Supabase SQL editor to set up the required tables for user profiles, progress sync, gamification state, and analytics.

---

## Scripts

```bash
npm start              # Start Expo dev server
npm run android        # Start on Android
npm run ios            # Start on iOS
npm run web            # Start on Web
npm run lint           # Run ESLint
npm run format         # Format code with Prettier
```

---

## License

Private — All rights reserved.
