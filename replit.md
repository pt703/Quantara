# Overview

Quantara is an adaptive financial literacy learning application built with React Native and Expo. The app helps young adults build financial knowledge and better money habits through bite-sized lessons, interactive quizzes, behavioral challenges, and personalized recommendations. Users must sign in with Supabase authentication (email/password) to access the app. Sessions persist via AsyncStorage for seamless return visits.

The application provides a complete learning experience with modules covering budgeting, saving, debt management, and investments. Users can track their financial snapshot, manage subscriptions, complete challenges, compete on leaderboards, and monitor their learning progress through analytics.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

**Framework**: React Native (v0.81.5) with Expo (v54.0.23) and TypeScript

**Navigation Structure**:
- Root Navigator: Stack navigator managing onboarding and main app flows
- Welcome Screen: Entry point with guest-first onboarding
- Main Tab Navigator: Bottom tabs with 5 sections (Home, Learn, Challenges, Social, Profile)
- Stack Navigators: Each tab contains a nested stack for detail screens
- Navigation uses React Navigation v7 with native-stack and bottom-tabs

**UI Components**:
- Custom themed components (`ThemedView`, `ThemedText`) for consistent styling
- Reusable components: `Button`, `Card`, `ProgressBar`, `Spacer`
- Specialized scroll views: `ScreenScrollView`, `ScreenKeyboardAwareScrollView`, `ScreenFlatList`
- Platform-specific blur effects using `expo-blur` and `expo-glass-effect`
- Gesture handling via `react-native-gesture-handler` and `react-native-reanimated`

**Design System**:
- Theme constants define colors, typography, spacing, and border radius
- Light/dark mode support with automatic switching via `useColorScheme`
- Consistent spacing scale and typography hierarchy
- Safe area handling with `react-native-safe-area-context`
- Dynamic header and tab bar height calculations for proper content padding

**State Management**:
- React Hooks for local state
- Custom hooks for domain logic:
  - `useUserData`: Profile and financial snapshot management
  - `useLearningProgress`: Lesson completion tracking
  - `useChallengeProgress`: Challenge status tracking
  - `useStorage`: Generic AsyncStorage wrapper with automatic JSON serialization
  - `useTheme`: Theme and color scheme management
  - `useNotifications`: Push notification setup and management with settings persistence
    - Challenge reminders (24-hour repeating for in-progress challenges)
    - Challenge completion notifications
    - New content alerts
    - Settings persisted to AsyncStorage with Android notification channels
    - Web platform shows informational notice (notifications require mobile device)
  - `useAuth`: Supabase authentication with sign up, login, logout, password reset

**Authentication**:
- Supabase client configured in `lib/supabase.ts` with AsyncStorage for session persistence
- `AuthContext` provider wraps app with authentication state (`user`, `session`, `isAuthenticated`, `isLoading`)
- Auth functions: `signUp`, `signIn`, `signOut`, `resetPassword`
- Auth screens: `LoginScreen`, `SignUpScreen`, `ForgotPasswordScreen`
- Navigation gating: `RootNavigator` checks `isAuthenticated` to show auth screens or main app
- Profile screen displays user email and sign out button
- Environment variables required: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`

**Animations**:
- Reanimated v4 for performant animations
- Spring-based interactions for buttons and cards
- Gesture-driven navigation transitions

## Data Architecture

**Local Storage**:
- AsyncStorage for persistent data storage
- Mock data files in `/mock` directory:
  - `modules.ts`: Learning modules with lessons and quizzes
  - `challenges.ts`: Behavioral finance challenges
  - `recommendations.ts`: Personalized content suggestions
- Data structure defined in `/types/index.ts`

**Data Models**:
- `UserProfile`: Name, avatar selection
- `FinancialSnapshot`: Income, expenses, debt, savings goals, subscriptions
- `Module`: Learning modules containing lessons and quizzes
- `Lesson`: Content, quiz questions, completion status
- `Challenge`: Steps, category, progress tracking
- `Recommendation`: Linked content suggestions (lessons or challenges)

**Data Flow**:
- Custom hooks abstract AsyncStorage operations
- Automatic loading on component mount
- Optimistic updates with error handling
- JSON serialization/deserialization handled by storage layer

## Error Handling

**Error Boundary**:
- Class-based `ErrorBoundary` component wraps entire app
- `ErrorFallback` component displays errors with:
  - User-friendly error message
  - Restart app functionality
  - Development-only detailed stack trace modal
  - Error logging capability hook

## Platform Support

**Cross-Platform Targeting**:
- iOS, Android, and Web support configured
- Platform-specific conditional rendering (e.g., BlurView for iOS)
- Web fallbacks for native-only features (KeyboardAwareScrollView)
- Expo's new architecture enabled for React Native
- Edge-to-edge display on Android

**Performance Optimizations**:
- React Compiler experimental feature enabled
- Worklets for off-thread animations
- Memoization with useMemo and useCallback
- Efficient re-render patterns

# External Dependencies

## Core Framework
- **expo**: Cross-platform application framework and development tools
- **react-native**: Mobile application framework
- **react**: UI library with hooks and functional components

## Navigation
- **@react-navigation/native**: Navigation framework
- **@react-navigation/native-stack**: Native stack navigation
- **@react-navigation/bottom-tabs**: Bottom tab navigation
- **react-native-screens**: Native screen optimization
- **react-native-safe-area-context**: Safe area insets handling

## UI & Interactions
- **@expo/vector-icons**: Icon library (Feather icons)
- **react-native-gesture-handler**: Touch gesture system
- **react-native-reanimated**: High-performance animation library
- **react-native-keyboard-controller**: Keyboard behavior management
- **expo-blur**: Blur effect components
- **expo-glass-effect**: Glass morphism effects
- **expo-haptics**: Haptic feedback
- **expo-image**: Optimized image component

## Storage & Data
- **@react-native-async-storage/async-storage**: Persistent key-value storage for user data, progress, and settings
- **@supabase/supabase-js**: Supabase client for authentication and future backend integration

## Notifications
- **expo-notifications**: Local and push notifications system
- **expo-device**: Device information for notification targeting

## Utilities
- **expo-linking**: Deep linking and URL handling
- **expo-constants**: App constants and manifest access
- **expo-font**: Custom font loading
- **expo-splash-screen**: Splash screen management
- **expo-system-ui**: System UI styling
- **expo-web-browser**: In-app browser for authentication flows
- **react-native-worklets**: JavaScript runtime for animations

## Development Tools
- **TypeScript**: Static type checking
- **ESLint**: Code linting with Expo and Prettier configs
- **Prettier**: Code formatting
- **babel-plugin-module-resolver**: Path alias resolution (@/* imports)

## Future Integration Points
- OAuth providers (Apple, Google) for social sign-in via Supabase
- Backend API tables in Supabase for cloud sync of user data
- Reinforcement learning service for personalized recommendations
- Analytics service for user behavior tracking
- Real banking integrations for financial snapshot automation

installation of library