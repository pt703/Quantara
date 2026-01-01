import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import ProfileScreen from "@/screens/ProfileScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import AnalyticsScreen from "@/screens/AnalyticsScreen";
import FinancialEditScreen from "@/screens/FinancialEditScreen";
import SubscriptionManagerScreen from "@/screens/SubscriptionManagerScreen";
import DebtTrackerScreen from "@/screens/DebtTrackerScreen";
import PortfolioTrackerScreen from "@/screens/PortfolioTrackerScreen";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "@/navigation/screenOptions";

export type ProfileStackParamList = {
  Profile: undefined;
  Settings: undefined;
  Analytics: undefined;
  FinancialEdit: undefined;
  SubscriptionManager: undefined;
  DebtTracker: undefined;
  PortfolioTracker: undefined;
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileStackNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Stack.Navigator screenOptions={getCommonScreenOptions({ theme, isDark })}>
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: "Profile",
        }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: "Settings",
        }}
      />
      <Stack.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{
          title: "Analytics",
        }}
      />
      <Stack.Screen
        name="FinancialEdit"
        component={FinancialEditScreen}
        options={{
          title: "Edit Finances",
        }}
      />
      <Stack.Screen
        name="SubscriptionManager"
        component={SubscriptionManagerScreen}
        options={{
          title: "Subscriptions",
        }}
      />
      <Stack.Screen
        name="DebtTracker"
        component={DebtTrackerScreen}
        options={{
          title: "Debt Tracker",
        }}
      />
      <Stack.Screen
        name="PortfolioTracker"
        component={PortfolioTrackerScreen}
        options={{
          title: "Portfolio",
        }}
      />
    </Stack.Navigator>
  );
}
