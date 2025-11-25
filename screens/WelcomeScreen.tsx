import React from 'react';
import { View, StyleSheet, Image, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, Typography, BorderRadius } from '@/constants/theme';

export default function WelcomeScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const handleGetStarted = () => {
    navigation.navigate('Main' as never);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <View style={styles.hero}>
          <Image
            source={require('../assets/images/welcome-hero.png')}
            style={styles.heroImage}
            resizeMode="contain"
          />
        </View>

        <View style={styles.textContainer}>
          <ThemedText style={styles.title}>Quantara</ThemedText>
          <ThemedText style={[styles.tagline, { color: theme.textSecondary }]}>
            Adaptive financial coaching for your real life
          </ThemedText>
        </View>
      </View>

      <View style={[styles.buttonContainer, { paddingBottom: insets.bottom + Spacing.xl }]}>
        <Pressable
          style={[styles.primaryButton, { backgroundColor: theme.primary }]}
          onPress={handleGetStarted}
        >
          <ThemedText style={[styles.primaryButtonText, { color: theme.buttonText }]}>
            Get Started
          </ThemedText>
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={handleGetStarted}>
          <ThemedText style={[styles.secondaryButtonText, { color: theme.primary }]}>
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
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  hero: {
    marginBottom: Spacing['3xl'],
  },
  heroImage: {
    width: 320,
    height: 240,
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    ...Typography.largeTitle,
    marginBottom: Spacing.sm,
  },
  tagline: {
    ...Typography.body,
    textAlign: 'center',
    maxWidth: 280,
  },
  buttonContainer: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  primaryButton: {
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    ...Typography.headline,
  },
  secondaryButton: {
    height: Spacing.buttonHeight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    ...Typography.headline,
  },
});
