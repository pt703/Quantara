import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ChallengesScreen from "@/screens/ChallengesScreen";
import ChallengeDetailScreen from "@/screens/ChallengeDetailScreen";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "@/navigation/screenOptions";

export type ChallengesStackParamList = {
  Challenges: undefined;
  ChallengeDetail: { challengeId: string };
};

const Stack = createNativeStackNavigator<ChallengesStackParamList>();

export default function ChallengesStackNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        ...getCommonScreenOptions({ theme, isDark }),
      }}
    >
      <Stack.Screen
        name="Challenges"
        component={ChallengesScreen}
        options={{ headerTitle: "Challenges" }}
      />
      <Stack.Screen
        name="ChallengeDetail"
        component={ChallengeDetailScreen}
        options={{ headerTitle: "Challenge" }}
      />
    </Stack.Navigator>
  );
}
