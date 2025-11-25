import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LearnScreen from "@/screens/LearnScreen";
import ModuleDetailScreen from "@/screens/ModuleDetailScreen";
import LessonScreen from "@/screens/LessonScreen";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "@/navigation/screenOptions";

export type LearnStackParamList = {
  Learn: undefined;
  ModuleDetail: { moduleId: string };
  Lesson: { lessonId: string; moduleId: string };
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
    </Stack.Navigator>
  );
}
