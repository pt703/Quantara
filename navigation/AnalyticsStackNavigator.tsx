import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AnalyticsScreen from "@/screens/AnalyticsScreen";
import { getCommonScreenOptions } from "@/navigation/screenOptions";
import { useTheme } from "@/hooks/useTheme";

export type AnalyticsStackParamList = {
  Analytics: undefined;
};

const Stack = createNativeStackNavigator<AnalyticsStackParamList>();

export default function AnalyticsStackNavigator() {
  const { theme } = useTheme();

  return (
    <Stack.Navigator screenOptions={getCommonScreenOptions(theme)}>
      <Stack.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{ title: "Analytics" }}
      />
    </Stack.Navigator>
  );
}
