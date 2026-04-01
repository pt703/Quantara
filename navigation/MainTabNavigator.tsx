import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import HomeStackNavigator from "@/navigation/HomeStackNavigator";
import LearnStackNavigator from "@/navigation/LearnStackNavigator";
import ChallengesStackNavigator from "@/navigation/ChallengesStackNavigator";
import SocialStackNavigator from "@/navigation/SocialStackNavigator";
import ProfileStackNavigator from "@/navigation/ProfileStackNavigator";
import { useTheme } from "@/hooks/useTheme";

export type MainTabParamList = {
  HomeTab: undefined;
  LearnTab: undefined;
  ChallengesTab: undefined;
  SocialTab: undefined;
  ProfileTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

type TabIconProps = {
  name: keyof typeof Feather.glyphMap;
  label: string;
  color: string;
  focused: boolean;
  size: number;
  primaryColor: string;
};

function TabIcon({ name, label, color, focused, size, primaryColor }: TabIconProps) {
  return (
    <View style={styles.tabItem}>
      <View style={[styles.tabIconBg, focused && { backgroundColor: primaryColor + '18' }]}>
        <Feather name={name} size={size} color={color} />
      </View>
      <Text numberOfLines={1} style={[styles.tabLabel, { color, fontWeight: focused ? '700' : '500' }]}>
        {label}
      </Text>
    </View>
  );
}

export default function MainTabNavigator() {
  const { theme, isDark } = useTheme();

  const makeTabOptions = (label: string, iconName: keyof typeof Feather.glyphMap) => ({
    tabBarShowLabel: false,
    tabBarIcon: ({ color, focused, size }: { color: string; focused: boolean; size: number }) => (
      <TabIcon
        name={iconName}
        label={label}
        color={color}
        focused={focused}
        size={size}
        primaryColor={theme.primary}
      />
    ),
    listeners: {
      tabPress: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
    },
  });

  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      screenOptions={{
        tabBarActiveTintColor: theme.tabIconSelected,
        tabBarInactiveTintColor: theme.tabIconDefault,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: Platform.select({
            ios: "transparent",
            android: theme.backgroundRoot,
          }),
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          shadowRadius: 0,
          height: 76,
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : null,
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={makeTabOptions("Home", "home")}
      />
      <Tab.Screen
        name="LearnTab"
        component={LearnStackNavigator}
        options={makeTabOptions("Learn", "book-open")}
      />
      <Tab.Screen
        name="ChallengesTab"
        component={ChallengesStackNavigator}
        options={makeTabOptions("Goals", "target")}
      />
      <Tab.Screen
        name="SocialTab"
        component={SocialStackNavigator}
        options={makeTabOptions("Social", "users")}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackNavigator}
        options={makeTabOptions("Profile", "user")}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    marginTop: 8,
  },
  tabIconBg: {
    width: 44,
    height: 32,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  tabLabel: {
    fontSize: 10,
    letterSpacing: 0.1,
    maxWidth: 56,
    textAlign: 'center',
  },
});
