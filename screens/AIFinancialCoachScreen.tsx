import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import Spacer from '@/components/Spacer';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useUserData } from '@/hooks/useUserData';
import { useAuthContext } from '@/context/AuthContext';
import {
  CoachMessage,
  generateFinancialCoachReply,
  getFinancialCoachFallback,
} from '@/services/aiCoachService';

const STARTER_PROMPTS = [
  'Should I pay off debt or build savings first?',
  'How much should I budget for wants vs needs?',
  'Can you help me make a weekly money plan?',
];

export default function AIFinancialCoachScreen() {
  const { theme } = useTheme();
  const { financial } = useUserData();
  const { user } = useAuthContext();
  const [messages, setMessages] = useState<CoachMessage[]>([
    {
      role: 'assistant',
      content:
        'I am your AI Financial Coach. Ask me anything about budgeting, debt payoff, saving, or spending decisions.',
    },
  ]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const scrollRef = useRef<ScrollView | null>(null);

  const userName = useMemo(() => {
    return user?.email?.split('@')[0] || 'User';
  }, [user?.email]);

  const handleSend = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || isSending) return;

    const userMessage: CoachMessage = { role: 'user', content: text };
    const historyForPrompt = [...messages, userMessage];
    setAutoScrollEnabled(true);

    setMessages(historyForPrompt);
    setInput('');
    setIsSending(true);

    try {
      const reply = await generateFinancialCoachReply({
        userMessage: text,
        history: historyForPrompt,
        userName,
        userContext: {
          monthlyIncome: financial.monthlyIncome,
          monthlyExpenses: financial.monthlyExpenses,
          savingsGoal: financial.savingsGoal,
          currentSavings: financial.currentSavings,
          monthlyDebt: financial.totalDebt,
          subscriptionCount: financial.subscriptions?.length || 0,
        },
      });

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: reply || getFinancialCoachFallback(text),
        },
      ]);
    } catch (error) {
      console.log('[AI Coach] Failed to generate response:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: getFinancialCoachFallback(text),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleMessagesScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
    setAutoScrollEnabled(distanceFromBottom < 120);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        keyboardShouldPersistTaps="handled"
        onScroll={handleMessagesScroll}
        scrollEventThrottle={16}
        onContentSizeChange={() => {
          if (autoScrollEnabled) {
            scrollRef.current?.scrollToEnd({ animated: true });
          }
        }}
      >
        {messages.map((message, index) => {
          const isAssistant = message.role === 'assistant';
          return (
            <View
              key={`${message.role}-${index}`}
              style={[
                styles.messageRow,
                isAssistant ? styles.leftAligned : styles.rightAligned,
              ]}
            >
              <ThemedView
                style={[
                  styles.messageBubble,
                  isAssistant
                    ? {
                        backgroundColor: theme.card,
                        borderColor: theme.border,
                      }
                    : {
                        backgroundColor: theme.primary,
                        borderColor: theme.primary,
                      },
                ]}
              >
                <ThemedText
                  style={[
                    styles.messageText,
                    { color: isAssistant ? theme.text : '#FFFFFF' },
                  ]}
                >
                  {message.content}
                </ThemedText>
              </ThemedView>
            </View>
          );
        })}

        {isSending ? (
          <View style={[styles.messageRow, styles.leftAligned]}>
            <ThemedView
              style={[
                styles.typingBubble,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <ActivityIndicator size="small" color={theme.primary} />
              <Spacer width={Spacing.sm} />
              <ThemedText style={[styles.typingText, { color: theme.textSecondary }]}>
                Thinking...
              </ThemedText>
            </ThemedView>
          </View>
        ) : null}
      </ScrollView>

      <ThemedView style={[styles.starterCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <ThemedText style={[styles.starterTitle, { color: theme.textSecondary }]}>
          Try asking:
        </ThemedText>
        <Spacer height={Spacing.sm} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.starterWrap}
          keyboardShouldPersistTaps="handled"
        >
          {STARTER_PROMPTS.map((prompt) => (
            <Pressable
              key={prompt}
              style={[styles.starterChip, { borderColor: theme.border }]}
              onPress={() => handleSend(prompt)}
              disabled={isSending}
            >
              <ThemedText style={styles.starterChipText}>{prompt}</ThemedText>
            </Pressable>
          ))}
        </ScrollView>
      </ThemedView>

      <View style={[styles.inputRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask a money question..."
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text }]}
          multiline
          editable={!isSending}
          returnKeyType="send"
          blurOnSubmit={false}
          onSubmitEditing={() => handleSend()}
        />
        <Pressable
          onPress={() => handleSend()}
          disabled={isSending || !input.trim()}
          style={[
            styles.sendButton,
            {
              backgroundColor:
                isSending || !input.trim() ? theme.border : theme.primary,
            },
          ]}
        >
          <Feather name="send" size={16} color="#FFFFFF" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  leftAligned: {
    justifyContent: 'flex-start',
  },
  rightAligned: {
    justifyContent: 'flex-end',
  },
  messageBubble: {
    maxWidth: '85%',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  messageText: {
    ...Typography.body,
    lineHeight: 22,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  typingText: {
    ...Typography.caption,
  },
  starterCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
  },
  starterTitle: {
    ...Typography.caption,
    fontWeight: '600',
  },
  starterWrap: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingRight: Spacing.sm,
  },
  starterChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  starterChipText: {
    ...Typography.caption,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  input: {
    ...Typography.body,
    flex: 1,
    maxHeight: 120,
    minHeight: 40,
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
