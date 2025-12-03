import React from 'react';
import { View, StyleSheet, Image, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, Typography, BorderRadius } from '@/constants/theme';

interface FeatureItemProps {
  icon: keyof typeof Feather.glyphMap;
  iconColor: string;
  iconBackground: string;
  title: string;
  description: string;
}

function FeatureItem({ icon, iconColor, iconBackground, title, description }: FeatureItemProps) {
  const { theme } = useTheme();
  
  return (
    <View style={styles.featureItem}>
      <View style={[styles.featureIconContainer, { backgroundColor: iconBackground }]}>
        <Feather name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.featureTextContainer}>
        <ThemedText style={styles.featureTitle}>{title}</ThemedText>
        <ThemedText style={[styles.featureDescription, { color: theme.textSecondary }]}>
          {description}
        </ThemedText>
      </View>
    </View>
  );
}

export default function WelcomeScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const handleGetStarted = () => {
    navigation.navigate('Main' as never);
  };

  const handleLogIn = () => {
    navigation.navigate('Main' as never);
  };

  const features: FeatureItemProps[] = [
    {
      icon: 'target',
      iconColor: '#0891B2',
      iconBackground: '#ECFEFF',
      title: 'Personalized Learning',
      description: 'Content adapts to your financial situation and goals',
    },
    {
      icon: 'zap',
      iconColor: '#F59E0B',
      iconBackground: '#FEF3C7',
      title: 'Bite-sized Lessons',
      description: 'Learn in 5-10 minute sessions that fit your schedule',
    },
    {
      icon: 'trending-up',
      iconColor: '#10B981',
      iconBackground: '#D1FAE5',
      title: 'Real-World Challenges',
      description: 'Build better money habits with actionable tasks',
    },
  ];

  return (
    <View 
      style={[
        styles.container, 
        { 
          backgroundColor: theme.background,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        }
      ]}
    >
      <View style={styles.headerSection}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/images/quantara-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <ThemedText style={styles.title}>Quantara</ThemedText>
        <ThemedText style={[styles.tagline, { color: theme.textSecondary }]}>
          Your path to financial confidence starts here
        </ThemedText>
      </View>

      <View style={styles.featuresSection}>
        {features.map((feature, index) => (
          <FeatureItem key={index} {...feature} />
        ))}
      </View>

      <View style={styles.buttonSection}>
        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
          ]}
          onPress={handleGetStarted}
        >
          <ThemedText style={[styles.primaryButtonText, { color: theme.buttonText }]}>
            Get Started
          </ThemedText>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.secondaryButton,
            { 
              borderColor: theme.border, 
              backgroundColor: theme.background,
              opacity: pressed ? 0.7 : 1 
            },
          ]}
          onPress={handleLogIn}
        >
          <ThemedText style={styles.secondaryButtonText}>
            Log In
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'space-between',
  },
  headerSection: {
    alignItems: 'center',
    paddingTop: 80,
  },
  logoContainer: {
    width: 130,
    height: 130,
    marginBottom: Spacing.lg,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 38,
    fontWeight: '600',
    letterSpacing: -0.5,
    marginBottom: Spacing.sm,
  },
  tagline: {
    ...Typography.body,
    fontSize: 16,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 22,
  },
  featuresSection: {
    gap: Spacing.lg,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  featureIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureTextContainer: {
    flex: 1,
    paddingTop: 2,
  },
  featureTitle: {
    ...Typography.headline,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  featureDescription: {
    ...Typography.subhead,
    fontSize: 14,
    lineHeight: 20,
  },
  buttonSection: {
    gap: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  primaryButton: {
    height: 52,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    ...Typography.headline,
    fontSize: 17,
    fontWeight: '600',
  },
  secondaryButton: {
    height: 52,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
  },
  secondaryButtonText: {
    ...Typography.headline,
    fontSize: 17,
    fontWeight: '600',
  },
});
