import React from 'react';
import { View, StyleSheet, Image, Pressable, LinearGradient } from 'react-native';
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
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/images/app-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <Spacer height={Spacing.xl} />

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
            Master your finances through adaptive learning
          </ThemedText>
        </View>
      </View>

      <View style={[styles.buttonContainer, { paddingBottom: insets.bottom + Spacing.xl }]}>
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
            { borderColor: theme.primary, opacity: pressed ? 0.7 : 1 },
          ]}
          onPress={handleGetStarted}
        >
          <ThemedText style={[styles.secondaryButtonText, { color: theme.primary }]}>
            Log In
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

function Spacer({ height }: { height: number }) {
  return <View style={{ height }} />;
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
  logoContainer: {
    width: 100,
    height: 100,
    marginBottom: Spacing.lg,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  hero: {
    marginBottom: Spacing['2xl'],
    width: '100%',
    aspectRatio: 4 / 3,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  title: {
    ...Typography.largeTitle,
    marginBottom: Spacing.sm,
  },
  tagline: {
    ...Typography.body,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 24,
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
    fontWeight: '600',
  },
  secondaryButton: {
    height: Spacing.buttonHeight,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
  },
  secondaryButtonText: {
    ...Typography.headline,
    fontWeight: '600',
  },
});
