import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import SocialScreen from "@/screens/SocialScreen";
import { getCommonScreenOptions } from "@/navigation/screenOptions";
import { useTheme } from "@/hooks/useTheme";

export type SocialStackParamList = {
  Social: undefined;
};

const Stack = createNativeStackNavigator<SocialStackParamList>();

export default function SocialStackNavigator() {
  const { theme } = useTheme();

  return (
    <Stack.Navigator screenOptions={getCommonScreenOptions(theme)}>
      <Stack.Screen
        name="Social"
        component={SocialScreen}
        options={{ title: "Social" }}
      />
    </Stack.Navigator>
  );
}
