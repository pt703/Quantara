import React, { useState } from 'react';
import { View, StyleSheet, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { useAuthContext } from '@/context/AuthContext';
import { Spacing, BorderRadius } from '@/constants/theme';
import { SimpleKeyboardScrollView } from '@/components/SimpleKeyboardScrollView';

export default function LoginScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { signIn, isLoading } = useAuthContext();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setError('');
    const { error: authError } = await signIn(email.trim(), password);
    
    if (authError) {
      setError(authError.message);
    }
  };

  const handleGoToSignUp = () => {
    navigation.navigate('SignUp' as never);
  };

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword' as never);
  };

  return (
    <SimpleKeyboardScrollView
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
        <ThemedText style={styles.title}>Welcome back</ThemedText>
        <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
          Sign in to continue your financial journey
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
                placeholder="Enter your password"
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

          <Pressable onPress={handleForgotPassword} style={styles.forgotPassword}>
            <ThemedText style={[styles.forgotPasswordText, { color: theme.primary }]}>
              Forgot password?
            </ThemedText>
          </Pressable>
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <Pressable
          style={({ pressed }) => [
            styles.loginButton,
            { backgroundColor: theme.primary, opacity: pressed || isLoading ? 0.85 : 1 },
          ]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={theme.buttonText} />
          ) : (
            <ThemedText style={[styles.loginButtonText, { color: theme.buttonText }]}>
              Log In
            </ThemedText>
          )}
        </Pressable>

        <View style={styles.signUpRow}>
          <ThemedText style={[styles.signUpText, { color: theme.textSecondary }]}>
            Don't have an account?{' '}
          </ThemedText>
          <Pressable onPress={handleGoToSignUp}>
            <ThemedText style={[styles.signUpLink, { color: theme.primary }]}>Sign up</ThemedText>
          </Pressable>
        </View>
      </View>
    </SimpleKeyboardScrollView>
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
  forgotPassword: {
    alignSelf: 'flex-end',
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  loginButton: {
    height: 52,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
  signUpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signUpText: {
    fontSize: 15,
  },
  signUpLink: {
    fontSize: 15,
    fontWeight: '600',
  },
});
