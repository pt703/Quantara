import React, { useMemo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import Spacer from '@/components/Spacer';
import { Spacing, Typography, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useChallengeProgress } from '@/hooks/useChallengeProgress';
import { challenges } from '../mock/challenges';
import { ChallengesStackParamList } from '../navigation/ChallengesStackNavigator';

type ChallengesScreenProps = {
  navigation: NativeStackNavigationProp<ChallengesStackParamList, 'Challenges'>;
};

const CATEGORY_ICONS: Record<string, string> = {
  spending: 'credit-card',
  debt: 'file-text',
  subscriptions: 'repeat',
  saving: 'target',
};

export default function ChallengesScreen({ navigation }: ChallengesScreenProps) {
  const { theme } = useTheme();
  const { getChallengeStatus } = useChallengeProgress();

  const categorizedChallenges = useMemo(() => {
    const challengesWithStatus = challenges.map((challenge) => ({
      ...challenge,
      status: getChallengeStatus(challenge.id),
    }));

    return {
      active: challengesWithStatus.filter((c) => c.status === 'in_progress'),
      suggested: challengesWithStatus.filter((c) => c.status === 'not_started'),
      completed: challengesWithStatus.filter((c) => c.status === 'completed'),
    };
  }, [getChallengeStatus]);

  const renderChallenge = (challenge: typeof challenges[0] & { status: string }) => (
    <React.Fragment key={challenge.id}>
      <Pressable
        style={({ pressed }) => [
          styles.challengeCard,
          { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
        ]}
        onPress={() => navigation.navigate('ChallengeDetail', { challengeId: challenge.id })}
      >
        <View style={styles.challengeHeader}>
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor:
                  challenge.category === 'spending'
                    ? theme.primary + '20'
                    : challenge.category === 'debt'
                    ? theme.warning + '20'
                    : challenge.category === 'subscriptions'
                    ? theme.error + '20'
                    : theme.success + '20',
              },
            ]}
          >
            <Feather
              name={CATEGORY_ICONS[challenge.category] as any}
              size={20}
              color={
                challenge.category === 'spending'
                  ? theme.primary
                  : challenge.category === 'debt'
                  ? theme.warning
                  : challenge.category === 'subscriptions'
                  ? theme.error
                  : theme.success
              }
            />
          </View>

          <View style={styles.challengeInfo}>
            <ThemedText style={styles.challengeTitle} numberOfLines={2}>
              {challenge.title}
            </ThemedText>
            <ThemedText
              style={[
                styles.statusBadge,
                {
                  color:
                    challenge.status === 'completed'
                      ? theme.success
                      : challenge.status === 'in_progress'
                      ? theme.primary
                      : theme.textSecondary,
                },
              ]}
            >
              {challenge.status === 'completed'
                ? 'Completed'
                : challenge.status === 'in_progress'
                ? 'In Progress'
                : 'Not Started'}
            </ThemedText>
          </View>

          <Feather name="chevron-right" size={20} color={theme.textSecondary} />
        </View>
      </Pressable>

      <Spacer height={Spacing.md} />
    </React.Fragment>
  );

  return (
    <ScreenScrollView>
      <Spacer height={Spacing.md} />

      {categorizedChallenges.active.length > 0 ? (
        <>
          <ThemedText style={styles.sectionTitle}>Active</ThemedText>
          <Spacer height={Spacing.md} />
          {categorizedChallenges.active.map(renderChallenge)}
          <Spacer height={Spacing.lg} />
        </>
      ) : null}

      {categorizedChallenges.suggested.length > 0 ? (
        <>
          <ThemedText style={styles.sectionTitle}>Suggested</ThemedText>
          <Spacer height={Spacing.md} />
          {categorizedChallenges.suggested.map(renderChallenge)}
          <Spacer height={Spacing.lg} />
        </>
      ) : null}

      {categorizedChallenges.completed.length > 0 ? (
        <>
          <ThemedText style={styles.sectionTitle}>Completed</ThemedText>
          <Spacer height={Spacing.md} />
          {categorizedChallenges.completed.map(renderChallenge)}
          <Spacer height={Spacing.lg} />
        </>
      ) : null}

      <Spacer height={Spacing.xl} />
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    ...Typography.headline,
    paddingHorizontal: Spacing.lg,
  },
  challengeCard: {
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
  },
  challengeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  challengeInfo: {
    flex: 1,
  },
  challengeTitle: {
    ...Typography.body,
    marginBottom: Spacing.xs,
  },
  statusBadge: {
    ...Typography.footnote,
    fontWeight: '600',
  },
});
