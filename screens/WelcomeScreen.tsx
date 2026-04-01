import React, { useEffect } from 'react';
import { View, StyleSheet, Image, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, Typography, BorderRadius } from '@/constants/theme';

interface FeatureItemProps {
  icon: keyof typeof Feather.glyphMap;
  iconColor: string;
  iconBackground: string;
  title: string;
  description: string;
  delay: number;
}

function FeatureItem({ icon, iconColor, iconBackground, title, description, delay }: FeatureItemProps) {
  const { theme } = useTheme();
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(-16);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 500 }));
    translateX.value = withDelay(delay, withTiming(0, { duration: 500 }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Animated.View style={[styles.featureItem, animStyle]}>
      <View style={[styles.featureIconContainer, { backgroundColor: iconBackground }]}>
        <Feather name={icon} size={22} color={iconColor} />
      </View>
      <View style={styles.featureTextContainer}>
        <ThemedText style={styles.featureTitle}>{title}</ThemedText>
        <ThemedText style={[styles.featureDescription, { color: theme.textSecondary }]}>
          {description}
        </ThemedText>
      </View>
    </Animated.View>
  );
}

export default function WelcomeScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();

  // Staggered entrance animations
  const logoOpacity = useSharedValue(0);
  const logoSlide = useSharedValue(24);
  const titleOpacity = useSharedValue(0);
  const titleSlide = useSharedValue(16);
  const buttonsOpacity = useSharedValue(0);
  const buttonsSlide = useSharedValue(16);

  useEffect(() => {
    logoOpacity.value = withDelay(0, withTiming(1, { duration: 600 }));
    logoSlide.value = withDelay(0, withTiming(0, { duration: 600 }));
    titleOpacity.value = withDelay(200, withTiming(1, { duration: 500 }));
    titleSlide.value = withDelay(200, withTiming(0, { duration: 500 }));
    buttonsOpacity.value = withDelay(600, withTiming(1, { duration: 500 }));
    buttonsSlide.value = withDelay(600, withTiming(0, { duration: 500 }));
  }, []);

  const logoAnimStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ translateY: logoSlide.value }],
  }));

  const titleAnimStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleSlide.value }],
  }));

  const buttonsAnimStyle = useAnimatedStyle(() => ({
    opacity: buttonsOpacity.value,
    transform: [{ translateY: buttonsSlide.value }],
  }));

  const features: Omit<FeatureItemProps, 'delay'>[] = [
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
    <LinearGradient
      colors={isDark
        ? ['#1E3A5F', '#1A2942', '#111827']
        : ['#DBEAFE', '#EFF6FF', '#FFFFFF']}
      locations={[0, 0.4, 1]}
      style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
    >
      {/* Logo + Title */}
      <Animated.View style={[styles.headerSection, logoAnimStyle]}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/images/quantara-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
      </Animated.View>

      <Animated.View style={[styles.titleSection, titleAnimStyle]}>
        <ThemedText style={styles.title}>Quantara</ThemedText>
        <ThemedText style={[styles.tagline, { color: theme.textSecondary }]}>
          Your path to financial confidence starts here
        </ThemedText>
      </Animated.View>

      {/* Features */}
      <View style={styles.featuresSection}>
        {features.map((feature, index) => (
          <FeatureItem key={index} {...feature} delay={350 + index * 100} />
        ))}
      </View>

      {/* Buttons */}
      <Animated.View style={[styles.buttonSection, buttonsAnimStyle]}>
        <Pressable
          style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
          onPress={() => navigation.navigate('SignUp' as never)}
        >
          <LinearGradient
            colors={['#3B82F6', '#1E40AF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.primaryButton}
          >
            <ThemedText style={styles.primaryButtonText}>Get Started</ThemedText>
            <Feather name="arrow-right" size={18} color="#FFFFFF" style={{ marginLeft: Spacing.sm }} />
          </LinearGradient>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.secondaryButton,
            {
              borderColor: isDark ? 'rgba(255,255,255,0.2)' : theme.border,
              backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.8)',
              opacity: pressed ? 0.7 : 1,
            },
          ]}
          onPress={() => navigation.navigate('Login' as never)}
        >
          <ThemedText style={[styles.secondaryButtonText, { color: theme.text }]}>
            Log In
          </ThemedText>
        </Pressable>
      </Animated.View>
    </LinearGradient>
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
    paddingTop: 60,
  },
  titleSection: {
    alignItems: 'center',
    marginTop: -Spacing.lg,
  },
  logoContainer: {
    width: 120,
    height: 120,
    marginBottom: Spacing.lg,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1,
    marginBottom: Spacing.sm,
  },
  tagline: {
    ...Typography.body,
    fontSize: 16,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 24,
  },
  featuresSection: {
    gap: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    ...Typography.headline,
    fontSize: 16,
    fontWeight: '700',
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
    height: 54,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  primaryButtonText: {
    ...Typography.headline,
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryButton: {
    height: 54,
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
