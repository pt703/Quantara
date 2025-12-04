import React, { useState } from 'react';
import { View, StyleSheet, TextInput, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { useAuthContext } from '@/context/AuthContext';
import { Spacing, Typography, BorderRadius } from '@/constants/theme';
import { ScreenKeyboardAwareScrollView } from '@/components/ScreenKeyboardAwareScrollView';

export default function SignUpScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { signUp, isLoading } = useAuthContext();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSignUp = async () => {
    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setError('');
    const { error: authError } = await signUp(email.trim(), password);
    
    if (authError) {
      setError(authError.message);
    } else {
      setSuccess(true);
    }
  };

  const handleGoToLogin = () => {
    navigation.navigate('Login' as never);
  };

  if (success) {
    return (
      <View style={[styles.successContainer, { backgroundColor: theme.background }]}>
        <View style={[styles.successIcon, { backgroundColor: '#D1FAE5' }]}>
          <Feather name="check" size={40} color="#10B981" />
        </View>
        <ThemedText style={styles.successTitle}>Check your email</ThemedText>
        <ThemedText style={[styles.successText, { color: theme.textSecondary }]}>
          We've sent a confirmation link to {email}. Please verify your email to continue.
        </ThemedText>
        <Pressable
          style={[styles.loginButton, { backgroundColor: theme.primary }]}
          onPress={handleGoToLogin}
        >
          <ThemedText style={[styles.loginButtonText, { color: theme.buttonText }]}>
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
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
      </View>

      <View style={styles.content}>
        <ThemedText style={styles.title}>Create account</ThemedText>
        <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
          Start your journey to financial confidence
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

          <View style={styles.inputGroup}>
            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Password</ThemedText>
            <View style={[styles.inputContainer, { borderColor: theme.border, backgroundColor: theme.card }]}>
              <Feather name="lock" size={20} color={theme.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="Create a password"
                placeholderTextColor={theme.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                <Feather name={showPassword ? 'eye-off' : 'eye'} size={20} color={theme.textSecondary} />
              </Pressable>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Confirm Password</ThemedText>
            <View style={[styles.inputContainer, { borderColor: theme.border, backgroundColor: theme.card }]}>
              <Feather name="lock" size={20} color={theme.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="Confirm your password"
                placeholderTextColor={theme.textSecondary}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
            </View>
          </View>
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <Pressable
          style={({ pressed }) => [
            styles.signUpButton,
            { backgroundColor: theme.primary, opacity: pressed || isLoading ? 0.85 : 1 },
          ]}
          onPress={handleSignUp}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={theme.buttonText} />
          ) : (
            <ThemedText style={[styles.signUpButtonText, { color: theme.buttonText }]}>
              Create Account
            </ThemedText>
          )}
        </Pressable>

        <View style={styles.loginRow}>
          <ThemedText style={[styles.loginText, { color: theme.textSecondary }]}>
            Already have an account?{' '}
          </ThemedText>
          <Pressable onPress={handleGoToLogin}>
            <ThemedText style={[styles.loginLink, { color: theme.primary }]}>Log in</ThemedText>
          </Pressable>
        </View>
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
  backButton: {
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
  eyeButton: {
    padding: Spacing.xs,
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  signUpButton: {
    height: 52,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signUpButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    fontSize: 15,
  },
  loginLink: {
    fontSize: 15,
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
  loginButton: {
    height: 52,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  loginButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
});
