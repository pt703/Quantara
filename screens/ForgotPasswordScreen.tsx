import React, { useState } from 'react';
import { View, StyleSheet, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { useAuthContext } from '@/context/AuthContext';
import { Spacing, BorderRadius } from '@/constants/theme';
import { ScreenKeyboardAwareScrollView } from '@/components/ScreenKeyboardAwareScrollView';

export default function ForgotPasswordScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { resetPassword, isLoading } = useAuthContext();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async () => {
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }

    setError('');
    const { error: authError } = await resetPassword(email.trim());
    
    if (authError) {
      setError(authError.message);
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <View style={[styles.successContainer, { backgroundColor: theme.background }]}>
        <View style={[styles.successIcon, { backgroundColor: '#DBEAFE' }]}>
          <Feather name="mail" size={40} color="#2563EB" />
        </View>
        <ThemedText style={styles.successTitle}>Check your email</ThemedText>
        <ThemedText style={[styles.successText, { color: theme.textSecondary }]}>
          We've sent password reset instructions to {email}
        </ThemedText>
        <Pressable
          style={[styles.backButton, { backgroundColor: theme.primary }]}
          onPress={() => navigation.navigate('Login' as never)}
        >
          <ThemedText style={[styles.backButtonText, { color: theme.buttonText }]}>
            Back to Login
          </ThemedText>
        </Pressable>
      </View>
    );
  }

  return (
    <ScreenKeyboardAwareScrollView
      contentContainerStyle={styles.container}
    >
      <View style={styles.header}>
        <Pressable
          style={styles.headerBackButton}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
      </View>

      <View style={styles.content}>
        <ThemedText style={styles.title}>Reset password</ThemedText>
        <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
          Enter your email and we'll send you instructions to reset your password
        </ThemedText>

        {error ? (
          <View style={[styles.errorContainer, { backgroundColor: '#FEE2E2' }]}>
            <ThemedText style={[styles.errorText, { color: '#DC2626' }]}>{error}</ThemedText>
          </View>
        ) : null}

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Email</ThemedText>
            <View style={[styles.inputContainer, { borderColor: theme.border, backgroundColor: theme.card }]}>
              <Feather name="mail" size={20} color={theme.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="Enter your email"
                placeholderTextColor={theme.textSecondary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <Pressable
          style={({ pressed }) => [
            styles.resetButton,
            { backgroundColor: theme.primary, opacity: pressed || isLoading ? 0.85 : 1 },
          ]}
          onPress={handleResetPassword}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={theme.buttonText} />
          ) : (
            <ThemedText style={[styles.resetButtonText, { color: theme.buttonText }]}>
              Send Reset Link
            </ThemedText>
          )}
        </Pressable>
      </View>
    </ScreenKeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  headerBackButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: Spacing.xl,
    lineHeight: 24,
  },
  errorContainer: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  form: {
    gap: Spacing.lg,
  },
  inputGroup: {
    gap: Spacing.xs,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    height: 52,
    paddingHorizontal: Spacing.md,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  resetButton: {
    height: 52,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  successText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing['2xl'],
  },
  backButton: {
    height: 52,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  backButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
});
