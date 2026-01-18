import React, { useState } from 'react';
import { StyleSheet, Switch, Pressable, TextInput, Linking, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { ScreenKeyboardAwareScrollView } from '@/components/ScreenKeyboardAwareScrollView';
import Spacer from '@/components/Spacer';
import { useTheme } from '@/hooks/useTheme';
import { useAI } from '@/hooks/useAI';
import { Spacing, Typography, BorderRadius } from '@/constants/theme';

export default function AISettingsScreen() {
  const { theme } = useTheme();
  const { isConfigured, isEnabled, isLoading, error, configureApiKey, setEnabled, clearApiKey } = useAI();
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) return;
    
    setIsSaving(true);
    const success = await configureApiKey(apiKey.trim());
    if (success) {
      setApiKey('');
    }
    setIsSaving(false);
  };

  const handleClearApiKey = async () => {
    await clearApiKey();
    setApiKey('');
  };

  const openGeminiConsole = () => {
    Linking.openURL('https://aistudio.google.com/app/apikey');
  };

  return (
    <ScreenKeyboardAwareScrollView>
      <Spacer height={Spacing.lg} />
      
      <ThemedView style={[styles.card, { backgroundColor: theme.card }]}>
        <ThemedView style={styles.cardHeader}>
          <Feather name="cpu" size={24} color={theme.primary} />
          <ThemedText style={styles.cardTitle}>AI-Powered Learning</ThemedText>
        </ThemedView>
        
        <ThemedText style={[styles.description, { color: theme.textSecondary }]}>
          Enable AI features to get personalized quiz questions based on your financial situation, 
          adaptive feedback, and custom insights tailored just for you.
        </ThemedText>
      </ThemedView>

      <Spacer height={Spacing.lg} />

      <ThemedView style={[styles.card, { backgroundColor: theme.card }]}>
        <ThemedText style={styles.sectionTitle}>API Configuration</ThemedText>
        
        {isConfigured ? (
          <>
            <ThemedView style={[styles.statusRow, { backgroundColor: theme.success + '20' }]}>
              <Feather name="check-circle" size={20} color={theme.success} />
              <ThemedText style={[styles.statusText, { color: theme.success }]}>
                Gemini API Connected
              </ThemedText>
            </ThemedView>

            <Spacer height={Spacing.md} />

            <ThemedView style={styles.toggleRow}>
              <ThemedView style={styles.toggleLabel}>
                <ThemedText style={styles.toggleTitle}>Enable AI Features</ThemedText>
                <ThemedText style={[styles.toggleDescription, { color: theme.textSecondary }]}>
                  Generate personalized questions and insights
                </ThemedText>
              </ThemedView>
              <Switch
                value={isEnabled}
                onValueChange={setEnabled}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor="#FFFFFF"
              />
            </ThemedView>

            <Spacer height={Spacing.lg} />

            <Pressable
              style={[styles.dangerButton, { borderColor: theme.error }]}
              onPress={handleClearApiKey}
            >
              <Feather name="trash-2" size={18} color={theme.error} />
              <ThemedText style={[styles.dangerButtonText, { color: theme.error }]}>
                Remove API Key
              </ThemedText>
            </Pressable>
          </>
        ) : (
          <>
            <ThemedText style={[styles.description, { color: theme.textSecondary }]}>
              Enter your Google Gemini API key to enable AI features. The free tier includes 
              60 requests per minute - plenty for personalized learning!
            </ThemedText>

            <Spacer height={Spacing.md} />

            <Pressable style={[styles.linkButton, { borderColor: theme.primary }]} onPress={openGeminiConsole}>
              <Feather name="external-link" size={16} color={theme.primary} />
              <ThemedText style={[styles.linkButtonText, { color: theme.primary }]}>
                Get Free API Key from Google AI Studio
              </ThemedText>
            </Pressable>

            <Spacer height={Spacing.lg} />

            <ThemedView style={styles.inputContainer}>
              <TextInput
                style={[
                  styles.input,
                  { 
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                    color: theme.text,
                  }
                ]}
                placeholder="Enter your Gemini API key"
                placeholderTextColor={theme.textSecondary}
                value={apiKey}
                onChangeText={setApiKey}
                secureTextEntry={!showKey}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable
                style={styles.eyeButton}
                onPress={() => setShowKey(!showKey)}
              >
                <Feather 
                  name={showKey ? "eye-off" : "eye"} 
                  size={20} 
                  color={theme.textSecondary} 
                />
              </Pressable>
            </ThemedView>

            {error ? (
              <>
                <Spacer height={Spacing.sm} />
                <ThemedText style={[styles.errorText, { color: theme.error }]}>
                  {error}
                </ThemedText>
              </>
            ) : null}

            <Spacer height={Spacing.md} />

            <Pressable
              style={[
                styles.saveButton,
                { 
                  backgroundColor: apiKey.trim() ? theme.primary : theme.border,
                  opacity: isSaving ? 0.7 : 1,
                }
              ]}
              onPress={handleSaveApiKey}
              disabled={!apiKey.trim() || isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Feather name="save" size={18} color="#FFFFFF" />
                  <ThemedText style={styles.saveButtonText}>Save API Key</ThemedText>
                </>
              )}
            </Pressable>
          </>
        )}
      </ThemedView>

      <Spacer height={Spacing.lg} />

      <ThemedView style={[styles.card, { backgroundColor: theme.card }]}>
        <ThemedText style={styles.sectionTitle}>What AI Features Include</ThemedText>
        <Spacer height={Spacing.sm} />
        
        <ThemedView style={styles.featureRow}>
          <Feather name="help-circle" size={18} color={theme.primary} />
          <ThemedView style={styles.featureContent}>
            <ThemedText style={styles.featureTitle}>Personalized Questions</ThemedText>
            <ThemedText style={[styles.featureDescription, { color: theme.textSecondary }]}>
              Quiz questions use YOUR actual income, expenses, and savings goals
            </ThemedText>
          </ThemedView>
        </ThemedView>

        <Spacer height={Spacing.md} />

        <ThemedView style={styles.featureRow}>
          <Feather name="trending-up" size={18} color={theme.primary} />
          <ThemedView style={styles.featureContent}>
            <ThemedText style={styles.featureTitle}>Adaptive Difficulty</ThemedText>
            <ThemedText style={[styles.featureDescription, { color: theme.textSecondary }]}>
              Questions get easier or harder based on your performance
            </ThemedText>
          </ThemedView>
        </ThemedView>

        <Spacer height={Spacing.md} />

        <ThemedView style={styles.featureRow}>
          <Feather name="message-circle" size={18} color={theme.primary} />
          <ThemedView style={styles.featureContent}>
            <ThemedText style={styles.featureTitle}>Smart Feedback</ThemedText>
            <ThemedText style={[styles.featureDescription, { color: theme.textSecondary }]}>
              Get personalized explanations when you answer questions
            </ThemedText>
          </ThemedView>
        </ThemedView>

        <Spacer height={Spacing.md} />

        <ThemedView style={styles.featureRow}>
          <Feather name="zap" size={18} color={theme.primary} />
          <ThemedView style={styles.featureContent}>
            <ThemedText style={styles.featureTitle}>Custom Insights</ThemedText>
            <ThemedText style={[styles.featureDescription, { color: theme.textSecondary }]}>
              See why each lesson matters for YOUR financial situation
            </ThemedText>
          </ThemedView>
        </ThemedView>
      </ThemedView>

      <Spacer height={Spacing.lg} />

      <ThemedView style={[styles.card, { backgroundColor: theme.card }]}>
        <ThemedView style={styles.infoRow}>
          <Feather name="shield" size={18} color={theme.textSecondary} />
          <ThemedText style={[styles.infoText, { color: theme.textSecondary }]}>
            Your API key is stored securely on your device and never shared. 
            Financial data is only sent to generate personalized content.
          </ThemedText>
        </ThemedView>
      </ThemedView>

      <Spacer height={Spacing.xl} />
    </ScreenKeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  cardTitle: {
    ...Typography.title,
    fontWeight: '600',
  },
  sectionTitle: {
    ...Typography.headline,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  description: {
    ...Typography.body,
    lineHeight: 22,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  statusText: {
    ...Typography.body,
    fontWeight: '500',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: {
    flex: 1,
    marginRight: Spacing.md,
  },
  toggleTitle: {
    ...Typography.body,
    fontWeight: '500',
  },
  toggleDescription: {
    ...Typography.caption,
    marginTop: 2,
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    ...Typography.body,
    padding: Spacing.md,
    paddingRight: 50,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  eyeButton: {
    position: 'absolute',
    right: Spacing.md,
    top: '50%',
    transform: [{ translateY: -10 }],
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  linkButtonText: {
    ...Typography.body,
    fontWeight: '500',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    minHeight: 48,
  },
  saveButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  dangerButtonText: {
    ...Typography.body,
    fontWeight: '500',
  },
  errorText: {
    ...Typography.caption,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    ...Typography.body,
    fontWeight: '500',
  },
  featureDescription: {
    ...Typography.caption,
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  infoText: {
    ...Typography.caption,
    flex: 1,
    lineHeight: 18,
  },
});
