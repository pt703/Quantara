// =============================================================================
// LEARN STACK NAVIGATOR
// =============================================================================
// Navigation stack for the Learn tab containing:
// - LearnScreen: Course overview with recommendations
// - CourseDetail: Individual course with lesson list
// - LessonPlayer: Gamified lesson experience
// =============================================================================

import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LearnScreen from "@/screens/LearnScreen";
import ModuleDetailScreen from "@/screens/ModuleDetailScreen";
import LessonScreen from "@/screens/LessonScreen";
import LessonPlayerScreen from "@/screens/LessonPlayerScreen";
import PreAssessmentScreen from "@/screens/PreAssessmentScreen";
import CourseDetailScreen from "@/screens/CourseDetailScreen";
import TestYourSkillScreen from "@/screens/TestYourSkillScreen";
import ReadingModuleScreen from "@/screens/ReadingModuleScreen";
import QuizModuleScreen from "@/screens/QuizModuleScreen";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "@/navigation/screenOptions";
import { ReadingModule, QuizModule } from "@/types";

// Define the params for each screen in this stack
export type LearnStackParamList = {
  Learn: undefined;
  ModuleDetail: { moduleId: string };
  Lesson: { lessonId: string; moduleId: string };
  // New course-based navigation
  CourseDetail: { courseId: string };
  LessonPlayer: { lessonId: string; courseId: string };
  // Pre-assessment for first-time course entry
  PreAssessment: { courseId: string };
  // Skill assessment
  TestYourSkill: undefined;
  // New module screens for Coursera-style structure
  // allModules array allows navigation to next module without going back
  ReadingModule: { 
    moduleId: string; 
    lessonId: string; 
    courseId: string; 
    moduleIndex: number; 
    totalModules: number;
    module: ReadingModule;
    allModules: (ReadingModule | QuizModule)[];
  };
  QuizModule: { 
    moduleId: string; 
    lessonId: string; 
    courseId: string; 
    moduleIndex: number; 
    totalModules: number;
    module: QuizModule;
    allModules: (ReadingModule | QuizModule)[];
  };
};

const Stack = createNativeStackNavigator<LearnStackParamList>();

export default function LearnStackNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        ...getCommonScreenOptions({ theme, isDark }),
      }}
    >
      <Stack.Screen
        name="Learn"
        component={LearnScreen}
        options={{ headerTitle: "Learn" }}
      />
      <Stack.Screen
        name="ModuleDetail"
        component={ModuleDetailScreen}
        options={{ headerTitle: "Module" }}
      />
      <Stack.Screen
        name="Lesson"
        component={LessonScreen}
        options={{ headerTitle: "Lesson" }}
      />
      {/* New gamified lesson player */}
      <Stack.Screen
        name="LessonPlayer"
        component={LessonPlayerScreen}
        options={{ 
          headerShown: false, // Custom header inside screen
          presentation: 'card', // Use card for proper back navigation
          gestureEnabled: true, // Enable swipe back gesture
        }}
      />
      {/* Pre-assessment for first-time course entry */}
      <Stack.Screen
        name="PreAssessment"
        component={PreAssessmentScreen}
        options={{ 
          headerShown: false,
          presentation: 'card',
          gestureEnabled: false, // Don't allow back during assessment
        }}
      />
      {/* Course detail showing lessons with modules */}
      <Stack.Screen
        name="CourseDetail"
        component={CourseDetailScreen}
        options={{ 
          headerShown: false,
          presentation: 'card',
          gestureEnabled: true,
        }}
      />
      {/* Test Your Skill assessment */}
      <Stack.Screen
        name="TestYourSkill"
        component={TestYourSkillScreen}
        options={{ 
          headerShown: false,
          presentation: 'card',
          gestureEnabled: true,
        }}
      />
      {/* Reading module with Mark as Complete */}
      <Stack.Screen
        name="ReadingModule"
        component={ReadingModuleScreen}
        options={{ 
          headerShown: false,
          presentation: 'card',
          gestureEnabled: true,
        }}
      />
      {/* Quiz module with penalty questions */}
      <Stack.Screen
        name="QuizModule"
        component={QuizModuleScreen}
        options={{ 
          headerShown: false,
          presentation: 'card',
          gestureEnabled: false, // Cannot leave until complete
        }}
      />
    </Stack.Navigator>
  );
}
